import type { Express } from "express";
import { createServer } from "http";
import authRouter from './routes/auth';
import userRoutes from './routes/userRoutes';
import taskRoutes from './routes/taskRoutes';
import notificationRoutes from './routes/notificationRoutes';

export function registerRoutes(app: Express) {
  // Register auth routes first
  app.use('/api/auth', authRouter);
  
  // Register resource routes
  app.use('/api/users', userRoutes);
  app.use('/api/tasks', taskRoutes);
  app.use('/api/notifications', notificationRoutes);

  return createServer(app);
}