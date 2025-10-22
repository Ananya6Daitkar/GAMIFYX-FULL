import * as vault from 'node-vault';
import { Secret, SecretType, CreateSecretRequest, UpdateSecretRequest, VaultConfig } from '@/models/Secret';
import { logger } from '@/telemetry/logger';
import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('secrets-manager', '1.0.0');

// Vault metrics
const vaultOperations = meter.createCounter('vault_operations_total', {
  description: 'Total Vault operations performed'
});

const vaultErrors = meter.createCounter('vault_errors_total', {
  description: 'Total Vault operation errors'
});

const secretsCount = meter.createUpDownCounter('secrets_count', {
  description: 'Current number of secrets stored'
});

export class VaultService {
  private client: any;
  private config: VaultConfig;

  constructor(config?: Partial<VaultConfig>) {
    this.config = {
      endpoint: process.env.VAULT_ENDPOINT || 'http://localhost:8200',
      token: process.env.VAULT_TOKEN || 'dev-token',
      namespace: process.env.VAULT_NAMESPACE,
      apiVersion: process.env.VAULT_API_VERSION || 'v1',
      timeout: parseInt(process.env.VAULT_TIMEOUT || '30000'),
      retries: parseInt(process.env.VAULT_RETRIES || '3'),
      ...config
    };

    this.client = vault({
      endpoint: this.config.endpoint,
      token: this.config.token,
      namespace: this.config.namespace,
      apiVersion: this.config.apiVersion,
      timeout: this.config.timeout
    });
  }

  async initialize(): Promise<void> {
    try {
      // Check Vault status
      const status = await this.client.status();
      logger.info('Vault connection established', { 
        sealed: status.sealed,
        version: status.version 
      });

      // Enable KV secrets engine if not already enabled
      try {
        await this.client.mount({
          mount_point: 'aiops-secrets',
          type: 'kv-v2',
          description: 'AIOps Learning Platform secrets'
        });
        logger.info('KV secrets engine enabled');
      } catch (error: any) {
        if (error.response?.statusCode === 400) {
          logger.info('KV secrets engine already enabled');
        } else {
          throw error;
        }
      }

      // Enable database secrets engine for dynamic credentials
      try {
        await this.client.mount({
          mount_point: 'database',
          type: 'database',
          description: 'Dynamic database credentials'
        });
        logger.info('Database secrets engine enabled');
      } catch (error: any) {
        if (error.response?.statusCode === 400) {
          logger.info('Database secrets engine already enabled');
        } else {
          logger.warn('Failed to enable database secrets engine', { error: error.message });
        }
      }

    } catch (error) {
      logger.error('Failed to initialize Vault', { error });
      throw error;
    }
  }

  async createSecret(request: CreateSecretRequest): Promise<Secret> {
    vaultOperations.add(1, { operation: 'create' });

    try {
      const secretPath = this.normalizePath(request.path);
      
      const secretData = {
        value: request.value,
        metadata: request.metadata,
        type: request.type,
        rotationConfig: request.rotationConfig,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        expiresAt: request.expiresAt?.toISOString()
      };

      // Store secret in Vault
      await this.client.write(`aiops-secrets/data/${secretPath}`, {
        data: secretData
      });

      // Store metadata separately for easier querying
      await this.client.write(`aiops-secrets/metadata/${secretPath}`, {
        custom_metadata: {
          name: request.name,
          type: request.type,
          owner: request.metadata.owner,
          environment: request.metadata.environment,
          service: request.metadata.service,
          tags: request.metadata.tags.join(','),
          rotation_enabled: request.rotationConfig?.enabled.toString() || 'false',
          rotation_interval: request.rotationConfig?.intervalDays?.toString() || '90'
        }
      });

      secretsCount.add(1);

      logger.info('Secret created successfully', { 
        path: secretPath,
        type: request.type,
        owner: request.metadata.owner
      });

      return {
        id: secretPath,
        name: request.name,
        path: secretPath,
        type: request.type,
        metadata: request.metadata,
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: request.expiresAt,
        rotationConfig: request.rotationConfig
      };

    } catch (error) {
      vaultErrors.add(1, { operation: 'create' });
      logger.error('Failed to create secret', { error, path: request.path });
      throw error;
    }
  }

