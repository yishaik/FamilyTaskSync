import { Request, Response } from 'express';
import { storage } from '../storage';
import { insertTaskSchema } from '@shared/schema';

export const getTasks = async (_req: Request, res: Response) => {
  try {
    const tasks = await storage.getTasks();
    res.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ message: 'Failed to fetch tasks' });
  }
};

export const createTask = async (req: Request, res: Response) => {
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
};

export const updateTask = async (req: Request, res: Response) => {
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
};

export const deleteTask = async (req: Request, res: Response) => {
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
};