// Test setup file for GitHub integration tests
import { jest } from '@jest/globals';

// Mock environment variables for testing
process.env['GITHUB_TOKEN_ENCRYPTION_KEY'] = 'test-encryption-key-32-characters-long';
process.env['NODE_ENV'] = 'test';

// Mock database connection
jest.mock('../database/connection', () => ({
  db: {
    query: jest.fn(),
    publishEvent: jest.fn(),
  },
}));

// Mock logger to avoid console output during tests
jest.mock('../telemetry/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Global test timeout
jest.setTimeout(10000);