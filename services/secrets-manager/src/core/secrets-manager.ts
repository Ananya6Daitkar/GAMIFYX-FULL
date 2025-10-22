/**
 * Comprehensive Secrets Management System for GamifyX
 * Supports HashiCorp Vault, AWS Secrets Manager, and Azure Key Vault
 */

import { EventEmitter } from 'events';
import { Logger } from '../utils/logger';
import { VaultClient } from '../providers/vault-client';
import { AWSSecretsClient } from '../providers/aws-secrets-client';
import { AzureKeyVaultClient } from '../providers/azure-keyvault-client';
import { EncryptionService } from '../services/encryption-service';
import { RotationScheduler } from '../services/rotation-scheduler';
import { AuditLogger } from '../services/audit-logger';
import { AccessController } from '../services/access-controller';
import { 
  Secret, 
  SecretMetadata, 
  SecretVersion, 
  RotationPolicy,
  AccessPolicy,
  SecretsConfig,
  SecretProvider,
  SecretRequest,
  SecretResponse,
  RotationResult,
  AuditEvent
} from '../types/secrets-types';

export class SecretsManager extends EventEmitter {
  private logger: Logger;
  private config: SecretsConfig;
  private providers: Map<SecretProvider, any> = new Map();
  private encryptionService: EncryptionService;
  private rotationScheduler: RotationScheduler;
  private auditLogger: AuditLogger;
  private accessController: AccessController;
  private secretCache: Map<string, { secret: Secret; expiresAt: Date }> = new Map();

  constructor(config: SecretsConfig) {
    super();
    this.config = config;
    this.logger = new Logger('SecretsManager');
    
    // Initialize services
    this.encryptionService = new EncryptionService(config.encryption);
    this.rotationScheduler = new RotationScheduler(config.rotation);
    this.auditLogger = new AuditLogger(config.audit);
    this.accessController = new AccessController(config.access);
    
    // Initialize providers
    this.initializeProviders();
    
    // Set up event handlers
    this.setupEventHandlers();
    
    // Start rotation scheduler
    this.rotationScheduler.start();
  }

  /**
   * Store a secret with encryption and access controls
   */
  async storeSecret(request: SecretRequest): Promise<SecretResponse> {
    const startTime = Date.now();
    
    try {
      this.logger.info('Storing secret', { 
        path: request.path, 
        provider: request.provider,
        requestId: request.requestId 
      });

      // Validate request
      await this.validateSecretRequest(request);

      // Check access permissions
      await this.accessController.checkAccess(request.requester, 'write', request.path);

      // Encrypt secret value if required
      let secretValue = request.value;
      if (this.config.encryption.enabled && !request.skipEncryption) {
        secretValue = await this.encryptionService.encrypt(request.value);
      }

      // Prepare secret metadata
      const metadata: SecretMetadata = {
        path: request.path,
        description: request.description,
        tags: request.tags || {},
        createdBy: request.requester,
        createdAt: new Date(),
        updatedBy: request.requester,
        updatedAt: new Date(),
        version: 1,
        rotationPolicy: request.rotationPolicy,
        accessPolicy: request.accessPolicy,
        encrypted: this.config.encryption.enabled && !request.skipEncryption,
        provider: request.provider
      };

      // Get provider client
      const provider = this.getProvider(request.provider);
      
      // Store secret in provider
      const result = await provider.storeSecret({
        path: request.path,
        value: secretValue,
        metadata,
        options: request.options
      });

      // Create secret object
      const secret: Secret = {
        id: result.id || this.generateSecretId(),
        path: request.path,
        value: secretValue,
        metadata,
        versions: [{
          version: 1,
          value: secretValue,
          createdAt: new Date(),
          createdBy: request.requester,
          active: true
        }]
      };

      // Schedule rotation if policy exists
      if (request.rotationPolicy) {
        await this.rotationScheduler.scheduleRotation(secret.id, request.rotationPolicy);
      }

      // Clear cache for this path
      this.clearSecretCache(request.path);

      // Log audit event
      await this.auditLogger.logEvent({
        type: 'secret_stored',
        secretPath: request.path,
        requester: request.requester,
        timestamp: new Date(),
        metadata: { provider: request.provider, encrypted: metadata.encrypted },
        duration: Date.now() - startTime
      });

      this.emit('secret:stored', { secret, requester: request.requester });

      return {
        success: true,
        secretId: secret.id,
        path: request.path,
        version: 1,
        metadata: {
          createdAt: metadata.createdAt,
          encrypted: metadata.encrypted,
          provider: request.provider
        }
      };

    } catch (error) {
      this.logger.error('Failed to store secret', error);
      
      await this.auditLogger.logEvent({
        type: 'secret_store_failed',
        secretPath: request.path,
        requester: request.requester,
        timestamp: new Date(),
        error: error.message,
        duration: Date.now() - startTime
      });

      throw error;
    }
  }

