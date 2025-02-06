import twilio from 'twilio';
import { type Task, type User } from '@shared/schema';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { storage } from '../storage';

const timeZone = 'Asia/Jerusalem';

// Validate required environment variables
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;
const REPLIT_URL = `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;

if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
  console.error('Missing required Twilio credentials');
  throw new Error('Missing required Twilio credentials');
}

// Validate Twilio credentials format
if (!TWILIO_ACCOUNT_SID.startsWith('AC')) {
  console.error('Invalid Twilio Account SID format');
  throw new Error('Invalid Twilio Account SID format - should start with AC');
}

if (!TWILIO_PHONE_NUMBER.startsWith('+')) {
  console.error('Invalid Twilio Phone Number format');
  throw new Error('Invalid Twilio Phone Number format - should start with +');
}

const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

interface TwilioError extends Error {
  code?: number;
  status?: number;
}

export async function sendTaskReminder(task: Task, user: User, notificationId: number) {
  try {
    // Check if user has a phone number
    if (!user.phoneNumber) {
      console.log(`Skipping message for user ${user.name} (ID: ${user.id}) - No phone number provided`);
      await storage.updateNotificationDeliveryStatus(notificationId, "failed", undefined, "No phone number provided");
      return null;
    }

    console.log('Attempting to send reminder with following details:', {
      userName: user.name,
      userId: user.id,
      phoneNumber: user.phoneNumber,
      notificationType: user.notificationPreference,
      taskTitle: task.title,
      taskDueDate: task.dueDate,
      twilioNumber: TWILIO_PHONE_NUMBER,
      webhookUrl: `${REPLIT_URL}/api/notifications/webhook`
    });

    const zonedDueDate = task.dueDate ? toZonedTime(task.dueDate, timeZone) : null;
    const messageBody = `Reminder for ${user.name}: Task "${task.title}" is due ${zonedDueDate ? `on ${format(zonedDueDate, 'MMM d')}` : 'soon'}. ${task.description || ''}`;

    // Format the 'to' number based on notification preference
    const formattedPhone = user.phoneNumber.startsWith('+') ? user.phoneNumber : `+${user.phoneNumber}`;

    // For WhatsApp, first check if the channel is available
    if (user.notificationPreference === 'whatsapp') {
      try {
        // Try to fetch WhatsApp channel info
        const whatsappChannel = await client.conversations.v1.services.list({ 
          friendlyName: 'WhatsApp' 
        });

        if (!whatsappChannel || whatsappChannel.length === 0) {
          console.log('WhatsApp channel not configured, falling back to SMS');
          // Update user's preference to SMS
          await storage.updateUser(user.id, { notificationPreference: 'sms' });
          // Update notification with fallback info
          await storage.updateNotificationDeliveryStatus(
            notificationId,
            "pending",
            undefined,
            "WhatsApp not configured, falling back to SMS"
          );
          // Set to SMS for this delivery
          user.notificationPreference = 'sms';
        }
      } catch (error) {
        console.log('Error checking WhatsApp availability, falling back to SMS:', error);
        user.notificationPreference = 'sms';
      }
    }

    const to = user.notificationPreference === 'whatsapp' 
      ? `whatsapp:${formattedPhone}`
      : formattedPhone;

    const from = user.notificationPreference === 'whatsapp'
      ? `whatsapp:${TWILIO_PHONE_NUMBER}`
      : TWILIO_PHONE_NUMBER;

    try {
      const message = await client.messages.create({
        body: messageBody,
        to,
        from,
        statusCallback: `${REPLIT_URL}/api/notifications/webhook`,
      });

      console.log(`${user.notificationPreference.toUpperCase()} message queued successfully:`, {
        userName: user.name,
        messageSid: message.sid,
        status: message.status,
        dateCreated: message.dateCreated
      });

      // For SMS, "queued" is a successful initial state
      if (message.status === 'queued') {
        await storage.updateNotificationDeliveryStatus(notificationId, "sent", message.sid);
        return message;
      }

      // For other statuses, update accordingly
      await storage.updateNotificationDeliveryStatus(notificationId, message.status, message.sid);
      return message;
    } catch (error) {
      const twilioError = error as TwilioError;

      // Log specific error types for better debugging
      if (twilioError.code === 21211) {
        console.error('Invalid phone number format:', user.phoneNumber);
      } else if (twilioError.code === 21608) {
        console.error('Unverified phone number. The number must be verified in the Twilio console first.');
      } else if (twilioError.code === 21614) {
        console.error('Invalid Twilio phone number.');
      }

      console.error('Error sending message:', {
        error: twilioError.message,
        code: twilioError.code,
        status: twilioError.status,
        stack: twilioError.stack,
        userName: user.name,
        userId: user.id,
        phoneNumber: user.phoneNumber,
        notificationType: user.notificationPreference
      });

      await storage.updateNotificationDeliveryStatus(
        notificationId, 
        "failed", 
        undefined, 
        `${twilioError.code}: ${twilioError.message}`
      );

      // Don't throw if it's a WhatsApp error, we'll fall back to SMS
      if (user.notificationPreference === 'whatsapp' && twilioError.code === 63007) {
        console.log('Falling back to SMS due to WhatsApp error');
        return await sendTaskReminder({ ...task }, { ...user, notificationPreference: 'sms' }, notificationId);
      }

      throw new Error(`Failed to send ${user.notificationPreference} reminder: ${twilioError.message}`);
    }
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    console.error('Error in sendTaskReminder:', {
      error: err.message,
      stack: err.stack
    });
    throw err;
  }
}