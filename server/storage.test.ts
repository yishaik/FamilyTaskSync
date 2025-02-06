// Set up mocks before imports
import { beforeEach, expect, jest, describe, it } from '@jest/globals';
import { createMockDb, type IMockDb } from './db.test';

const { db: mockDb, resetMocks } = createMockDb();

jest.doMock('./db', () => ({
  db: mockDb,
  sql: jest.fn(),
}));

// Import after mocks are set up
import { DatabaseStorage } from './storage';
import { type User, type InsertUser, users } from '@shared/schema';

describe('DatabaseStorage', () => {
  let storage: DatabaseStorage;
  let db: IMockDb;

  beforeEach(() => {
    db = mockDb;
    storage = new DatabaseStorage();
    resetMocks();
  });

  describe('getUsers', () => {
    it('should return all users', async () => {
      const mockUsers: User[] = [
        { id: 1, name: 'Test User', color: '#000000', phoneNumber: null, notificationPreference: 'sms' },
      ];

      db.returning.mockResolvedValue(mockUsers);

      const result = await storage.getUsers();

      expect(result).toEqual(mockUsers);
      expect(db.select).toHaveBeenCalled();
      expect(db.from).toHaveBeenCalledWith(users);
    });
  });

  describe('createUser', () => {
    it('should create a user and format phone number correctly', async () => {
      const mockUser: InsertUser = {
        name: 'Test User',
        color: '#000000',
        phoneNumber: '1234567890',
        notificationPreference: 'sms',
      };

      const expectedUser: User = {
        id: 1,
        ...mockUser,
        phoneNumber: '+1234567890',
      };

      db.returning.mockResolvedValue([expectedUser]);

      const result = await storage.createUser(mockUser);

      expect(result).toEqual(expectedUser);
      expect(result.phoneNumber).toBe('+1234567890');
      expect(db.insert).toHaveBeenCalledWith(users);
      expect(db.values).toHaveBeenCalledWith({
        ...mockUser,
        phoneNumber: '+1234567890',
      });
    });

    it('should handle null phone number', async () => {
      const mockUser: InsertUser = {
        name: 'Test User',
        color: '#000000',
        phoneNumber: null,
        notificationPreference: 'sms',
      };

      const expectedUser: User = {
        id: 1,
        ...mockUser,
      };

      db.returning.mockResolvedValue([expectedUser]);

      const result = await storage.createUser(mockUser);

      expect(result).toEqual(expectedUser);
      expect(result.phoneNumber).toBeNull();
      expect(db.insert).toHaveBeenCalledWith(users);
      expect(db.values).toHaveBeenCalledWith(mockUser);
    });
  });
});