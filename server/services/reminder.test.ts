// Set up mocks before imports
import { beforeEach, afterEach, expect, jest, describe, it } from '@jest/globals';
import { createMockDb, type IMockDb } from '../db.test';

const { db: mockDb, resetMocks } = createMockDb();

jest.doMock('../db', () => ({
  db: mockDb,
  sql: jest.fn(),
}));

// Mock storage methods with proper types
jest.doMock('../storage', () => ({
  storage: {
    getUser: jest.fn().mockImplementation(() => Promise.resolve(undefined)),
    createNotification: jest.fn().mockImplementation(() => Promise.resolve({ id: 1 })),
  },
}));

// Mock SMS sending with proper type
jest.doMock('./sms', () => ({
  sendTaskReminder: jest.fn().mockImplementation(() => Promise.resolve({
    sid: 'test_sid',
    status: 'queued',
    dateCreated: new Date()
  })),
}));

// Import after mocks are set up
import { checkAndSendReminders } from './reminder';
import { storage } from '../storage';
import { sendTaskReminder } from './sms';
import { type Task, type User, tasks } from '@shared/schema';
import { addMinutes } from 'date-fns';

// Define the TwilioMessage type
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
      const mockTaskWithTime = { ...mockTask, reminderTime };

      // Type the mock implementations
      db.returning.mockImplementation(() => Promise.resolve([mockTaskWithTime]));

      const mockedGetUser = storage.getUser as jest.MockedFunction<typeof storage.getUser>;
      mockedGetUser.mockImplementation(() => Promise.resolve(mockUser));

      const mockedCreateNotification = storage.createNotification as jest.MockedFunction<typeof storage.createNotification>;
      mockedCreateNotification.mockImplementation(() => Promise.resolve({ id: 1 }));

      const mockedSendTaskReminder = sendTaskReminder as jest.MockedFunction<typeof sendTaskReminder>;
      mockedSendTaskReminder.mockImplementation(() => Promise.resolve({
        sid: 'test_sid',
        status: 'queued',
        dateCreated: new Date(),
      }));

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
      db.returning.mockImplementation(() => Promise.resolve([]));

      await checkAndSendReminders();

      expect(storage.getUser).not.toHaveBeenCalled();
      expect(storage.createNotification).not.toHaveBeenCalled();
      expect(sendTaskReminder).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      // Mock database error
      db.returning.mockImplementation(() => Promise.reject(new Error('Database error')));

      await expect(checkAndSendReminders()).resolves.not.toThrow();
    });
  });
});