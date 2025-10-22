import { Router, Request, Response } from 'express';
import { CICDIntegrationService } from '@/services/CICDIntegrationService';
import { VaultService } from '@/services/VaultService';
import { SecretAccessService } from '@/services/SecretAccessService';
import { authenticateToken, requirePermission } from '@/middleware/auth';
import { logger } from '@/telemetry/logger';

const router = Router();

// Initialize services
const vaultService = new VaultService();
const accessService = new SecretAccessService();
const cicdService = new CICDIntegrationService(vaultService, accessService);

// Get secrets for CI/CD pipeline
router.post('/secrets',
  authenticateToken,
  requirePermission('cicd', 'read'),
  async (req: Request, res: Response) => {
    try {
      const { pipelineId, environment, service, platform } = req.body;

      if (!pipelineId || !environment || !service || !platform) {
        return res.status(400).json({
          error: {
            code: 'MISSING_PARAMETERS',
            message: 'pipelineId, environment, service, and platform are required',
            correlationId: req.correlationId
          }
        });
      }

      // Validate CI/CD access
      const isValidAccess = await cicdService.validateCICDAccess(
        pipelineId,
        platform,
        req.ip || 'unknown',
        req.get('User-Agent') || 'unknown'
      );

      if (!isValidAccess) {
        return res.status(403).json({
          error: {
            code: 'CICD_ACCESS_DENIED',
            message: 'CI/CD access denied',
            correlationId: req.correlationId
          }
        });
      }

      const secrets = await cicdService.getSecretsForPipeline(
        pipelineId,
        environment,
        service,
        platform,
        req.get('User-Agent') || 'unknown',
        req.ip || 'unknown'
      );

      res.json({
        success: true,
        data: { secrets },
        correlationId: req.correlationId
      });

    } catch (error) {
      logger.error('Failed to get CI/CD secrets', { 
        error,
        requestBody: req.body,
        userId: req.user?.id,
        correlationId: req.correlationId 
      });
      
      res.status(400).json({
        error: {
          code: 'CICD_SECRETS_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get CI/CD secrets',
          correlationId: req.correlationId
        }
      });
    }
  }
);

// Generate GitHub Actions configuration
router.post('/github-actions',
  authenticateToken,
  requirePermission('cicd', 'read'),
  async (req: Request, res: Response) => {
    try {
      const { repository, environment, service } = req.body;

      if (!repository || !environment || !service) {
        return res.status(400).json({
          error: {
            code: 'MISSING_PARAMETERS',
            message: 'repository, environment, and service are required',
            correlationId: req.correlationId
          }
        });
      }

      const workflowConfig = await cicdService.generateGitHubActionsSecrets(
        repository,
        environment,
        service
      );

      res.json({
        success: true,
        data: { workflowConfig },
        correlationId: req.correlationId
      });

    } catch (error) {
      logger.error('Failed to generate GitHub Actions config', { 
        error,
        requestBody: req.body,
        userId: req.user?.id,
        correlationId: req.correlationId 
      });
      
      res.status(400).json({
        error: {
          code: 'GITHUB_ACTIONS_CONFIG_FAILED',
          message: error instanceof Error ? error.message : 'Failed to generate GitHub Actions config',
          correlationId: req.correlationId
        }
      });
    }
  }
);

// Generate Docker Compose configuration
router.post('/docker-compose',
  authenticateToken,
  requirePermission('cicd', 'read'),
  async (req: Request, res: Response) => {
    try {
      const { service, environment } = req.body;

      if (!service || !environment) {
        return res.status(400).json({
          error: {
            code: 'MISSING_PARAMETERS',
            message: 'service and environment are required',
            correlationId: req.correlationId
          }
        });
      }

      const dockerConfig = await cicdService.generateDockerComposeSecrets(
        service,
        environment
      );

      res.json({
        success: true,
        data: { dockerConfig },
        correlationId: req.correlationId
      });

    } catch (error) {
      logger.error('Failed to generate Docker Compose config', { 
        error,
        requestBody: req.body,
        userId: req.user?.id,
        correlationId: req.correlationId 
      });
      
      res.status(400).json({
        error: {
          code: 'DOCKER_COMPOSE_CONFIG_FAILED',
          message: error instanceof Error ? error.message : 'Failed to generate Docker Compose config',
          correlationId: req.correlationId
        }
      });
    }
  }
);

// Generate Kubernetes configuration
router.post('/kubernetes',
  authenticateToken,
  requirePermission('cicd', 'read'),
  async (req: Request, res: Response) => {
    try {
      const { namespace, service, environment } = req.body;

      if (!namespace || !service || !environment) {
        return res.status(400).json({
          error: {
            code: 'MISSING_PARAMETERS',
            message: 'namespace, service, and environment are required',
            correlationId: req.correlationId
          }
        });
      }

      const k8sConfig = await cicdService.generateKubernetesSecrets(
        namespace,
        service,
        environment
      );

      res.json({
        success: true,
        data: { k8sConfig },
        correlationId: req.correlationId
      });

    } catch (error) {
      logger.error('Failed to generate Kubernetes config', { 
        error,
        requestBody: req.body,
        userId: req.user?.id,
        correlationId: req.correlationId 
      });
      
      res.status(400).json({
        error: {
          code: 'KUBERNETES_CONFIG_FAILED',
          message: error instanceof Error ? error.message : 'Failed to generate Kubernetes config',
          correlationId: req.correlationId
        }
      });
    }
  }
);

// Generate Terraform configuration
router.post('/terraform',
  authenticateToken,
  requirePermission('cicd', 'read'),
  async (req: Request, res: Response) => {
    try {
      const { service, environment } = req.body;

      if (!service || !environment) {
        return res.status(400).json({
          error: {
            code: 'MISSING_PARAMETERS',
            message: 'service and environment are required',
            correlationId: req.correlationId
          }
        });
      }

      const terraformConfig = await cicdService.generateTerraformSecrets(
        service,
        environment
      );

      res.json({
        success: true,
        data: { terraformConfig },
        correlationId: req.correlationId
      });

    } catch (error) {
      logger.error('Failed to generate Terraform config', { 
        error,
        requestBody: req.body,
        userId: req.user?.id,
        correlationId: req.correlationId 
      });
      
      res.status(400).json({
        error: {
          code: 'TERRAFORM_CONFIG_FAILED',
          message: error instanceof Error ? error.message : 'Failed to generate Terraform config',
          correlationId: req.correlationId
        }
      });
    }
  }
);

// Get CI/CD usage statistics
router.get('/stats',
  authenticateToken,
  requirePermission('cicd', 'read'),
  async (req: Request, res: Response) => {
    try {
      const stats = await cicdService.getCICDUsageStats();

      res.json({
        success: true,
        data: stats,
        correlationId: req.correlationId
      });

    } catch (error) {
      logger.error('Failed to get CI/CD stats', { 
        error,
        userId: req.user?.id,
        correlationId: req.correlationId 
      });
      
      res.status(400).json({
        error: {
          code: 'CICD_STATS_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get CI/CD stats',
          correlationId: req.correlationId
        }
      });
    }
  }
);

export default router;