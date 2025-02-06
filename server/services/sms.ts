import twilio from 'twilio';
import { type Task, type User } from '@shared/schema';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { storage } from '../storage'; // Fixed import path

const timeZone = 'Asia/Jerusalem';

// Validate required environment variables
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

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
      twilioNumber: TWILIO_PHONE_NUMBER
    });

    const zonedDueDate = task.dueDate ? toZonedTime(task.dueDate, timeZone) : null;
    const messageBody = `Reminder for ${user.name}: Task "${task.title}" is due ${zonedDueDate ? `on ${format(zonedDueDate, 'MMM d')}` : 'soon'}. ${task.description || ''}`;

    // Format the 'to' number based on notification preference
    const formattedPhone = user.phoneNumber.startsWith('+') ? user.phoneNumber : `+${user.phoneNumber}`;

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
        statusCallback: `${process.env.PUBLIC_URL}/api/notifications/webhook`,
      });

      console.log(`${user.notificationPreference.toUpperCase()} message sent successfully:`, {
        userName: user.name,
        messageSid: message.sid,
        status: message.status,
        dateCreated: message.dateCreated
      });

      await storage.updateNotificationDeliveryStatus(notificationId, "sent", message.sid);
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