  /**
   * Retrieve a secret with decryption and access validation
   */
  async getSecret(path: string, requester: string, version?: number): Promise<Secret> {
    const startTime = Date.now();
    
    try {
      this.logger.debug('Retrieving secret', { path, requester, version });

      // Check access permissions
      await this.accessController.checkAccess(requester, 'read', path);

      // Check cache first
      const cacheKey = `${path}:${version || 'latest'}`;
      const cached = this.secretCache.get(cacheKey);
      if (cached && cached.expiresAt > new Date()) {
        this.logger.debug('Secret retrieved from cache', { path });
        
        await this.auditLogger.logEvent({
          type: 'secret_accessed',
          secretPath: path,
          requester,
          timestamp: new Date(),
          metadata: { source: 'cache', version },
          duration: Date.now() - startTime
        });

        return cached.secret;
      }

      // Determine provider from path or metadata
      const provider = await this.determineProvider(path);
      const providerClient = this.getProvider(provider);

      // Retrieve secret from provider
      const secret = await providerClient.getSecret(path, version);

      // Decrypt value if encrypted
      if (secret.metadata.encrypted) {
        secret.value = await this.encryptionService.decrypt(secret.value);
        
        // Decrypt version values
        if (secret.versions) {
          for (const ver of secret.versions) {
            if (ver.value) {
              ver.value = await this.encryptionService.decrypt(ver.value);
            }
          }
        }
      }

      // Cache the secret
      if (this.config.cache.enabled) {
        this.secretCache.set(cacheKey, {
          secret,
          expiresAt: new Date(Date.now() + this.config.cache.ttlSeconds * 1000)
        });
      }

      // Log audit event
      await this.auditLogger.logEvent({
        type: 'secret_accessed',
        secretPath: path,
        requester,
        timestamp: new Date(),
        metadata: { 
          provider: secret.metadata.provider, 
          version: version || secret.metadata.version,
          encrypted: secret.metadata.encrypted
        },
        duration: Date.now() - startTime
      });

      this.emit('secret:accessed', { secret, requester });

      return secret;

    } catch (error) {
      this.logger.error('Failed to retrieve secret', error);
      
      await this.auditLogger.logEvent({
        type: 'secret_access_failed',
        secretPath: path,
        requester,
        timestamp: new Date(),
        error: error.message,
        duration: Date.now() - startTime
      });

      throw error;
    }
  }

  /**
   * Update an existing secret with versioning
   */
  async updateSecret(
    path: string, 
    newValue: string, 
    requester: string, 
    options?: { description?: string; tags?: Record<string, string> }
  ): Promise<SecretResponse> {
    const startTime = Date.now();
    
    try {
      this.logger.info('Updating secret', { path, requester });

      // Check access permissions
      await this.accessController.checkAccess(requester, 'write', path);

      // Get existing secret to preserve metadata
      const existingSecret = await this.getSecret(path, requester);

      // Encrypt new value if required
      let secretValue = newValue;
      if (existingSecret.metadata.encrypted) {
        secretValue = await this.encryptionService.encrypt(newValue);
      }

      // Update metadata
      const newVersion = existingSecret.metadata.version + 1;
      const updatedMetadata: SecretMetadata = {
        ...existingSecret.metadata,
        description: options?.description || existingSecret.metadata.description,
        tags: { ...existingSecret.metadata.tags, ...options?.tags },
        updatedBy: requester,
        updatedAt: new Date(),
        version: newVersion
      };

      // Get provider client
      const provider = this.getProvider(existingSecret.metadata.provider);

      // Update secret in provider
      await provider.updateSecret({
        path,
        value: secretValue,
        metadata: updatedMetadata,
        version: newVersion
      });

      // Clear cache
      this.clearSecretCache(path);

      // Log audit event
      await this.auditLogger.logEvent({
        type: 'secret_updated',
        secretPath: path,
        requester,
        timestamp: new Date(),
        metadata: { 
          oldVersion: existingSecret.metadata.version,
          newVersion,
          provider: existingSecret.metadata.provider
        },
        duration: Date.now() - startTime
      });

      this.emit('secret:updated', { 
        path, 
        oldVersion: existingSecret.metadata.version, 
        newVersion, 
        requester 
      });

      return {
        success: true,
        secretId: existingSecret.id,
        path,
        version: newVersion,
        metadata: {
          updatedAt: updatedMetadata.updatedAt,
          encrypted: updatedMetadata.encrypted,
          provider: existingSecret.metadata.provider
        }
      };

    } catch (error) {
      this.logger.error('Failed to update secret', error);
      
      await this.auditLogger.logEvent({
        type: 'secret_update_failed',
        secretPath: path,
        requester,
        timestamp: new Date(),
        error: error.message,
        duration: Date.now() - startTime
      });

      throw error;
    }
  }

