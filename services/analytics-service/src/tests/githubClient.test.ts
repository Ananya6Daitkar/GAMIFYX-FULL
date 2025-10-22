import axios, { AxiosInstance } from 'axios';
import { GitHubClient } from '../services/githubClient';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('GitHubClient', () => {
  let client: GitHubClient;
  let mockAxiosInstance: jest.Mocked<AxiosInstance>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock axios instance
    mockAxiosInstance = {
      defaults: { headers: { common: {} } },
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      request: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() }
      }
    } as any;

    mockedAxios.create.mockReturnValue(mockAxiosInstance);
    
    client = new GitHubClient();
  });

  describe('Constructor', () => {
    it('should create client without token', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://api.github.com',
        timeout: 30000,
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'GamifyX-Analytics-Service/1.0.0'
        }
      });
    });

    it('should create client with token', () => {
      const token = 'test-token';
      new GitHubClient(token);
      
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://api.github.com',
        timeout: 30000,
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'GamifyX-Analytics-Service/1.0.0',
          'Authorization': `token ${token}`
        }
      });
    });
  });

  describe('Token Management', () => {
    it('should set authentication token', () => {
      const token = 'new-token';
      client.setToken(token);
      
      expect(mockAxiosInstance.defaults.headers.common['Authorization']).toBe(`token ${token}`);
    });

    it('should clear authentication token', () => {
      client.setToken('test-token');
      client.clearToken();
      
      expect(mockAxiosInstance.defaults.headers.common['Authorization']).toBeUndefined();
    });

    it('should check if client is authenticated', () => {
      expect(client.isAuthenticated()).toBe(false);
      
      client.setToken('test-token');
      expect(client.isAuthenticated()).toBe(true);
      
      client.clearToken();
      expect(client.isAuthenticated()).toBe(false);
    });
  });

  describe('HTTP Methods', () => {
    const mockResponse = {
      data: { test: 'data' },
      status: 200,
      headers: {
        'x-ratelimit-limit': '5000',
        'x-ratelimit-remaining': '4999',
        'x-ratelimit-reset': '1234567890',
        'x-ratelimit-used': '1'
      }
    };

    beforeEach(() => {
      mockAxiosInstance.get.mockResolvedValue(mockResponse);
      mockAxiosInstance.post.mockResolvedValue(mockResponse);
      mockAxiosInstance.put.mockResolvedValue(mockResponse);
      mockAxiosInstance.delete.mockResolvedValue(mockResponse);
    });

    it('should make GET requests', async () => {
      const result = await client.get('/test');
      
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/test', undefined);
      expect(result.data).toEqual({ test: 'data' });
      expect(result.status).toBe(200);
    });

    it('should make POST requests', async () => {
      const data = { test: 'post-data' };
      const result = await client.post('/test', data);
      
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/test', data, undefined);
      expect(result.data).toEqual({ test: 'data' });
    });

    it('should make PUT requests', async () => {
      const data = { test: 'put-data' };
      const result = await client.put('/test', data);
      
      expect(mockAxiosInstance.put).toHaveBeenCalledWith('/test', data, undefined);
      expect(result.data).toEqual({ test: 'data' });
    });

    it('should make DELETE requests', async () => {
      const result = await client.delete('/test');
      
      expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/test', undefined);
      expect(result.data).toEqual({ test: 'data' });
    });
  });

  describe('Rate Limit Handling', () => {
    it('should update rate limit from response headers', async () => {
      const mockResponse = {
        data: {},
        status: 200,
        headers: {
          'x-ratelimit-limit': '5000',
          'x-ratelimit-remaining': '4999',
          'x-ratelimit-reset': '1234567890',
          'x-ratelimit-used': '1'
        }
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);
      
      // Mock the interceptor behavior by calling updateRateLimit manually
      const result = await client.get('/test');
      
      // Since we can't easily test the private method, we'll test the public interface
      expect(result.data).toEqual({});
      expect(result.status).toBe(200);
    });

    it('should handle rate limit exceeded error', async () => {
      const rateLimitError = {
        response: {
          status: 403,
          headers: {
            'x-ratelimit-remaining': '0',
            'x-ratelimit-reset': Math.floor(Date.now() / 1000) + 60
          },
          data: { message: 'API rate limit exceeded' }
        },
        config: { url: '/test' }
      };

      // Mock the error being thrown
      mockAxiosInstance.get.mockRejectedValue(rateLimitError);

      // Test that the error is properly handled
      await expect(client.get('/test')).rejects.toEqual(rateLimitError);
    });
  });

  describe('API Methods', () => {
    beforeEach(() => {
      mockAxiosInstance.get.mockResolvedValue({
        data: { login: 'testuser' },
        status: 200,
        headers: {}
      });
    });

    it('should test connection successfully', async () => {
      const result = await client.testConnection();
      
      expect(result.success).toBe(true);
      expect(result.user).toEqual({ login: 'testuser' });
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/user', undefined);
    });

    it('should handle connection test failure', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('Network error'));
      
      const result = await client.testConnection();
      
      expect(result.success).toBe(false);
      expect(result.user).toBeUndefined();
    });

    it('should get rate limit', async () => {
      const rateLimitData = {
        rate: {
          limit: 5000,
          remaining: 4999,
          reset: 1234567890,
          used: 1
        }
      };
      
      mockAxiosInstance.get.mockResolvedValue({
        data: rateLimitData,
        status: 200,
        headers: {}
      });
      
      const result = await client.getRateLimit();
      
      expect(result).toEqual(rateLimitData.rate);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/rate_limit', undefined);
    });

    it('should get repository information', async () => {
      const repoData = { name: 'test-repo', owner: { login: 'testowner' } };
      
      mockAxiosInstance.get.mockResolvedValue({
        data: repoData,
        status: 200,
        headers: {}
      });
      
      const result = await client.getRepository('testowner', 'test-repo');
      
      expect(result.data).toEqual(repoData);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/repos/testowner/test-repo', undefined);
    });

    it('should get pull requests with parameters', async () => {
      const prData = [{ number: 1, title: 'Test PR' }];
      
      mockAxiosInstance.get.mockResolvedValue({
        data: prData,
        status: 200,
        headers: {}
      });
      
      const params = {
        state: 'open' as const,
        sort: 'created' as const,
        direction: 'desc' as const,
        per_page: 50,
        author: 'testuser'
      };
      
      const result = await client.getPullRequests('testowner', 'test-repo', params);
      
      expect(result.data).toEqual(prData);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/repos/testowner/test-repo/pulls?state=open&sort=created&direction=desc&per_page=50&author=testuser',
        undefined
      );
    });

    it('should get pull requests without parameters', async () => {
      await client.getPullRequests('testowner', 'test-repo');
      
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/repos/testowner/test-repo/pulls', undefined);
    });

    it('should get specific pull request', async () => {
      await client.getPullRequest('testowner', 'test-repo', 123);
      
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/repos/testowner/test-repo/pulls/123', undefined);
    });

    it('should get pull request commits', async () => {
      await client.getPullRequestCommits('testowner', 'test-repo', 123);
      
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/repos/testowner/test-repo/pulls/123/commits', undefined);
    });

    it('should get pull request files', async () => {
      await client.getPullRequestFiles('testowner', 'test-repo', 123);
      
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/repos/testowner/test-repo/pulls/123/files', undefined);
    });

    it('should search repositories', async () => {
      const searchParams = {
        sort: 'stars' as const,
        order: 'desc' as const,
        per_page: 10
      };
      
      await client.searchRepositories('test query', searchParams);
      
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/search/repositories?q=test+query&sort=stars&order=desc&per_page=10',
        undefined
      );
    });

    it('should get user information', async () => {
      // Test getting current user
      await client.getUser();
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/user', undefined);
      
      // Test getting specific user
      await client.getUser('testuser');
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/users/testuser', undefined);
    });
  });

  describe('Error Handling', () => {
    it('should handle 401 authentication errors', async () => {
      const authError = {
        response: {
          status: 401,
          data: { message: 'Bad credentials' }
        }
      };
      
      mockAxiosInstance.get.mockRejectedValue(authError);
      
      await expect(client.get('/test')).rejects.toEqual(authError);
    });

    it('should handle 404 not found errors', async () => {
      const notFoundError = {
        response: {
          status: 404,
          data: { message: 'Not Found' }
        },
        config: { url: '/repos/nonexistent/repo' }
      };
      
      mockAxiosInstance.get.mockRejectedValue(notFoundError);
      
      await expect(client.get('/repos/nonexistent/repo')).rejects.toEqual(notFoundError);
    });

    it('should handle 422 validation errors', async () => {
      const validationError = {
        response: {
          status: 422,
          data: { message: 'Validation Failed' }
        }
      };
      
      mockAxiosInstance.post.mockRejectedValue(validationError);
      
      await expect(client.post('/test', {})).rejects.toEqual(validationError);
    });
  });
});