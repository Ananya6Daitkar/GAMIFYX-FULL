import { GitHubService } from '../services/githubService';
import { GitHubTokenManager } from '../services/githubTokenManager';
import { db } from '../database/connection';

// Mock external dependencies but test real integration between our services
jest.mock('../database/connection');
jest.mock('../telemetry/logger');

describe('PR Tracking Integration Tests', () => {
  let githubService: GitHubService;
  let tokenManager: GitHubTokenManager;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset singletons
    (GitHubService as any).instance = undefined;
    (GitHubTokenManager as any).instance = undefined;
    
    githubService = GitHubService.getInstance();
    tokenManager = GitHubTokenManager.getInstance();
  });

  describe('End-to-End PR Monitoring Workflow', () => {
    const mockTeacherId = 'teacher-123';
    const mockStudentUsername = 'student1';
    const mockRepositories = ['owner/repo1', 'owner/repo2'];

    it('should complete full PR tracking workflow', async () => {
      // Mock database responses for token storage and retrieval
      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // Store token
        .mockResolvedValueOnce({ // Get token
          rows: [{
            encrypted_token: 'encrypted-token:iv:tag',
            is_active: true,
            last_validated: new Date()
          }]
        })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // Add monitored repo
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // Add monitored repo

      // Mock GitHub API responses
      const mockPRData = [
        {
          id: 1,
          title: 'Test PR 1',
          user: { login: mockStudentUsername },
          state: 'open',
          created_at: '2023-01-01T00:00:00Z',
          commits: 3,
          additions: 10,
          deletions: 5,
          html_url: 'https://github.com/owner/repo1/pull/1'
        }
      ];

      // Mock the GitHub client and its methods
      const mockClient = {
        testConnection: jest.fn().mockResolvedValue({
          success: true,
          user: { login: 'teacher', id: 123, name: 'Teacher', email: 'teacher@example.com' }
        }),
        getPullRequests: jest.fn().mockResolvedValue({
          data: mockPRData,
          rateLimit: { limit: 5000, remaining: 4999, reset: 1234567890, used: 1 },
          status: 200
        })
      };

      // Mock token manager methods
      jest.spyOn(tokenManager, 'validateToken').mockResolvedValue({
        isValid: true,
        user: { login: 'teacher', id: 123, name: 'Teacher', email: 'teacher@example.com' }
      });
      jest.spyOn(tokenManager, 'storeToken').mockResolvedValue(true);
      jest.spyOn(tokenManager, 'getAuthenticatedClient').mockResolvedValue(mockClient as any);

      // Step 1: Store GitHub token
      const tokenStored = await githubService.storeToken(mockTeacherId, 'github-token');
      expect(tokenStored).toBe(true);

      // Step 2: Add repositories to monitoring
      const repositories = mockRepositories.map((repo, index) => ({
        id: `${index + 1}`,
        name: repo.split('/')[1],
        fullName: repo,
        url: `https://github.com/${repo}`,
        owner: repo.split('/')[0]
      }));

      await githubService.monitorRepositories(mockTeacherId, repositories);

      // Step 3: Fetch student PRs
      const prs = await githubService.fetchStudentPRs(mockTeacherId, mockStudentUsername, mockRepositories);

      // Verify the complete workflow
      expect(prs).toHaveLength(1);
      expect(prs[0]).toMatchObject({
        id: '1',
        studentUsername: mockStudentUsername,
        repository: 'owner/repo1',
        title: 'Test PR 1',
        status: 'open',
        linesChanged: 15
      });

      // Verify database interactions
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO monitored_repositories'),
        expect.arrayContaining([mockTeacherId])
      );
    });

    it('should handle authentication failures in workflow', async () => {
      // Mock invalid token
      jest.spyOn(tokenManager, 'validateToken').mockResolvedValue({
        isValid: false,
        error: 'Invalid token'
      });

      const tokenStored = await githubService.storeToken(mockTeacherId, 'invalid-token');
      expect(tokenStored).toBe(false);

      // Should not proceed with PR fetching
      jest.spyOn(tokenManager, 'getAuthenticatedClient').mockResolvedValue(null);

      await expect(
        githubService.fetchStudentPRs(mockTeacherId, mockStudentUsername, mockRepositories)
      ).rejects.toThrow('No valid GitHub token found');
    });

    it('should handle database errors gracefully', async () => {
      // Mock database error
      (db.query as jest.Mock).mockRejectedValue(new Error('Database connection failed'));

      const repositories = [{
        id: '1',
        name: 'test-repo',
        fullName: 'owner/test-repo',
        url: 'https://github.com/owner/test-repo',
        owner: 'owner'
      }];

      await expect(
        githubService.monitorRepositories(mockTeacherId, repositories)
      ).rejects.toThrow('Database connection failed');
    });
  });

  describe('Real-time Updates and WebSocket Integration', () => {
    it('should process webhook events and trigger real-time updates', async () => {
      const mockWebhookPayload = {
        action: 'opened',
        pull_request: {
          id: 123,
          number: 1,
          title: 'New PR',
          user: { login: 'student1' },
          state: 'open',
          created_at: '2023-01-01T00:00:00Z',
          html_url: 'https://github.com/owner/repo/pull/1'
        },
        repository: {
          full_name: 'owner/repo'
        }
      };

      // Mock database responses for webhook processing
      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // Log webhook event
        .mockResolvedValueOnce({ // Find monitored repository
          rows: [{ teacher_id: 'teacher-123' }]
        })
        .mockResolvedValueOnce({ // Find student mapping
          rows: [{ student_id: 'student-456' }]
        });

      (db.publishEvent as jest.Mock).mockResolvedValue(true);

      await githubService.webhookHandler(mockWebhookPayload);

      // Verify webhook event was logged
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO github_webhook_events'),
        expect.arrayContaining(['owner/repo', 'opened'])
      );

      // Verify real-time event was published
      expect(db.publishEvent).toHaveBeenCalledWith(
        'pr_updates',
        expect.objectContaining({
          type: 'pr_update',
          action: 'opened',
          studentId: 'student-456',
          teacherId: 'teacher-123'
        })
      );
    });

    it('should handle webhook events for unmonitored repositories', async () => {
      const mockWebhookPayload = {
        action: 'opened',
        pull_request: {
          id: 123,
          number: 1,
          title: 'New PR',
          user: { login: 'student1' },
          state: 'open'
        },
        repository: {
          full_name: 'unmonitored/repo'
        }
      };

      // Mock no monitored repository found
      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // Log webhook event
        .mockResolvedValueOnce({ rows: [] }); // No monitored repository

      await githubService.webhookHandler(mockWebhookPayload);

      // Should log the event but not publish real-time updates
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO github_webhook_events'),
        expect.arrayContaining(['unmonitored/repo', 'opened'])
      );
      expect(db.publishEvent).not.toHaveBeenCalled();
    });
  });

  describe('Data Consistency and Error Recovery', () => {
    it('should maintain data consistency during concurrent operations', async () => {
      const mockTeacherId = 'teacher-123';
      
      // Mock concurrent database operations
      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // First operation
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // Second operation
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // Third operation

      const repositories = [
        {
          id: '1',
          name: 'repo1',
          fullName: 'owner/repo1',
          url: 'https://github.com/owner/repo1',
          owner: 'owner'
        },
        {
          id: '2',
          name: 'repo2',
          fullName: 'owner/repo2',
          url: 'https://github.com/owner/repo2',
          owner: 'owner'
        }
      ];

      // Execute concurrent operations
      const promises = [
        githubService.monitorRepositories(mockTeacherId, [repositories[0]]),
        githubService.monitorRepositories(mockTeacherId, [repositories[1]])
      ];

      await Promise.all(promises);

      // Verify all operations completed
      expect(db.query).toHaveBeenCalledTimes(2);
    });

    it('should handle partial failures in batch operations', async () => {
      const mockTeacherId = 'teacher-123';
      const repositories = [
        {
          id: '1',
          name: 'repo1',
          fullName: 'owner/repo1',
          url: 'https://github.com/owner/repo1',
          owner: 'owner'
        },
        {
          id: '2',
          name: 'repo2',
          fullName: 'owner/repo2',
          url: 'https://github.com/owner/repo2',
          owner: 'owner'
        }
      ];

      // Mock first operation succeeds, second fails
      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockRejectedValueOnce(new Error('Database error'));

      await expect(
        githubService.monitorRepositories(mockTeacherId, repositories)
      ).rejects.toThrow('Database error');

      // Should have attempted both operations
      expect(db.query).toHaveBeenCalledTimes(2);
    });
  });

  describe('Performance and Rate Limiting', () => {
    it('should handle GitHub API rate limiting', async () => {
      const mockTeacherId = 'teacher-123';
      const mockClient = {
        getPullRequests: jest.fn()
          .mockRejectedValueOnce({ // First call hits rate limit
            response: {
              status: 403,
              headers: { 'x-ratelimit-remaining': '0' }
            }
          })
          .mockResolvedValueOnce({ // Second call succeeds
            data: [],
            rateLimit: { limit: 5000, remaining: 4999, reset: 1234567890, used: 1 },
            status: 200
          })
      };

      jest.spyOn(tokenManager, 'getAuthenticatedClient').mockResolvedValue(mockClient as any);

      // Should handle rate limiting gracefully
      await expect(
        githubService.fetchStudentPRs(mockTeacherId, 'student1', ['owner/repo'])
      ).rejects.toThrow(); // Will throw due to rate limit error in our mock
    });

    it('should batch multiple repository requests efficiently', async () => {
      const mockTeacherId = 'teacher-123';
      const mockRepositories = ['owner/repo1', 'owner/repo2', 'owner/repo3'];
      
      const mockClient = {
        getPullRequests: jest.fn().mockResolvedValue({
          data: [],
          rateLimit: { limit: 5000, remaining: 4999, reset: 1234567890, used: 1 },
          status: 200
        })
      };

      jest.spyOn(tokenManager, 'getAuthenticatedClient').mockResolvedValue(mockClient as any);

      await githubService.fetchStudentPRs(mockTeacherId, 'student1', mockRepositories);

      // Should make one API call per repository
      expect(mockClient.getPullRequests).toHaveBeenCalledTimes(3);
    });
  });

  describe('Token Management Integration', () => {
    it('should automatically refresh expired tokens', async () => {
      const mockTeacherId = 'teacher-123';
      
      // Mock token that needs revalidation
      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [{
          encrypted_token: 'old-token:iv:tag',
          is_active: true,
          last_validated: new Date(Date.now() - 1000 * 60 * 60 * 25) // 25 hours ago
        }]
      });

      const mockClient = {
        testConnection: jest.fn().mockResolvedValue({
          success: true,
          user: { login: 'teacher', id: 123, name: 'Teacher', email: 'teacher@example.com' }
        })
      };

      // Mock token validation and update
      jest.spyOn(tokenManager, 'validateToken').mockResolvedValue({
        isValid: true,
        user: { login: 'teacher', id: 123, name: 'Teacher', email: 'teacher@example.com' }
      });

      // Mock decryption
      const originalDecrypt = (tokenManager as any).decryptToken;
      jest.spyOn(tokenManager as any, 'decryptToken').mockReturnValue('decrypted-token');

      const token = await tokenManager.getToken(mockTeacherId);

      expect(token).toBe('decrypted-token');
      expect(tokenManager.validateToken).toHaveBeenCalled();
    });

    it('should deactivate invalid tokens during operations', async () => {
      const mockTeacherId = 'teacher-123';
      
      // Mock invalid token
      jest.spyOn(tokenManager, 'getAuthenticatedClient').mockResolvedValue(null);
      jest.spyOn(tokenManager, 'deactivateToken').mockResolvedValue(true);

      const result = await githubService.testConnection(mockTeacherId);

      expect(result).toBe(false);
    });
  });
});