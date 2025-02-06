// Set up mocks before imports
import { beforeEach, afterEach, expect, jest, describe, it } from '@jest/globals';

interface TwilioMessage {
  sid: string;
  status: string;
  dateCreated: Date;
}

interface TwilioClient {
  messages: {
    create: jest.MockedFunction<(params: any) => Promise<TwilioMessage>>;
  };
}

// Mock twilio
jest.doMock('twilio', () => {
  return jest.fn(() => ({
    messages: {
      create: jest.fn().mockImplementation(() => Promise.resolve({
        sid: 'test_sid',
        status: 'queued',
        dateCreated: new Date()
      }))
    },
  }));
});

// Mock storage
jest.doMock('../storage', () => ({
  storage: {
    updateNotificationDeliveryStatus: jest.fn().mockImplementation(() => Promise.resolve()),
  },
}));

// Import after mocks are set up
import { storage } from '../storage';
import { sendTaskReminder } from './sms';
import { type Task, type User } from '@shared/schema';

describe('SMS Service', () => {
  let mockTwilioClient: TwilioClient;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    jest.clearAllMocks();

    // Save original env vars
    originalEnv = { ...process.env };

    // Set test env vars
    process.env.TWILIO_ACCOUNT_SID = 'AC_test';
    process.env.TWILIO_AUTH_TOKEN = 'test_token';
    process.env.TWILIO_PHONE_NUMBER = '+1234567890';
    process.env.REPL_SLUG = 'test';
    process.env.REPL_OWNER = 'test';

    // Get the mocked Twilio client instance
    mockTwilioClient = (require('twilio') as jest.MockedFunction<any>)();
  });

  afterEach(() => {
    // Restore original env vars
    process.env = originalEnv;
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

  describe('sendTaskReminder', () => {
    it('should successfully send SMS notification', async () => {
      const mockMessageResponse: TwilioMessage = {
        sid: 'test_sid',
        status: 'queued',
        dateCreated: new Date(),
      };

      mockTwilioClient.messages.create.mockImplementation(() => Promise.resolve(mockMessageResponse));

      const result = await sendTaskReminder(mockTask, mockUser, 1);

      expect(mockTwilioClient.messages.create).toHaveBeenCalledWith({
        body: expect.any(String),
        to: mockUser.phoneNumber,
        from: process.env.TWILIO_PHONE_NUMBER,
        statusCallback: expect.stringContaining('/api/notifications/webhook'),
      });

      expect(storage.updateNotificationDeliveryStatus).toHaveBeenCalledWith(
        1,
        'sent',
        'test_sid'
      );

      expect(result).toEqual(mockMessageResponse);
    });

    it('should handle missing phone number', async () => {
      const userWithoutPhone = { ...mockUser, phoneNumber: null };

      await sendTaskReminder(mockTask, userWithoutPhone, 1);

      expect(mockTwilioClient.messages.create).not.toHaveBeenCalled();
      expect(storage.updateNotificationDeliveryStatus).toHaveBeenCalledWith(
        1,
        'failed',
        undefined,
        'No phone number provided'
      );
    });

    it('should handle Twilio errors', async () => {
      const error = new Error('Invalid phone number') as Error & { code: number };
      error.code = 21211;
      mockTwilioClient.messages.create.mockImplementation(() => Promise.reject(error));

      await expect(sendTaskReminder(mockTask, mockUser, 1)).rejects.toThrow();

      expect(storage.updateNotificationDeliveryStatus).toHaveBeenCalledWith(
        1,
        'failed',
        undefined,
        '21211: Invalid phone number'
      );
    });
  });
});