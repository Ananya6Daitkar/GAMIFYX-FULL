/**
 * HashiCorp Vault Client for GamifyX Secrets Manager
 * Provides comprehensive integration with Vault KV, Transit, and PKI engines
 */

import { EventEmitter } from 'events';
import axios, { AxiosInstance } from 'axios';
import { Logger } from '../utils/logger';
import { 
  Secret, 
  SecretMetadata, 
  VaultConfig,
  VaultAuthMethod,
  VaultEngine
} from '../types/secrets-types';

export class VaultClient extends EventEmitter {
  private logger: Logger;
  private config: VaultConfig;
  private client: AxiosInstance;
  private token: string | null = null;
  private tokenExpiresAt: Date | null = null;
  private renewalTimer: NodeJS.Timeout | null = null;

  constructor(config: VaultConfig) {
    super();
    this.config = config;
    this.logger = new Logger('VaultClient');
    
    // Initialize HTTP client
    this.client = axios.create({
      baseURL: config.address,
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Set up request/response interceptors
    this.setupInterceptors();
  }

  /**
   * Initialize Vault client with authentication
   */
  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing Vault client', { address: this.config.address });

      // Authenticate with Vault
      await this.authenticate();

      // Set up token renewal
      this.setupTokenRenewal();

      // Verify connection
      await this.healthCheck();

      this.logger.info('Vault client initialized successfully');
      this.emit('initialized');

    } catch (error) {
      this.logger.error('Failed to initialize Vault client', error);
      throw error;
    }
  }

  /**
   * Store a secret in Vault KV engine
   */
  async storeSecret(request: {
    path: string;
    value: string;
    metadata: SecretMetadata;
    options?: any;
  }): Promise<{ id?: string; version?: number }> {
    try {
      await this.ensureAuthenticated();

      const engine = this.config.engines?.kv || 'secret';
      const fullPath = `${engine}/data/${request.path}`;

      // Prepare secret data
      const secretData = {
        data: {
          value: request.value,
          metadata: JSON.stringify(request.metadata)
        },
        options: request.options || {}
      };

      this.logger.debug('Storing secret in Vault', { path: fullPath });

      const response = await this.client.post(fullPath, secretData);

      return {
        version: response.data?.data?.version
      };

    } catch (error) {
      this.logger.error('Failed to store secret in Vault', error);
      throw this.handleVaultError(error);
    }
  }

  /**
   * Retrieve a secret from Vault KV engine
   */
  async getSecret(path: string, version?: number): Promise<Secret> {
    try {
      await this.ensureAuthenticated();

      const engine = this.config.engines?.kv || 'secret';
      let fullPath = `${engine}/data/${path}`;
      
      if (version) {
        fullPath += `?version=${version}`;
      }

      this.logger.debug('Retrieving secret from Vault', { path: fullPath });

      const response = await this.client.get(fullPath);
      const data = response.data?.data;

      if (!data) {
        throw new Error(`Secret not found at path: ${path}`);
      }

      // Parse metadata
      let metadata: SecretMetadata;
      try {
        metadata = JSON.parse(data.metadata || '{}');
      } catch {
        metadata = {
          path,
          createdAt: new Date(),
          updatedAt: new Date(),
          version: data.metadata?.version || 1,
          provider: 'vault'
        } as SecretMetadata;
      }

      // Get all versions if available
      const versions = await this.getSecretVersions(path);

      return {
        id: `vault_${path.replace(/\//g, '_')}`,
        path,
        value: data.value,
        metadata,
        versions
      };

    } catch (error) {
      this.logger.error('Failed to retrieve secret from Vault', error);
      throw this.handleVaultError(error);
    }
  }

