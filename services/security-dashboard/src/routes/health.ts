import { Router, Request, Response } from 'express';
import pool from '@/database/connection';

const router = Router();

// Health check endpoint
router.get('/', async (req: Request, res: Response) => {
  const healthCheck = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'security-dashboard',
    version: '1.0.0',
    checks: {
      database: 'unknown'
    }
  };

  try {
    // Check database connection
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    healthCheck.checks.database = 'healthy';
  } catch (error) {
    healthCheck.checks.database = 'unhealthy';
    healthCheck.status = 'degraded';
  }

  const statusCode = healthCheck.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(healthCheck);
});

// Readiness check
router.get('/ready', async (req: Request, res: Response) => {
  try {
    // Check if all critical services are ready
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();

    res.json({
      status: 'ready',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Liveness check
router.get('/live', (req: Request, res: Response) => {
  res.json({
    status: 'alive',
    timestamp: new Date().toISOString()
  });
});

export { router as healthRouter };