  /**
   * Delete a secret with audit logging
   */
  async deleteSecret(path: string, requester: string): Promise<void> {
    const startTime = Date.now();
    
    try {
      this.logger.info('Deleting secret', { path, requester });

      // Check access permissions
      await this.accessController.checkAccess(requester, 'delete', path);

      // Get secret metadata before deletion
      const secret = await this.getSecret(path, requester);

      // Get provider client
      const provider = this.getProvider(secret.metadata.provider);

      // Delete from provider
      await provider.deleteSecret(path);

      // Cancel any scheduled rotations
      await this.rotationScheduler.cancelRotation(secret.id);

      // Clear cache
      this.clearSecretCache(path);

      // Log audit event
      await this.auditLogger.logEvent({
        type: 'secret_deleted',
        secretPath: path,
        requester,
        timestamp: new Date(),
        metadata: { 
          provider: secret.metadata.provider,
          version: secret.metadata.version
        },
        duration: Date.now() - startTime
      });

      this.emit('secret:deleted', { secret, requester });

    } catch (error) {
      this.logger.error('Failed to delete secret', error);
      
      await this.auditLogger.logEvent({
        type: 'secret_delete_failed',
        secretPath: path,
        requester,
        timestamp: new Date(),
        error: error.message,
        duration: Date.now() - startTime
      });

      throw error;
    }
  }

  /**
   * Rotate a secret according to its rotation policy
   */
  async rotateSecret(secretId: string, requester: string): Promise<RotationResult> {
    const startTime = Date.now();
    
    try {
      this.logger.info('Rotating secret', { secretId, requester });

      // Find secret by ID
      const secret = await this.findSecretById(secretId);
      if (!secret) {
        throw new Error(`Secret with ID ${secretId} not found`);
      }

      // Check access permissions
      await this.accessController.checkAccess(requester, 'rotate', secret.path);

      // Check if secret has rotation policy
      if (!secret.metadata.rotationPolicy) {
        throw new Error(`Secret ${secret.path} does not have a rotation policy`);
      }

      // Generate new secret value
      const newValue = await this.generateSecretValue(secret.metadata.rotationPolicy);

      // Update secret with new value
      const updateResult = await this.updateSecret(secret.path, newValue, requester, {
        description: `Rotated on ${new Date().toISOString()}`
      });

      // Schedule next rotation
      await this.rotationScheduler.scheduleRotation(secretId, secret.metadata.rotationPolicy);

      // Log audit event
      await this.auditLogger.logEvent({
        type: 'secret_rotated',
        secretPath: secret.path,
        requester,
        timestamp: new Date(),
        metadata: { 
          secretId,
          oldVersion: secret.metadata.version,
          newVersion: updateResult.version,
          rotationPolicy: secret.metadata.rotationPolicy.type
        },
        duration: Date.now() - startTime
      });

      this.emit('secret:rotated', { 
        secretId, 
        path: secret.path, 
        oldVersion: secret.metadata.version,
        newVersion: updateResult.version,
        requester 
      });

      return {
        success: true,
        secretId,
        path: secret.path,
        oldVersion: secret.metadata.version,
        newVersion: updateResult.version!,
        rotatedAt: new Date(),
        nextRotation: this.rotationScheduler.getNextRotationTime(secretId)
      };

    } catch (error) {
      this.logger.error('Failed to rotate secret', error);
      
      await this.auditLogger.logEvent({
        type: 'secret_rotation_failed',
        secretPath: secretId,
        requester,
        timestamp: new Date(),
        error: error.message,
        duration: Date.now() - startTime
      });

      throw error;
    }
  }

