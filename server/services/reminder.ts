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

    for (const task of pendingReminders) {
      if (!task.assignedTo) continue;

      try {
        // Get the user assigned to the task
        const user = await storage.getUser(task.assignedTo);
        if (!user) continue;

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
          message: `SMS reminder sent for task: ${task.title}`,
        });
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