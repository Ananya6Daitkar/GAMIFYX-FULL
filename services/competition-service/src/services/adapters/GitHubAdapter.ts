import { Octokit } from '@octokit/rest';
import axios from 'axios';
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
 * GitHub API adapter for competition integration
 * Handles GitHub OAuth, pull request tracking, and Hacktoberfest validation
 */
export class GitHubAdapter extends BaseExternalAPIAdapter {
  private octokit: Octokit;
  private clientId: string;
  private clientSecret: string;

  constructor() {
    super('GitHub');
  }

  protected async setupClient(): Promise<void> {
    this.clientId = this.config.clientId;
    this.clientSecret = this.config.clientSecret;

    // Initialize Octokit with app credentials
    this.octokit = new Octokit({
      auth: `token ${process.env.GITHUB_TOKEN || ''}`,
      baseUrl: this.config.baseUrl || 'https://api.github.com',
      request: {
        timeout: this.config.timeout || 10000
      }
    });
  }

  protected async testConnection(): Promise<void> {
    try {
      await this.octokit.rest.meta.get();
      logger.debug('GitHub API connection test successful');
    } catch (error) {
      throw new Error(`GitHub API connection test failed: ${error.message}`);
    }
  }

  async authenticate(userId: string, authCode?: string): Promise<AuthenticationResult> {
    try {
      if (!authCode) {
        // Return OAuth URL for user to authenticate
        const scopes = this.config.scopes || ['read:user', 'public_repo'];
        const authUrl = `https://github.com/login/oauth/authorize?client_id=${this.clientId}&scope=${scopes.join(',')}&state=${userId}`;
        
        return {
          success: false,
          error: `Please authenticate at: ${authUrl}`
        };
      }

      // Exchange auth code for access token
      const tokenResponse = await axios.post('https://github.com/login/oauth/access_token', {
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code: authCode
      }, {
        headers: {
          'Accept': 'application/json'
        }
      });

      const { access_token, scope, token_type } = tokenResponse.data;

      if (!access_token) {
        return {
          success: false,
          error: 'Failed to obtain access token'
        };
      }

      // Verify token by getting user info
      const userOctokit = new Octokit({ auth: access_token });
      const userResponse = await userOctokit.rest.users.getAuthenticated();

      return {
        success: true,
        accessToken: access_token,
        scopes: scope ? scope.split(',') : [],
        expiresAt: undefined // GitHub tokens don't expire
      };

    } catch (error) {
      this.handleAPIError(error, 'authentication');
    }
  }

