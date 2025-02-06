import { DatabaseStorage } from './storage';
import { db } from './db';
import { type User } from '@shared/schema';
import { expect, jest, describe, it } from '@jest/globals';

// Mock the database
jest.mock('./db', () => ({
  db: {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    returning: jest.fn(),
    values: jest.fn().mockReturnThis(),
  },
}));

// Mock initializeDefaultUsers function
jest.mock('./storage', () => {
  const actualStorage = jest.requireActual('./storage');
  return {
    ...actualStorage,
    initializeDefaultUsers: jest.fn(),
  };
});

describe('DatabaseStorage', () => {
  let storage: DatabaseStorage;

  beforeEach(() => {
    storage = new DatabaseStorage();
    jest.clearAllMocks();

    // Reset all mock implementations
    (db.select as jest.Mock).mockReturnThis();
    (db.from as jest.Mock).mockReturnThis();
    (db.where as jest.Mock).mockReturnThis();
    (db.insert as jest.Mock).mockReturnThis();
    (db.update as jest.Mock).mockReturnThis();
    (db.delete as jest.Mock).mockReturnThis();
    (db.set as jest.Mock).mockReturnThis();
    (db.values as jest.Mock).mockReturnThis();
  });

  describe('getUsers', () => {
    it('should return all users', async () => {
      const mockUsers: User[] = [
        { id: 1, name: 'Test User', color: '#000000', phoneNumber: null, notificationPreference: 'sms' },
      ];

      (db.from as jest.Mock).mockResolvedValueOnce(mockUsers);

      const result = await storage.getUsers();
      expect(result).toEqual(mockUsers);
      expect(db.select).toHaveBeenCalled();
      expect(db.from).toHaveBeenCalled();
    });
  });

  describe('createUser', () => {
    it('should create a user and format phone number correctly', async () => {
      const mockUser = {
        name: 'Test User',
        color: '#000000',
        phoneNumber: '1234567890',
        notificationPreference: 'sms' as const,
      };

      const expectedUser: User = {
        id: 1,
        ...mockUser,
        phoneNumber: '+1234567890',
      };

      (db.returning as jest.Mock).mockResolvedValueOnce([expectedUser]);

      const result = await storage.createUser(mockUser);
      expect(result).toEqual(expectedUser);
      expect(result.phoneNumber).toBe('+1234567890');
      expect(db.insert).toHaveBeenCalled();
      expect(db.values).toHaveBeenCalledWith({
        ...mockUser,
        phoneNumber: '+1234567890',
      });
    });

    it('should handle null phone number', async () => {
      const mockUser = {
        name: 'Test User',
        color: '#000000',
        phoneNumber: null,
        notificationPreference: 'sms' as const,
      };

      const expectedUser: User = {
        id: 1,
        ...mockUser,
      };

      (db.returning as jest.Mock).mockResolvedValueOnce([expectedUser]);

      const result = await storage.createUser(mockUser);
      expect(result).toEqual(expectedUser);
      expect(result.phoneNumber).toBeNull();
      expect(db.insert).toHaveBeenCalled();
      expect(db.values).toHaveBeenCalledWith(mockUser);
    });
  });
});