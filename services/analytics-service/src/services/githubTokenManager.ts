import * as crypto from 'crypto';
import { logger } from '../telemetry/logger';
import { db } from '../database/connection';
import { GitHubClient } from './githubClient';

export interface TokenValidationResult {
  isValid: boolean;
  user?: {
    login: string;
    id: number;
    name: string;
    email: string;
  };
  scopes?: string[];
  rateLimit?: {
    limit: number;
    remaining: number;
    reset: Date;
  };
  error?: string;
}

export interface StoredToken {
  id: number;
  teacherId: string;
  encryptedToken: string;
  tokenScope: string[];
  isActive: boolean;
  lastValidated: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * GitHub Token Manager
 * Handles secure storage, validation, and management of GitHub tokens
 */
export class GitHubTokenManager {
  private static instance: GitHubTokenManager;
  private readonly encryptionKey: string;
  private readonly algorithm = 'aes-256-gcm';

  private constructor() {
    // Get encryption key from environment or generate one
    this.encryptionKey = process.env['GITHUB_TOKEN_ENCRYPTION_KEY'] || this.generateEncryptionKey();
    
    if (!process.env['GITHUB_TOKEN_ENCRYPTION_KEY']) {
      logger.warn('GITHUB_TOKEN_ENCRYPTION_KEY not set in environment, using generated key');
    }
  }

  public static getInstance(): GitHubTokenManager {
    if (!GitHubTokenManager.instance) {
      GitHubTokenManager.instance = new GitHubTokenManager();
    }
    return GitHubTokenManager.instance;
  }

  /**
   * Generate a secure encryption key
   */
  private generateEncryptionKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Encrypt a GitHub token for secure storage
   */
  private encryptToken(token: string): { encrypted: string; iv: string; tag: string } {
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipher(this.algorithm, this.encryptionKey);
      
      let encrypted = cipher.update(token, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // For GCM mode, we would get the auth tag, but createCipher doesn't support it
      // Using a simpler approach for now
      const hmac = crypto.createHmac('sha256', this.encryptionKey);
      hmac.update(encrypted);
      const tag = hmac.digest('hex');

      return {
        encrypted,
        iv: iv.toString('hex'),
        tag
      };
    } catch (error) {
      logger.error('Failed to encrypt GitHub token:', error);
      throw new Error('Token encryption failed');
    }
  }

  /**
   * Decrypt a GitHub token from storage
   */
  private decryptToken(encryptedData: string): string {
    try {
      const parts = encryptedData.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted token format');
      }

      const [encrypted, , tag] = parts;
      
      if (!encrypted || !tag) {
        throw new Error('Invalid encrypted token format');
      }
      
      // Verify tag first
      const hmac = crypto.createHmac('sha256', this.encryptionKey);
      hmac.update(encrypted);
      const expectedTag = hmac.digest('hex');
      
      if (tag !== expectedTag) {
        throw new Error('Token integrity check failed');
      }

      const decipher = crypto.createDecipher(this.algorithm, this.encryptionKey);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      logger.error('Failed to decrypt GitHub token:', error);
      throw new Error('Token decryption failed');
    }
  }