  /**
   * List secrets with filtering and pagination
   */
  async listSecrets(
    requester: string,
    options?: {
      prefix?: string;
      tags?: Record<string, string>;
      provider?: SecretProvider;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ secrets: SecretMetadata[]; total: number; hasMore: boolean }> {
    try {
      this.logger.debug('Listing secrets', { requester, options });

      // Check base access permission
      await this.accessController.checkAccess(requester, 'list', options?.prefix || '/');

      const results: SecretMetadata[] = [];
      const providers = options?.provider ? [options.provider] : Array.from(this.providers.keys());

      for (const providerType of providers) {
        const provider = this.getProvider(providerType);
        const providerResults = await provider.listSecrets({
          prefix: options?.prefix,
          tags: options?.tags,
          limit: options?.limit,
          offset: options?.offset
        });

        // Filter results based on access permissions
        for (const metadata of providerResults.secrets) {
          try {
            await this.accessController.checkAccess(requester, 'read', metadata.path);
            results.push(metadata);
          } catch {
            // Skip secrets the user doesn't have access to
          }
        }
      }

      // Apply pagination
      const limit = options?.limit || 50;
      const offset = options?.offset || 0;
      const paginatedResults = results.slice(offset, offset + limit);

      await this.auditLogger.logEvent({
        type: 'secrets_listed',
        requester,
        timestamp: new Date(),
        metadata: { 
          count: paginatedResults.length,
          prefix: options?.prefix,
          provider: options?.provider
        }
      });

      return {
        secrets: paginatedResults,
        total: results.length,
        hasMore: offset + limit < results.length
      };

    } catch (error) {
      this.logger.error('Failed to list secrets', error);
      throw error;
    }
  }  
// Private helper methods

  private initializeProviders(): void {
    // Initialize HashiCorp Vault
    if (this.config.providers.vault?.enabled) {
      this.providers.set(SecretProvider.VAULT, new VaultClient(this.config.providers.vault));
      this.logger.info('HashiCorp Vault provider initialized');
    }

    // Initialize AWS Secrets Manager
    if (this.config.providers.aws?.enabled) {
      this.providers.set(SecretProvider.AWS_SECRETS_MANAGER, new AWSSecretsClient(this.config.providers.aws));
      this.logger.info('AWS Secrets Manager provider initialized');
    }

    // Initialize Azure Key Vault
    if (this.config.providers.azure?.enabled) {
      this.providers.set(SecretProvider.AZURE_KEY_VAULT, new AzureKeyVaultClient(this.config.providers.azure));
      this.logger.info('Azure Key Vault provider initialized');
    }

    if (this.providers.size === 0) {
      throw new Error('No secret providers configured');
    }
  }

  private setupEventHandlers(): void {
    // Handle rotation events
    this.rotationScheduler.on('rotation:due', async (secretId: string) => {
      try {
        await this.rotateSecret(secretId, 'system');
      } catch (error) {
        this.logger.error('Automatic rotation failed', { secretId, error });
        this.emit('rotation:failed', { secretId, error });
      }
    });

    // Handle access violations
    this.accessController.on('access:denied', (event) => {
      this.auditLogger.logEvent({
        type: 'access_denied',
        secretPath: event.path,
        requester: event.requester,
        timestamp: new Date(),
        metadata: { action: event.action, reason: event.reason }
      });
    });

    // Handle encryption service events
    this.encryptionService.on('key:rotated', (keyId: string) => {
      this.logger.info('Encryption key rotated', { keyId });
      this.clearAllCache(); // Clear cache when encryption keys change
    });
  }

  private getProvider(providerType: SecretProvider): any {
    const provider = this.providers.get(providerType);
    if (!provider) {
      throw new Error(`Provider ${providerType} not configured`);
    }
    return provider;
  }

  private async determineProvider(path: string): Promise<SecretProvider> {
    // Check if path has provider prefix
    if (path.startsWith('vault/')) {
      return SecretProvider.VAULT;
    }
    if (path.startsWith('aws/')) {
      return SecretProvider.AWS_SECRETS_MANAGER;
    }
    if (path.startsWith('azure/')) {
      return SecretProvider.AZURE_KEY_VAULT;
    }

    // Use default provider
    return this.config.defaultProvider || SecretProvider.VAULT;
  }

  private async validateSecretRequest(request: SecretRequest): Promise<void> {
    if (!request.path || request.path.trim().length === 0) {
      throw new Error('Secret path is required');
    }

    if (!request.value || request.value.trim().length === 0) {
      throw new Error('Secret value is required');
    }

    if (!request.requester || request.requester.trim().length === 0) {
      throw new Error('Requester is required');
    }

    // Validate path format
    if (!/^[a-zA-Z0-9/_-]+$/.test(request.path)) {
      throw new Error('Secret path contains invalid characters');
    }

    // Check value size limits
    if (request.value.length > this.config.maxSecretSize) {
      throw new Error(`Secret value exceeds maximum size of ${this.config.maxSecretSize} bytes`);
    }

    // Validate rotation policy if provided
    if (request.rotationPolicy) {
      await this.validateRotationPolicy(request.rotationPolicy);
    }
  }

  private async validateRotationPolicy(policy: RotationPolicy): Promise<void> {
    if (!policy.type || !['automatic', 'manual'].includes(policy.type)) {
      throw new Error('Invalid rotation policy type');
    }

    if (policy.type === 'automatic') {
      if (!policy.intervalDays || policy.intervalDays < 1) {
        throw new Error('Automatic rotation requires valid interval in days');
      }

      if (policy.intervalDays < this.config.rotation.minIntervalDays) {
        throw new Error(`Rotation interval must be at least ${this.config.rotation.minIntervalDays} days`);
      }
    }
  }

  private async generateSecretValue(rotationPolicy: RotationPolicy): Promise<string> {
    switch (rotationPolicy.generationType) {
      case 'password':
        return this.generatePassword(rotationPolicy.generationOptions);
      case 'api_key':
        return this.generateApiKey(rotationPolicy.generationOptions);
      case 'certificate':
        return await this.generateCertificate(rotationPolicy.generationOptions);
      case 'custom':
        if (rotationPolicy.customGenerator) {
          return await rotationPolicy.customGenerator();
        }
        throw new Error('Custom generator not provided');
      default:
        throw new Error(`Unsupported generation type: ${rotationPolicy.generationType}`);
    }
  }

  private generatePassword(options?: any): string {
    const length = options?.length || 32;
    const charset = options?.charset || 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    
    return password;
  }

  private generateApiKey(options?: any): string {
    const length = options?.length || 64;
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    
    let apiKey = '';
    for (let i = 0; i < length; i++) {
      apiKey += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    
    return apiKey;
  }

  private async generateCertificate(options?: any): Promise<string> {
    // This would integrate with a certificate authority
    // For now, return a placeholder
    throw new Error('Certificate generation not implemented');
  }

  private async findSecretById(secretId: string): Promise<Secret | null> {
    // Search across all providers for the secret
    for (const [providerType, provider] of this.providers) {
      try {
        const secret = await provider.getSecretById(secretId);
        if (secret) {
          return secret;
        }
      } catch (error) {
        // Continue searching in other providers
      }
    }
    return null;
  }

  private clearSecretCache(path: string): void {
    const keysToDelete = Array.from(this.secretCache.keys()).filter(key => key.startsWith(path));
    keysToDelete.forEach(key => this.secretCache.delete(key));
  }

  private clearAllCache(): void {
    this.secretCache.clear();
  }

  private generateSecretId(): string {
    return `secret_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Health check for all configured providers
   */
  async healthCheck(): Promise<{ [key: string]: { healthy: boolean; latency?: number; error?: string } }> {
    const results: { [key: string]: { healthy: boolean; latency?: number; error?: string } } = {};

    for (const [providerType, provider] of this.providers) {
      const startTime = Date.now();
      try {
        await provider.healthCheck();
        results[providerType] = {
          healthy: true,
          latency: Date.now() - startTime
        };
      } catch (error) {
        results[providerType] = {
          healthy: false,
          latency: Date.now() - startTime,
          error: error.message
        };
      }
    }

    return results;
  }

  /**
   * Get comprehensive metrics for monitoring
   */
  getMetrics(): any {
    return {
      cache: {
        size: this.secretCache.size,
        hitRate: this.getCacheHitRate()
      },
      providers: {
        configured: this.providers.size,
        healthy: Object.values(this.healthCheck()).filter(p => p.healthy).length
      },
      rotation: {
        scheduled: this.rotationScheduler.getScheduledRotationsCount(),
        overdue: this.rotationScheduler.getOverdueRotationsCount()
      }
    };
  }

  private getCacheHitRate(): number {
    // This would be tracked with actual cache hit/miss counters
    return 0.85; // Placeholder
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down secrets manager');
    
    // Stop rotation scheduler
    await this.rotationScheduler.stop();
    
    // Close provider connections
    for (const [providerType, provider] of this.providers) {
      try {
        if (provider.close) {
          await provider.close();
        }
      } catch (error) {
        this.logger.error(`Error closing ${providerType} provider`, error);
      }
    }
    
    // Clear cache
    this.clearAllCache();
    
    this.emit('shutdown:complete');
  }
}