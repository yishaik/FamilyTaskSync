// Set up mocks before imports
import { jest } from '@jest/globals';

// Create a type for the mocked database instance
export interface IMockDb {
  select: jest.Mock<any, any>;
  from: jest.Mock<any, any>;
  where: jest.Mock<any, any>;
  insert: jest.Mock<any, any>;
  update: jest.Mock<any, any>;
  delete: jest.Mock<any, any>;
  set: jest.Mock<any, any>;
  values: jest.Mock<any, any>;
  returning: jest.Mock<any, any>;
}

// Create and export the mock db instance
export const createMockDb = () => {
  // Create mock methods with proper typing
  const mockMethods = {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    returning: jest.fn(),
  };

  // Create the mock db instance
  const mockDb = mockMethods as IMockDb;

  // Create a function to reset all mocks
  const resetMocks = () => {
    Object.values(mockMethods).forEach(mock => {
      mock.mockClear();
      if (mock !== mockMethods.returning) {
        mock.mockReturnThis();
      }
    });
  };

  return { db: mockDb, resetMocks };
};