  /**
   * Update a secret in Vault KV engine
   */
  async updateSecret(request: {
    path: string;
    value: string;
    metadata: SecretMetadata;
    version: number;
  }): Promise<void> {
    try {
      await this.ensureAuthenticated();

      const engine = this.config.engines?.kv || 'secret';
      const fullPath = `${engine}/data/${request.path}`;

      // Check-and-set operation for version control
      const secretData = {
        data: {
          value: request.value,
          metadata: JSON.stringify(request.metadata)
        },
        options: {
          cas: request.version - 1 // Current version - 1 for CAS
        }
      };

      this.logger.debug('Updating secret in Vault', { path: fullPath, version: request.version });

      await this.client.post(fullPath, secretData);

    } catch (error) {
      this.logger.error('Failed to update secret in Vault', error);
      throw this.handleVaultError(error);
    }
  }

  /**
   * Delete a secret from Vault KV engine
   */
  async deleteSecret(path: string): Promise<void> {
    try {
      await this.ensureAuthenticated();

      const engine = this.config.engines?.kv || 'secret';
      const metadataPath = `${engine}/metadata/${path}`;

      this.logger.debug('Deleting secret from Vault', { path: metadataPath });

      await this.client.delete(metadataPath);

    } catch (error) {
      this.logger.error('Failed to delete secret from Vault', error);
      throw this.handleVaultError(error);
    }
  }

  /**
   * List secrets with optional filtering
   */
  async listSecrets(options?: {
    prefix?: string;
    tags?: Record<string, string>;
    limit?: number;
    offset?: number;
  }): Promise<{ secrets: SecretMetadata[]; total: number }> {
    try {
      await this.ensureAuthenticated();

      const engine = this.config.engines?.kv || 'secret';
      const listPath = `${engine}/metadata/${options?.prefix || ''}`;

      this.logger.debug('Listing secrets from Vault', { path: listPath });

      const response = await this.client.get(listPath + '?list=true');
      const keys = response.data?.data?.keys || [];

      const secrets: SecretMetadata[] = [];

      // Get metadata for each secret
      for (const key of keys) {
        try {
          const secretPath = options?.prefix ? `${options.prefix}/${key}` : key;
          const metadataPath = `${engine}/metadata/${secretPath}`;
          
          const metadataResponse = await this.client.get(metadataPath);
          const metadata = metadataResponse.data?.data;

          if (metadata) {
            secrets.push({
              path: secretPath,
              description: metadata.custom_metadata?.description,
              tags: metadata.custom_metadata?.tags || {},
              createdAt: new Date(metadata.created_time),
              updatedAt: new Date(metadata.updated_time),
              version: metadata.current_version,
              provider: 'vault'
            } as SecretMetadata);
          }
        } catch (error) {
          // Skip secrets we can't access
          this.logger.debug('Skipping inaccessible secret', { key, error: error.message });
        }
      }

      // Apply filtering
      let filteredSecrets = secrets;
      
      if (options?.tags) {
        filteredSecrets = secrets.filter(secret => {
          return Object.entries(options.tags!).every(([key, value]) => 
            secret.tags?.[key] === value
          );
        });
      }

      // Apply pagination
      const offset = options?.offset || 0;
      const limit = options?.limit || 50;
      const paginatedSecrets = filteredSecrets.slice(offset, offset + limit);

      return {
        secrets: paginatedSecrets,
        total: filteredSecrets.length
      };

    } catch (error) {
      this.logger.error('Failed to list secrets from Vault', error);
      throw this.handleVaultError(error);
    }
  }

  /**
   * Encrypt data using Vault Transit engine
   */
  async encrypt(plaintext: string, keyName: string = 'default'): Promise<string> {
    try {
      await this.ensureAuthenticated();

      const engine = this.config.engines?.transit || 'transit';
      const encryptPath = `${engine}/encrypt/${keyName}`;

      const response = await this.client.post(encryptPath, {
        plaintext: Buffer.from(plaintext).toString('base64')
      });

      return response.data?.data?.ciphertext;

    } catch (error) {
      this.logger.error('Failed to encrypt data with Vault', error);
      throw this.handleVaultError(error);
    }
  }

