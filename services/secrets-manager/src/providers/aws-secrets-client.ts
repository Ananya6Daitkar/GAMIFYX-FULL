/**
 * AWS Secrets Manager Client for GamifyX Secrets Manager
 * Provides comprehensive integration with AWS Secrets Manager
 */

import { EventEmitter } from 'events';
import {
  SecretsManagerClient,
  CreateSecretCommand,
  GetSecretValueCommand,
  UpdateSecretCommand,
  DeleteSecretCommand,
  ListSecretsCommand,
  DescribeSecretCommand,
  PutSecretValueCommand,
  RestoreSecretCommand,
  RotateSecretCommand,
  GetRandomPasswordCommand,
  TagResourceCommand,
  UntagResourceCommand
} from '@aws-sdk/client-secrets-manager';
import { Logger } from '../utils/logger';
import { 
  Secret, 
  SecretMetadata, 
  AWSSecretsConfig
} from '../types/secrets-types';

export class AWSSecretsClient extends EventEmitter {
  private logger: Logger;
  private config: AWSSecretsConfig;
  private client: SecretsManagerClient;

  constructor(config: AWSSecretsConfig) {
    super();
    this.config = config;
    this.logger = new Logger('AWSSecretsClient');
    
    // Initialize AWS Secrets Manager client
    this.client = new SecretsManagerClient({
      region: config.region,
      credentials: config.credentials ? {
        accessKeyId: config.credentials.accessKeyId,
        secretAccessKey: config.credentials.secretAccessKey,
        sessionToken: config.credentials.sessionToken
      } : undefined,
      maxAttempts: config.maxRetries || 3
    });

    this.logger.info('AWS Secrets Manager client initialized', { region: config.region });
  }

  /**
   * Store a secret in AWS Secrets Manager
   */
  async storeSecret(request: {
    path: string;
    value: string;
    metadata: SecretMetadata;
    options?: any;
  }): Promise<{ id?: string; version?: string }> {
    try {
      const secretName = this.buildSecretName(request.path);
      
      this.logger.debug('Storing secret in AWS Secrets Manager', { secretName });

      // Prepare tags from metadata
      const tags = this.buildTagsFromMetadata(request.metadata);

      const command = new CreateSecretCommand({
        Name: secretName,
        SecretString: request.value,
        Description: request.metadata.description,
        Tags: tags,
        KmsKeyId: this.config.kmsKeyId,
        ReplicationRegions: this.config.replicationRegions?.map(region => ({
          Region: region,
          KmsKeyId: this.config.kmsKeyId
        }))
      });

      const response = await this.client.send(command);

      return {
        id: response.ARN,
        version: response.VersionId
      };

    } catch (error) {
      this.logger.error('Failed to store secret in AWS Secrets Manager', error);
      throw this.handleAWSError(error);
    }
  }

  /**
   * Retrieve a secret from AWS Secrets Manager
   */
  async getSecret(path: string, version?: number): Promise<Secret> {
    try {
      const secretName = this.buildSecretName(path);
      
      this.logger.debug('Retrieving secret from AWS Secrets Manager', { secretName, version });

      const command = new GetSecretValueCommand({
        SecretId: secretName,
        VersionId: version?.toString(),
        VersionStage: version ? undefined : 'AWSCURRENT'
      });

      const response = await this.client.send(command);

      if (!response.SecretString) {
        throw new Error(`Secret not found or empty: ${path}`);
      }

      // Get secret metadata
      const metadata = await this.getSecretMetadata(secretName);

      // Get all versions
      const versions = await this.getSecretVersions(secretName);

      return {
        id: response.ARN!,
        path,
        value: response.SecretString,
        metadata,
        versions
      };

    } catch (error) {
      this.logger.error('Failed to retrieve secret from AWS Secrets Manager', error);
      throw this.handleAWSError(error);
    }
  }

  /**
   * Update a secret in AWS Secrets Manager
   */
  async updateSecret(request: {
    path: string;
    value: string;
    metadata: SecretMetadata;
    version: number;
  }): Promise<void> {
    try {
      const secretName = this.buildSecretName(request.path);
      
      this.logger.debug('Updating secret in AWS Secrets Manager', { secretName });

      // Update secret value
      const updateCommand = new PutSecretValueCommand({
        SecretId: secretName,
        SecretString: request.value
      });

      await this.client.send(updateCommand);

      // Update tags if metadata changed
      const tags = this.buildTagsFromMetadata(request.metadata);
      if (tags.length > 0) {
        const tagCommand = new TagResourceCommand({
          SecretId: secretName,
          Tags: tags
        });
        await this.client.send(tagCommand);
      }

    } catch (error) {
      this.logger.error('Failed to update secret in AWS Secrets Manager', error);
      throw this.handleAWSError(error);
    }
  }

