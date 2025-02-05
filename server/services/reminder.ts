import { db } from '../db';
import { storage } from '../storage';
import { sendTaskReminder } from './sms';
import { lt, eq, and, isNull } from 'drizzle-orm';
import { tasks } from '@shared/schema';

export async function checkAndSendReminders() {
  try {
    // Get all tasks that have reminders due and haven't been sent yet
    const pendingReminders = await db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.smsReminderSent, false),
          lt(tasks.reminderTime, new Date()),
          eq(tasks.completed, false),
          isNull(tasks.assignedTo)
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