  /**
   * Decrypt data using Vault Transit engine
   */
  async decrypt(ciphertext: string, keyName: string = 'default'): Promise<string> {
    try {
      await this.ensureAuthenticated();

      const engine = this.config.engines?.transit || 'transit';
      const decryptPath = `${engine}/decrypt/${keyName}`;

      const response = await this.client.post(decryptPath, {
        ciphertext
      });

      const plaintext = response.data?.data?.plaintext;
      return Buffer.from(plaintext, 'base64').toString();

    } catch (error) {
      this.logger.error('Failed to decrypt data with Vault', error);
      throw this.handleVaultError(error);
    }
  }

  /**
   * Generate a certificate using Vault PKI engine
   */
  async generateCertificate(options: {
    commonName: string;
    altNames?: string[];
    ttl?: string;
    role?: string;
  }): Promise<{ certificate: string; privateKey: string; serialNumber: string }> {
    try {
      await this.ensureAuthenticated();

      const engine = this.config.engines?.pki || 'pki';
      const role = options.role || 'default';
      const issuePath = `${engine}/issue/${role}`;

      const requestData = {
        common_name: options.commonName,
        alt_names: options.altNames?.join(','),
        ttl: options.ttl || '24h'
      };

      const response = await this.client.post(issuePath, requestData);
      const data = response.data?.data;

      return {
        certificate: data.certificate,
        privateKey: data.private_key,
        serialNumber: data.serial_number
      };

    } catch (error) {
      this.logger.error('Failed to generate certificate with Vault', error);
      throw this.handleVaultError(error);
    }
  }

  /**
   * Health check for Vault
   */
  async healthCheck(): Promise<void> {
    try {
      const response = await this.client.get('/v1/sys/health');
      
      if (response.status !== 200) {
        throw new Error(`Vault health check failed with status: ${response.status}`);
      }

      this.logger.debug('Vault health check passed');

    } catch (error) {
      this.logger.error('Vault health check failed', error);
      throw error;
    }
  }

  // Private helper methods

  private async authenticate(): Promise<void> {
    switch (this.config.authMethod) {
      case VaultAuthMethod.TOKEN:
        await this.authenticateWithToken();
        break;
      case VaultAuthMethod.USERPASS:
        await this.authenticateWithUserPass();
        break;
      case VaultAuthMethod.AWS:
        await this.authenticateWithAWS();
        break;
      case VaultAuthMethod.KUBERNETES:
        await this.authenticateWithKubernetes();
        break;
      default:
        throw new Error(`Unsupported auth method: ${this.config.authMethod}`);
    }
  }

  private async authenticateWithToken(): Promise<void> {
    if (!this.config.token) {
      throw new Error('Token not provided for token authentication');
    }

    this.token = this.config.token;
    
    // Verify token and get TTL
    const response = await this.client.get('/v1/auth/token/lookup-self', {
      headers: { 'X-Vault-Token': this.token }
    });

    const ttl = response.data?.data?.ttl;
    if (ttl) {
      this.tokenExpiresAt = new Date(Date.now() + ttl * 1000);
    }

    this.logger.info('Authenticated with Vault using token');
  }

  private async authenticateWithUserPass(): Promise<void> {
    if (!this.config.username || !this.config.password) {
      throw new Error('Username and password required for userpass authentication');
    }

    const response = await this.client.post(`/v1/auth/userpass/login/${this.config.username}`, {
      password: this.config.password
    });

    this.token = response.data?.auth?.client_token;
    const leaseDuration = response.data?.auth?.lease_duration;

    if (leaseDuration) {
      this.tokenExpiresAt = new Date(Date.now() + leaseDuration * 1000);
    }

    this.logger.info('Authenticated with Vault using userpass');
  }

  private async authenticateWithAWS(): Promise<void> {
    // AWS IAM authentication implementation
    throw new Error('AWS authentication not implemented');
  }

