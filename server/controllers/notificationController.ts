import { Request, Response } from 'express';
import { storage } from '../storage';
import { insertNotificationSchema, InsertTask, insertTaskSchema } from '@shared/schema';
import { notificationService } from '../services/NotificationService';
import { NotificationError, ValidationError } from '../services/errors';

export const getNotificationsByUserId = async (req: Request, res: Response) => {
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
};

export const createNotification = async (req: Request, res: Response) => {
  try {
    const parsed = insertNotificationSchema.parse(req.body);
    const notification = await storage.createNotification(parsed);
    res.json(notification);
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(400).json({ message: 'Failed to create notification' });
  }
};

export const markNotificationAsRead = async (req: Request, res: Response) => {
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
};

export const getNotificationLogs = async (_req: Request, res: Response) => {
  try {
    const notifications = await storage.getAllNotificationsWithStatus();
    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notification logs:', error);
    res.status(500).json({ message: 'Failed to fetch notification logs' });
  }
};

export const testNotification = async (req: Request, res: Response) => {
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
    const testTaskData: InsertTask = {
      title: "Test Notification",
      description: "This is a test notification to verify your notification settings.",
      assignedTo: user.id,
      priority: "medium",
      dueDate: new Date().toISOString(),
      reminderTime: new Date().toISOString()
    };
    
    const parsedTaskData = insertTaskSchema.parse(testTaskData);
    const testTask = await storage.createTask(parsedTaskData);

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
};

export const handleWebhook = async (req: Request, res: Response) => {
  try {
    const { MessageSid, MessageStatus, ErrorCode, ErrorMessage } = req.body;
    await notificationService.processWebhook(MessageSid, MessageStatus, ErrorCode, ErrorMessage);
    res.sendStatus(200);
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.sendStatus(500);
  }
};