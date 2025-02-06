// Set up mocks before imports
import { afterEach, beforeEach, expect, jest, describe, it } from '@jest/globals';
import { createMockDb, type IMockDb } from '../db.test';

const { db: mockDb, resetMocks } = createMockDb();

jest.doMock('../db', () => ({
  db: mockDb,
  sql: jest.fn(),
}));

// Mock storage methods
jest.doMock('../storage', () => ({
  storage: {
    getUser: jest.fn<Promise<User | undefined>, [number]>(),
    createNotification: jest.fn<Promise<{ id: number }>, [any]>(),
  },
}));

// Mock SMS sending
jest.doMock('./sms', () => ({
  sendTaskReminder: jest.fn<Promise<TwilioMessage>, [Task, User, number]>(),
}));

// Import after mocks are set up
import { checkAndSendReminders } from './reminder';
import { storage } from '../storage';
import { sendTaskReminder } from './sms';
import { type Task, type User, tasks } from '@shared/schema';
import { addMinutes } from 'date-fns';

interface TwilioMessage {
  sid: string;
  status: string;
  dateCreated: Date;
}

describe('Reminder Service', () => {
  let mockCheckInterval: NodeJS.Timeout;
  let db: IMockDb;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    db = mockDb;
    resetMocks();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    if (mockCheckInterval) {
      clearInterval(mockCheckInterval);
    }
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

      // Setup mock chain for initial tasks query
      db.returning.mockResolvedValueOnce([{ ...mockTask, reminderTime }]);

      // Setup storage and SMS mocks
      (storage.getUser as jest.Mock).mockResolvedValueOnce(mockUser);
      (storage.createNotification as jest.Mock).mockResolvedValueOnce({ id: 1 });
      (sendTaskReminder as jest.Mock).mockResolvedValueOnce({
        sid: 'test_sid',
        status: 'queued',
        dateCreated: new Date(),
      });

      await checkAndSendReminders();

      expect(storage.getUser).toHaveBeenCalledWith(mockTask.assignedTo);
      expect(storage.createNotification).toHaveBeenCalled();
      expect(sendTaskReminder).toHaveBeenCalled();
      expect(db.update).toHaveBeenCalledWith(tasks);
    });

    it('should not process reminders outside the time window', async () => {
      const now = new Date();
      const reminderTime = addMinutes(now, 5); // 5 minutes in the future

      // Mock empty result for reminders outside window
      db.returning.mockResolvedValueOnce([]);

      await checkAndSendReminders();

      expect(storage.getUser).not.toHaveBeenCalled();
      expect(storage.createNotification).not.toHaveBeenCalled();
      expect(sendTaskReminder).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      // Mock database error
      db.returning.mockRejectedValueOnce(new Error('Database error'));

      await expect(checkAndSendReminders()).resolves.not.toThrow();
    });
  });
});