import twilio from 'twilio';
import { type Task, type User } from '@shared/schema';
import { format } from 'date-fns';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export async function sendTaskReminder(task: Task, user: User) {
  if (!user.phoneNumber) {
    console.log(`No phone number for user ${user.name}, skipping SMS reminder`);
    return;
  }

  try {
    const message = await client.messages.create({
      body: `Reminder: Task "${task.title}" is due ${task.dueDate ? `on ${format(new Date(task.dueDate), 'MMM d')}` : 'soon'}. ${task.description || ''}`,
      to: user.phoneNumber,
      from: process.env.TWILIO_PHONE_NUMBER,
    });

    console.log(`SMS sent successfully to ${user.name}, message SID: ${message.sid}`);
    return message;
  } catch (error) {
    console.error('Error sending SMS:', error);
    throw new Error('Failed to send SMS reminder');
  }
}
