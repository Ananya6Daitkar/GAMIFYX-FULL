import { Router, Request, Response } from 'express';
import { logger } from '@/utils/logger';

const router = Router();

// Health check endpoint
router.get('/', (req: Request, res: Response) => {
  const healthCheck = {
    status: 'healthy',
    service: 'api-gateway',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    correlationId: req.correlationId,
  };

  res.status(200).json(healthCheck);
});

// Readiness check endpoint
router.get('/ready', (req: Request, res: Response) => {
  // Check if all required environment variables are set
  const requiredEnvVars = ['JWT_SECRET'];
  const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

  if (missingEnvVars.length > 0) {
    logger.warn('Readiness check failed - missing environment variables', {
      missingEnvVars,
      correlationId: req.correlationId,
    });

    res.status(503).json({
      status: 'not ready',
      service: 'api-gateway',
      timestamp: new Date().toISOString(),
      issues: [`Missing environment variables: ${missingEnvVars.join(', ')}`],
      correlationId: req.correlationId,
    });
    return;
  }

  res.status(200).json({
    status: 'ready',
    service: 'api-gateway',
    timestamp: new Date().toISOString(),
    correlationId: req.correlationId,
  });
});

// Liveness check endpoint
router.get('/live', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'alive',
    service: 'api-gateway',
    timestamp: new Date().toISOString(),
    correlationId: req.correlationId,
  });
});

export { router as healthRouter };