  private async authenticateWithKubernetes(): Promise<void> {
    // Kubernetes service account authentication implementation
    throw new Error('Kubernetes authentication not implemented');
  }

  private async ensureAuthenticated(): Promise<void> {
    if (!this.token) {
      await this.authenticate();
    }

    // Check if token is expired
    if (this.tokenExpiresAt && this.tokenExpiresAt <= new Date()) {
      this.logger.info('Token expired, re-authenticating');
      await this.authenticate();
    }
  }

  private setupTokenRenewal(): void {
    if (!this.tokenExpiresAt || this.config.authMethod === VaultAuthMethod.TOKEN) {
      return; // Don't renew root tokens
    }

    const renewalTime = this.tokenExpiresAt.getTime() - Date.now() - 300000; // 5 minutes before expiry
    
    if (renewalTime > 0) {
      this.renewalTimer = setTimeout(async () => {
        try {
          await this.renewToken();
        } catch (error) {
          this.logger.error('Token renewal failed', error);
          this.emit('token:renewal:failed', error);
        }
      }, renewalTime);
    }
  }

  private async renewToken(): Promise<void> {
    if (!this.token) return;

    try {
      const response = await this.client.post('/v1/auth/token/renew-self', {}, {
        headers: { 'X-Vault-Token': this.token }
      });

      const leaseDuration = response.data?.auth?.lease_duration;
      if (leaseDuration) {
        this.tokenExpiresAt = new Date(Date.now() + leaseDuration * 1000);
        this.setupTokenRenewal(); // Schedule next renewal
      }

      this.logger.info('Token renewed successfully');
      this.emit('token:renewed');

    } catch (error) {
      this.logger.error('Failed to renew token', error);
      throw error;
    }
  }

  private setupInterceptors(): void {
    // Request interceptor to add auth token
    this.client.interceptors.request.use((config) => {
      if (this.token) {
        config.headers['X-Vault-Token'] = this.token;
      }
      return config;
    });

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 403) {
          this.logger.warn('Vault access denied, token may be invalid');
          this.token = null;
          this.tokenExpiresAt = null;
        }
        return Promise.reject(error);
      }
    );
  }

  private async getSecretVersions(path: string): Promise<any[]> {
    try {
      const engine = this.config.engines?.kv || 'secret';
      const metadataPath = `${engine}/metadata/${path}`;

      const response = await this.client.get(metadataPath);
      const versions = response.data?.data?.versions || {};

      return Object.entries(versions).map(([version, data]: [string, any]) => ({
        version: parseInt(version),
        createdAt: new Date(data.created_time),
        deletedAt: data.deletion_time ? new Date(data.deletion_time) : null,
        destroyed: data.destroyed || false,
        active: !data.destroyed && !data.deletion_time
      }));

    } catch (error) {
      this.logger.debug('Failed to get secret versions', error);
      return [];
    }
  }

  private handleVaultError(error: any): Error {
    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.errors?.[0] || error.response.statusText;
      
      switch (status) {
        case 403:
          return new Error(`Vault access denied: ${message}`);
        case 404:
          return new Error(`Vault path not found: ${message}`);
        case 400:
          return new Error(`Vault bad request: ${message}`);
        default:
          return new Error(`Vault error (${status}): ${message}`);
      }
    }

    return error;
  }

  async getSecretById(secretId: string): Promise<Secret | null> {
    // Extract path from secret ID (vault_path_to_secret -> path/to/secret)
    const path = secretId.replace('vault_', '').replace(/_/g, '/');
    
    try {
      return await this.getSecret(path);
    } catch (error) {
      return null;
    }
  }

  async close(): Promise<void> {
    if (this.renewalTimer) {
      clearTimeout(this.renewalTimer);
      this.renewalTimer = null;
    }
    
    this.token = null;
    this.tokenExpiresAt = null;
    
    this.logger.info('Vault client closed');
  }
}