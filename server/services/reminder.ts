import { db } from '../db';
import { storage } from '../storage';
import { sendTaskReminder } from './sms';
import { lt, eq, and, isNotNull } from 'drizzle-orm';
import { tasks } from '@shared/schema';
import { toZonedTime } from 'date-fns-tz';

const TIMEZONE = 'Asia/Jerusalem';

export async function checkAndSendReminders() {
  try {
    // Get current time in Israel timezone
    const now = new Date();
    const israelTime = toZonedTime(now, TIMEZONE);

    // Get all tasks that have reminders due and haven't been sent yet
    const pendingReminders = await db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.smsReminderSent, false),
          lt(tasks.reminderTime, israelTime),
          eq(tasks.completed, false),
          isNotNull(tasks.assignedTo)
        )
      );

    console.log(`Found ${pendingReminders.length} pending reminders to process`);

    for (const task of pendingReminders) {
      if (!task.assignedTo) continue;

      try {
        // Get the user assigned to the task
        const user = await storage.getUser(task.assignedTo);
        if (!user) {
          console.log(`No user found for task ${task.id}, skipping reminder`);
          continue;
        }

        // Send the reminder
        await sendTaskReminder(task, user);

        // Mark reminder as sent
        await db
          .update(tasks)
          .set({ smsReminderSent: true })
          .where(eq(tasks.id, task.id));

        // Create a notification
        await storage.createNotification({
          taskId: task.id,
          userId: user.id,
          message: `Reminder: Task "${task.title}" is due soon.`,
        });

        console.log(`Successfully processed reminder for task ${task.id} assigned to user ${user.name}`);
      } catch (error) {
        console.error(`Failed to process reminder for task ${task.id}:`, error);
      }
    }
  } catch (error) {
    console.error('Error checking reminders:', error);
  }
}

// Run reminder check every minute
setInterval(checkAndSendReminders, 60 * 1000);

// Initial check when the service starts
checkAndSendReminders();