  /**
   * Validate a GitHub token by testing API access
   */
  public async validateToken(token: string): Promise<TokenValidationResult> {
    try {
      const client = new GitHubClient(token);
      const result = await client.testConnection();

      if (!result.success) {
        return {
          isValid: false,
          error: 'Token authentication failed'
        };
      }

      // Get token scopes from headers (would need to modify client to expose headers)
      const rateLimit = result.rateLimit ? {
        limit: result.rateLimit.limit,
        remaining: result.rateLimit.remaining,
        reset: new Date(result.rateLimit.reset * 1000)
      } : undefined;

      return {
        isValid: true,
        user: {
          login: result.user.login,
          id: result.user.id,
          name: result.user.name,
          email: result.user.email
        },
        ...(rateLimit && { rateLimit })
      };
    } catch (error) {
      logger.error('GitHub token validation failed:', error);
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Unknown validation error'
      };
    }
  }

  /**
   * Store a GitHub token securely in the database
   */
  public async storeToken(teacherId: string, token: string): Promise<boolean> {
    try {
      // First validate the token
      const validation = await this.validateToken(token);
      if (!validation.isValid) {
        logger.error(`Cannot store invalid GitHub token for teacher ${teacherId}`);
        return false;
      }

      // Encrypt the token
      const { encrypted, iv, tag } = this.encryptToken(token);
      const encryptedToken = `${encrypted}:${iv}:${tag}`;

      // Store in database
      const query = `
        INSERT INTO github_tokens (teacher_id, encrypted_token, token_scope, is_active, last_validated, created_at, updated_at)
        VALUES ($1, $2, $3, $4, NOW(), NOW(), NOW())
        ON CONFLICT (teacher_id) 
        DO UPDATE SET 
          encrypted_token = $2,
          token_scope = $3,
          is_active = $4,
          last_validated = NOW(),
          updated_at = NOW()
      `;

      const scopes = validation.user ? ['repo'] : []; // Default scopes, would need to get actual scopes
      await db.query(query, [teacherId, encryptedToken, scopes, true]);

      logger.info(`GitHub token stored successfully for teacher ${teacherId}`);
      return true;
    } catch (error) {
      logger.error(`Failed to store GitHub token for teacher ${teacherId}:`, error);
      return false;
    }
  }

  /**
   * Retrieve and decrypt a GitHub token from the database
   */
  public async getToken(teacherId: string): Promise<string | null> {
    try {
      const query = `
        SELECT encrypted_token, is_active, last_validated 
        FROM github_tokens 
        WHERE teacher_id = $1 AND is_active = true
      `;
      
      const result = await db.query(query, [teacherId]);
      
      if (result.rows.length === 0) {
        logger.debug(`No active GitHub token found for teacher ${teacherId}`);
        return null;
      }

      const { encrypted_token, last_validated } = result.rows[0];
      
      // Check if token needs revalidation (older than 24 hours)
      const lastValidated = new Date(last_validated);
      const now = new Date();
      const hoursSinceValidation = (now.getTime() - lastValidated.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceValidation > 24) {
        logger.info(`GitHub token for teacher ${teacherId} needs revalidation`);
        const decryptedToken = this.decryptToken(encrypted_token);
        const validation = await this.validateToken(decryptedToken);
        
        if (!validation.isValid) {
          logger.warn(`GitHub token for teacher ${teacherId} is no longer valid`);
          await this.deactivateToken(teacherId);
          return null;
        }
        
        // Update last validated timestamp
        await this.updateLastValidated(teacherId);
      }

      return this.decryptToken(encrypted_token);
    } catch (error) {
      logger.error(`Failed to retrieve GitHub token for teacher ${teacherId}:`, error);
      return null;
    }
  }

  /**
   * Update the last validated timestamp for a token
   */
  private async updateLastValidated(teacherId: string): Promise<void> {
    try {
      const query = `
        UPDATE github_tokens 
        SET last_validated = NOW(), updated_at = NOW()
        WHERE teacher_id = $1
      `;
      await db.query(query, [teacherId]);
    } catch (error) {
      logger.error(`Failed to update last validated timestamp for teacher ${teacherId}:`, error);
    }
  }

  /**
   * Deactivate a GitHub token
   */
  public async deactivateToken(teacherId: string): Promise<boolean> {
    try {
      const query = `
        UPDATE github_tokens 
        SET is_active = false, updated_at = NOW()
        WHERE teacher_id = $1
      `;
      
      const result = await db.query(query, [teacherId]);
      
      if (result.rowCount && result.rowCount > 0) {
        logger.info(`GitHub token deactivated for teacher ${teacherId}`);
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error(`Failed to deactivate GitHub token for teacher ${teacherId}:`, error);
      return false;
    }
  }

  /**
   * Delete a GitHub token completely
   */
  public async deleteToken(teacherId: string): Promise<boolean> {
    try {
      const query = 'DELETE FROM github_tokens WHERE teacher_id = $1';
      const result = await db.query(query, [teacherId]);
      
      if (result.rowCount && result.rowCount > 0) {
        logger.info(`GitHub token deleted for teacher ${teacherId}`);
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error(`Failed to delete GitHub token for teacher ${teacherId}:`, error);
      return false;
    }
  }

  /**
   * Get all stored tokens for a teacher (metadata only, not the actual tokens)
   */
  public async getTokenInfo(teacherId: string): Promise<Omit<StoredToken, 'encryptedToken'> | null> {
    try {
      const query = `
        SELECT id, teacher_id, token_scope, is_active, last_validated, created_at, updated_at
        FROM github_tokens 
        WHERE teacher_id = $1
      `;
      
      const result = await db.query(query, [teacherId]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        teacherId: row.teacher_id,
        tokenScope: row.token_scope,
        isActive: row.is_active,
        lastValidated: row.last_validated ? new Date(row.last_validated) : null,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
      };
    } catch (error) {
      logger.error(`Failed to get token info for teacher ${teacherId}:`, error);
      return null;
    }
  }

  /**
   * Test if a stored token is still valid
   */
  public async testStoredToken(teacherId: string): Promise<TokenValidationResult> {
    try {
      const token = await this.getToken(teacherId);
      
      if (!token) {
        return {
          isValid: false,
          error: 'No token found for teacher'
        };
      }

      return await this.validateToken(token);
    } catch (error) {
      logger.error(`Failed to test stored token for teacher ${teacherId}:`, error);
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get GitHub client with stored token
   */
  public async getAuthenticatedClient(teacherId: string): Promise<GitHubClient | null> {
    try {
      const token = await this.getToken(teacherId);
      
      if (!token) {
        logger.debug(`No valid GitHub token available for teacher ${teacherId}`);
        return null;
      }

      return new GitHubClient(token);
    } catch (error) {
      logger.error(`Failed to create authenticated GitHub client for teacher ${teacherId}:`, error);
      return null;
    }
  }

  /**
   * Rotate encryption key (for security maintenance)
   */
  public async rotateEncryptionKey(_newKey: string): Promise<boolean> {
    // This would be a complex operation requiring re-encryption of all stored tokens
    // Implementation would depend on specific security requirements
    logger.warn('Token encryption key rotation not implemented');
    return false;
  }
}