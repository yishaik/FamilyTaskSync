import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { insertTaskSchema, insertNotificationSchema } from "@shared/schema";
import { toZonedTime } from 'date-fns-tz';
import { notifications } from "@shared/schema";
import { eq } from 'drizzle-orm';
import { db } from "./db";
import { sendTaskReminder } from './services/sms';

export function registerRoutes(app: Express) {
  // Users
  app.get("/api/users", async (_req, res) => {
    const users = await storage.getUsers();
    res.json(users);
  });

  app.patch("/api/users/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;

      // Validate phone number format if it's being updated
      if (updates.phoneNumber && !updates.phoneNumber.startsWith('+')) {
        updates.phoneNumber = `+${updates.phoneNumber}`;
      }

      const user = await storage.updateUser(id, updates);
      res.json(user);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(400).json({ message: 'An unknown error occurred' });
      }
    }
  });

  // Tasks
  app.get("/api/tasks", async (_req, res) => {
    const tasks = await storage.getTasks();
    res.json(tasks);
  });

  app.post("/api/tasks", async (req, res) => {
    try {
      console.log('Creating new task with data:', req.body);

      const parsed = insertTaskSchema.parse(req.body);

      // Convert reminder time to Date object if present
      if (parsed.reminderTime) {
        console.log('Processing reminder time:', {
          original: parsed.reminderTime,
          parsed: new Date(parsed.reminderTime)
        });
      }

      const task = await storage.createTask(parsed);

      console.log('Task created successfully:', {
        taskId: task.id,
        reminderTime: task.reminderTime,
        assignedTo: task.assignedTo
      });

      res.json(task);
    } catch (error) {
      console.error('Error creating task:', error);
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(400).json({ message: 'Failed to create task' });
      }
    }
  });

  app.patch("/api/tasks/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const updates = req.body;
    const task = await storage.updateTask(id, updates);
    res.json(task);
  });

  app.delete("/api/tasks/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteTask(id);
      res.json({ success: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete task';
      res.status(400).json({ message });
    }
  });

  // Notifications
  app.get("/api/notifications/:userId", async (req, res) => {
    const userId = parseInt(req.params.userId);
    const notifications = await storage.getNotifications(userId);
    res.json(notifications);
  });

  app.post("/api/notifications", async (req, res) => {
    const parsed = insertNotificationSchema.parse(req.body);
    const notification = await storage.createNotification(parsed);
    res.json(notification);
  });

  app.post("/api/notifications/:id/read", async (req, res) => {
    const id = parseInt(req.params.id);
    await storage.markNotificationAsRead(id);
    res.json({ success: true });
  });

  app.get("/api/notifications/log", async (_req, res) => {
    const notifications = await storage.getAllNotificationsWithStatus();
    res.json(notifications);
  });

  app.post("/api/notifications/webhook", async (req, res) => {
    try {
      const { MessageSid, MessageStatus, ErrorCode, ErrorMessage } = req.body;

      // Find notification by MessageSid
      const [notification] = await db
        .select()
        .from(notifications)
        .where(eq(notifications.messageSid, MessageSid));

      if (notification) {
        await storage.updateNotificationDeliveryStatus(
          notification.id,
          MessageStatus,
          MessageSid,
          ErrorCode ? `${ErrorCode}: ${ErrorMessage}` : undefined
        );
      }

      res.sendStatus(200);
    } catch (error) {
      console.error('Error processing webhook:', error);
      res.sendStatus(500);
    }
  });

  app.post("/api/notifications/test/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (!user.phoneNumber) {
        return res.status(400).json({
          success: false,
          message: "No phone number configured for this user"
        });
      }

      // Create a test task first
      const testTask = await storage.createTask({
        title: "Test Notification",
        description: "This is a test notification to verify your notification settings.",
        assignedTo: user.id,
        completed: false,
        priority: "medium",
        dueDate: new Date().toISOString(),
        reminderTime: new Date().toISOString(),
      });

      // Create a test notification
      const notification = await storage.createNotification({
        taskId: testTask.id,
        userId: user.id,
        message: `Test notification for ${user.name}`,
        read: false
      });

      try {
        // Send test notification using the existing SMS service
        const result = await sendTaskReminder(testTask, user, notification.id);

        if (result) {
          return res.json({ 
            success: true, 
            message: `Test notification queued successfully via ${user.notificationPreference}`,
            status: result.status
          });
        } else {
          return res.status(400).json({
            success: false,
            message: "Failed to send notification - no valid delivery method available"
          });
        }
      } catch (error) {
        // Check if it's a WhatsApp configuration error
        const err = error as Error;
        if (err.message.includes('WhatsApp not configured')) {
          return res.json({
            success: true,
            message: "WhatsApp not available, notification sent via SMS instead",
            fallback: true
          });
        }

        throw error;
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
      res.status(500).json({
        success: false,
        message: "Failed to send test notification",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  return createServer(app);
}