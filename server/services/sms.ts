import twilio from 'twilio';
import { type Task, type User } from '@shared/schema';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

const timeZone = 'Asia/Jerusalem';

// Validate required environment variables
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
  console.error('Missing required Twilio credentials');
  throw new Error('Missing required Twilio credentials');
}

const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

interface TwilioError extends Error {
  code?: string;
  status?: number;
}

export async function sendTaskReminder(task: Task, user: User) {
  try {
    // Check if user has a phone number
    if (!user.phoneNumber) {
      console.log(`Skipping message for user ${user.name} (ID: ${user.id}) - No phone number provided`);
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

    const zonedDueDate = task.dueDate ? toZonedTime(new Date(task.dueDate), timeZone) : null;
    const messageBody = `Reminder for ${user.name}: Task "${task.title}" is due ${zonedDueDate ? `on ${format(zonedDueDate, 'MMM d')}` : 'soon'}. ${task.description || ''}`;

    // Format the 'to' number based on notification preference
    // Ensure phone number is in E.164 format (e.g., +972123456789)
    const formattedPhone = user.phoneNumber.startsWith('+') ? user.phoneNumber : `+${user.phoneNumber}`;

    const to = user.notificationPreference === 'whatsapp' 
      ? `whatsapp:${formattedPhone}`
      : formattedPhone;

    const from = user.notificationPreference === 'whatsapp'
      ? `whatsapp:${TWILIO_PHONE_NUMBER}`
      : TWILIO_PHONE_NUMBER;

    console.log('Sending message with configuration:', {
      to,
      from,
      messageType: user.notificationPreference,
      messageBody
    });

    const message = await client.messages.create({
      body: messageBody,
      to,
      from,
    });

    console.log(`${user.notificationPreference.toUpperCase()} message sent successfully:`, {
      userName: user.name,
      messageSid: message.sid,
      status: message.status,
      dateCreated: message.dateCreated
    });

    return message;
  } catch (error) {
    const twilioError = error as TwilioError;
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
    throw new Error(`Failed to send ${user.notificationPreference} reminder: ${twilioError.message}`);
  }
}