import '@testing-library/jest-dom';

// Mock fetch globally
global.fetch = jest.fn();

// Reset all mocks before each test
beforeEach(() => {
  jest.resetAllMocks();
});
