import { logger } from '@/telemetry/logger';
import { ExternalAPIError } from '@/types/competition';

/**
 * Base interface for external API adapters
 * Defines common methods that all external API adapters must implement
 */
export interface IExternalAPIAdapter {
  /**
   * Initialize the adapter with configuration
   */
  initialize(config: ExternalAPIConfig): Promise<void>;

  /**
   * Authenticate user and get access token
   */
  authenticate(userId: string, authCode?: string): Promise<AuthenticationResult>;

  /**
   * Validate user's external profile
   */
  validateProfile(username: string): Promise<ProfileValidationResult>;

  /**
   * Fetch user's contributions for a specific time period
   */
  fetchContributions(username: string, startDate: Date, endDate: Date): Promise<ContributionData[]>;

  /**
   * Validate a specific contribution against competition requirements
   */
  validateContribution(contribution: ContributionData, requirements: ValidationRequirements): Promise<ValidationResult>;

  /**
   * Get user's profile information
   */
  getUserProfile(username: string): Promise<UserProfile>;

  /**
   * Check if the adapter is healthy and can make API calls
   */
  healthCheck(): Promise<HealthCheckResult>;

  /**
   * Get rate limit information
   */
  getRateLimit(): Promise<RateLimitInfo>;
}

/**
 * Abstract base class for external API adapters
 * Provides common functionality and error handling
 */
export abstract class BaseExternalAPIAdapter implements IExternalAPIAdapter {
  protected config: ExternalAPIConfig;
  protected initialized: boolean = false;
  protected rateLimitInfo: RateLimitInfo = {
    limit: 0,
    remaining: 0,
    resetTime: new Date()
  };

  constructor(protected platform: string) {}

  async initialize(config: ExternalAPIConfig): Promise<void> {
    try {
      logger.info(`Initializing ${this.platform} API adapter...`);
      
      this.validateConfig(config);
      this.config = config;
      
      await this.setupClient();
      await this.testConnection();
      
      this.initialized = true;
      logger.info(`${this.platform} API adapter initialized successfully`);
    } catch (error) {
      logger.error(`Failed to initialize ${this.platform} API adapter`, { error });
      throw new ExternalAPIError(
        `Failed to initialize ${this.platform} adapter: ${error.message}`,
        this.platform,
        error
      );
    }
  }

  async healthCheck(): Promise<HealthCheckResult> {
    try {
      if (!this.initialized) {
        return {
          status: 'unhealthy',
          message: 'Adapter not initialized',
          timestamp: new Date()
        };
      }

      await this.testConnection();
      const rateLimit = await this.getRateLimit();

      return {
        status: rateLimit.remaining > 10 ? 'healthy' : 'degraded',
        message: rateLimit.remaining > 10 ? 'API healthy' : 'Rate limit approaching',
        timestamp: new Date(),
        rateLimit
      };
    } catch (error) {
      logger.error(`${this.platform} health check failed`, { error });
      return {
        status: 'unhealthy',
        message: error.message,
        timestamp: new Date()
      };
    }
  }

  protected validateConfig(config: ExternalAPIConfig): void {
    if (!config.clientId) {
      throw new Error('Client ID is required');
    }
    if (!config.clientSecret) {
      throw new Error('Client secret is required');
    }
    if (!config.baseUrl) {
      throw new Error('Base URL is required');
    }
  }

  protected async handleRateLimit(response: any): Promise<void> {
    if (response.headers) {
      this.rateLimitInfo = {
        limit: parseInt(response.headers['x-ratelimit-limit'] || '0'),
        remaining: parseInt(response.headers['x-ratelimit-remaining'] || '0'),
        resetTime: new Date(parseInt(response.headers['x-ratelimit-reset'] || '0') * 1000)
      };

      if (this.rateLimitInfo.remaining < 10) {
        logger.warn(`${this.platform} API rate limit approaching`, {
          remaining: this.rateLimitInfo.remaining,
          resetTime: this.rateLimitInfo.resetTime
        });
      }
    }
  }

  protected handleAPIError(error: any, operation: string): never {
    logger.error(`${this.platform} API error during ${operation}`, { error });
    
    if (error.response?.status === 401) {
      throw new ExternalAPIError(
        'Authentication failed - invalid credentials',
        this.platform,
        error
      );
    }
    
    if (error.response?.status === 403) {
      throw new ExternalAPIError(
        'Access forbidden - insufficient permissions',
        this.platform,
        error
      );
    }
    
    if (error.response?.status === 429) {
      throw new ExternalAPIError(
        'Rate limit exceeded',
        this.platform,
        error
      );
    }

    throw new ExternalAPIError(
      `${this.platform} API error: ${error.message}`,
      this.platform,
      error
    );
  }

  // Abstract methods that must be implemented by concrete adapters
  protected abstract setupClient(): Promise<void>;
  protected abstract testConnection(): Promise<void>;
  
  abstract authenticate(userId: string, authCode?: string): Promise<AuthenticationResult>;
  abstract validateProfile(username: string): Promise<ProfileValidationResult>;
  abstract fetchContributions(username: string, startDate: Date, endDate: Date): Promise<ContributionData[]>;
  abstract validateContribution(contribution: ContributionData, requirements: ValidationRequirements): Promise<ValidationResult>;
  abstract getUserProfile(username: string): Promise<UserProfile>;
  abstract getRateLimit(): Promise<RateLimitInfo>;
}

// Type definitions for external API integration
export interface ExternalAPIConfig {
  clientId: string;
  clientSecret: string;
  baseUrl: string;
  redirectUri?: string;
  scopes?: string[];
  webhookSecret?: string;
  timeout?: number;
  retryAttempts?: number;
}

export interface AuthenticationResult {
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: Date;
  scopes?: string[];
  error?: string;
}

export interface ProfileValidationResult {
  valid: boolean;
  username: string;
  profileUrl: string;
  verified: boolean;
  publicProfile: boolean;
  error?: string;
}

export interface ContributionData {
  id: string;
  type: 'pull_request' | 'commit' | 'issue' | 'review' | 'repository';
  title: string;
  description?: string;
  url: string;
  repositoryUrl: string;
  repositoryName: string;
  createdAt: Date;
  updatedAt: Date;
  status: 'open' | 'closed' | 'merged' | 'draft';
  labels: string[];
  metadata: Record<string, any>;
}

export interface ValidationRequirements {
  minContributions?: number;
  requireApproval?: boolean;
  excludeLabels?: string[];
  includeLabels?: string[];
  minLinesChanged?: number;
  repositoryRequirements?: {
    mustBePublic?: boolean;
    mustHaveTopics?: string[];
    excludeOwn?: boolean;
  };
  timeframe?: {
    start: Date;
    end: Date;
  };
}

export interface ValidationResult {
  valid: boolean;
  score: number;
  maxScore: number;
  reasons: string[];
  metadata: Record<string, any>;
}

export interface UserProfile {
  username: string;
  displayName: string;
  avatarUrl: string;
  profileUrl: string;
  bio?: string;
  location?: string;
  company?: string;
  email?: string;
  publicRepos: number;
  followers: number;
  following: number;
  createdAt: Date;
  verified: boolean;
}

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  message: string;
  timestamp: Date;
  rateLimit?: RateLimitInfo;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetTime: Date;
}