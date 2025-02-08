import { NotificationService } from '../NotificationService';
import { Task } from '../../types/Task';
import { User } from '../../types/User';

describe('NotificationService', () => {
  let notificationService: NotificationService;

  beforeEach(() => {
    notificationService = new NotificationService();
  });

  describe('validatePhoneNumber', () => {
    it('should validate correct phone numbers', () => {
      const validNumber = '+12345678900';
      expect(() => {
        notificationService['validatePhoneNumber'](validNumber);
      }).not.toThrow();
    });

    it('should throw error for invalid phone numbers', () => {
      const invalidNumber = '123';
      expect(() => {
        notificationService['validatePhoneNumber'](invalidNumber);
      }).toThrow('Invalid phone number format');
    });
  });
});
