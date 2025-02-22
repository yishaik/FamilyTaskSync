import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { insertTaskSchema, insertNotificationSchema } from "@shared/schema";
import { notifications } from "@shared/schema";
import { eq } from 'drizzle-orm';
import { db } from "./db";
import { notificationService } from './services/NotificationService';
import { NotificationError, ValidationError } from './services/errors';
import authRouter from './routes/auth';

export function registerRoutes(app: Express) {
  // Register auth routes first
  app.use('/api/auth', authRouter);

  // Users
  app.get("/api/users", async (_req, res) => {
    const users = await storage.getUsers();
    res.json(users);
  });

  app.patch("/api/users/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
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
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid task ID" });
      }
      const updates = req.body;
      const task = await storage.updateTask(id, updates);
      res.json(task);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(400).json({ message: 'Failed to update task' });
      }
    }
  });

  app.delete("/api/tasks/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid task ID" });
      }
      await storage.deleteTask(id);
      res.json({ success: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete task';
      res.status(400).json({ message });
    }
  });

  // Notifications
  app.get("/api/notifications/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      const notifications = await storage.getNotifications(userId);
      res.json(notifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({ message: 'Failed to fetch notifications' });
    }
  });

  app.post("/api/notifications", async (req, res) => {
    try {
      const parsed = insertNotificationSchema.parse(req.body);
      const notification = await storage.createNotification(parsed);
      res.json(notification);
    } catch (error) {
      console.error('Error creating notification:', error);
      res.status(400).json({ message: 'Failed to create notification' });
    }
  });

  app.post("/api/notifications/:id/read", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid notification ID" });
      }
      await storage.markNotificationAsRead(id);
      res.json({ success: true });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({ message: 'Failed to mark notification as read' });
    }
  });

  app.get("/api/notifications/log", async (_req, res) => {
    try {
      const notifications = await storage.getAllNotificationsWithStatus();
      res.json(notifications);
    } catch (error) {
      console.error('Error fetching notification logs:', error);
      res.status(500).json({ message: 'Failed to fetch notification logs' });
    }
  });

  app.post("/api/notifications/test/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      console.log('Testing notification for user:', {
        userId,
        userName: user.name,
        notificationPreference: user.notificationPreference
      });

      // Create a test task
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
        const result = await notificationService.sendTaskReminder(testTask, user, notification.id);
        return res.json({
          success: true,
          message: result.fallback 
            ? `Test notification sent successfully via SMS (WhatsApp unavailable)`
            : `Test notification sent successfully via ${result.channel}`,
          status: result.status,
          channel: result.channel,
          fallback: result.fallback
        });
      } catch (error) {
        if (error instanceof ValidationError) {
          return res.status(400).json({
            success: false,
            message: error.message
          });
        }
        throw error;
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
      const status = error instanceof NotificationError ? error.status || 500 : 500;
      res.status(status).json({
        success: false,
        message: error instanceof Error ? error.message : "Unknown error occurred"
      });
    }
  });

  app.post("/api/notifications/webhook", async (req, res) => {
    try {
      const { MessageSid, MessageStatus, ErrorCode, ErrorMessage } = req.body;
      await notificationService.processWebhook(MessageSid, MessageStatus, ErrorCode, ErrorMessage);
      res.sendStatus(200);
    } catch (error) {
      console.error('Error processing webhook:', error);
      res.sendStatus(500);
    }
  });

  return createServer(app);
}