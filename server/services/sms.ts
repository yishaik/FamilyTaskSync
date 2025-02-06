import twilio from 'twilio';
import { type Task, type User } from '@shared/schema';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

const timeZone = 'Asia/Jerusalem';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

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
      taskTitle: task.title
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
      ? `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`
      : process.env.TWILIO_PHONE_NUMBER;

    console.log('Sending message with configuration:', {
      to,
      from,
      messageType: user.notificationPreference
    });

    const message = await client.messages.create({
      body: messageBody,
      to,
      from,
    });

    console.log(`${user.notificationPreference.toUpperCase()} message sent successfully for ${user.name}, message SID: ${message.sid}`);
    return message;
  } catch (error) {
    console.error('Error sending message:', error);
    if (error.code) {
      console.error(`Twilio Error Code: ${error.code}`);
      console.error(`Twilio Error Message: ${error.message}`);
    }
    throw new Error(`Failed to send ${user.notificationPreference} reminder`);
  }
}