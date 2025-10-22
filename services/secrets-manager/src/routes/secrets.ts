import { Router, Request, Response } from 'express';
import { VaultService } from '@/services/VaultService';
import { SecretAccessService } from '@/services/SecretAccessService';
import { RotationService } from '@/services/RotationService';
import { CreateSecretRequest, UpdateSecretRequest, SecretAction } from '@/models/Secret';
import { authenticateToken, requirePermission } from '@/middleware/auth';
import { validateSecretRequest } from '@/middleware/validation';
import { logger } from '@/telemetry/logger';

const router = Router();

// Initialize services (these would be injected in a real application)
const vaultService = new VaultService();
const accessService = new SecretAccessService();

// Create a new secret
router.post('/',
  authenticateToken,
  requirePermission('secrets', 'create'),
  validateSecretRequest,
  async (req: Request, res: Response) => {
    try {
      const createRequest: CreateSecretRequest = req.body;
      
      // Log the creation attempt
      await accessService.logSecretAccess({
        secretId: createRequest.path,
        secretPath: createRequest.path,
        userId: req.user.id,
        action: SecretAction.CREATE,
        result: 'success',
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown',
        timestamp: new Date()
      });

      const secret = await vaultService.createSecret(createRequest);
      
      // Don't return the actual secret value in the response
      const { value, ...secretResponse } = secret;
      
      res.status(201).json({
        success: true,
        data: secretResponse,
        correlationId: req.correlationId
      });

    } catch (error) {
      await accessService.logSecretAccess({
        secretId: req.body.path || 'unknown',
        secretPath: req.body.path || 'unknown',
        userId: req.user?.id || 'unknown',
        action: SecretAction.CREATE,
        result: 'failure',
        reason: error instanceof Error ? error.message : 'Unknown error',
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown',
        timestamp: new Date()
      });

      logger.error('Failed to create secret', { 
        error, 
        path: req.body.path,
        userId: req.user?.id,
        correlationId: req.correlationId 
      });
      
      res.status(400).json({
        error: {
          code: 'SECRET_CREATION_FAILED',
          message: error instanceof Error ? error.message : 'Failed to create secret',
          correlationId: req.correlationId
        }
      });
    }
  }
);

// Get a secret
router.get('/*',
  authenticateToken,
  requirePermission('secrets', 'read'),
  async (req: Request, res: Response) => {
    try {
      const secretPath = req.params[0]; // Get the full path after /secrets/
      const includeValue = req.query.includeValue === 'true';
      
      const secret = await vaultService.getSecret(secretPath, includeValue);
      
      if (!secret) {
        await accessService.logSecretAccess({
          secretId: secretPath,
          secretPath: secretPath,
          userId: req.user.id,
          action: SecretAction.READ,
          result: 'failure',
          reason: 'Secret not found',
          ipAddress: req.ip || 'unknown',
          userAgent: req.get('User-Agent') || 'unknown',
          timestamp: new Date()
        });

        return res.status(404).json({
          error: {
            code: 'SECRET_NOT_FOUND',
            message: 'Secret not found',
            correlationId: req.correlationId
          }
        });
      }

      // Log successful access
      await accessService.logSecretAccess({
        secretId: secret.id,
        secretPath: secret.path,
        userId: req.user.id,
        action: SecretAction.READ,
        result: 'success',
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown',
        timestamp: new Date()
      });

      res.json({
        success: true,
        data: secret,
        correlationId: req.correlationId
      });

    } catch (error) {
      const secretPath = req.params[0];
      
      await accessService.logSecretAccess({
        secretId: secretPath,
        secretPath: secretPath,
        userId: req.user?.id || 'unknown',
        action: SecretAction.READ,
        result: 'failure',
        reason: error instanceof Error ? error.message : 'Unknown error',
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown',
        timestamp: new Date()
      });

      logger.error('Failed to get secret', { 
        error, 
        path: secretPath,
        userId: req.user?.id,
        correlationId: req.correlationId 
      });
      
      res.status(400).json({
        error: {
          code: 'SECRET_RETRIEVAL_FAILED',
          message: error instanceof Error ? error.message : 'Failed to retrieve secret',
          correlationId: req.correlationId
        }
      });
    }
  }
);

