import { Router, Request, Response } from 'express';
import { SecretInjectionService, SecretInjectionConfig } from '@/services/SecretInjectionService';
import { VaultService } from '@/services/VaultService';
import { SecretAccessService } from '@/services/SecretAccessService';
import { authenticateToken, requirePermission } from '@/middleware/auth';
import { logger } from '@/telemetry/logger';

const router = Router();

// Initialize services
const vaultService = new VaultService();
const accessService = new SecretAccessService();
const injectionService = new SecretInjectionService(vaultService, accessService);

// Inject secrets for a specific service
router.post('/inject',
  authenticateToken,
  requirePermission('secrets', 'inject'),
  async (req: Request, res: Response) => {
    try {
      const config: SecretInjectionConfig = req.body;

      if (!config.service || !config.environment || !config.format || !config.secretPaths) {
        return res.status(400).json({
          error: {
            code: 'MISSING_PARAMETERS',
            message: 'service, environment, format, and secretPaths are required',
            correlationId: req.correlationId
          }
        });
      }

      const result = await injectionService.injectSecrets(config, req.user.id);

      res.json({
        success: result.success,
        data: result,
        correlationId: req.correlationId
      });

    } catch (error) {
      logger.error('Failed to inject secrets', { 
        error,
        requestBody: req.body,
        userId: req.user?.id,
        correlationId: req.correlationId 
      });
      
      res.status(400).json({
        error: {
          code: 'SECRET_INJECTION_FAILED',
          message: error instanceof Error ? error.message : 'Failed to inject secrets',
          correlationId: req.correlationId
        }
      });
    }
  }
);

// Inject secrets for all services in an environment
router.post('/inject-all',
  authenticateToken,
  requirePermission('secrets', 'inject'),
  async (req: Request, res: Response) => {
    try {
      const { environment } = req.body;

      if (!environment) {
        return res.status(400).json({
          error: {
            code: 'MISSING_PARAMETERS',
            message: 'environment is required',
            correlationId: req.correlationId
          }
        });
      }

      const results = await injectionService.injectSecretsForAllServices(environment, req.user.id);

      const summary = {
        totalServices: results.length,
        successfulInjections: results.filter(r => r.success).length,
        failedInjections: results.filter(r => !r.success).length,
        totalSecretsInjected: results.reduce((sum, r) => sum + r.secretsInjected, 0),
        results
      };

      res.json({
        success: true,
        data: summary,
        correlationId: req.correlationId
      });

    } catch (error) {
      logger.error('Failed to inject secrets for all services', { 
        error,
        requestBody: req.body,
        userId: req.user?.id,
        correlationId: req.correlationId 
      });
      
      res.status(400).json({
        error: {
          code: 'BULK_SECRET_INJECTION_FAILED',
          message: error instanceof Error ? error.message : 'Failed to inject secrets for all services',
          correlationId: req.correlationId
        }
      });
    }
  }
);

// Generate configuration for specific platform
router.post('/generate-config',
  authenticateToken,
  requirePermission('secrets', 'read'),
  async (req: Request, res: Response) => {
    try {
      const { service, environment, format, secretPaths, outputPath } = req.body;

      if (!service || !environment || !format || !secretPaths) {
        return res.status(400).json({
          error: {
            code: 'MISSING_PARAMETERS',
            message: 'service, environment, format, and secretPaths are required',
            correlationId: req.correlationId
          }
        });
      }

      const config: SecretInjectionConfig = {
        service,
        environment,
        format,
        secretPaths,
        outputPath
      };

      // Generate configuration without writing to file
      const configWithoutOutput = { ...config, outputPath: undefined };
      const result = await injectionService.injectSecrets(configWithoutOutput, req.user.id);

      res.json({
        success: result.success,
        data: {
          configuration: result,
          format,
          service,
          environment
        },
        correlationId: req.correlationId
      });

    } catch (error) {
      logger.error('Failed to generate configuration', { 
        error,
        requestBody: req.body,
        userId: req.user?.id,
        correlationId: req.correlationId 
      });
      
      res.status(400).json({
        error: {
          code: 'CONFIG_GENERATION_FAILED',
          message: error instanceof Error ? error.message : 'Failed to generate configuration',
          correlationId: req.correlationId
        }
      });
    }
  }
);

