import { storage } from '../storage';
import { sendTaskReminder } from './sms';
import twilio from 'twilio';
import { type Task, type User } from '../../shared/schema';

// Mock twilio
jest.mock('twilio', () => {
  return jest.fn(() => ({
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
});

// Mock storage
jest.mock('../storage', () => ({
  storage: {
    updateNotificationDeliveryStatus: jest.fn(),
    updateUser: jest.fn(),
  },
}));

describe('SMS Service', () => {
  let mockTwilioClient: jest.Mocked<any>;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.TWILIO_ACCOUNT_SID = 'AC_test';
    process.env.TWILIO_AUTH_TOKEN = 'test_token';
    process.env.TWILIO_PHONE_NUMBER = '+1234567890';
    process.env.REPL_SLUG = 'test';
    process.env.REPL_OWNER = 'test';

    mockTwilioClient = (twilio as jest.Mock)();
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
      mockTwilioClient.messages.create.mockResolvedValueOnce({
        sid: 'test_sid',
        status: 'queued',
        dateCreated: new Date(),
      });

      await sendTaskReminder(mockTask, mockUser, 1);

      expect(mockTwilioClient.messages.create).toHaveBeenCalledWith({
        body: expect.any(String),
        to: mockUser.phoneNumber,
        from: process.env.TWILIO_PHONE_NUMBER,
        statusCallback: expect.any(String),
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
      mockTwilioClient.messages.create.mockResolvedValueOnce({
        sid: 'test_sid',
        status: 'queued',
        dateCreated: new Date(),
      });

      await sendTaskReminder(mockTask, whatsappUser, 1);

      // Should update user preference to SMS
      expect(storage.updateUser).toHaveBeenCalledWith(
        whatsappUser.id,
        { notificationPreference: 'sms' }
      );

      // Should send SMS instead
      expect(mockTwilioClient.messages.create).toHaveBeenCalledWith({
        body: expect.any(String),
        to: whatsappUser.phoneNumber,
        from: process.env.TWILIO_PHONE_NUMBER,
        statusCallback: expect.any(String),
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