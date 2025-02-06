import { checkAndSendReminders } from './reminder';
import { db } from '../db';
import { storage } from '../storage';
import { sendTaskReminder } from './sms';
import { type Task, type User } from '../../shared/schema';
import { addMinutes, subMinutes } from 'date-fns';

// Mock dependencies
jest.mock('../db', () => ({
  db: {
    select: jest.fn(),
    update: jest.fn(),
  },
}));

jest.mock('../storage', () => ({
  storage: {
    getUser: jest.fn(),
    createNotification: jest.fn(),
  },
}));

jest.mock('./sms', () => ({
  sendTaskReminder: jest.fn(),
}));

describe('Reminder Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const mockTask: Task = {
    id: 1,
    title: 'Test Task',
    description: 'Test Description',
    assignedTo: 1,
    completed: false,
    priority: 'medium',
    dueDate: new Date(),
    reminderTime: new Date(),
    smsReminderSent: false,
  };

  const mockUser: User = {
    id: 1,
    name: 'Test User',
    color: '#000000',
    phoneNumber: '+1234567890',
    notificationPreference: 'sms',
  };

  describe('checkAndSendReminders', () => {
    it('should process pending reminders within the time window', async () => {
      const now = new Date();
      const reminderTime = now;

      // Mock db.select to return a task with reminder due
      (db.select as jest.Mock).mockImplementation(() => ({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([{ ...mockTask, reminderTime }]),
      }));

      // Mock storage.getUser to return a user
      (storage.getUser as jest.Mock).mockResolvedValue(mockUser);

      // Mock storage.createNotification
      (storage.createNotification as jest.Mock).mockResolvedValue({ id: 1 });

      // Mock sendTaskReminder
      (sendTaskReminder as jest.Mock).mockResolvedValue({ status: 'queued' });

      // Mock db.update for marking reminder as sent
      (db.update as jest.Mock).mockImplementation(() => ({
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([mockTask]),
        returning: jest.fn().mockResolvedValue([mockTask]),
      }));

      await checkAndSendReminders();

      expect(storage.getUser).toHaveBeenCalledWith(mockTask.assignedTo);
      expect(storage.createNotification).toHaveBeenCalled();
      expect(sendTaskReminder).toHaveBeenCalled();
      expect(db.update).toHaveBeenCalled();
    });

    it('should not process reminders outside the time window', async () => {
      const now = new Date();
      const reminderTime = addMinutes(now, 5); // 5 minutes in the future

      // Mock db.select to return no tasks
      (db.select as jest.Mock).mockImplementation(() => ({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([]),
      }));

      await checkAndSendReminders();

      expect(storage.getUser).not.toHaveBeenCalled();
      expect(storage.createNotification).not.toHaveBeenCalled();
      expect(sendTaskReminder).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      // Mock db.select to throw an error
      (db.select as jest.Mock).mockImplementation(() => {
        throw new Error('Database error');
      });

      await expect(checkAndSendReminders()).resolves.not.toThrow();
    });
  });
});