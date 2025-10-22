import * as crypto from 'crypto';
import { GitHubTokenManager } from '../services/githubTokenManager';
import { GitHubClient } from '../services/githubClient';
import { db } from '../database/connection';

// Mock dependencies
jest.mock('../services/githubClient');
jest.mock('../database/connection');
jest.mock('crypto');

describe('GitHubTokenManager', () => {
  let tokenManager: GitHubTokenManager;
  let mockClient: jest.Mocked<GitHubClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset singleton instance
    (GitHubTokenManager as any).instance = undefined;
    
    // Mock crypto functions
    (crypto.randomBytes as jest.Mock).mockReturnValue(Buffer.from('test-random-bytes'));
    (crypto.createCipher as jest.Mock).mockReturnValue({
      update: jest.fn().mockReturnValue('encrypted-part'),
      final: jest.fn().mockReturnValue('-final')
    });
    (crypto.createDecipher as jest.Mock).mockReturnValue({
      update: jest.fn().mockReturnValue('decrypted-part'),
      final: jest.fn().mockReturnValue('-final')
    });
    (crypto.createHmac as jest.Mock).mockReturnValue({
      update: jest.fn().mockReturnThis(),
      digest: jest.fn().mockReturnValue('test-hmac-tag')
    });

    // Mock GitHubClient
    mockClient = {
      testConnection: jest.fn(),
    } as any;
    (GitHubClient as jest.MockedClass<typeof GitHubClient>).mockImplementation(() => mockClient);
    
    tokenManager = GitHubTokenManager.getInstance();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = GitHubTokenManager.getInstance();
      const instance2 = GitHubTokenManager.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Token Validation', () => {
    it('should validate token successfully', async () => {
      const mockUser = {
        login: 'testuser',
        id: 123,
        name: 'Test User',
        email: 'test@example.com'
      };
      
      mockClient.testConnection.mockResolvedValue({
        success: true,
        user: mockUser,
        rateLimit: {
          limit: 5000,
          remaining: 4999,
          reset: 1234567890,
          used: 1
        }
      });

      const result = await tokenManager.validateToken('valid-token');

      expect(result.isValid).toBe(true);
      expect(result.user).toEqual(mockUser);
      expect(result.rateLimit).toBeDefined();
    });

    it('should handle invalid token', async () => {
      mockClient.testConnection.mockResolvedValue({ success: false });

      const result = await tokenManager.validateToken('invalid-token');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Token authentication failed');
    });

    it('should handle validation errors', async () => {
      mockClient.testConnection.mockRejectedValue(new Error('Network error'));

      const result = await tokenManager.validateToken('error-token');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });

  describe('Token Storage', () => {
    it('should store valid token successfully', async () => {
      // Mock successful validation
      mockClient.testConnection.mockResolvedValue({
        success: true,
        user: { login: 'testuser', id: 123, name: 'Test User', email: 'test@example.com' }
      });

      // Mock database query
      (db.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 1 });

      const result = await tokenManager.storeToken('teacher-123', 'valid-token');

      expect(result).toBe(true);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO github_tokens'),
        expect.arrayContaining(['teacher-123'])
      );
    });

    it('should reject invalid token storage', async () => {
      mockClient.testConnection.mockResolvedValue({ success: false });

      const result = await tokenManager.storeToken('teacher-123', 'invalid-token');

      expect(result).toBe(false);
      expect(db.query).not.toHaveBeenCalled();
    });

    it('should handle database errors during storage', async () => {
      mockClient.testConnection.mockResolvedValue({
        success: true,
        user: { login: 'testuser', id: 123, name: 'Test User', email: 'test@example.com' }
      });
      (db.query as jest.Mock).mockRejectedValue(new Error('Database error'));

      const result = await tokenManager.storeToken('teacher-123', 'valid-token');

      expect(result).toBe(false);
    });
  });

  describe('Token Retrieval', () => {
    it('should retrieve and decrypt token successfully', async () => {
      const mockDbResult = {
        rows: [{
          encrypted_token: 'encrypted-part-final:test-iv:test-hmac-tag',
          is_active: true,
          last_validated: new Date(Date.now() - 1000 * 60 * 60) // 1 hour ago
        }]
      };
      
      (db.query as jest.Mock).mockResolvedValue(mockDbResult);

      const result = await tokenManager.getToken('teacher-123');

      expect(result).toBe('decrypted-part-final');
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT encrypted_token'),
        ['teacher-123']
      );
    });

    it('should return null when no token found', async () => {
      (db.query as jest.Mock).mockResolvedValue({ rows: [] });

      const result = await tokenManager.getToken('teacher-456');

      expect(result).toBeNull();
    });

    it('should revalidate old tokens', async () => {
      const mockDbResult = {
        rows: [{
          encrypted_token: 'encrypted-part-final:test-iv:test-hmac-tag',
          is_active: true,
          last_validated: new Date(Date.now() - 1000 * 60 * 60 * 25) // 25 hours ago
        }]
      };
      
      (db.query as jest.Mock)
        .mockResolvedValueOnce(mockDbResult) // Initial query
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // Update query

      mockClient.testConnection.mockResolvedValue({
        success: true,
        user: { login: 'testuser', id: 123, name: 'Test User', email: 'test@example.com' }
      });

      const result = await tokenManager.getToken('teacher-123');

      expect(result).toBe('decrypted-part-final');
      expect(mockClient.testConnection).toHaveBeenCalled();
    });

    it('should deactivate invalid tokens during revalidation', async () => {
      const mockDbResult = {
        rows: [{
          encrypted_token: 'encrypted-part-final:test-iv:test-hmac-tag',
          is_active: true,
          last_validated: new Date(Date.now() - 1000 * 60 * 60 * 25) // 25 hours ago
        }]
      };
      
      (db.query as jest.Mock)
        .mockResolvedValueOnce(mockDbResult) // Initial query
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // Deactivate query

      mockClient.testConnection.mockResolvedValue({ success: false });

      const result = await tokenManager.getToken('teacher-123');

      expect(result).toBeNull();
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE github_tokens'),
        expect.arrayContaining(['teacher-123'])
      );
    });

    it('should handle decryption errors', async () => {
      const mockDbResult = {
        rows: [{
          encrypted_token: 'invalid-format',
          is_active: true,
          last_validated: new Date()
        }]
      };
      
      (db.query as jest.Mock).mockResolvedValue(mockDbResult);

      const result = await tokenManager.getToken('teacher-123');

      expect(result).toBeNull();
    });
  });

  describe('Token Management', () => {
    it('should deactivate token successfully', async () => {
      (db.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 1 });

      const result = await tokenManager.deactivateToken('teacher-123');

      expect(result).toBe(true);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE github_tokens'),
        ['teacher-123']
      );
    });

    it('should handle deactivation when no token exists', async () => {
      (db.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 0 });

      const result = await tokenManager.deactivateToken('teacher-456');

      expect(result).toBe(false);
    });

    it('should delete token successfully', async () => {
      (db.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 1 });

      const result = await tokenManager.deleteToken('teacher-123');

      expect(result).toBe(true);
      expect(db.query).toHaveBeenCalledWith(
        'DELETE FROM github_tokens WHERE teacher_id = $1',
        ['teacher-123']
      );
    });

    it('should get token info without exposing encrypted token', async () => {
      const mockDbResult = {
        rows: [{
          id: 1,
          teacher_id: 'teacher-123',
          token_scope: ['repo'],
          is_active: true,
          last_validated: new Date(),
          created_at: new Date(),
          updated_at: new Date()
        }]
      };
      
      (db.query as jest.Mock).mockResolvedValue(mockDbResult);

      const result = await tokenManager.getTokenInfo('teacher-123');

      expect(result).toBeDefined();
      expect(result?.teacherId).toBe('teacher-123');
      expect(result?.isActive).toBe(true);
      expect((result as any).encryptedToken).toBeUndefined();
    });

    it('should return null when no token info found', async () => {
      (db.query as jest.Mock).mockResolvedValue({ rows: [] });

      const result = await tokenManager.getTokenInfo('teacher-456');

      expect(result).toBeNull();
    });
  });

  describe('Authenticated Client', () => {
    it('should return authenticated client with valid token', async () => {
      const mockDbResult = {
        rows: [{
          encrypted_token: 'encrypted-part-final:test-iv:test-hmac-tag',
          is_active: true,
          last_validated: new Date()
        }]
      };
      
      (db.query as jest.Mock).mockResolvedValue(mockDbResult);

      const result = await tokenManager.getAuthenticatedClient('teacher-123');

      expect(result).toBeInstanceOf(GitHubClient);
    });

    it('should return null when no valid token available', async () => {
      (db.query as jest.Mock).mockResolvedValue({ rows: [] });

      const result = await tokenManager.getAuthenticatedClient('teacher-456');

      expect(result).toBeNull();
    });
  });

  describe('Test Stored Token', () => {
    it('should test stored token successfully', async () => {
      const mockDbResult = {
        rows: [{
          encrypted_token: 'encrypted-part-final:test-iv:test-hmac-tag',
          is_active: true,
          last_validated: new Date()
        }]
      };
      
      (db.query as jest.Mock).mockResolvedValue(mockDbResult);
      mockClient.testConnection.mockResolvedValue({
        success: true,
        user: { login: 'testuser', id: 123, name: 'Test User', email: 'test@example.com' }
      });

      const result = await tokenManager.testStoredToken('teacher-123');

      expect(result.isValid).toBe(true);
      expect(result.user?.login).toBe('testuser');
    });

    it('should handle missing stored token', async () => {
      (db.query as jest.Mock).mockResolvedValue({ rows: [] });

      const result = await tokenManager.testStoredToken('teacher-456');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('No token found for teacher');
    });
  });

  describe('Encryption/Decryption', () => {
    it('should handle encryption errors gracefully', async () => {
      (crypto.createCipher as jest.Mock).mockImplementation(() => {
        throw new Error('Encryption failed');
      });

      mockClient.testConnection.mockResolvedValue({
        success: true,
        user: { login: 'testuser', id: 123, name: 'Test User', email: 'test@example.com' }
      });

      const result = await tokenManager.storeToken('teacher-123', 'valid-token');

      expect(result).toBe(false);
    });

    it('should handle decryption integrity check failure', async () => {
      const mockDbResult = {
        rows: [{
          encrypted_token: 'encrypted-part-final:test-iv:wrong-tag',
          is_active: true,
          last_validated: new Date()
        }]
      };
      
      (db.query as jest.Mock).mockResolvedValue(mockDbResult);

      const result = await tokenManager.getToken('teacher-123');

      expect(result).toBeNull();
    });
  });
});