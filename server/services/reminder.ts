import { db } from '../db';
import { storage } from '../storage';
import { sendTaskReminder } from './sms';
import { lt, eq, and, isNotNull, gte } from 'drizzle-orm';
import { tasks } from '@shared/schema';
import { toZonedTime, zonedTimeToUtc } from 'date-fns-tz';
import { subMinutes } from 'date-fns';

const TIMEZONE = 'Asia/Jerusalem';

export async function checkAndSendReminders() {
  try {
    // Get current time in Israel timezone
    const now = new Date();
    const israelTime = toZonedTime(now, TIMEZONE);

    // Get the time 1 minute ago to create a window for reminders
    const oneMinuteAgo = subMinutes(israelTime, 1);

    // Get all tasks that have reminders due in the last minute and haven't been sent yet
    const pendingReminders = await db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.smsReminderSent, false),
          lt(tasks.reminderTime, israelTime),
          gte(tasks.reminderTime, oneMinuteAgo),
          eq(tasks.completed, false),
          isNotNull(tasks.assignedTo)
        )
      );

    console.log(`Found ${pendingReminders.length} pending reminders to process within the last minute window`);

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

    // Mark old unprocessed reminders as sent to prevent them from being processed
    const oldReminders = await db
      .update(tasks)
      .set({ smsReminderSent: true })
      .where(
        and(
          eq(tasks.smsReminderSent, false),
          lt(tasks.reminderTime, oneMinuteAgo),
          isNotNull(tasks.assignedTo)
        )
      )
      .returning();

    if (oldReminders.length > 0) {
      console.log(`Marked ${oldReminders.length} old reminders as sent to prevent processing`);
    }
  } catch (error) {
    console.error('Error checking reminders:', error);
  }
}

// Run reminder check every minute
setInterval(checkAndSendReminders, 60 * 1000);

// Initial check when the service starts
checkAndSendReminders();