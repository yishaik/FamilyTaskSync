import { DatabaseStorage } from './storage';
import { db } from './db';
import { type User } from '../shared/schema';

// Mock the database
jest.mock('./db', () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));

describe('DatabaseStorage', () => {
  let storage: DatabaseStorage;

  beforeEach(() => {
    storage = new DatabaseStorage();
    jest.clearAllMocks();
  });

  describe('getUsers', () => {
    it('should return all users', async () => {
      const mockUsers = [
        { id: 1, name: 'Test User', color: '#000000', phoneNumber: null, notificationPreference: 'sms' },
      ];

      (db.select as jest.Mock).mockImplementation(() => ({
        from: () => Promise.resolve(mockUsers),
      }));

      const result = await storage.getUsers();
      expect(result).toEqual(mockUsers);
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

      const expectedUser = {
        ...mockUser,
        phoneNumber: '+1234567890',
      };

      (db.insert as jest.Mock).mockImplementation(() => ({
        values: () => ({
          returning: () => [{ id: 1, ...expectedUser }],
        }),
      }));

      const result = await storage.createUser(mockUser);
      expect(result.phoneNumber).toBe('+1234567890');
    });
  });
});