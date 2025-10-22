import { logger } from '../telemetry/logger';
import { db } from '../database/connection';
import { GitHubClient } from './githubClient';
import { GitHubTokenManager, TokenValidationResult } from './githubTokenManager';

export interface PullRequest {
  id: string;
  studentUsername: string;
  repository: string;
  title: string;
  createdAt: Date;
  status: 'open' | 'closed' | 'merged';
  commitCount: number;
  linesChanged: number;
  url: string;
}

export interface Repository {
  id: string;
  name: string;
  fullName: string;
  url: string;
  owner: string;
}

export interface GitHubWebhookPayload {
  action: string;
  pull_request?: any;
  repository?: any;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetTime: Date;
}

/**
 * GitHub Integration Service
 * Handles GitHub API interactions with authentication, rate limiting, and secure token management
 */
export class GitHubService {
  private static instance: GitHubService;
  private tokenManager: GitHubTokenManager;

  private constructor() {
    this.tokenManager = GitHubTokenManager.getInstance();
  }

  public static getInstance(): GitHubService {
    if (!GitHubService.instance) {
      GitHubService.instance = new GitHubService();
    }
    return GitHubService.instance;
  }

  /**
   * Authenticate with GitHub using a personal access token
   */
  public async authenticateWithToken(token: string): Promise<boolean> {
    try {
      const validation = await this.tokenManager.validateToken(token);
      return validation.isValid;
    } catch (error) {
      logger.error('GitHub authentication failed:', error);
      return false;
    }
  }

  /**
   * Store encrypted GitHub token in database
   */
  public async storeToken(teacherId: string, token: string): Promise<boolean> {
    return await this.tokenManager.storeToken(teacherId, token);
  }

  /**
   * Retrieve and decrypt GitHub token from database
   */
  public async getToken(teacherId: string): Promise<string | null> {
    return await this.tokenManager.getToken(teacherId);
  }

  /**
   * Validate GitHub token by testing API access
   */
  public async validateToken(token: string): Promise<TokenValidationResult> {
    return await this.tokenManager.validateToken(token);
  }

  /**
   * Fetch pull requests for a specific student from given repositories
   */
  public async fetchStudentPRs(teacherId: string, username: string, repositories: string[]): Promise<PullRequest[]> {
    const pullRequests: PullRequest[] = [];

    try {
      const client = await this.tokenManager.getAuthenticatedClient(teacherId);
      if (!client) {
        throw new Error(`No valid GitHub token found for teacher ${teacherId}`);
      }

      for (const repo of repositories) {
        const prs = await this.fetchRepositoryPRs(client, repo, username);
        pullRequests.push(...prs);
      }

      logger.info(`Fetched ${pullRequests.length} PRs for student ${username}`);
      return pullRequests;
    } catch (error) {
      logger.error(`Failed to fetch PRs for student ${username}:`, error);
      throw error;
    }
  }

  /**
   * Fetch pull requests from a specific repository
   */
  private async fetchRepositoryPRs(client: GitHubClient, repository: string, author?: string): Promise<PullRequest[]> {
    try {
      const [owner, repo] = repository.split('/');
      if (!owner || !repo) {
        throw new Error(`Invalid repository format: ${repository}`);
      }

      const params = {
        state: 'all' as const,
        per_page: 100,
        sort: 'created' as const,
        direction: 'desc' as const,
        ...(author && { author })
      };

      const response = await client.getPullRequests(owner, repo, params);
      
      const pullRequests: PullRequest[] = response.data.map((pr: any) => ({
        id: pr.id.toString(),
        studentUsername: pr.user.login,
        repository: repository,
        title: pr.title,
        createdAt: new Date(pr.created_at),
        status: pr.merged_at ? 'merged' : pr.state as 'open' | 'closed',
        commitCount: pr.commits || 0,
        linesChanged: (pr.additions || 0) + (pr.deletions || 0),
        url: pr.html_url
      }));

      return pullRequests;
    } catch (error) {
      logger.error(`Failed to fetch PRs from repository ${repository}:`, error);
      throw error;
    }
  }

  /**
   * Get current rate limit status for a teacher's token
   */
  public async getRateLimitInfo(teacherId: string): Promise<any> {
    try {
      const client = await this.tokenManager.getAuthenticatedClient(teacherId);
      if (!client) {
        return null;
      }
      return await client.getRateLimit();
    } catch (error) {
      logger.error('Failed to get rate limit info:', error);
      return null;
    }
  }

  /**
   * Test GitHub API connectivity for a teacher
   */
  public async testConnection(teacherId: string): Promise<boolean> {
    try {
      const client = await this.tokenManager.getAuthenticatedClient(teacherId);
      if (!client) {
        return false;
      }
      const result = await client.testConnection();
      return result.success;
    } catch (error) {
      logger.error('GitHub API connection test failed:', error);
      return false;
    }
  }