// Update a secret
router.put('/*',
  authenticateToken,
  requirePermission('secrets', 'update'),
  async (req: Request, res: Response) => {
    try {
      const secretPath = req.params[0];
      const updateRequest: UpdateSecretRequest = req.body;
      
      const secret = await vaultService.updateSecret(secretPath, updateRequest);
      
      // Log the update
      await accessService.logSecretAccess({
        secretId: secret.id,
        secretPath: secret.path,
        userId: req.user.id,
        action: SecretAction.UPDATE,
        result: 'success',
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown',
        timestamp: new Date()
      });

      // Don't return the actual secret value
      const { value, ...secretResponse } = secret;
      
      res.json({
        success: true,
        data: secretResponse,
        correlationId: req.correlationId
      });

    } catch (error) {
      const secretPath = req.params[0];
      
      await accessService.logSecretAccess({
        secretId: secretPath,
        secretPath: secretPath,
        userId: req.user?.id || 'unknown',
        action: SecretAction.UPDATE,
        result: 'failure',
        reason: error instanceof Error ? error.message : 'Unknown error',
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown',
        timestamp: new Date()
      });

      logger.error('Failed to update secret', { 
        error, 
        path: secretPath,
        userId: req.user?.id,
        correlationId: req.correlationId 
      });
      
      res.status(400).json({
        error: {
          code: 'SECRET_UPDATE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to update secret',
          correlationId: req.correlationId
        }
      });
    }
  }
);

// Delete a secret
router.delete('/*',
  authenticateToken,
  requirePermission('secrets', 'delete'),
  async (req: Request, res: Response) => {
    try {
      const secretPath = req.params[0];
      
      await vaultService.deleteSecret(secretPath);
      
      // Log the deletion
      await accessService.logSecretAccess({
        secretId: secretPath,
        secretPath: secretPath,
        userId: req.user.id,
        action: SecretAction.DELETE,
        result: 'success',
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown',
        timestamp: new Date()
      });

      res.json({
        success: true,
        message: 'Secret deleted successfully',
        correlationId: req.correlationId
      });

    } catch (error) {
      const secretPath = req.params[0];
      
      await accessService.logSecretAccess({
        secretId: secretPath,
        secretPath: secretPath,
        userId: req.user?.id || 'unknown',
        action: SecretAction.DELETE,
        result: 'failure',
        reason: error instanceof Error ? error.message : 'Unknown error',
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown',
        timestamp: new Date()
      });

      logger.error('Failed to delete secret', { 
        error, 
        path: secretPath,
        userId: req.user?.id,
        correlationId: req.correlationId 
      });
      
      res.status(400).json({
        error: {
          code: 'SECRET_DELETION_FAILED',
          message: error instanceof Error ? error.message : 'Failed to delete secret',
          correlationId: req.correlationId
        }
      });
    }
  }
);

// List secrets
router.get('/',
  authenticateToken,
  requirePermission('secrets', 'list'),
  async (req: Request, res: Response) => {
    try {
      const prefix = req.query.prefix as string;
      
      const secretPaths = await vaultService.listSecrets(prefix);
      
      // Log the list operation
      await accessService.logSecretAccess({
        secretId: 'list-operation',
        secretPath: prefix || 'all',
        userId: req.user.id,
        action: SecretAction.LIST,
        result: 'success',
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown',
        timestamp: new Date()
      });

      res.json({
        success: true,
        data: { secrets: secretPaths },
        correlationId: req.correlationId
      });

    } catch (error) {
      await accessService.logSecretAccess({
        secretId: 'list-operation',
        secretPath: req.query.prefix as string || 'all',
        userId: req.user?.id || 'unknown',
        action: SecretAction.LIST,
        result: 'failure',
        reason: error instanceof Error ? error.message : 'Unknown error',
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown',
        timestamp: new Date()
      });

      logger.error('Failed to list secrets', { 
        error, 
        prefix: req.query.prefix,
        userId: req.user?.id,
        correlationId: req.correlationId 
      });
      
      res.status(400).json({
        error: {
          code: 'SECRET_LIST_FAILED',
          message: error instanceof Error ? error.message : 'Failed to list secrets',
          correlationId: req.correlationId
        }
      });
    }
  }
);

export default router;