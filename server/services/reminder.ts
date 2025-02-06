import { db } from '../db';
import { storage } from '../storage';
import { sendTaskReminder } from './sms';
import { lt, eq, and, isNotNull, gte, between } from 'drizzle-orm';
import { tasks } from '@shared/schema';
import { toZonedTime } from 'date-fns-tz';
import { subMinutes, addMinutes } from 'date-fns';

const TIMEZONE = 'Asia/Jerusalem';

export async function checkAndSendReminders() {
  try {
    // Get current time in UTC
    const now = new Date();
    const israelTime = toZonedTime(now, TIMEZONE);

    console.log('Checking reminders at:', {
      utcTime: now.toISOString(),
      israelTime: israelTime.toISOString(),
    });

    // Create a 2-minute window for reminders (1 minute before and after current time)
    // to avoid missing any reminders due to processing delays
    const windowStart = subMinutes(now, 1);
    const windowEnd = addMinutes(now, 1);

    console.log('Reminder window:', {
      start: windowStart.toISOString(),
      end: windowEnd.toISOString(),
    });

    // Get all tasks that have reminders due in the window and haven't been sent yet
    const pendingReminders = await db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.smsReminderSent, false),
          between(tasks.reminderTime, windowStart, windowEnd),
          eq(tasks.completed, false),
          isNotNull(tasks.assignedTo),
          isNotNull(tasks.reminderTime)
        )
      );

    console.log('Found tasks with pending reminders:', {
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

        // Create a notification first
        const notification = await storage.createNotification({
          taskId: task.id,
          userId: user.id,
          message: `Reminder: Task "${task.title}" is due soon.`,
        });

        // Send the reminder with notification ID
        await sendTaskReminder(task, user, notification.id);

        // Mark reminder as sent in tasks table
        await db
          .update(tasks)
          .set({ smsReminderSent: true })
          .where(eq(tasks.id, task.id));

        console.log(`Successfully processed reminder for task ${task.id} assigned to user ${user.name}`);
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Unknown error');
        console.error(`Failed to process reminder for task ${task.id}:`, {
          error: err.message,
          stack: err.stack
        });
      }
    }

    // Mark old unprocessed reminders as sent
    // Only mark reminders that are more than 5 minutes old to prevent premature marking
    const fiveMinutesAgo = subMinutes(now, 5);

    const oldReminders = await db
      .update(tasks)
      .set({ smsReminderSent: true })
      .where(
        and(
          eq(tasks.smsReminderSent, false),
          lt(tasks.reminderTime, fiveMinutesAgo),
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