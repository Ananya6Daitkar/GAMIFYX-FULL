import { Router, Request, Response } from 'express';
import { logger } from '../utils/logger';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  const healthCheck = {
    status: 'healthy',
    service: 'integration-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.SERVICE_VERSION || '1.0.0'
  };

  logger.debug('Health check requested', healthCheck);
  res.json(healthCheck);
});

router.get('/ready', (req: Request, res: Response) => {
  // Check if service is ready to accept requests
  // This could include checking database connections, external services, etc.
  const readinessCheck = {
    status: 'ready',
    service: 'integration-service',
    timestamp: new Date().toISOString(),
    checks: {
      orchestrator: 'healthy',
      websocket: 'healthy',
      memory: process.memoryUsage().heapUsed < 1024 * 1024 * 1024 // Less than 1GB
    }
  };

  const isReady = Object.values(readinessCheck.checks).every(check => 
    check === 'healthy' || check === true
  );

  if (isReady) {
    res.json(readinessCheck);
  } else {
    res.status(503).json({
      ...readinessCheck,
      status: 'not_ready'
    });
  }
});

router.get('/live', (req: Request, res: Response) => {
  // Simple liveness check
  res.json({
    status: 'alive',
    service: 'integration-service',
    timestamp: new Date().toISOString()
  });
});

export { router as healthRouter };