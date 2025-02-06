import { type User, type InsertUser, type Task, type InsertTask, type Notification, type InsertNotification, users, tasks, notifications } from "@shared/schema";
import { db, sql } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  // Users
  getUsers(): Promise<User[]>;
  getUser(id: number): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User>;

  // Tasks
  getTasks(): Promise<Task[]>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, task: Partial<InsertTask>): Promise<Task>;
  deleteTask(id: number): Promise<void>;

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
    };

    console.log('Storage: Processed task data:', {
      ...taskData,
      dueDate: taskData.dueDate?.toISOString(),
      reminderTime: taskData.reminderTime?.toISOString(),
    });

    const [task] = await db.insert(tasks).values(taskData).returning();

    console.log('Storage: Task created:', {
      id: task.id,
      title: task.title,
      reminderTime: task.reminderTime?.toISOString(),
      assignedTo: task.assignedTo
    });

    return task;
  }

  async updateTask(id: number, updates: Partial<InsertTask>): Promise<Task> {
    console.log('Storage: Updating task:', { id, updates });

    const updateData = {
      ...updates,
      dueDate: updates.dueDate ? new Date(updates.dueDate) : undefined,
      reminderTime: updates.reminderTime ? new Date(updates.reminderTime) : undefined,
    };

    console.log('Storage: Processed update data:', {
      ...updateData,
      dueDate: updateData.dueDate?.toISOString(),
      reminderTime: updateData.reminderTime?.toISOString(),
    });

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
      deliveryAttempts: sql`delivery_attempts + 1`,
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