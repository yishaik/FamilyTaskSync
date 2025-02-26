import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  color: text("color").notNull(),
  phoneNumber: text("phone_number"),
  notificationPreference: text("notification_preference").notNull().default("sms"),
  twoFactorSecret: text("two_factor_secret"),
});

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  assignedTo: integer("assigned_to").references(() => users.id),
  completed: boolean("completed").notNull().default(false),
  priority: text("priority").notNull().default("medium"),
  dueDate: timestamp("due_date"),
  reminderTime: timestamp("reminder_time"),
  smsReminderSent: boolean("sms_reminder_sent").notNull().default(false),
  // New fields for recurring tasks
  recurrencePattern: text("recurrence_pattern"), // daily, weekly, monthly
  recurrenceEndDate: timestamp("recurrence_end_date"),
  parentTaskId: integer("parent_task_id").references(() => tasks.id, { onDelete: 'set null' }),
  isRecurring: boolean("is_recurring").notNull().default(false),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").references(() => tasks.id, { onDelete: 'cascade' }).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  read: boolean("read").notNull().default(false),
  deliveryStatus: text("delivery_status").notNull().default("pending"),
  messageSid: text("message_sid"),
  deliveryError: text("delivery_error"),
  deliveryAttempts: integer("delivery_attempts").notNull().default(0),
  lastAttemptAt: timestamp("last_attempt_at"),
});

// Update schemas to handle date properly
export const insertUserSchema = createInsertSchema(users).extend({
  notificationPreference: z.enum(["sms", "whatsapp"]).default("sms"),
});

export const recurrencePatterns = ["daily", "weekly", "monthly"] as const;
export const taskPriorities = ["low", "medium", "high"] as const;
export type TaskPriority = typeof taskPriorities[number];

export const insertTaskSchema = createInsertSchema(tasks).extend({
  dueDate: z.string().nullable().optional(),
  reminderTime: z.string().nullable().optional(),
  recurrencePattern: z.enum(recurrencePatterns).nullable().optional(),
  recurrenceEndDate: z.string().nullable().optional(),
  isRecurring: z.boolean().optional(),
  priority: z.enum(taskPriorities).default("medium"),
}).omit({ id: true, smsReminderSent: true, parentTaskId: true });

export const insertNotificationSchema = createInsertSchema(notifications)
  .omit({ id: true, createdAt: true, deliveryStatus: true, messageSid: true, deliveryError: true, deliveryAttempts: true, lastAttemptAt: true });

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

export const deliveryStatuses = ["pending", "sent", "delivered", "failed"] as const;