  /**
   * Monitor repositories for a teacher
   */
  public async monitorRepositories(teacherId: string, repositories: Repository[]): Promise<void> {
    try {
      for (const repo of repositories) {
        await this.addMonitoredRepository(teacherId, repo);
      }
      logger.info(`Added ${repositories.length} repositories to monitoring for teacher ${teacherId}`);
    } catch (error) {
      logger.error(`Failed to monitor repositories for teacher ${teacherId}:`, error);
      throw error;
    }
  }

  /**
   * Add a repository to monitoring
   */
  private async addMonitoredRepository(teacherId: string, repository: Repository): Promise<void> {
    try {
      const query = `
        INSERT INTO monitored_repositories (teacher_id, repository_url, repository_name, repository_owner, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        ON CONFLICT (teacher_id, repository_url) 
        DO UPDATE SET 
          is_active = $5,
          updated_at = NOW()
      `;
      
      await db.query(query, [teacherId, repository.url, repository.name, repository.owner, true]);
      logger.debug(`Added repository ${repository.name} to monitoring for teacher ${teacherId}`);
    } catch (error) {
      logger.error(`Failed to add repository ${repository.name} to monitoring:`, error);
      throw error;
    }
  }

  /**
   * Handle GitHub webhook payload
   */
  public async webhookHandler(payload: GitHubWebhookPayload): Promise<void> {
    try {
      // Log the webhook event
      const query = `
        INSERT INTO github_webhook_events (repository_url, event_type, action, pr_number, pr_id, sender_username, payload, received_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      `;
      
      const repositoryUrl = payload.repository?.full_name || 'unknown';
      const eventType = payload.action || 'unknown';
      const prNumber = payload.pull_request?.number || null;
      const prId = payload.pull_request?.id?.toString() || null;
      const senderUsername = payload.pull_request?.user?.login || null;
      
      await db.query(query, [
        repositoryUrl,
        eventType,
        payload.action,
        prNumber,
        prId,
        senderUsername,
        JSON.stringify(payload)
      ]);

      // Trigger real-time updates if this is a PR event
      if (payload.pull_request && payload.repository) {
        await this.handlePRWebhookEvent(payload);
      }

      logger.info(`GitHub webhook event logged: ${eventType} for repository ${repositoryUrl}`);
    } catch (error) {
      logger.error('Failed to handle GitHub webhook:', error);
      throw error;
    }
  }

  /**
   * Handle PR-specific webhook events for real-time updates
   */
  private async handlePRWebhookEvent(payload: GitHubWebhookPayload): Promise<void> {
    try {
      const pr = payload.pull_request!;
      const repository = payload.repository!;
      const action = payload.action;

      // Find the teacher and student for this repository and PR author
      const githubUsername = pr.user.login;
      const repositoryFullName = repository.full_name;

      // Get monitored repository info
      const repoQuery = `
        SELECT teacher_id 
        FROM monitored_repositories 
        WHERE repository_url LIKE $1 AND is_active = true
      `;
      const repoResult = await db.query(repoQuery, [`%${repositoryFullName}%`]);

      if (repoResult.rows.length === 0) {
        logger.debug(`Repository ${repositoryFullName} not monitored, skipping real-time update`);
        return;
      }

      const teacherId = repoResult.rows[0].teacher_id;

      // Get student mapping
      const studentQuery = `
        SELECT student_id 
        FROM student_github_profiles 
        WHERE github_username = $1 AND teacher_id = $2 AND is_verified = true
      `;
      const studentResult = await db.query(studentQuery, [githubUsername, teacherId]);

      if (studentResult.rows.length === 0) {
        logger.debug(`No student mapping found for ${githubUsername} under teacher ${teacherId}`);
        return;
      }

      const studentId = studentResult.rows[0].student_id;

      // Prepare PR data for real-time broadcast
      const prData = {
        id: pr.id.toString(),
        number: pr.number,
        title: pr.title,
        state: pr.state,
        user: pr.user.login,
        repository: repository.full_name,
        url: pr.html_url,
        createdAt: pr.created_at,
        updatedAt: pr.updated_at,
        mergedAt: pr.merged_at,
        closedAt: pr.closed_at
      };

      // Publish real-time event
      await db.publishEvent('pr_updates', {
        type: 'pr_update',
        action,
        studentId,
        teacherId,
        prData,
        timestamp: new Date().toISOString()
      });

      logger.info(`Published real-time PR update: ${action} for student ${studentId} in teacher ${teacherId}'s class`);

    } catch (error) {
      logger.error('Error handling PR webhook event for real-time updates:', error);
    }
  }
}