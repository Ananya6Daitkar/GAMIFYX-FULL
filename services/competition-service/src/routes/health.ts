import { Router, Request, Response } from 'express';
import { logger } from '@/telemetry/logger';
import { repository } from '@/database/repositories';

const router = Router();

// Basic health check
router.get('/', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'competition-service',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    correlationId: req.correlationId
  });
});

// Detailed health check
router.get('/detailed', async (req: Request, res: Response) => {
  const healthChecks = {
    service: 'healthy',
    database: 'unknown',
    externalAPIs: 'unknown',
    cache: 'unknown'
  };

  let overallStatus = 'healthy';

  try {
    // Check database connection
    await repository.healthCheck();
    healthChecks.database = 'healthy';
  } catch (error) {
    logger.error('Database health check failed', { error });
    healthChecks.database = 'unhealthy';
    overallStatus = 'unhealthy';
  }

  try {
    // Check external APIs (GitHub, GitLab)
    // TODO: Implement actual external API health checks
    healthChecks.externalAPIs = 'healthy';
  } catch (error) {
    logger.error('External API health check failed', { error });
    healthChecks.externalAPIs = 'unhealthy';
    overallStatus = 'degraded';
  }

  try {
    // Check cache (Redis)
    // TODO: Implement actual cache health check
    healthChecks.cache = 'healthy';
  } catch (error) {
    logger.error('Cache health check failed', { error });
    healthChecks.cache = 'unhealthy';
    overallStatus = 'degraded';
  }

  const statusCode = overallStatus === 'healthy' ? 200 : 
                    overallStatus === 'degraded' ? 200 : 503;

  res.status(statusCode).json({
    status: overallStatus,
    service: 'competition-service',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    checks: healthChecks,
    correlationId: req.correlationId
  });
});

// Readiness check (for Kubernetes)
router.get('/ready', (req: Request, res: Response) => {
  // TODO: Implement actual readiness checks
  // Check if all required services are initialized
  res.json({
    status: 'ready',
    service: 'competition-service',
    timestamp: new Date().toISOString(),
    correlationId: req.correlationId
  });
});

// Liveness check (for Kubernetes)
router.get('/live', (req: Request, res: Response) => {
  res.json({
    status: 'alive',
    service: 'competition-service',
    timestamp: new Date().toISOString(),
    correlationId: req.correlationId
  });
});

export { router as healthRouter };