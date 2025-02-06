import twilio, { Twilio } from 'twilio';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { type Task, type User, type Notification } from '@shared/schema';
import { config } from '../config';
import { storage } from '../storage';
import { ConfigurationError, DeliveryError, NotificationError } from './errors';

interface DeliveryResult {
  messageSid: string;
  status: string;
  channel: 'sms' | 'whatsapp';
}

export class NotificationService {
  private client: Twilio;
  private readonly timeZone: string;

  constructor() {
    this.client = twilio(config.twilio.accountSid, config.twilio.authToken);
    this.timeZone = config.app.timeZone;
  }

  private formatMessage(task: Task, user: User): string {
    const zonedDueDate = task.dueDate ? toZonedTime(task.dueDate, this.timeZone) : null;
    return `Reminder for ${user.name}: Task "${task.title}" is due ${
      zonedDueDate ? `on ${format(zonedDueDate, 'MMM d')}` : 'soon'
    }. ${task.description || ''}`;
  }

  private async checkWhatsAppAvailability(): Promise<boolean> {
    try {
      const whatsappChannel = await this.client.conversations.v1.services.list({
        friendlyName: 'WhatsApp'
      });
      return whatsappChannel.length > 0;
    } catch (error) {
      console.warn('Error checking WhatsApp availability:', error);
      return false;
    }
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

  private validatePhoneNumber(phoneNumber: string | null): string {
    if (!phoneNumber) {
      throw new ValidationError('No phone number provided');
    }
    return phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
  }

  async sendTaskReminder(
    task: Task,
    user: User,
    notificationId: number
  ): Promise<DeliveryResult> {
    console.log('Sending task reminder:', {
      taskId: task.id,
      userId: user.id,
      notificationType: user.notificationPreference
    });

    try {
      const formattedPhone = this.validatePhoneNumber(user.phoneNumber);
      let deliveryChannel: 'sms' | 'whatsapp' = 'sms';

      // Check WhatsApp availability if preferred
      if (user.notificationPreference === 'whatsapp') {
        const whatsAppAvailable = await this.checkWhatsAppAvailability();
        if (!whatsAppAvailable) {
          console.log('WhatsApp unavailable, falling back to SMS');
          await this.updateDeliveryStatus(
            notificationId,
            'pending',
            undefined,
            'WhatsApp not configured, falling back to SMS'
          );
          deliveryChannel = 'sms';
        } else {
          deliveryChannel = 'whatsapp';
        }
      }

      const message = await this.client.messages.create({
        body: this.formatMessage(task, user),
        to: deliveryChannel === 'whatsapp' ? `whatsapp:${formattedPhone}` : formattedPhone,
        from: deliveryChannel === 'whatsapp' ? `whatsapp:${config.twilio.phoneNumber}` : config.twilio.phoneNumber,
        statusCallback: `${config.app.baseUrl}/api/notifications/webhook`,
      });

      console.log('Message queued:', {
        messageSid: message.sid,
        status: message.status,
        channel: deliveryChannel
      });

      await this.updateDeliveryStatus(
        notificationId,
        message.status === 'queued' ? 'sent' : message.status,
        message.sid
      );

      return {
        messageSid: message.sid,
        status: message.status,
        channel: deliveryChannel
      };
    } catch (error: any) {
      if (error.code === 63007 && user.notificationPreference === 'whatsapp') {
        console.log('WhatsApp error, retrying with SMS');
        return this.sendTaskReminder(
          task,
          { ...user, notificationPreference: 'sms' },
          notificationId
        );
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
