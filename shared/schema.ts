import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  color: text("color").notNull(),
  phoneNumber: text("phone_number"),
  notificationPreference: text("notification_preference").notNull().default("sms"), // 'sms' or 'whatsapp'
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
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").references(() => tasks.id, { onDelete: 'cascade' }).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  read: boolean("read").notNull().default(false),
  // New fields for delivery tracking
  deliveryStatus: text("delivery_status").notNull().default("pending"), // pending, sent, delivered, failed
  messageSid: text("message_sid"), // Twilio message ID for tracking
  deliveryError: text("delivery_error"), // Error message if delivery failed
  deliveryAttempts: integer("delivery_attempts").notNull().default(0),
  lastAttemptAt: timestamp("last_attempt_at"),
});

// Update schemas to handle date properly
export const insertUserSchema = createInsertSchema(users).extend({
  notificationPreference: z.literal('sms'),
});

export const insertTaskSchema = createInsertSchema(tasks).extend({
  dueDate: z.string().nullable().optional(),
  reminderTime: z.string().nullable().optional(),
}).omit({ id: true, smsReminderSent: true });

export const insertNotificationSchema = createInsertSchema(notifications)
  .omit({ id: true, createdAt: true, deliveryStatus: true, messageSid: true, deliveryError: true, deliveryAttempts: true, lastAttemptAt: true });

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

export const taskPriorities = ["low", "medium", "high"] as const;
export const deliveryStatuses = ["pending", "sent", "delivered", "failed"] as const;