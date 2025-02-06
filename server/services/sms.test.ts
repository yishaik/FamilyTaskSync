import { storage } from '../storage';
import { sendTaskReminder } from './sms';
import twilio from 'twilio';
import { type Task, type User } from '@shared/schema';
import { expect, jest, describe, it } from '@jest/globals';

interface TwilioInterface {
  messages: {
    create: jest.Mock;
  };
  conversations: {
    v1: {
      services: {
        list: jest.Mock;
      };
    };
  };
}

// Mock twilio
jest.mock('twilio', () => {
  const mockTwilio = jest.fn(() => ({
    messages: {
      create: jest.fn(),
    },
    conversations: {
      v1: {
        services: {
          list: jest.fn(),
        },
      },
    },
  }));
  return mockTwilio;
});

// Mock storage
jest.mock('../storage', () => ({
  storage: {
    updateNotificationDeliveryStatus: jest.fn(),
    updateUser: jest.fn(),
  },
}));

describe('SMS Service', () => {
  let mockTwilioClient: TwilioInterface;
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

    mockTwilioClient = (twilio as unknown as jest.Mock)() as TwilioInterface;
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
      const mockMessageResponse = {
        sid: 'test_sid',
        status: 'queued',
        dateCreated: new Date(),
      };

      mockTwilioClient.messages.create.mockResolvedValueOnce(mockMessageResponse);

      await sendTaskReminder(mockTask, mockUser, 1);

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
    });

    it('should fall back to SMS when WhatsApp is not available', async () => {
      const whatsappUser = { ...mockUser, notificationPreference: 'whatsapp' as const };

      // Mock WhatsApp channel check to return empty array (not configured)
      mockTwilioClient.conversations.v1.services.list.mockResolvedValueOnce([]);

      // Mock successful SMS fallback
      const mockMessageResponse = {
        sid: 'test_sid',
        status: 'queued',
        dateCreated: new Date(),
      };
      mockTwilioClient.messages.create.mockResolvedValueOnce(mockMessageResponse);

      await sendTaskReminder(mockTask, whatsappUser, 1);

      expect(storage.updateUser).toHaveBeenCalledWith(whatsappUser.id, {
        notificationPreference: 'sms',
      });

      expect(mockTwilioClient.messages.create).toHaveBeenCalledWith({
        body: expect.any(String),
        to: whatsappUser.phoneNumber,
        from: process.env.TWILIO_PHONE_NUMBER,
        statusCallback: expect.stringContaining('/api/notifications/webhook'),
      });
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
      const error = new Error('Invalid phone number') as any;
      error.code = 21211;
      mockTwilioClient.messages.create.mockRejectedValueOnce(error);

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