  async getSecret(path: string, includeValue: boolean = true): Promise<Secret | null> {
    vaultOperations.add(1, { operation: 'read' });

    try {
      const secretPath = this.normalizePath(path);
      
      // Get secret data
      const response = await this.client.read(`aiops-secrets/data/${secretPath}`);
      
      if (!response?.data?.data) {
        return null;
      }

      const secretData = response.data.data;
      
      // Get metadata
      const metadataResponse = await this.client.read(`aiops-secrets/metadata/${secretPath}`);
      const customMetadata = metadataResponse?.data?.custom_metadata || {};

      const secret: Secret = {
        id: secretPath,
        name: customMetadata.name || secretPath,
        path: secretPath,
        type: secretData.type as SecretType,
        metadata: secretData.metadata,
        createdAt: new Date(secretData.createdAt),
        updatedAt: new Date(secretData.updatedAt),
        expiresAt: secretData.expiresAt ? new Date(secretData.expiresAt) : undefined,
        rotationConfig: secretData.rotationConfig
      };

      if (includeValue) {
        secret.value = secretData.value;
      }

      logger.info('Secret retrieved successfully', { 
        path: secretPath,
        includeValue
      });

      return secret;

    } catch (error: any) {
      if (error.response?.statusCode === 404) {
        return null;
      }
      
      vaultErrors.add(1, { operation: 'read' });
      logger.error('Failed to get secret', { error, path });
      throw error;
    }
  }

  async updateSecret(path: string, request: UpdateSecretRequest): Promise<Secret> {
    vaultOperations.add(1, { operation: 'update' });

    try {
      const secretPath = this.normalizePath(path);
      
      // Get existing secret
      const existing = await this.getSecret(secretPath, true);
      if (!existing) {
        throw new Error(`Secret not found: ${secretPath}`);
      }

      // Merge updates
      const updatedData = {
        value: request.value || existing.value,
        metadata: { ...existing.metadata, ...request.metadata },
        type: existing.type,
        rotationConfig: request.rotationConfig || existing.rotationConfig,
        createdAt: existing.createdAt.toISOString(),
        updatedAt: new Date().toISOString(),
        expiresAt: request.expiresAt?.toISOString() || existing.expiresAt?.toISOString()
      };

      // Update secret in Vault
      await this.client.write(`aiops-secrets/data/${secretPath}`, {
        data: updatedData
      });

      // Update metadata
      const updatedMetadata = { ...existing.metadata, ...request.metadata };
      await this.client.write(`aiops-secrets/metadata/${secretPath}`, {
        custom_metadata: {
          name: existing.name,
          type: existing.type,
          owner: updatedMetadata.owner,
          environment: updatedMetadata.environment,
          service: updatedMetadata.service,
          tags: updatedMetadata.tags.join(','),
          rotation_enabled: updatedData.rotationConfig?.enabled.toString() || 'false',
          rotation_interval: updatedData.rotationConfig?.intervalDays?.toString() || '90'
        }
      });

      logger.info('Secret updated successfully', { 
        path: secretPath,
        hasNewValue: !!request.value
      });

      return {
        ...existing,
        metadata: updatedMetadata,
        updatedAt: new Date(),
        expiresAt: request.expiresAt || existing.expiresAt,
        rotationConfig: request.rotationConfig || existing.rotationConfig
      };

    } catch (error) {
      vaultErrors.add(1, { operation: 'update' });
      logger.error('Failed to update secret', { error, path });
      throw error;
    }
  }

  async deleteSecret(path: string): Promise<void> {
    vaultOperations.add(1, { operation: 'delete' });

    try {
      const secretPath = this.normalizePath(path);
      
      // Delete secret data
      await this.client.delete(`aiops-secrets/data/${secretPath}`);
      
      // Delete metadata
      await this.client.delete(`aiops-secrets/metadata/${secretPath}`);

      secretsCount.add(-1);

      logger.info('Secret deleted successfully', { path: secretPath });

    } catch (error) {
      vaultErrors.add(1, { operation: 'delete' });
      logger.error('Failed to delete secret', { error, path });
      throw error;
    }
  }