  async validateProfile(username: string): Promise<ProfileValidationResult> {
    try {
      const response = await this.octokit.rest.users.getByUsername({
        username
      });

      await this.handleRateLimit(response);

      const user = response.data;

      return {
        valid: true,
        username: user.login,
        profileUrl: user.html_url,
        verified: true,
        publicProfile: user.type === 'User' && !user.site_admin
      };

    } catch (error) {
      if (error.status === 404) {
        return {
          valid: false,
          username,
          profileUrl: `https://github.com/${username}`,
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

      // Fetch pull requests
      const pullRequests = await this.fetchPullRequests(username, startDate, endDate);
      contributions.push(...pullRequests);

      // Fetch issues
      const issues = await this.fetchIssues(username, startDate, endDate);
      contributions.push(...issues);

      // Fetch commits (from user's repositories)
      const commits = await this.fetchCommits(username, startDate, endDate);
      contributions.push(...commits);

      logger.info(`Fetched ${contributions.length} contributions for ${username}`, {
        pullRequests: pullRequests.length,
        issues: issues.length,
        commits: commits.length
      });

      return contributions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    } catch (error) {
      this.handleAPIError(error, 'fetch contributions');
    }
  }

  private async fetchPullRequests(username: string, startDate: Date, endDate: Date): Promise<ContributionData[]> {
    const pullRequests: ContributionData[] = [];
    let page = 1;
    const perPage = 100;

    while (true) {
      const response = await this.octokit.rest.search.issuesAndPullRequests({
        q: `author:${username} type:pr created:${startDate.toISOString().split('T')[0]}..${endDate.toISOString().split('T')[0]}`,
        sort: 'created',
        order: 'desc',
        page,
        per_page: perPage
      });

      await this.handleRateLimit(response);

      if (response.data.items.length === 0) break;

      for (const pr of response.data.items) {
        pullRequests.push({
          id: pr.id.toString(),
          type: 'pull_request',
          title: pr.title,
          description: pr.body || '',
          url: pr.html_url,
          repositoryUrl: pr.repository_url.replace('api.github.com/repos', 'github.com'),
          repositoryName: pr.repository_url.split('/').slice(-2).join('/'),
          createdAt: new Date(pr.created_at),
          updatedAt: new Date(pr.updated_at),
          status: pr.state === 'open' ? 'open' : (pr.pull_request?.merged_at ? 'merged' : 'closed'),
          labels: pr.labels.map((label: any) => label.name),
          metadata: {
            number: pr.number,
            draft: pr.draft,
            mergeable: pr.mergeable,
            comments: pr.comments,
            reviewComments: pr.review_comments,
            additions: pr.additions,
            deletions: pr.deletions,
            changedFiles: pr.changed_files
          }
        });
      }

      if (response.data.items.length < perPage) break;
      page++;
    }

    return pullRequests;
  }

  private async fetchIssues(username: string, startDate: Date, endDate: Date): Promise<ContributionData[]> {
    const issues: ContributionData[] = [];
    let page = 1;
    const perPage = 100;

    while (true) {
      const response = await this.octokit.rest.search.issuesAndPullRequests({
        q: `author:${username} type:issue created:${startDate.toISOString().split('T')[0]}..${endDate.toISOString().split('T')[0]}`,
        sort: 'created',
        order: 'desc',
        page,
        per_page: perPage
      });

      await this.handleRateLimit(response);

      if (response.data.items.length === 0) break;

      for (const issue of response.data.items) {
        issues.push({
          id: issue.id.toString(),
          type: 'issue',
          title: issue.title,
          description: issue.body || '',
          url: issue.html_url,
          repositoryUrl: issue.repository_url.replace('api.github.com/repos', 'github.com'),
          repositoryName: issue.repository_url.split('/').slice(-2).join('/'),
          createdAt: new Date(issue.created_at),
          updatedAt: new Date(issue.updated_at),
          status: issue.state,
          labels: issue.labels.map((label: any) => label.name),
          metadata: {
            number: issue.number,
            comments: issue.comments,
            assignees: issue.assignees?.map((a: any) => a.login) || []
          }
        });
      }

      if (response.data.items.length < perPage) break;
      page++;
    }

    return issues;
  }

  private async fetchCommits(username: string, startDate: Date, endDate: Date): Promise<ContributionData[]> {
    const commits: ContributionData[] = [];

    try {
      // Get user's repositories
      const reposResponse = await this.octokit.rest.repos.listForUser({
        username,
        type: 'owner',
        sort: 'updated',
        per_page: 50
      });

      await this.handleRateLimit(reposResponse);

      // Fetch commits from each repository
      for (const repo of reposResponse.data) {
        try {
          const commitsResponse = await this.octokit.rest.repos.listCommits({
            owner: username,
            repo: repo.name,
            author: username,
            since: startDate.toISOString(),
            until: endDate.toISOString(),
            per_page: 100
          });

          await this.handleRateLimit(commitsResponse);

          for (const commit of commitsResponse.data) {
            commits.push({
              id: commit.sha,
              type: 'commit',
              title: commit.commit.message.split('\n')[0],
              description: commit.commit.message,
              url: commit.html_url,
              repositoryUrl: repo.html_url,
              repositoryName: repo.full_name,
              createdAt: new Date(commit.commit.author.date),
              updatedAt: new Date(commit.commit.author.date),
              status: 'merged',
              labels: [],
              metadata: {
                sha: commit.sha,
                additions: commit.stats?.additions || 0,
                deletions: commit.stats?.deletions || 0,
                total: commit.stats?.total || 0
              }
            });
          }
        } catch (error) {
          // Skip repositories we can't access
          logger.debug(`Skipping repository ${repo.name}: ${error.message}`);
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
        score = await this.validatePullRequest(contribution, requirements, reasons);
      } else if (contribution.type === 'issue') {
        score = await this.validateIssue(contribution, requirements, reasons);
      } else if (contribution.type === 'commit') {
        score = await this.validateCommit(contribution, requirements, reasons);
      }

      // Apply Hacktoberfest-specific validation if needed
      if (requirements.includeLabels?.includes('hacktoberfest-accepted') || 
          requirements.excludeLabels?.includes('spam')) {
        score = await this.applyHacktoberfestValidation(contribution, requirements, reasons, score);
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

  private async validatePullRequest(contribution: ContributionData, requirements: ValidationRequirements, reasons: string[]): Promise<number> {
    let score = 50; // Base score for PR

    // Check if PR is merged or approved
    if (requirements.requireApproval && contribution.status !== 'merged') {
      const [owner, repo] = contribution.repositoryName.split('/');
      const prNumber = contribution.metadata.number;

      try {
        const reviewsResponse = await this.octokit.rest.pulls.listReviews({
          owner,
          repo,
          pull_number: prNumber
        });

        const approvedReviews = reviewsResponse.data.filter(review => review.state === 'APPROVED');
        
        if (approvedReviews.length > 0 || contribution.status === 'merged') {
          score += 30;
          reasons.push('Pull request approved or merged');
        } else {
          score -= 20;
          reasons.push('Pull request not approved or merged');
        }
      } catch (error) {
        reasons.push('Could not verify PR approval status');
      }
    }

    // Check minimum lines changed
    if (requirements.minLinesChanged) {
      const linesChanged = (contribution.metadata.additions || 0) + (contribution.metadata.deletions || 0);
      if (linesChanged >= requirements.minLinesChanged) {
        score += 20;
        reasons.push(`Sufficient lines changed: ${linesChanged}`);
      } else {
        score -= 10;
        reasons.push(`Insufficient lines changed: ${linesChanged} < ${requirements.minLinesChanged}`);
      }
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

    // Issues get points for being constructive
    if (contribution.description && contribution.description.length > 50) {
      score += 20;
      reasons.push('Detailed issue description');
    }

    // Check if issue has responses/engagement
    if (contribution.metadata.comments > 0) {
      score += 15;
      reasons.push('Issue has community engagement');
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

    // Check lines changed
    const linesChanged = contribution.metadata.total || 0;
    if (linesChanged > 5) {
      score += 15;
      reasons.push(`Meaningful changes: ${linesChanged} lines`);
    }

    return Math.max(0, Math.min(100, score));
  }

  private async applyHacktoberfestValidation(contribution: ContributionData, requirements: ValidationRequirements, reasons: string[], currentScore: number): Promise<number> {
    let score = currentScore;

    // Hacktoberfest-specific validation
    if (contribution.type === 'pull_request') {
      // Check for hacktoberfest-accepted label
      if (contribution.labels.includes('hacktoberfest-accepted')) {
        score += 20;
        reasons.push('Has hacktoberfest-accepted label');
      }

      // Check for spam/invalid labels
      const spamLabels = ['spam', 'invalid', 'hacktoberfest-invalid'];
      const hasSpamLabel = spamLabels.some(label => contribution.labels.includes(label));
      if (hasSpamLabel) {
        score = 0;
        reasons.push('Marked as spam or invalid');
      }

      // Check repository participation in Hacktoberfest
      const repoTopics = await this.getRepositoryTopics(contribution.repositoryName);
      if (repoTopics.includes('hacktoberfest')) {
        score += 10;
        reasons.push('Repository participates in Hacktoberfest');
      }
    }

    return Math.max(0, Math.min(100, score));
  }

  private async getRepositoryTopics(repositoryName: string): Promise<string[]> {
    try {
      const [owner, repo] = repositoryName.split('/');
      const response = await this.octokit.rest.repos.getAllTopics({
        owner,
        repo
      });
      return response.data.names;
    } catch (error) {
      return [];
    }
  }

  async getUserProfile(username: string): Promise<UserProfile> {
    try {
      const response = await this.octokit.rest.users.getByUsername({
        username
      });

      await this.handleRateLimit(response);

      const user = response.data;

      return {
        username: user.login,
        displayName: user.name || user.login,
        avatarUrl: user.avatar_url,
        profileUrl: user.html_url,
        bio: user.bio,
        location: user.location,
        company: user.company,
        email: user.email,
        publicRepos: user.public_repos,
        followers: user.followers,
        following: user.following,
        createdAt: new Date(user.created_at),
        verified: user.type === 'User'
      };

    } catch (error) {
      this.handleAPIError(error, 'get user profile');
    }
  }

  async getRateLimit(): Promise<RateLimitInfo> {
    try {
      const response = await this.octokit.rest.rateLimit.get();
      const rateLimit = response.data.rate;

      this.rateLimitInfo = {
        limit: rateLimit.limit,
        remaining: rateLimit.remaining,
        resetTime: new Date(rateLimit.reset * 1000)
      };

      return this.rateLimitInfo;

    } catch (error) {
      this.handleAPIError(error, 'get rate limit');
    }
  }

  /**
   * Hacktoberfest-specific validation method
   */
  async validateHacktoberfestParticipation(username: string, year: number = new Date().getFullYear()): Promise<{
    eligible: boolean;
    validPRs: number;
    totalPRs: number;
    details: Array<{
      url: string;
      title: string;
      status: 'valid' | 'invalid' | 'pending';
      reason: string;
    }>;
  }> {
    const startDate = new Date(year, 9, 1); // October 1st
    const endDate = new Date(year, 9, 31, 23, 59, 59); // October 31st

    const contributions = await this.fetchContributions(username, startDate, endDate);
    const pullRequests = contributions.filter(c => c.type === 'pull_request');

    const validationResults = await Promise.all(
      pullRequests.map(async (pr) => {
        const validation = await this.validateContribution(pr, {
          requireApproval: true,
          excludeLabels: ['spam', 'invalid', 'hacktoberfest-invalid'],
          includeLabels: ['hacktoberfest-accepted'],
          minLinesChanged: 1
        });

        return {
          url: pr.url,
          title: pr.title,
          status: validation.valid ? 'valid' as const : 'invalid' as const,
          reason: validation.reasons.join(', ')
        };
      })
    );

    const validPRs = validationResults.filter(r => r.status === 'valid').length;

    return {
      eligible: validPRs >= 4,
      validPRs,
      totalPRs: pullRequests.length,
      details: validationResults
    };
  }
}