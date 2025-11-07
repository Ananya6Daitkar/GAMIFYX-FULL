import { Router } from 'express';
import { pool } from '@/database/connection';
import { asyncHandler } from '@/middleware/errorHandler';

const router = Router();

// Health check endpoint
router.get('/', asyncHandler(async (req: any, res: any) => {
  const healthCheck: any = {
    service: 'model-performance-service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  };

  // Check database connection
  try {
    const result = await pool.query('SELECT NOW()');
    healthCheck.database = {
      status: 'connected',
      timestamp: result.rows[0].now
    };
  } catch (error) {
    healthCheck.database = {
      status: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
    healthCheck.status = 'unhealthy';
  }

  const statusCode = healthCheck.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(healthCheck);
}));

// Readiness check endpoint
router.get('/ready', asyncHandler(async (req: any, res: any) => {
  try {
    // Check if database is ready
    await pool.query('SELECT 1');
    
    res.json({
      status: 'ready',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}));

// Liveness check endpoint
router.get('/live', (req: any, res: any) => {
  res.json({
    status: 'alive',
    timestamp: new Date().toISOString()
  });
});

export { router as healthRouter };