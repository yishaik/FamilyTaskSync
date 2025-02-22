import { type User, type InsertUser, type Task, type InsertTask, type Notification, type InsertNotification, users, tasks, notifications } from "@shared/schema";
import { db } from "./db";
import { eq, sql as drizzleSql } from "drizzle-orm";
import { addDays, addWeeks, addMonths } from "date-fns";

export interface IStorage {
  // Users
  getUsers(): Promise<User[]>;
  getUserByPhone(phoneNumber: string): Promise<User | undefined>;
  getUser(id: number): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User>;

  // Tasks
  getTasks(): Promise<Task[]>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, task: Partial<InsertTask>): Promise<Task>;
  deleteTask(id: number): Promise<void>;
  createRecurringTaskInstances(task: Task): Promise<void>;

  // Notifications
  getNotifications(userId: number): Promise<Notification[]>;
  getAllNotificationsWithStatus(): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: number): Promise<void>;
  updateNotificationDeliveryStatus(id: number, status: string, messageSid?: string, error?: string): Promise<void>;
  getNotificationByMessageSid(messageSid: string): Promise<Notification[]>;
}

export class DatabaseStorage implements IStorage {
  async getUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async getUserByPhone(phoneNumber: string): Promise<User | undefined> {
    // Ensure phone number format is correct
    const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.phoneNumber, formattedPhone));
    return user;
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    // Ensure phone number format is correct if provided
    if (insertUser.phoneNumber && !insertUser.phoneNumber.startsWith('+')) {
      insertUser.phoneNumber = `+${insertUser.phoneNumber}`;
    }

    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User> {
    // Ensure phone number format is correct if being updated
    if (updates.phoneNumber) {
      updates.phoneNumber = updates.phoneNumber.startsWith('+')
        ? updates.phoneNumber
        : `+${updates.phoneNumber}`;
    }

    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();

    if (!user) {
      throw new Error(`User ${id} not found`);
    }

    return user;
  }

  async getTasks(): Promise<Task[]> {
    return await db.select().from(tasks);
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    console.log('Storage: Creating task with data:', insertTask);

    // Ensure dates are properly parsed
    const taskData = {
      ...insertTask,
      dueDate: insertTask.dueDate ? new Date(insertTask.dueDate) : null,
      reminderTime: insertTask.reminderTime ? new Date(insertTask.reminderTime) : null,
      recurrenceEndDate: insertTask.recurrenceEndDate ? new Date(insertTask.recurrenceEndDate) : null,
    };

    const [task] = await db.insert(tasks).values(taskData).returning();

    if (task.isRecurring && task.recurrencePattern && task.dueDate) {
      await this.createRecurringTaskInstances(task);
    }

    return task;
  }

  async updateTask(id: number, updates: Partial<InsertTask>): Promise<Task> {
    const updateData = {
      ...updates,
      dueDate: updates.dueDate ? new Date(updates.dueDate) : undefined,
      reminderTime: updates.reminderTime ? new Date(updates.reminderTime) : undefined,
    };

    const [task] = await db
      .update(tasks)
      .set(updateData)
      .where(eq(tasks.id, id))
      .returning();

    if (!task) {
      throw new Error(`Task ${id} not found`);
    }

    return task;
  }

  async deleteTask(id: number): Promise<void> {
    await db.delete(tasks).where(eq(tasks.id, id));
  }

  async getNotifications(userId: number): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(notifications.createdAt);
  }

  async getAllNotificationsWithStatus(): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .orderBy(notifications.createdAt);
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [newNotification] = await db
      .insert(notifications)
      .values(notification)
      .returning();
    return newNotification;
  }

  async markNotificationAsRead(id: number): Promise<void> {
    await db
      .update(notifications)
      .set({ read: true })
      .where(eq(notifications.id, id));
  }

  async updateNotificationDeliveryStatus(
    id: number,
    status: string,
    messageSid?: string,
    error?: string
  ): Promise<void> {
    const updates: any = {
      deliveryStatus: status,
      lastAttemptAt: new Date(),
      deliveryAttempts: drizzleSql`delivery_attempts + 1`,
    };

    if (messageSid) {
      updates.messageSid = messageSid;
    }

    if (error) {
      updates.deliveryError = error;
    }

    await db
      .update(notifications)
      .set(updates)
      .where(eq(notifications.id, id));
  }

  async getNotificationByMessageSid(messageSid: string): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.messageSid, messageSid));
  }

  async createRecurringTaskInstances(parentTask: Task): Promise<void> {
    if (!parentTask.dueDate || !parentTask.recurrencePattern || !parentTask.isRecurring) {
      return;
    }

    const endDate = parentTask.recurrenceEndDate || addMonths(new Date(parentTask.dueDate), 3);
    let currentDate = new Date(parentTask.dueDate);

    while (currentDate <= endDate) {
      let nextDate: Date;
      switch (parentTask.recurrencePattern) {
        case 'daily':
          nextDate = addDays(currentDate, 1);
          break;
        case 'weekly':
          nextDate = addWeeks(currentDate, 1);
          break;
        case 'monthly':
          nextDate = addMonths(currentDate, 1);
          break;
        default:
          return;
      }

      const instanceData = {
        title: parentTask.title,
        description: parentTask.description,
        assignedTo: parentTask.assignedTo,
        priority: parentTask.priority,
        dueDate: nextDate,
        reminderTime: parentTask.reminderTime ? new Date(
          nextDate.getTime() + 
          (new Date(parentTask.reminderTime).getTime() - new Date(parentTask.dueDate).getTime())
        ) : null,
        parentTaskId: parentTask.id,
        isRecurring: false
      };

      await db.insert(tasks).values(instanceData);
      currentDate = nextDate;
    }
  }
}

export const storage = new DatabaseStorage();

const defaultUsers = [
  {
    name: "Mom",
    color: "#FF69B4",
    phoneNumber: null,
    notificationPreference: "sms" as const
  },
  {
    name: "Dad",
    color: "#4169E1",
    phoneNumber: null,
    notificationPreference: "sms" as const
  },
  {
    name: "Kid",
    color: "#32CD32",
    phoneNumber: null,
    notificationPreference: "sms" as const
  }
];

async function initializeDefaultUsers() {
  const existingUsers = await storage.getUsers();
  if (existingUsers.length === 0) {
    for (const user of defaultUsers) {
      await storage.createUser(user);
    }
  }
}

initializeDefaultUsers();