  async listSecrets(prefix?: string): Promise<string[]> {
    vaultOperations.add(1, { operation: 'list' });

    try {
      const listPath = prefix ? `aiops-secrets/metadata/${prefix}` : 'aiops-secrets/metadata/';
      
      const response = await this.client.list(listPath);
      
      if (!response?.data?.keys) {
        return [];
      }

      logger.info('Secrets listed successfully', { 
        prefix,
        count: response.data.keys.length
      });

      return response.data.keys;

    } catch (error: any) {
      if (error.response?.statusCode === 404) {
        return [];
      }
      
      vaultErrors.add(1, { operation: 'list' });
      logger.error('Failed to list secrets', { error, prefix });
      throw error;
    }
  }

  async rotateSecret(path: string): Promise<Secret> {
    vaultOperations.add(1, { operation: 'rotate' });

    try {
      const secretPath = this.normalizePath(path);
      const secret = await this.getSecret(secretPath, true);
      
      if (!secret) {
        throw new Error(`Secret not found: ${secretPath}`);
      }

      if (!secret.rotationConfig?.enabled) {
        throw new Error(`Rotation not enabled for secret: ${secretPath}`);
      }

      let newValue: string;

      // Generate new value based on rotation strategy
      switch (secret.rotationConfig.strategy) {
        case 'regenerate':
          newValue = this.generateRandomSecret(32);
          break;
        case 'database_rotate':
          newValue = await this.rotateDatabasePassword(secret);
          break;
        case 'api_refresh':
          newValue = await this.refreshAPIKey(secret);
          break;
        default:
          newValue = this.generateRandomSecret(32);
      }

      // Update secret with new value
      const updatedSecret = await this.updateSecret(secretPath, {
        value: newValue
      });

      logger.info('Secret rotated successfully', { 
        path: secretPath,
        strategy: secret.rotationConfig.strategy
      });

      return updatedSecret;

    } catch (error) {
      vaultErrors.add(1, { operation: 'rotate' });
      logger.error('Failed to rotate secret', { error, path });
      throw error;
    }
  }

  async createDatabaseConnection(name: string, config: any): Promise<void> {
    try {
      await this.client.write(`database/config/${name}`, {
        plugin_name: 'postgresql-database-plugin',
        connection_url: `postgresql://{{username}}:{{password}}@${config.host}:${config.port}/${config.database}?sslmode=${config.ssl ? 'require' : 'disable'}`,
        allowed_roles: [`${name}-role`],
        username: config.username,
        password: config.password
      });

      // Create role for dynamic credentials
      await this.client.write(`database/roles/${name}-role`, {
        db_name: name,
        creation_statements: [
          `CREATE ROLE "{{name}}" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}';`,
          `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO "{{name}}";`
        ],
        default_ttl: '1h',
        max_ttl: '24h'
      });

      logger.info('Database connection configured', { name });

    } catch (error) {
      logger.error('Failed to configure database connection', { error, name });
      throw error;
    }
  }

  async getDynamicDatabaseCredentials(name: string): Promise<{ username: string; password: string; lease_id: string }> {
    try {
      const response = await this.client.read(`database/creds/${name}-role`);
      
      logger.info('Dynamic database credentials generated', { name });
      
      return {
        username: response.data.username,
        password: response.data.password,
        lease_id: response.lease_id
      };

    } catch (error) {
      logger.error('Failed to get dynamic database credentials', { error, name });
      throw error;
    }
  }

  private normalizePath(path: string): string {
    return path.replace(/^\/+|\/+$/g, '').replace(/\/+/g, '/');
  }

  private generateRandomSecret(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private async rotateDatabasePassword(secret: Secret): Promise<string> {
    // In a real implementation, this would connect to the database
    // and update the password for the user
    const newPassword = this.generateRandomSecret(24);
    
    // TODO: Implement actual database password rotation
    logger.info('Database password rotation simulated', { 
      path: secret.path 
    });
    
    return newPassword;
  }

  private async refreshAPIKey(secret: Secret): Promise<string> {
    // In a real implementation, this would call the API provider
    // to refresh the API key
    const newKey = `ak_${this.generateRandomSecret(32)}`;
    
    // TODO: Implement actual API key refresh
    logger.info('API key refresh simulated', { 
      path: secret.path 
    });
    
    return newKey;
  }

  async healthCheck(): Promise<{ status: string; sealed: boolean; version?: string }> {
    try {
      const status = await this.client.status();
      return {
        status: 'healthy',
        sealed: status.sealed,
        version: status.version
      };
    } catch (error) {
      logger.error('Vault health check failed', { error });
      return {
        status: 'unhealthy',
        sealed: true
      };
    }
  }
}