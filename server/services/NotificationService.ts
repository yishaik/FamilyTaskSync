import twilio, { Twilio } from 'twilio';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { type Task, type User, type Notification } from '@shared/schema';
import { config } from '../config';
import { storage } from '../storage';
import { ConfigurationError, DeliveryError, NotificationError, ValidationError } from './errors';

interface DeliveryResult {
  messageSid: string;
  status: string;
  channel: 'sms' | 'whatsapp';
  fallback?: boolean;
}

export class NotificationService {
  private client: Twilio;
  private readonly timeZone: string;

  constructor() {
    if (!config.twilio.accountSid || !config.twilio.authToken || !config.twilio.phoneNumber) {
      throw new ConfigurationError('Missing required Twilio credentials');
    }
    this.client = twilio(config.twilio.accountSid, config.twilio.authToken);
    this.timeZone = config.app.timeZone;
  }

  private formatMessage(task: Task, user: User): string {
    const zonedDueDate = task.dueDate ? toZonedTime(task.dueDate, this.timeZone) : null;
    return `Reminder for ${user.name}: Task "${task.title}" is due ${
      zonedDueDate ? `on ${format(zonedDueDate, 'MMM d')}` : 'soon'
    }. ${task.description || ''}`;
  }

  private validatePhoneNumber(phoneNumber: string | null): string {
    if (!phoneNumber) {
      throw new ValidationError('No phone number provided');
    }
    return phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
  }

  private async updateDeliveryStatus(
    notificationId: number,
    status: string,
    messageSid?: string,
    error?: string
  ): Promise<void> {
    await storage.updateNotificationDeliveryStatus(
      notificationId,
      status,
      messageSid,
      error
    );
  }

  async sendTaskReminder(
    task: Task,
    user: User,
    notificationId: number
  ): Promise<DeliveryResult> {
    console.log('Sending task reminder:', {
      taskId: task.id,
      userId: user.id,
      userName: user.name,
      notificationType: user.notificationPreference,
      phone: user.phoneNumber
    });

    try {
      const formattedPhone = this.validatePhoneNumber(user.phoneNumber);
      let deliveryChannel: 'sms' | 'whatsapp' = user.notificationPreference === 'whatsapp' ? 'whatsapp' : 'sms';
      let usingFallback = false;

      // If WhatsApp is requested but not configured, fall back to SMS
      if (deliveryChannel === 'whatsapp' && !config.twilio.whatsappNumber) {
        console.log('WhatsApp number not configured, falling back to SMS');
        await this.updateDeliveryStatus(
          notificationId,
          'pending',
          undefined,
          'WhatsApp not configured, falling back to SMS'
        );
        deliveryChannel = 'sms';
        usingFallback = true;
        await storage.updateUser(user.id, { notificationPreference: 'sms' });
      }

      const from = deliveryChannel === 'whatsapp' 
        ? `whatsapp:${config.twilio.whatsappNumber}`
        : config.twilio.phoneNumber;

      const to = deliveryChannel === 'whatsapp'
        ? `whatsapp:${formattedPhone}`
        : formattedPhone;

      console.log('Sending message with:', {
        channel: deliveryChannel,
        to,
        from,
        fallback: usingFallback
      });

      const message = await this.client.messages.create({
        body: this.formatMessage(task, user),
        to,
        from,
        statusCallback: `${config.app.baseUrl}/api/notifications/webhook`,
      });

      console.log(`${deliveryChannel.toUpperCase()} message queued:`, {
        messageSid: message.sid,
        status: message.status,
        channel: deliveryChannel,
        fallback: usingFallback
      });

      await this.updateDeliveryStatus(
        notificationId,
        message.status === 'queued' ? 'sent' : message.status,
        message.sid
      );

      return {
        messageSid: message.sid,
        status: message.status,
        channel: deliveryChannel,
        fallback: usingFallback
      };
    } catch (error: any) {
      // Handle WhatsApp-specific errors
      if (error.code === 63007) {
        console.log('WhatsApp message failed, falling back to SMS');
        // Update user preference to SMS
        await storage.updateUser(user.id, { notificationPreference: 'sms' });
        // Retry with SMS
        const smsResult = await this.sendTaskReminder(task, { ...user, notificationPreference: 'sms' }, notificationId);
        return { ...smsResult, fallback: true };
      }

      const notificationError = NotificationError.fromTwilioError(error);
      await this.updateDeliveryStatus(
        notificationId,
        'failed',
        undefined,
        notificationError.message
      );
      throw notificationError;
    }
  }

  async processWebhook(
    messageSid: string,
    messageStatus: string,
    errorCode?: string,
    errorMessage?: string
  ): Promise<void> {
    const [notification] = await storage.getNotificationByMessageSid(messageSid);
    if (notification) {
      await this.updateDeliveryStatus(
        notification.id,
        messageStatus,
        messageSid,
        errorCode ? `${errorCode}: ${errorMessage}` : undefined
      );
    }
  }
}

export const notificationService = new NotificationService();