import { logger } from '@/telemetry/logger';
import { ExternalAPIError } from '@/types/competition';
import { GitHubAdapter } from './adapters/GitHubAdapter';
import { GitLabAdapter } from './adapters/GitLabAdapter';
import { HacktoberfestAdapter } from './adapters/HacktoberfestAdapter';
import { 
  IExternalAPIAdapter, 
  ExternalAPIConfig,
  ContributionData,
  ValidationRequirements,
  ValidationResult,
  UserProfile,
  AuthenticationResult
} from './adapters/BaseExternalAPIAdapter';

/**
 * External API Manager
 * Manages all external API adapters and provides unified interface
 */
export class ExternalAPIManager {
  private adapters: Map<string, IExternalAPIAdapter> = new Map();
  private initialized: boolean = false;

  async initialize(): Promise<void> {
    try {
      logger.info('Initializing External API Manager...');

      // Initialize GitHub adapter
      if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
        const githubAdapter = new GitHubAdapter();
        await githubAdapter.initialize({
          clientId: process.env.GITHUB_CLIENT_ID,
          clientSecret: process.env.GITHUB_CLIENT_SECRET,
          baseUrl: 'https://api.github.com',
          scopes: ['read:user', 'public_repo'],
          timeout: 10000
        });
        this.adapters.set('github', githubAdapter);
        logger.info('GitHub adapter initialized');
      } else {
        logger.warn('GitHub credentials not provided, skipping GitHub adapter');
      }

      // Initialize GitLab adapter
      if (process.env.GITLAB_CLIENT_ID && process.env.GITLAB_CLIENT_SECRET) {
        const gitlabAdapter = new GitLabAdapter();
        await gitlabAdapter.initialize({
          clientId: process.env.GITLAB_CLIENT_ID,
          clientSecret: process.env.GITLAB_CLIENT_SECRET,
          baseUrl: 'https://gitlab.com/api/v4',
          scopes: ['read_user', 'read_api', 'read_repository'],
          timeout: 10000
        });
        this.adapters.set('gitlab', gitlabAdapter);
        logger.info('GitLab adapter initialized');
      } else {
        logger.warn('GitLab credentials not provided, skipping GitLab adapter');
      }

      // Initialize Hacktoberfest adapter (uses GitHub)
      if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
        const hacktoberfestAdapter = new HacktoberfestAdapter();
        await hacktoberfestAdapter.initialize({
          clientId: process.env.GITHUB_CLIENT_ID,
          clientSecret: process.env.GITHUB_CLIENT_SECRET,
          baseUrl: 'https://api.github.com',
          scopes: ['read:user', 'public_repo'],
          timeout: 10000
        });
        this.adapters.set('hacktoberfest', hacktoberfestAdapter);
        logger.info('Hacktoberfest adapter initialized');
      }

