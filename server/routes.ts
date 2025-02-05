import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { insertTaskSchema, insertNotificationSchema } from "@shared/schema";

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
      const user = await storage.updateUser(id, updates);
      res.json(user);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

  // Tasks
  app.get("/api/tasks", async (_req, res) => {
    const tasks = await storage.getTasks();
    res.json(tasks);
  });

  app.post("/api/tasks", async (req, res) => {
    const parsed = insertTaskSchema.parse(req.body);
    const task = await storage.createTask(parsed);
    res.json(task);
  });

  app.patch("/api/tasks/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const updates = req.body;
    const task = await storage.updateTask(id, updates);
    res.json(task);
  });

  app.delete("/api/tasks/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    await storage.deleteTask(id);
    res.json({ success: true });
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

  return createServer(app);
}