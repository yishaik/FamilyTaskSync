import { db } from '../db';
import { storage } from '../storage';
import { sendTaskReminder } from './sms';
import { lt, eq, and, isNotNull, gte } from 'drizzle-orm';
import { tasks } from '@shared/schema';
import { toZonedTime } from 'date-fns-tz';
import { subMinutes } from 'date-fns';

const TIMEZONE = 'Asia/Jerusalem';

export async function checkAndSendReminders() {
  try {
    // Get current time in Israel timezone
    const now = new Date();
    const israelTime = toZonedTime(now, TIMEZONE);

    console.log('Checking reminders at:', {
      utcTime: now.toISOString(),
      israelTime: israelTime.toISOString(),
    });

    // Get the time 1 minute ago to create a window for reminders
    const oneMinuteAgo = subMinutes(israelTime, 1);

    // Log the reminder window
    console.log('Reminder window:', {
      from: oneMinuteAgo.toISOString(),
      to: israelTime.toISOString(),
    });

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
          isNotNull(tasks.assignedTo),
          isNotNull(tasks.reminderTime)
        )
      );

    // Log all found tasks
    console.log('All tasks with reminders:', {
      count: pendingReminders.length,
      tasks: pendingReminders.map(task => ({
        id: task.id,
        title: task.title,
        reminderTime: task.reminderTime,
        assignedTo: task.assignedTo,
      }))
    });

    for (const task of pendingReminders) {
      if (!task.assignedTo) continue;

      try {
        // Get the user assigned to the task
        const user = await storage.getUser(task.assignedTo);
        if (!user) {
          console.log(`No user found for task ${task.id}, skipping reminder`);
          continue;
        }

        console.log(`Processing reminder for task ${task.id}:`, {
          taskId: task.id,
          taskTitle: task.title,
          userId: user.id,
          userName: user.name,
          userPhone: user.phoneNumber,
          notificationPreference: user.notificationPreference,
          reminderTime: task.reminderTime?.toISOString()
        });

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
        const err = error instanceof Error ? error : new Error('Unknown error');
        console.error(`Failed to process reminder for task ${task.id}:`, {
          error: err.message,
          stack: err.stack
        });
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
          isNotNull(tasks.assignedTo),
          isNotNull(tasks.reminderTime)
        )
      )
      .returning();

    if (oldReminders.length > 0) {
      console.log('Old reminders marked as sent:', {
        count: oldReminders.length,
        reminders: oldReminders.map(task => ({
          id: task.id,
          title: task.title,
          reminderTime: task.reminderTime
        }))
      });
    }
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    console.error('Error checking reminders:', {
      error: err.message,
      stack: err.stack
    });
  }
}

// Run reminder check every minute
const checkInterval = setInterval(checkAndSendReminders, 60 * 1000);

// Initial check when the service starts
checkAndSendReminders();

// Handle cleanup
process.on('SIGTERM', () => {
  clearInterval(checkInterval);
});