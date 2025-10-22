import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { logger } from '../telemetry/logger';

export interface GitHubRateLimit {
  limit: number;
  remaining: number;
  reset: number;
  used: number;
}

export interface GitHubApiResponse<T = any> {
  data: T;
  rateLimit: GitHubRateLimit;
  status: number;
}

/**
 * GitHub API Client with built-in rate limiting and error handling
 */
export class GitHubClient {
  private client: AxiosInstance;
  private currentRateLimit: GitHubRateLimit | null = null;
  // Note: Request queue functionality can be implemented later if needed
  // private requestQueue: Array<{
  //   config: AxiosRequestConfig;
  //   resolve: (value: any) => void;
  //   reject: (reason: any) => void;
  // }> = [];
  // private isProcessingQueue = false;

  constructor(token?: string) {
    this.client = axios.create({
      baseURL: 'https://api.github.com',
      timeout: 30000,
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'GamifyX-Analytics-Service/1.0.0',
        ...(token && { 'Authorization': `token ${token}` })
      }
    });

    this.setupInterceptors();
  }

  /**
   * Set authentication token
   */
  public setToken(token: string): void {
    this.client.defaults.headers.common['Authorization'] = `token ${token}`;
  }

  /**
   * Remove authentication token
   */
  public clearToken(): void {
    delete this.client.defaults.headers.common['Authorization'];
  }

  /**
   * Setup request and response interceptors
   */
  private setupInterceptors(): void {
    // Request interceptor for rate limiting
    this.client.interceptors.request.use(
      async (config) => {
        await this.checkRateLimit();
        return config;
      },
      (error) => {
        logger.error('GitHub API request interceptor error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor for rate limit tracking and error handling
    this.client.interceptors.response.use(
      (response) => {
        this.updateRateLimit(response.headers);
        return response;
      },
      async (error) => {
        if (error.response) {
          this.updateRateLimit(error.response.headers);
          
          // Handle rate limit exceeded
          if (error.response.status === 403 && 
              error.response.headers['x-ratelimit-remaining'] === '0') {
            logger.warn('GitHub API rate limit exceeded');
            await this.handleRateLimitExceeded();
            // Retry the request after waiting
            return this.client.request(error.config);
          }

          // Handle other GitHub API errors
          this.handleApiError(error);
        }
        
        return Promise.reject(error);
      }
    );
  }

  /**
   * Update rate limit information from response headers
   */
  private updateRateLimit(headers: any): void {
    if (headers['x-ratelimit-limit'] && 
        headers['x-ratelimit-remaining'] && 
        headers['x-ratelimit-reset']) {
      
      this.currentRateLimit = {
        limit: parseInt(headers['x-ratelimit-limit']),
        remaining: parseInt(headers['x-ratelimit-remaining']),
        reset: parseInt(headers['x-ratelimit-reset']),
        used: parseInt(headers['x-ratelimit-used'] || '0')
      };

      logger.debug('GitHub rate limit updated:', this.currentRateLimit);
    }
  }

  /**
   * Check if we can make a request without hitting rate limits
   */
  private async checkRateLimit(): Promise<void> {
    if (!this.currentRateLimit) {
      return;
    }

    // If we're close to the limit, wait for reset
    if (this.currentRateLimit.remaining <= 5) {
      const now = Math.floor(Date.now() / 1000);
      const waitTime = (this.currentRateLimit.reset - now) * 1000;
      
      if (waitTime > 0 && waitTime < 3600000) { // Don't wait more than 1 hour
        logger.info(`GitHub rate limit low (${this.currentRateLimit.remaining} remaining), waiting ${waitTime}ms`);
        await this.sleep(waitTime);
      }
    }
  }

  /**
   * Handle rate limit exceeded scenario
   */
  private async handleRateLimitExceeded(): Promise<void> {
    if (!this.currentRateLimit) {
      // If we don't have rate limit info, wait a default time
      await this.sleep(60000); // 1 minute
      return;
    }

    const now = Math.floor(Date.now() / 1000);
    const waitTime = (this.currentRateLimit.reset - now + 10) * 1000; // Add 10 seconds buffer
    
    if (waitTime > 0 && waitTime < 3600000) { // Don't wait more than 1 hour
      logger.warn(`GitHub rate limit exceeded, waiting ${waitTime}ms for reset`);
      await this.sleep(waitTime);
    }
  }

  /**
   * Handle GitHub API errors
   */
  private handleApiError(error: any): void {
    const status = error.response?.status;
    const message = error.response?.data?.message || error.message;

    switch (status) {
      case 401:
        logger.error('GitHub API authentication failed - invalid token');
        break;
      case 403:
        if (message.includes('rate limit')) {
          logger.warn('GitHub API rate limit exceeded');
        } else {
          logger.error('GitHub API access forbidden:', message);
        }
        break;
      case 404:
        logger.warn('GitHub API resource not found:', error.config?.url);
        break;
      case 422:
        logger.error('GitHub API validation failed:', message);
        break;
      default:
        logger.error(`GitHub API error (${status}):`, message);
    }
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Make a GET request to GitHub API
   */
  public async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<GitHubApiResponse<T>> {
    try {
      const response = await this.client.get<T>(url, config);
      return {
        data: response.data,
        rateLimit: this.currentRateLimit!,
        status: response.status
      };
    } catch (error) {
      logger.error(`GitHub API GET request failed for ${url}:`, error);
      throw error;
    }
  }

  /**
   * Make a POST request to GitHub API
   */
  public async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<GitHubApiResponse<T>> {
    try {
      const response = await this.client.post<T>(url, data, config);
      return {
        data: response.data,
        rateLimit: this.currentRateLimit!,
        status: response.status
      };
    } catch (error) {
      logger.error(`GitHub API POST request failed for ${url}:`, error);
      throw error;
    }
  }

  /**
   * Make a PUT request to GitHub API
   */
  public async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<GitHubApiResponse<T>> {
    try {
      const response = await this.client.put<T>(url, data, config);
      return {
        data: response.data,
        rateLimit: this.currentRateLimit!,
        status: response.status
      };
    } catch (error) {
      logger.error(`GitHub API PUT request failed for ${url}:`, error);
      throw error;
    }
  }

  /**
   * Make a DELETE request to GitHub API
   */
  public async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<GitHubApiResponse<T>> {
    try {
      const response = await this.client.delete<T>(url, config);
      return {
        data: response.data,
        rateLimit: this.currentRateLimit!,
        status: response.status
      };
    } catch (error) {
      logger.error(`GitHub API DELETE request failed for ${url}:`, error);
      throw error;
    }
  }

  /**
   * Test API connectivity and authentication
   */
  public async testConnection(): Promise<{ success: boolean; user?: any; rateLimit?: GitHubRateLimit }> {
    try {
      const response = await this.get('/user');
      return {
        success: true,
        user: response.data,
        rateLimit: response.rateLimit
      };
    } catch (error) {
      logger.error('GitHub API connection test failed:', error);
      return { success: false };
    }
  }

  /**
   * Get current rate limit status
   */
  public async getRateLimit(): Promise<GitHubRateLimit> {
    try {
      const response = await this.get('/rate_limit');
      return response.data.rate;
    } catch (error) {
      logger.error('Failed to get GitHub rate limit:', error);
      throw error;
    }
  }

  /**
   * Get current rate limit info (cached)
   */
  public getCurrentRateLimit(): GitHubRateLimit | null {
    return this.currentRateLimit;
  }

  /**
   * Check if client is authenticated
   */
  public isAuthenticated(): boolean {
    return !!this.client.defaults.headers.common['Authorization'];
  }

  /**
   * Get repository information
   */
  public async getRepository(owner: string, repo: string) {
    return this.get(`/repos/${owner}/${repo}`);
  }

  /**
   * Get pull requests for a repository
   */
  public async getPullRequests(owner: string, repo: string, params?: {
    state?: 'open' | 'closed' | 'all';
    sort?: 'created' | 'updated' | 'popularity';
    direction?: 'asc' | 'desc';
    per_page?: number;
    page?: number;
    author?: string;
  }) {
    const queryParams = new URLSearchParams();
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }

    const url = `/repos/${owner}/${repo}/pulls${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    return this.get(url);
  }

  /**
   * Get a specific pull request
   */
  public async getPullRequest(owner: string, repo: string, pullNumber: number) {
    return this.get(`/repos/${owner}/${repo}/pulls/${pullNumber}`);
  }

  /**
   * Get commits for a pull request
   */
  public async getPullRequestCommits(owner: string, repo: string, pullNumber: number) {
    return this.get(`/repos/${owner}/${repo}/pulls/${pullNumber}/commits`);
  }

  /**
   * Get files changed in a pull request
   */
  public async getPullRequestFiles(owner: string, repo: string, pullNumber: number) {
    return this.get(`/repos/${owner}/${repo}/pulls/${pullNumber}/files`);
  }

  /**
   * Search repositories
   */
  public async searchRepositories(query: string, params?: {
    sort?: 'stars' | 'forks' | 'help-wanted-issues' | 'updated';
    order?: 'asc' | 'desc';
    per_page?: number;
    page?: number;
  }) {
    const queryParams = new URLSearchParams({ q: query });
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }

    return this.get(`/search/repositories?${queryParams.toString()}`);
  }

  /**
   * Get user information
   */
  public async getUser(username?: string) {
    const url = username ? `/users/${username}` : '/user';
    return this.get(url);
  }
}