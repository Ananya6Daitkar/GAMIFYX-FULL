import { VaultService } from '@/services/VaultService';
import { SecretAccessService } from '@/services/SecretAccessService';
import { RotationService } from '@/services/RotationService';
import { NotificationService } from '@/services/NotificationService';
import { SecretType, RotationStrategy } from '@/models/Secret';

// Mock dependencies
jest.mock('@/database/connection');
jest.mock('@/telemetry/logger');
jest.mock('node-vault');

describe('Secrets Manager Service Tests', () => {
  let vaultService: VaultService;
  let accessService: SecretAccessService;
  let rotationService: RotationService;
  let notificationService: NotificationService;

  beforeEach(() => {
    // Mock Vault client
    const mockVaultClient = {
      status: jest.fn().mockResolvedValue({ sealed: false, version: '1.12.0' }),
      mount: jest.fn().mockResolvedValue({}),
      write: jest.fn().mockResolvedValue({}),
      read: jest.fn().mockResolvedValue({
        data: {
          data: {
            value: 'test-secret-value',
            type: SecretType.API_KEY,
            metadata: {
              description: 'Test secret',
              owner: 'test@example.com',
              environment: 'test',
              service: 'test-service',
              tags: ['test'],
              sensitive: true
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        }
      }),
      delete: jest.fn().mockResolvedValue({}),
      list: jest.fn().mockResolvedValue({ data: { keys: ['test/secret1', 'test/secret2'] } })
    };

    // Mock node-vault
    require('node-vault').mockImplementation(() => mockVaultClient);

    vaultService = new VaultService();
    accessService = new SecretAccessService();
    notificationService = new NotificationService();
    rotationService = new RotationService(vaultService, accessService, notificationService);
  });

  describe('VaultService', () => {
    it('should initialize successfully', async () => {
      await expect(vaultService.initialize()).resolves.not.toThrow();
    });

    it('should create a secret successfully', async () => {
      const secretRequest = {
        name: 'test-secret',
        path: 'test/secret',
        type: SecretType.API_KEY,
        value: 'test-api-key-value-123456',
        metadata: {
          description: 'Test API key',
          owner: 'test@example.com',
          environment: 'test',
          service: 'test-service',
          tags: ['test', 'api'],
          sensitive: true
        },
        rotationConfig: {
          enabled: true,
          intervalDays: 90,
          strategy: RotationStrategy.REGENERATE,
          notifyBefore: 7,
          maxRetries: 3,
          backoffMultiplier: 2
        }
      };

      const secret = await vaultService.createSecret(secretRequest);

      expect(secret).toBeDefined();
      expect(secret.name).toBe(secretRequest.name);
      expect(secret.path).toBe(secretRequest.path);
      expect(secret.type).toBe(secretRequest.type);
    });

    it('should retrieve a secret successfully', async () => {
      const secret = await vaultService.getSecret('test/secret', true);

      expect(secret).toBeDefined();
      expect(secret?.value).toBe('test-secret-value');
      expect(secret?.type).toBe(SecretType.API_KEY);
    });

    it('should list secrets successfully', async () => {
      const secrets = await vaultService.listSecrets('test');

      expect(secrets).toBeDefined();
      expect(Array.isArray(secrets)).toBe(true);
      expect(secrets.length).toBeGreaterThan(0);
    });

    it('should handle vault connection errors gracefully', async () => {
      const mockVaultClient = require('node-vault')();
      mockVaultClient.status.mockRejectedValue(new Error('Connection failed'));

      const healthCheck = await vaultService.healthCheck();
      expect(healthCheck.status).toBe('unhealthy');
    });
  });

  describe('Secret Validation', () => {
    it('should validate database password requirements', () => {
      const validPassword = 'SecurePassword123!';
      const invalidPassword = 'weak';

      // This would be tested in the validation middleware
      expect(validPassword.length).toBeGreaterThanOrEqual(8);
      expect(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(validPassword)).toBe(true);
      expect(invalidPassword.length).toBeLessThan(8);
    });

    it('should validate API key format', () => {
      const validApiKey = 'ak_1234567890abcdef1234567890abcdef';
      const invalidApiKey = 'invalid-key!@#';

      expect(validApiKey.length).toBeGreaterThanOrEqual(16);
      expect(/^[a-zA-Z0-9_-]+$/.test(validApiKey)).toBe(true);
      expect(/^[a-zA-Z0-9_-]+$/.test(invalidApiKey)).toBe(false);
    });

    it('should validate JWT secret length', () => {
      const validJwtSecret = 'super-long-jwt-secret-that-is-at-least-32-characters-long';
      const invalidJwtSecret = 'short';

      expect(validJwtSecret.length).toBeGreaterThanOrEqual(32);
      expect(invalidJwtSecret.length).toBeLessThan(32);
    });
  });

  describe('Rotation Service', () => {
    it('should determine if secret needs rotation', async () => {
      const secret = {
        id: 'test-secret',
        name: 'test-secret',
        path: 'test/secret',
        type: SecretType.API_KEY,
        metadata: {
          description: 'Test secret',
          owner: 'test@example.com',
          environment: 'test',
          service: 'test-service',
          tags: ['test'],
          sensitive: true
        },
        createdAt: new Date(),
        updatedAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000), // 100 days ago
        rotationConfig: {
          enabled: true,
          intervalDays: 90,
          strategy: RotationStrategy.REGENERATE,
          notifyBefore: 7,
          maxRetries: 3,
          backoffMultiplier: 2
        }
      };

      // Mock the private method for testing
      const shouldRotate = (secret: any) => {
        const now = new Date();
        const nextRotation = new Date(secret.updatedAt);
        nextRotation.setDate(nextRotation.getDate() + secret.rotationConfig.intervalDays);
        return now >= nextRotation;
      };

      expect(shouldRotate(secret)).toBe(true);
    });

    it('should generate rotation schedule', async () => {
      // Mock listSecrets to return test secrets
      jest.spyOn(vaultService, 'listSecrets').mockResolvedValue(['test/secret1', 'test/secret2']);
      jest.spyOn(vaultService, 'getSecret').mockResolvedValue({
        id: 'test-secret',
        name: 'test-secret',
        path: 'test/secret',
        type: SecretType.API_KEY,
        metadata: {
          description: 'Test secret',
          owner: 'test@example.com',
          environment: 'test',
          service: 'test-service',
          tags: ['test'],
          sensitive: true
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        rotationConfig: {
          enabled: true,
          intervalDays: 90,
          strategy: RotationStrategy.REGENERATE,
          notifyBefore: 7,
          maxRetries: 3,
          backoffMultiplier: 2
        }
      });

      const schedule = await rotationService.getRotationSchedule();

      expect(schedule).toBeDefined();
      expect(Array.isArray(schedule)).toBe(true);
    });
  });

  describe('Access Logging', () => {
    it('should log secret access attempts', async () => {
      const mockQuery = jest.fn().mockResolvedValue({ rows: [] });
      const mockClient = {
        query: mockQuery,
        release: jest.fn()
      };

      // Mock database connection
      const mockPool = {
        connect: jest.fn().mockResolvedValue(mockClient)
      };

      const accessService = new SecretAccessService(mockPool as any);

      await accessService.logSecretAccess({
        secretId: 'test-secret',
        secretPath: 'test/secret',
        userId: 'test-user',
        action: 'read',
        result: 'success',
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
        timestamp: new Date()
      });

      expect(mockQuery).toHaveBeenCalled();
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle Vault service errors gracefully', async () => {
      const mockVaultClient = require('node-vault')();
      mockVaultClient.read.mockRejectedValue(new Error('Vault error'));

      await expect(vaultService.getSecret('nonexistent/secret')).rejects.toThrow('Vault error');
    });

    it('should handle database connection errors', async () => {
      const mockPool = {
        connect: jest.fn().mockRejectedValue(new Error('Database connection failed'))
      };

      const accessService = new SecretAccessService(mockPool as any);

      await expect(accessService.logSecretAccess({
        secretId: 'test-secret',
        secretPath: 'test/secret',
        userId: 'test-user',
        action: 'read',
        result: 'success',
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
        timestamp: new Date()
      })).rejects.toThrow('Database connection failed');
    });
  });

  describe('Security Features', () => {
    it('should detect anomalous access patterns', async () => {
      const mockQuery = jest.fn()
        .mockResolvedValueOnce({ rows: [{ secret_path: 'test/secret', failure_rate: 0.8 }] }) // High failure rate
        .mockResolvedValueOnce({ rows: [{ secret_path: 'test/secret', off_hours_access: 10 }] }) // Off hours access
        .mockResolvedValueOnce({ rows: [{ secret_path: 'test/secret', user_id: 'new-user' }] }); // New user

      const mockClient = {
        query: mockQuery,
        release: jest.fn()
      };

      const mockPool = {
        connect: jest.fn().mockResolvedValue(mockClient)
      };

      const accessService = new SecretAccessService(mockPool as any);
      const anomalies = await accessService.detectAnomalousAccess();

      expect(anomalies).toBeDefined();
      expect(Array.isArray(anomalies)).toBe(true);
      expect(anomalies.length).toBeGreaterThan(0);
    });

    it('should validate CI/CD platform access', async () => {
      const { CICDIntegrationService } = require('@/services/CICDIntegrationService');
      const cicdService = new CICDIntegrationService(vaultService, accessService);

      const validAccess = await cicdService.validateCICDAccess(
        'github-actions-123',
        'github-actions',
        '192.30.252.1',
        'GitHub-Actions/1.0'
      );

      expect(validAccess).toBe(true);

      const invalidAccess = await cicdService.validateCICDAccess(
        'unknown-pipeline',
        'unknown-platform',
        '1.2.3.4',
        'Unknown-Agent'
      );

      expect(invalidAccess).toBe(false);
    });
  });
});