  /**
   * Delete a secret from AWS Secrets Manager
   */
  async deleteSecret(path: string): Promise<void> {
    try {
      const secretName = this.buildSecretName(path);
      
      this.logger.debug('Deleting secret from AWS Secrets Manager', { secretName });

      const command = new DeleteSecretCommand({
        SecretId: secretName,
        ForceDeleteWithoutRecovery: this.config.forceDelete || false,
        RecoveryWindowInDays: this.config.forceDelete ? undefined : (this.config.recoveryWindowDays || 30)
      });

      await this.client.send(command);

    } catch (error) {
      this.logger.error('Failed to delete secret from AWS Secrets Manager', error);
      throw this.handleAWSError(error);
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
      this.logger.debug('Listing secrets from AWS Secrets Manager', options);

      const secrets: SecretMetadata[] = [];
      let nextToken: string | undefined;
      const maxResults = Math.min(options?.limit || 100, 100); // AWS limit is 100

      do {
        const command = new ListSecretsCommand({
          MaxResults: maxResults,
          NextToken: nextToken,
          Filters: this.buildListFilters(options)
        });

        const response = await this.client.send(command);
        
        if (response.SecretList) {
          for (const secret of response.SecretList) {
            const metadata = this.buildMetadataFromAWSSecret(secret);
            
            // Apply prefix filter if specified
            if (options?.prefix && !metadata.path.startsWith(options.prefix)) {
              continue;
            }

            // Apply tag filter if specified
            if (options?.tags && !this.matchesTags(secret.Tags || [], options.tags)) {
              continue;
            }

            secrets.push(metadata);
          }
        }

        nextToken = response.NextToken;
      } while (nextToken && secrets.length < (options?.limit || 100));

      // Apply pagination
      const offset = options?.offset || 0;
      const limit = options?.limit || 50;
      const paginatedSecrets = secrets.slice(offset, offset + limit);

      return {
        secrets: paginatedSecrets,
        total: secrets.length
      };

    } catch (error) {
      this.logger.error('Failed to list secrets from AWS Secrets Manager', error);
      throw this.handleAWSError(error);
    }
  }

  /**
   * Rotate a secret using AWS Secrets Manager rotation
   */
  async rotateSecret(secretName: string, lambdaFunctionArn?: string): Promise<void> {
    try {
      this.logger.debug('Rotating secret in AWS Secrets Manager', { secretName });

      const command = new RotateSecretCommand({
        SecretId: secretName,
        RotationLambdaARN: lambdaFunctionArn,
        RotationRules: {
          AutomaticallyAfterDays: this.config.defaultRotationDays || 30
        }
      });

      await this.client.send(command);

    } catch (error) {
      this.logger.error('Failed to rotate secret in AWS Secrets Manager', error);
      throw this.handleAWSError(error);
    }
  }

  /**
   * Generate a random password using AWS Secrets Manager
   */
  async generateRandomPassword(options?: {
    length?: number;
    excludeCharacters?: string;
    excludeNumbers?: boolean;
    excludePunctuation?: boolean;
    excludeUppercase?: boolean;
    excludeLowercase?: boolean;
    includeSpace?: boolean;
    requireEachIncludedType?: boolean;
  }): Promise<string> {
    try {
      const command = new GetRandomPasswordCommand({
        PasswordLength: options?.length || 32,
        ExcludeCharacters: options?.excludeCharacters,
        ExcludeNumbers: options?.excludeNumbers,
        ExcludePunctuation: options?.excludePunctuation,
        ExcludeUppercase: options?.excludeUppercase,
        ExcludeLowercase: options?.excludeLowercase,
        IncludeSpace: options?.includeSpace,
        RequireEachIncludedType: options?.requireEachIncludedType
      });

      const response = await this.client.send(command);
      return response.RandomPassword!;

    } catch (error) {
      this.logger.error('Failed to generate random password', error);
      throw this.handleAWSError(error);
    }
  }

  /**
   * Health check for AWS Secrets Manager
   */
  async healthCheck(): Promise<void> {
    try {
      // Try to list secrets with minimal results to test connectivity
      const command = new ListSecretsCommand({
        MaxResults: 1
      });

      await this.client.send(command);
      this.logger.debug('AWS Secrets Manager health check passed');

    } catch (error) {
      this.logger.error('AWS Secrets Manager health check failed', error);
      throw error;
    }
  }

  // Private helper methods

  private buildSecretName(path: string): string {
    const prefix = this.config.secretPrefix || 'gamifyx';
    return `${prefix}/${path}`;
  }

  private buildTagsFromMetadata(metadata: SecretMetadata): Array<{ Key: string; Value: string }> {
    const tags: Array<{ Key: string; Value: string }> = [];

    // Add standard tags
    tags.push(
      { Key: 'CreatedBy', Value: metadata.createdBy || 'unknown' },
      { Key: 'Provider', Value: 'gamifyx-secrets-manager' },
      { Key: 'Version', Value: metadata.version?.toString() || '1' }
    );

    // Add custom tags
    if (metadata.tags) {
      Object.entries(metadata.tags).forEach(([key, value]) => {
        tags.push({ Key: key, Value: value });
      });
    }

    // Add description as tag if present
    if (metadata.description) {
      tags.push({ Key: 'Description', Value: metadata.description });
    }

    return tags;
  }

