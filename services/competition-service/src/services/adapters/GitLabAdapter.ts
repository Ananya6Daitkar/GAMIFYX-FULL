import axios, { AxiosInstance } from 'axios';
import { logger } from '@/telemetry/logger';
import { 
  BaseExternalAPIAdapter,
  ExternalAPIConfig,
  AuthenticationResult,
  ProfileValidationResult,
  ContributionData,
  ValidationRequirements,
  ValidationResult,
  UserProfile,
  RateLimitInfo
} from './BaseExternalAPIAdapter';

/**
 * GitLab API adapter for competition integration
 * Handles GitLab OAuth, merge request tracking, and contribution validation
 */
export class GitLabAdapter extends BaseExternalAPIAdapter {
  private client: AxiosInstance;
  private clientId: string;
  private clientSecret: string;
  private baseUrl: string;

  constructor() {
    super('GitLab');
  }

  protected async setupClient(): Promise<void> {
    this.clientId = this.config.clientId;
    this.clientSecret = this.config.clientSecret;
    this.baseUrl = this.config.baseUrl || 'https://gitlab.com/api/v4';

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: this.config.timeout || 10000,
      headers: {
        'User-Agent': 'GamifyX-Competition-Service/1.0'
      }
    });

    // Add response interceptor for rate limit handling
    this.client.interceptors.response.use(
      (response) => {
        this.handleRateLimit(response);
        return response;
      },
      (error) => {
        if (error.response) {
          this.handleRateLimit(error.response);
        }
        return Promise.reject(error);
      }
    );
  }

  protected async testConnection(): Promise<void> {
    try {
      await this.client.get('/version');
      logger.debug('GitLab API connection test successful');
    } catch (error) {
      throw new Error(`GitLab API connection test failed: ${error.message}`);
    }
  }

  async authenticate(userId: string, authCode?: string): Promise<AuthenticationResult> {
    try {
      if (!authCode) {
        // Return OAuth URL for user to authenticate
        const scopes = this.config.scopes || ['read_user', 'read_api', 'read_repository'];
        const redirectUri = this.config.redirectUri || 'http://localhost:3000/auth/gitlab/callback';
        const authUrl = `${this.baseUrl.replace('/api/v4', '')}/oauth/authorize?client_id=${this.clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scopes.join(' ')}&state=${userId}`;
        
        return {
          success: false,
          error: `Please authenticate at: ${authUrl}`
        };
      }

      // Exchange auth code for access token
      const tokenResponse = await axios.post(`${this.baseUrl.replace('/api/v4', '')}/oauth/token`, {
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code: authCode,
        grant_type: 'authorization_code',
        redirect_uri: this.config.redirectUri || 'http://localhost:3000/auth/gitlab/callback'
      });

      const { access_token, refresh_token, expires_in, scope } = tokenResponse.data;

      if (!access_token) {
        return {
          success: false,
          error: 'Failed to obtain access token'
        };
      }

      // Verify token by getting user info
      const userResponse = await this.client.get('/user', {
        headers: {
          'Authorization': `Bearer ${access_token}`
        }
      });

      return {
        success: true,
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAt: expires_in ? new Date(Date.now() + expires_in * 1000) : undefined,
        scopes: scope ? scope.split(' ') : []
      };

    } catch (error) {
      this.handleAPIError(error, 'authentication');
    }
  }

  async validateProfile(username: string): Promise<ProfileValidationResult> {
    try {
      const response = await this.client.get(`/users?username=${username}`);
      const users = response.data;

      if (!users || users.length === 0) {
        return {
          valid: false,
          username,
          profileUrl: `https://gitlab.com/${username}`,
          verified: false,
          publicProfile: false,
          error: 'User not found'
        };
      }

      const user = users[0];

      return {
        valid: true,
        username: user.username,
        profileUrl: user.web_url,
        verified: true,
        publicProfile: user.state === 'active'
      };

    } catch (error) {
      if (error.response?.status === 404) {
        return {
          valid: false,
          username,
          profileUrl: `https://gitlab.com/${username}`,
          verified: false,
          publicProfile: false,
          error: 'User not found'
        };
      }
      this.handleAPIError(error, 'profile validation');
    }
  }

  async fetchContributions(username: string, startDate: Date, endDate: Date): Promise<ContributionData[]> {
    try {
      const contributions: ContributionData[] = [];

      // Get user ID first
      const userResponse = await this.client.get(`/users?username=${username}`);
      if (!userResponse.data || userResponse.data.length === 0) {
        throw new Error('User not found');
      }
      const userId = userResponse.data[0].id;

      // Fetch merge requests
      const mergeRequests = await this.fetchMergeRequests(userId, startDate, endDate);
      contributions.push(...mergeRequests);

      // Fetch issues
      const issues = await this.fetchIssues(userId, startDate, endDate);
      contributions.push(...issues);

      // Fetch commits from user's projects
      const commits = await this.fetchCommits(userId, startDate, endDate);
      contributions.push(...commits);

      logger.info(`Fetched ${contributions.length} contributions for ${username}`, {
        mergeRequests: mergeRequests.length,
        issues: issues.length,
        commits: commits.length
      });

      return contributions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    } catch (error) {
      this.handleAPIError(error, 'fetch contributions');
    }
  }

  private async fetchMergeRequests(userId: number, startDate: Date, endDate: Date): Promise<ContributionData[]> {
    const mergeRequests: ContributionData[] = [];
    let page = 1;
    const perPage = 100;

    while (true) {
      const response = await this.client.get('/merge_requests', {
        params: {
          author_id: userId,
          created_after: startDate.toISOString(),
          created_before: endDate.toISOString(),
          page,
          per_page: perPage,
          order_by: 'created_at',
          sort: 'desc'
        }
      });

      if (response.data.length === 0) break;

      for (const mr of response.data) {
        mergeRequests.push({
          id: mr.id.toString(),
          type: 'pull_request', // Map to common type
          title: mr.title,
          description: mr.description || '',
          url: mr.web_url,
          repositoryUrl: mr.project?.web_url || '',
          repositoryName: mr.project?.path_with_namespace || '',
          createdAt: new Date(mr.created_at),
          updatedAt: new Date(mr.updated_at),
          status: mr.state === 'opened' ? 'open' : (mr.state === 'merged' ? 'merged' : 'closed'),
          labels: mr.labels || [],
          metadata: {
            iid: mr.iid,
            draft: mr.draft || mr.work_in_progress,
            mergeable: mr.merge_status === 'can_be_merged',
            upvotes: mr.upvotes,
            downvotes: mr.downvotes,
            source_branch: mr.source_branch,
            target_branch: mr.target_branch,
            changes_count: mr.changes_count
          }
        });
      }

      if (response.data.length < perPage) break;
      page++;
    }

    return mergeRequests;
  }

  private async fetchIssues(userId: number, startDate: Date, endDate: Date): Promise<ContributionData[]> {
    const issues: ContributionData[] = [];
    let page = 1;
    const perPage = 100;

    while (true) {
      const response = await this.client.get('/issues', {
        params: {
          author_id: userId,
          created_after: startDate.toISOString(),
          created_before: endDate.toISOString(),
          page,
          per_page: perPage,
          order_by: 'created_at',
          sort: 'desc'
        }
      });

      if (response.data.length === 0) break;

      for (const issue of response.data) {
        issues.push({
          id: issue.id.toString(),
          type: 'issue',
          title: issue.title,
          description: issue.description || '',
          url: issue.web_url,
          repositoryUrl: issue.project?.web_url || '',
          repositoryName: issue.project?.path_with_namespace || '',
          createdAt: new Date(issue.created_at),
          updatedAt: new Date(issue.updated_at),
          status: issue.state,
          labels: issue.labels || [],
          metadata: {
            iid: issue.iid,
            upvotes: issue.upvotes,
            downvotes: issue.downvotes,
            user_notes_count: issue.user_notes_count,
            assignees: issue.assignees?.map((a: any) => a.username) || []
          }
        });
      }

      if (response.data.length < perPage) break;
      page++;
    }

    return issues;
  }

  private async fetchCommits(userId: number, startDate: Date, endDate: Date): Promise<ContributionData[]> {
    const commits: ContributionData[] = [];

    try {
      // Get user's projects
      const projectsResponse = await this.client.get(`/users/${userId}/projects`, {
        params: {
          owned: true,
          per_page: 50,
          order_by: 'last_activity_at',
          sort: 'desc'
        }
      });

      // Fetch commits from each project
      for (const project of projectsResponse.data) {
        try {
          const commitsResponse = await this.client.get(`/projects/${project.id}/repository/commits`, {
            params: {
              author: project.owner?.username,
              since: startDate.toISOString(),
              until: endDate.toISOString(),
              per_page: 100
            }
          });

          for (const commit of commitsResponse.data) {
            commits.push({
              id: commit.id,
              type: 'commit',
              title: commit.title,
              description: commit.message,
              url: commit.web_url,
              repositoryUrl: project.web_url,
              repositoryName: project.path_with_namespace,
              createdAt: new Date(commit.created_at),
              updatedAt: new Date(commit.created_at),
              status: 'merged',
              labels: [],
              metadata: {
                short_id: commit.short_id,
                author_name: commit.author_name,
                author_email: commit.author_email,
                stats: commit.stats
              }
            });
          }
        } catch (error) {
          // Skip projects we can't access
          logger.debug(`Skipping project ${project.name}: ${error.message}`);
        }
      }
    } catch (error) {
      logger.warn('Failed to fetch commits', { error: error.message });
    }

    return commits;
  }

  async validateContribution(contribution: ContributionData, requirements: ValidationRequirements): Promise<ValidationResult> {
    const reasons: string[] = [];
    let score = 0;
    const maxScore = 100;

    try {
      // Validate based on contribution type
      if (contribution.type === 'pull_request') {
        score = await this.validateMergeRequest(contribution, requirements, reasons);
      } else if (contribution.type === 'issue') {
        score = await this.validateIssue(contribution, requirements, reasons);
      } else if (contribution.type === 'commit') {
        score = await this.validateCommit(contribution, requirements, reasons);
      }

      return {
        valid: score >= 50, // 50% threshold for validity
        score,
        maxScore,
        reasons,
        metadata: {
          contributionType: contribution.type,
          validationTimestamp: new Date(),
          requirements: Object.keys(requirements)
        }
      };

    } catch (error) {
      logger.error('Contribution validation failed', { error, contributionId: contribution.id });
      return {
        valid: false,
        score: 0,
        maxScore,
        reasons: [`Validation error: ${error.message}`],
        metadata: { error: error.message }
      };
    }
  }

  private async validateMergeRequest(contribution: ContributionData, requirements: ValidationRequirements, reasons: string[]): Promise<number> {
    let score = 50; // Base score for MR

    // Check if MR is merged or approved
    if (requirements.requireApproval && contribution.status !== 'merged') {
      // GitLab doesn't have the same approval system as GitHub
      // Check upvotes as a proxy for approval
      const upvotes = contribution.metadata.upvotes || 0;
      if (upvotes > 0 || contribution.status === 'merged') {
        score += 30;
        reasons.push('Merge request has positive feedback or is merged');
      } else {
        score -= 20;
        reasons.push('Merge request lacks positive feedback');
      }
    }

    // Check if it's not a draft
    if (!contribution.metadata.draft) {
      score += 10;
      reasons.push('Not a draft merge request');
    } else {
      score -= 10;
      reasons.push('Draft merge request');
    }

    // Check changes count
    const changesCount = contribution.metadata.changes_count || 0;
    if (changesCount > 0) {
      score += 15;
      reasons.push(`Has ${changesCount} file changes`);
    }

    // Check labels
    if (requirements.excludeLabels) {
      const hasExcludedLabel = requirements.excludeLabels.some(label => 
        contribution.labels.includes(label)
      );
      if (hasExcludedLabel) {
        score -= 50;
        reasons.push('Contains excluded labels');
      }
    }

    return Math.max(0, Math.min(100, score));
  }

  private async validateIssue(contribution: ContributionData, requirements: ValidationRequirements, reasons: string[]): Promise<number> {
    let score = 30; // Base score for issue

    // Issues get points for being detailed
    if (contribution.description && contribution.description.length > 50) {
      score += 20;
      reasons.push('Detailed issue description');
    }

    // Check if issue has engagement
    const notesCount = contribution.metadata.user_notes_count || 0;
    if (notesCount > 0) {
      score += 15;
      reasons.push('Issue has community engagement');
    }

    // Check upvotes
    const upvotes = contribution.metadata.upvotes || 0;
    if (upvotes > 0) {
      score += 10;
      reasons.push('Issue has positive feedback');
    }

    return Math.max(0, Math.min(100, score));
  }

  private async validateCommit(contribution: ContributionData, requirements: ValidationRequirements, reasons: string[]): Promise<number> {
    let score = 20; // Base score for commit

    // Check commit message quality
    if (contribution.title.length > 10 && !contribution.title.startsWith('Update ')) {
      score += 15;
      reasons.push('Good commit message');
    }

    // Check if commit has stats
    if (contribution.metadata.stats) {
      score += 15;
      reasons.push('Commit has file changes');
    }

    return Math.max(0, Math.min(100, score));
  }

  async getUserProfile(username: string): Promise<UserProfile> {
    try {
      const response = await this.client.get(`/users?username=${username}`);
      
      if (!response.data || response.data.length === 0) {
        throw new Error('User not found');
      }

      const user = response.data[0];

      return {
        username: user.username,
        displayName: user.name || user.username,
        avatarUrl: user.avatar_url,
        profileUrl: user.web_url,
        bio: user.bio,
        location: user.location,
        company: user.organization,
        email: user.public_email,
        publicRepos: 0, // GitLab doesn't provide this in user endpoint
        followers: 0, // GitLab doesn't provide this
        following: 0, // GitLab doesn't provide this
        createdAt: new Date(user.created_at),
        verified: user.state === 'active'
      };

    } catch (error) {
      this.handleAPIError(error, 'get user profile');
    }
  }

  async getRateLimit(): Promise<RateLimitInfo> {
    // GitLab doesn't have a dedicated rate limit endpoint
    // Return cached rate limit info from response headers
    return this.rateLimitInfo;
  }

  protected async handleRateLimit(response: any): Promise<void> {
    if (response.headers) {
      // GitLab uses different header names
      this.rateLimitInfo = {
        limit: parseInt(response.headers['ratelimit-limit'] || '0'),
        remaining: parseInt(response.headers['ratelimit-remaining'] || '0'),
        resetTime: response.headers['ratelimit-reset'] 
          ? new Date(parseInt(response.headers['ratelimit-reset']) * 1000)
          : new Date()
      };

      if (this.rateLimitInfo.remaining < 10) {
        logger.warn(`${this.platform} API rate limit approaching`, {
          remaining: this.rateLimitInfo.remaining,
          resetTime: this.rateLimitInfo.resetTime
        });
      }
    }
  }

  /**
   * GitLab-specific method to get project information
   */
  async getProjectInfo(projectId: string): Promise<{
    id: number;
    name: string;
    description: string;
    webUrl: string;
    topics: string[];
    visibility: string;
    forksCount: number;
    starsCount: number;
  }> {
    try {
      const response = await this.client.get(`/projects/${encodeURIComponent(projectId)}`);
      const project = response.data;

      return {
        id: project.id,
        name: project.name,
        description: project.description || '',
        webUrl: project.web_url,
        topics: project.topics || [],
        visibility: project.visibility,
        forksCount: project.forks_count,
        starsCount: project.star_count
      };

    } catch (error) {
      this.handleAPIError(error, 'get project info');
    }
  }
}