      this.initialized = true;
      logger.info(`External API Manager initialized successfully with ${this.adapters.size} adapters`);

    } catch (error) {
      logger.error('Failed to initialize External API Manager', { error });
      throw error;
    }
  }

  /**
   * Get an adapter by platform name
   */
  getAdapter(platform: string): IExternalAPIAdapter | null {
    return this.adapters.get(platform.toLowerCase()) || null;
  }

  /**
   * Get all available adapters
   */
  getAvailableAdapters(): string[] {
    return Array.from(this.adapters.keys());
  }

  /**
   * Authenticate user with a specific platform
   */
  async authenticateUser(platform: string, userId: string, authCode?: string): Promise<AuthenticationResult> {
    const adapter = this.getAdapter(platform);
    if (!adapter) {
      throw new ExternalAPIError(`Adapter for platform ${platform} not found`, platform);
    }

    return adapter.authenticate(userId, authCode);
  }

  /**
   * Validate user profile on a platform
   */
  async validateUserProfile(platform: string, username: string): Promise<{
    valid: boolean;
    username: string;
    profileUrl: string;
    verified: boolean;
    error?: string;
  }> {
    const adapter = this.getAdapter(platform);
    if (!adapter) {
      throw new ExternalAPIError(`Adapter for platform ${platform} not found`, platform);
    }

    return adapter.validateProfile(username);
  }

  /**
   * Fetch user contributions from a platform
   */
  async fetchUserContributions(
    platform: string, 
    username: string, 
    startDate: Date, 
    endDate: Date
  ): Promise<ContributionData[]> {
    const adapter = this.getAdapter(platform);
    if (!adapter) {
      throw new ExternalAPIError(`Adapter for platform ${platform} not found`, platform);
    }

    return adapter.fetchContributions(username, startDate, endDate);
  }

  /**
   * Validate a contribution against requirements
   */
  async validateContribution(
    platform: string,
    contribution: ContributionData,
    requirements: ValidationRequirements
  ): Promise<ValidationResult> {
    const adapter = this.getAdapter(platform);
    if (!adapter) {
      throw new ExternalAPIError(`Adapter for platform ${platform} not found`, platform);
    }

    return adapter.validateContribution(contribution, requirements);
  }

  /**
   * Get user profile from a platform
   */
  async getUserProfile(platform: string, username: string): Promise<UserProfile> {
    const adapter = this.getAdapter(platform);
    if (!adapter) {
      throw new ExternalAPIError(`Adapter for platform ${platform} not found`, platform);
    }

    return adapter.getUserProfile(username);
  }

  /**
   * Get Hacktoberfest-specific status for a user
   */
  async getHacktoberfestStatus(username: string, year?: number): Promise<any> {
    const hacktoberfestAdapter = this.adapters.get('hacktoberfest') as HacktoberfestAdapter;
    if (!hacktoberfestAdapter) {
      throw new ExternalAPIError('Hacktoberfest adapter not available', 'hacktoberfest');
    }

    return hacktoberfestAdapter.getHacktoberfestStatus(username);
  }

  /**
   * Get Hacktoberfest leaderboard
   */
  async getHacktoberfestLeaderboard(usernames: string[]): Promise<any[]> {
    const hacktoberfestAdapter = this.adapters.get('hacktoberfest') as HacktoberfestAdapter;
    if (!hacktoberfestAdapter) {
      throw new ExternalAPIError('Hacktoberfest adapter not available', 'hacktoberfest');
    }

    return hacktoberfestAdapter.getHacktoberfestLeaderboard(usernames);
  }

  /**
   * Validate multiple contributions across platforms
   */
  async validateMultipleContributions(
    contributions: Array<{
      platform: string;
      contribution: ContributionData;
      requirements: ValidationRequirements;
    }>
  ): Promise<ValidationResult[]> {
    const results = await Promise.all(
      contributions.map(async ({ platform, contribution, requirements }) => {
        try {
          return await this.validateContribution(platform, contribution, requirements);
        } catch (error) {
          logger.error('Failed to validate contribution', { 
            error, 
            platform, 
            contributionId: contribution.id 
          });
          return {
            valid: false,
            score: 0,
            maxScore: 100,
            reasons: [`Validation failed: ${error.message}`],
            metadata: { error: error.message }
          };
        }
      })
    );

    return results;
  }

  /**
   * Get comprehensive user activity across all platforms
   */
  async getUserActivitySummary(
    userProfiles: Array<{ platform: string; username: string }>,
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalContributions: number;
    contributionsByPlatform: Record<string, number>;
    contributionsByType: Record<string, number>;
    topRepositories: Array<{ name: string; contributions: number }>;
    activityTimeline: Array<{ date: Date; count: number }>;
  }> {
    const allContributions: ContributionData[] = [];
    const contributionsByPlatform: Record<string, number> = {};

    // Fetch contributions from all platforms
    for (const { platform, username } of userProfiles) {
      try {
        const contributions = await this.fetchUserContributions(platform, username, startDate, endDate);
        allContributions.push(...contributions);
        contributionsByPlatform[platform] = contributions.length;
      } catch (error) {
        logger.error(`Failed to fetch contributions for ${username} on ${platform}`, { error });
        contributionsByPlatform[platform] = 0;
      }
    }

    // Analyze contributions
    const contributionsByType: Record<string, number> = {};
    const repositoryContributions: Record<string, number> = {};

    for (const contribution of allContributions) {
      contributionsByType[contribution.type] = (contributionsByType[contribution.type] || 0) + 1;
      repositoryContributions[contribution.repositoryName] = 
        (repositoryContributions[contribution.repositoryName] || 0) + 1;
    }

    // Get top repositories
    const topRepositories = Object.entries(repositoryContributions)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([name, contributions]) => ({ name, contributions }));

    // Create activity timeline (daily)
    const timelineMap: Record<string, number> = {};
    for (const contribution of allContributions) {
      const dateKey = contribution.createdAt.toISOString().split('T')[0];
      timelineMap[dateKey] = (timelineMap[dateKey] || 0) + 1;
    }

    const activityTimeline = Object.entries(timelineMap)
      .map(([date, count]) => ({ date: new Date(date), count }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    return {
      totalContributions: allContributions.length,
      contributionsByPlatform,
      contributionsByType,
      topRepositories,
      activityTimeline
    };
  }

  async healthCheck(): Promise<{ 
    status: string; 
    initialized: boolean;
    adapters: Record<string, { status: string; message?: string }>;
  }> {
    const adapterHealth: Record<string, { status: string; message?: string }> = {};

    for (const [platform, adapter] of this.adapters) {
      try {
        const health = await adapter.healthCheck();
        adapterHealth[platform] = {
          status: health.status,
          message: health.message
        };
      } catch (error) {
        adapterHealth[platform] = {
          status: 'unhealthy',
          message: error.message
        };
      }
    }

    const overallStatus = Object.values(adapterHealth).every(h => h.status === 'healthy') 
      ? 'healthy' 
      : Object.values(adapterHealth).some(h => h.status === 'healthy')
      ? 'degraded'
      : 'unhealthy';

    return {
      status: overallStatus,
      initialized: this.initialized,
      adapters: adapterHealth
    };
  }
}