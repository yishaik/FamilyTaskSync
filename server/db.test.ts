// Set up mocks before imports
import { jest } from '@jest/globals';

// Create a type for the mocked database instance
export interface IMockDb {
  select: jest.Mock;
  from: jest.Mock;
  where: jest.Mock;
  insert: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
  set: jest.Mock;
  values: jest.Mock;
  returning: jest.Mock;
}

// Create and export the mock db instance
export const createMockDb = () => {
  // Create mock methods
  const mockMethods = {
    select: jest.fn(),
    from: jest.fn(),
    where: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    set: jest.fn(),
    values: jest.fn(),
    returning: jest.fn(),
  };

  // Make each method chainable
  Object.values(mockMethods).forEach(mock => {
    mock.mockReturnValue(mockMethods);
  });

  // Create the mock db instance
  const mockDb = {
    ...mockMethods
  } as unknown as IMockDb;

  // Create a function to reset all mocks
  const resetMocks = () => {
    Object.values(mockMethods).forEach(mock => {
      mock.mockClear();
      mock.mockReturnValue(mockMethods);
    });
  };

  return { db: mockDb, resetMocks };
};