// Get injection history
router.get('/history',
  authenticateToken,
  requirePermission('secrets', 'read'),
  async (req: Request, res: Response) => {
    try {
      const { service, environment } = req.query;

      const history = await injectionService.getInjectionHistory(
        service as string,
        environment as string
      );

      res.json({
        success: true,
        data: { history },
        correlationId: req.correlationId
      });

    } catch (error) {
      logger.error('Failed to get injection history', { 
        error,
        query: req.query,
        userId: req.user?.id,
        correlationId: req.correlationId 
      });
      
      res.status(400).json({
        error: {
          code: 'INJECTION_HISTORY_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get injection history',
          correlationId: req.correlationId
        }
      });
    }
  }
);

// Validate secret injection file
router.post('/validate',
  authenticateToken,
  requirePermission('secrets', 'read'),
  async (req: Request, res: Response) => {
    try {
      const { filePath } = req.body;

      if (!filePath) {
        return res.status(400).json({
          error: {
            code: 'MISSING_PARAMETERS',
            message: 'filePath is required',
            correlationId: req.correlationId
          }
        });
      }

      const validation = await injectionService.validateSecretInjection(filePath);

      res.json({
        success: true,
        data: validation,
        correlationId: req.correlationId
      });

    } catch (error) {
      logger.error('Failed to validate secret injection', { 
        error,
        requestBody: req.body,
        userId: req.user?.id,
        correlationId: req.correlationId 
      });
      
      res.status(400).json({
        error: {
          code: 'INJECTION_VALIDATION_FAILED',
          message: error instanceof Error ? error.message : 'Failed to validate secret injection',
          correlationId: req.correlationId
        }
      });
    }
  }
);

// Generate environment-specific secrets for GamifyX services
router.post('/gamifyx-setup',
  authenticateToken,
  requirePermission('secrets', 'inject'),
  async (req: Request, res: Response) => {
    try {
      const { environment = 'development' } = req.body;

      logger.info('Setting up GamifyX secrets', { environment, userId: req.user.id });

      // Define GamifyX-specific secret configurations
      const gamifyxServices = [
        {
          service: 'user-service',
          secretPaths: [
            `user-service/${environment}/jwt-secret`,
            `user-service/${environment}/db-password`,
            `common/${environment}/redis-password`
          ]
        },
        {
          service: 'gamification-service',
          secretPaths: [
            `gamification-service/${environment}/jwt-secret`,
            `gamification-service/${environment}/db-password`,
            `gamification-service/${environment}/websocket-secret`,
            `common/${environment}/redis-password`
          ]
        },
        {
          service: 'analytics-service',
          secretPaths: [
            `analytics-service/${environment}/jwt-secret`,
            `analytics-service/${environment}/db-password`,
            `analytics-service/${environment}/influxdb-token`,
            `common/${environment}/redis-password`
          ]
        },
        {
          service: 'ai-feedback-service',
          secretPaths: [
            `ai-feedback-service/${environment}/openai-api-key`,
            `ai-feedback-service/${environment}/huggingface-api-key`,
            `ai-feedback-service/${environment}/db-password`
          ]
        },
        {
          service: 'api-gateway',
          secretPaths: [
            `api-gateway/${environment}/jwt-secret`,
            `api-gateway/${environment}/websocket-secret`,
            `common/${environment}/redis-password`
          ]
        }
      ];

      const results = [];

      for (const serviceConfig of gamifyxServices) {
        const config: SecretInjectionConfig = {
          service: serviceConfig.service,
          environment,
          format: 'env',
          outputPath: `./services/${serviceConfig.service}/.env.${environment}`,
          secretPaths: serviceConfig.secretPaths
        };

        const result = await injectionService.injectSecrets(config, req.user.id);
        results.push({
          service: serviceConfig.service,
          ...result
        });
      }

      const summary = {
        environment,
        totalServices: results.length,
        successfulSetups: results.filter(r => r.success).length,
        failedSetups: results.filter(r => !r.success).length,
        totalSecretsConfigured: results.reduce((sum, r) => sum + r.secretsInjected, 0),
        results
      };

      res.json({
        success: true,
        data: summary,
        correlationId: req.correlationId
      });

    } catch (error) {
      logger.error('Failed to setup GamifyX secrets', { 
        error,
        requestBody: req.body,
        userId: req.user?.id,
        correlationId: req.correlationId 
      });
      
      res.status(400).json({
        error: {
          code: 'GAMIFYX_SETUP_FAILED',
          message: error instanceof Error ? error.message : 'Failed to setup GamifyX secrets',
          correlationId: req.correlationId
        }
      });
    }
  }
);

export default router;