  private buildListFilters(options?: {
    prefix?: string;
    tags?: Record<string, string>;
  }): Array<{ Key: string; Values: string[] }> {
    const filters: Array<{ Key: string; Values: string[] }> = [];

    if (options?.prefix) {
      filters.push({
        Key: 'name',
        Values: [`${this.buildSecretName(options.prefix)}*`]
      });
    }

    return filters;
  }

  private matchesTags(secretTags: Array<{ Key?: string; Value?: string }>, filterTags: Record<string, string>): boolean {
    return Object.entries(filterTags).every(([key, value]) => {
      return secretTags.some(tag => tag.Key === key && tag.Value === value);
    });
  }

  private buildMetadataFromAWSSecret(secret: any): SecretMetadata {
    const path = this.extractPathFromSecretName(secret.Name);
    
    // Extract metadata from tags
    const tags: Record<string, string> = {};
    let createdBy = 'unknown';
    let description = secret.Description;

    if (secret.Tags) {
      secret.Tags.forEach((tag: any) => {
        if (tag.Key === 'CreatedBy') {
          createdBy = tag.Value;
        } else if (tag.Key === 'Description' && !description) {
          description = tag.Value;
        } else if (!['Provider', 'Version'].includes(tag.Key)) {
          tags[tag.Key] = tag.Value;
        }
      });
    }

    return {
      path,
      description,
      tags,
      createdBy,
      createdAt: secret.CreatedDate || new Date(),
      updatedBy: createdBy, // AWS doesn't track who updated
      updatedAt: secret.LastChangedDate || secret.CreatedDate || new Date(),
      version: 1, // AWS doesn't expose version numbers directly
      provider: 'aws'
    } as SecretMetadata;
  }

  private extractPathFromSecretName(secretName: string): string {
    const prefix = this.config.secretPrefix || 'gamifyx';
    return secretName.replace(`${prefix}/`, '');
  }

  private async getSecretMetadata(secretName: string): Promise<SecretMetadata> {
    const command = new DescribeSecretCommand({
      SecretId: secretName
    });

    const response = await this.client.send(command);
    return this.buildMetadataFromAWSSecret(response);
  }

  private async getSecretVersions(secretName: string): Promise<any[]> {
    try {
      const command = new DescribeSecretCommand({
        SecretId: secretName
      });

      const response = await this.client.send(command);
      const versions: any[] = [];

      if (response.VersionIdsToStages) {
        Object.entries(response.VersionIdsToStages).forEach(([versionId, stages]) => {
          versions.push({
            version: versionId,
            stages: stages,
            createdAt: response.CreatedDate,
            active: (stages as string[]).includes('AWSCURRENT')
          });
        });
      }

      return versions;

    } catch (error) {
      this.logger.debug('Failed to get secret versions', error);
      return [];
    }
  }

  private handleAWSError(error: any): Error {
    if (error.name) {
      switch (error.name) {
        case 'ResourceNotFoundException':
          return new Error(`Secret not found: ${error.message}`);
        case 'InvalidParameterException':
          return new Error(`Invalid parameter: ${error.message}`);
        case 'InvalidRequestException':
          return new Error(`Invalid request: ${error.message}`);
        case 'ResourceExistsException':
          return new Error(`Secret already exists: ${error.message}`);
        case 'LimitExceededException':
          return new Error(`AWS limit exceeded: ${error.message}`);
        case 'InternalServiceError':
          return new Error(`AWS internal error: ${error.message}`);
        case 'UnauthorizedOperation':
        case 'AccessDenied':
          return new Error(`AWS access denied: ${error.message}`);
        default:
          return new Error(`AWS Secrets Manager error: ${error.message}`);
      }
    }

    return error;
  }

  async getSecretById(secretId: string): Promise<Secret | null> {
    try {
      // AWS uses ARN as secret ID
      const command = new GetSecretValueCommand({
        SecretId: secretId
      });

      const response = await this.client.send(command);
      
      if (!response.SecretString) {
        return null;
      }

      const path = this.extractPathFromSecretName(response.Name!);
      const metadata = await this.getSecretMetadata(response.Name!);
      const versions = await this.getSecretVersions(response.Name!);

      return {
        id: secretId,
        path,
        value: response.SecretString,
        metadata,
        versions
      };

    } catch (error) {
      return null;
    }
  }

  async close(): Promise<void> {
    // AWS SDK doesn't require explicit cleanup
    this.logger.info('AWS Secrets Manager client closed');
  }
}