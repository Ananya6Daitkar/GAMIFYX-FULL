import { GitHubService, Repository } from '../services/githubService';
import { GitHubTokenManager } from '../services/githubTokenManager';
import { GitHubClient } from '../services/githubClient';
import { db } from '../database/connection';

// Mock dependencies
jest.mock('../services/githubTokenManager');
jest.mock('../services/githubClient');
jest.mock('../database/connection');

describe('GitHubService', () => {
  let githubService: GitHubService;
  let mockTokenManager: jest.Mocked<GitHubTokenManager>;
  let mockClient: jest.Mocked<GitHubClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset singleton instance
    (GitHubService as any).instance = undefined;
    
    // Create mocked instances
    mockTokenManager = {
      validateToken: jest.fn(),
      storeToken: jest.fn(),
      getToken: jest.fn(),
      getAuthenticatedClient: jest.fn(),
    } as any;

    mockClient = {
      getPullRequests: jest.fn(),
      getRateLimit: jest.fn(),
      testConnection: jest.fn(),
    } as any;

    // Mock GitHubTokenManager.getInstance()
    (GitHubTokenManager.getInstance as jest.Mock).mockReturnValue(mockTokenManager);
    
    githubService = GitHubService.getInstance();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = GitHubService.getInstance();
      const instance2 = GitHubService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('authenticateWithToken', () => {
    it('should return true for valid token', async () => {
      mockTokenManager.validateToken.mockResolvedValue({ isValid: true });

      const result = await githubService.authenticateWithToken('valid-token');

      expect(result).toBe(true);
      expect(mockTokenManager.validateToken).toHaveBeenCalledWith('valid-token');
    });

    it('should return false for invalid token', async () => {
      mockTokenManager.validateToken.mockResolvedValue({ 
        isValid: false, 
        error: 'Invalid token' 
      });

      const result = await githubService.authenticateWithToken('invalid-token');

      expect(result).toBe(false);
      expect(mockTokenManager.validateToken).toHaveBeenCalledWith('invalid-token');
    });

    it('should handle authentication errors gracefully', async () => {
      mockTokenManager.validateToken.mockRejectedValue(new Error('Network error'));

      const result = await githubService.authenticateWithToken('error-token');

      expect(result).toBe(false);
    });
  });

  describe('storeToken', () => {
    it('should store token successfully', async () => {
      mockTokenManager.storeToken.mockResolvedValue(true);

      const result = await githubService.storeToken('teacher-123', 'github-token');

      expect(result).toBe(true);
      expect(mockTokenManager.storeToken).toHaveBeenCalledWith('teacher-123', 'github-token');
    });

    it('should handle storage failures', async () => {
      mockTokenManager.storeToken.mockResolvedValue(false);

      const result = await githubService.storeToken('teacher-123', 'invalid-token');

      expect(result).toBe(false);
    });
  });

  describe('getToken', () => {
    it('should retrieve token successfully', async () => {
      const expectedToken = 'decrypted-token';
      mockTokenManager.getToken.mockResolvedValue(expectedToken);

      const result = await githubService.getToken('teacher-123');

      expect(result).toBe(expectedToken);
      expect(mockTokenManager.getToken).toHaveBeenCalledWith('teacher-123');
    });

    it('should return null when no token found', async () => {
      mockTokenManager.getToken.mockResolvedValue(null);

      const result = await githubService.getToken('teacher-456');

      expect(result).toBeNull();
    });
  });

  describe('validateToken', () => {
    it('should validate token and return result', async () => {
      const validationResult = {
        isValid: true,
        user: { login: 'testuser', id: 123, name: 'Test User', email: 'test@example.com' }
      };
      mockTokenManager.validateToken.mockResolvedValue(validationResult);

      const result = await githubService.validateToken('test-token');

      expect(result).toEqual(validationResult);
      expect(mockTokenManager.validateToken).toHaveBeenCalledWith('test-token');
    });
  });

  describe('fetchStudentPRs', () => {
    const mockPRData = [
      {
        id: 1,
        title: 'Test PR',
        user: { login: 'student1' },
        state: 'open',
        created_at: '2023-01-01T00:00:00Z',
        commits: 3,
        additions: 10,
        deletions: 5,
        html_url: 'https://github.com/owner/repo/pull/1'
      }
    ];

    it('should fetch PRs successfully', async () => {
      mockTokenManager.getAuthenticatedClient.mockResolvedValue(mockClient);
      mockClient.getPullRequests.mockResolvedValue({
        data: mockPRData,
        rateLimit: { limit: 5000, remaining: 4999, reset: 1234567890, used: 1 },
        status: 200
      });

      const result = await githubService.fetchStudentPRs('teacher-123', 'student1', ['owner/repo']);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: '1',
        studentUsername: 'student1',
        repository: 'owner/repo',
        title: 'Test PR',
        status: 'open',
        commitCount: 0,
        linesChanged: 15
      });
    });

    it('should throw error when no token available', async () => {
      mockTokenManager.getAuthenticatedClient.mockResolvedValue(null);

      await expect(
        githubService.fetchStudentPRs('teacher-123', 'student1', ['owner/repo'])
      ).rejects.toThrow('No valid GitHub token found for teacher teacher-123');
    });

    it('should handle API errors gracefully', async () => {
      mockTokenManager.getAuthenticatedClient.mockResolvedValue(mockClient);
      mockClient.getPullRequests.mockRejectedValue(new Error('API Error'));

      await expect(
        githubService.fetchStudentPRs('teacher-123', 'student1', ['owner/repo'])
      ).rejects.toThrow('API Error');
    });

    it('should handle invalid repository format', async () => {
      mockTokenManager.getAuthenticatedClient.mockResolvedValue(mockClient);

      await expect(
        githubService.fetchStudentPRs('teacher-123', 'student1', ['invalid-repo'])
      ).rejects.toThrow('Invalid repository format: invalid-repo');
    });
  });

  describe('getRateLimitInfo', () => {
    it('should return rate limit info', async () => {
      const rateLimitInfo = { limit: 5000, remaining: 4999, reset: 1234567890, used: 1 };
      mockTokenManager.getAuthenticatedClient.mockResolvedValue(mockClient);
      mockClient.getRateLimit.mockResolvedValue(rateLimitInfo);

      const result = await githubService.getRateLimitInfo('teacher-123');

      expect(result).toEqual(rateLimitInfo);
    });

    it('should return null when no client available', async () => {
      mockTokenManager.getAuthenticatedClient.mockResolvedValue(null);

      const result = await githubService.getRateLimitInfo('teacher-123');

      expect(result).toBeNull();
    });
  });

  describe('testConnection', () => {
    it('should return true for successful connection', async () => {
      mockTokenManager.getAuthenticatedClient.mockResolvedValue(mockClient);
      mockClient.testConnection.mockResolvedValue({ success: true });

      const result = await githubService.testConnection('teacher-123');

      expect(result).toBe(true);
    });

    it('should return false for failed connection', async () => {
      mockTokenManager.getAuthenticatedClient.mockResolvedValue(mockClient);
      mockClient.testConnection.mockResolvedValue({ success: false });

      const result = await githubService.testConnection('teacher-123');

      expect(result).toBe(false);
    });

    it('should return false when no client available', async () => {
      mockTokenManager.getAuthenticatedClient.mockResolvedValue(null);

      const result = await githubService.testConnection('teacher-123');

      expect(result).toBe(false);
    });
  });

  describe('monitorRepositories', () => {
    const mockRepositories: Repository[] = [
      {
        id: '1',
        name: 'test-repo',
        fullName: 'owner/test-repo',
        url: 'https://github.com/owner/test-repo',
        owner: 'owner'
      }
    ];

    it('should add repositories to monitoring', async () => {
      (db.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 1 });

      await githubService.monitorRepositories('teacher-123', mockRepositories);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO monitored_repositories'),
        expect.arrayContaining(['teacher-123', mockRepositories[0]?.url])
      );
    });

    it('should handle database errors', async () => {
      (db.query as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(
        githubService.monitorRepositories('teacher-123', mockRepositories)
      ).rejects.toThrow('Database error');
    });
  });

  describe('webhookHandler', () => {
    const mockWebhookPayload = {
      action: 'opened',
      pull_request: {
        id: 123,
        number: 1,
        title: 'Test PR',
        user: { login: 'student1' },
        state: 'open',
        created_at: '2023-01-01T00:00:00Z',
        html_url: 'https://github.com/owner/repo/pull/1'
      },
      repository: {
        full_name: 'owner/repo'
      }
    };

    it('should handle webhook payload successfully', async () => {
      (db.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 1 });
      (db.publishEvent as jest.Mock).mockResolvedValue(true);

      await githubService.webhookHandler(mockWebhookPayload);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO github_webhook_events'),
        expect.arrayContaining(['owner/repo', 'opened'])
      );
    });

    it('should handle webhook without pull request', async () => {
      const payloadWithoutPR = {
        action: 'push',
        repository: { full_name: 'owner/repo' }
      };

      (db.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 1 });

      await githubService.webhookHandler(payloadWithoutPR);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO github_webhook_events'),
        expect.arrayContaining(['owner/repo', 'push'])
      );
    });

    it('should handle database errors in webhook processing', async () => {
      (db.query as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(
        githubService.webhookHandler(mockWebhookPayload)
      ).rejects.toThrow('Database error');
    });
  });
});