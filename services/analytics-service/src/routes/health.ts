/**
 * Health check routes
 */

import { Router, Request, Response } from 'express';
import { db } from '../database/connection';
import { MetricsCollector } from '../services/metricsCollector';
import { logger } from '../telemetry/logger';

const router = Router();
const metricsCollector = MetricsCollector.getInstance();

/**
 * Basic health check
 * GET /health
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const dbHealth = await db.healthCheck();
    const metricsStats = metricsCollector.getMetricsSummary();
    
    const isHealthy = dbHealth.postgres && dbHealth.redis;
    
    res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? 'healthy' : 'unhealthy',
      service: 'analytics-service',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      database: dbHealth,
      metrics: metricsStats,
      uptime: process.uptime()
    });

  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      service: 'analytics-service',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Detailed health check
 * GET /health/detailed
 */
router.get('/detailed', async (req: Request, res: Response) => {
  try {
    const dbHealth = await db.healthCheck();
    const metricsStats = metricsCollector.getMetricsSummary();
    
    // Check various service components
    const componentHealth = {
      database: {
        postgres: dbHealth.postgres,
        redis: dbHealth.redis
      },
      analytics: {
        riskCalculations: metricsStats.riskCalculations > 0,
        performanceAnalyses: metricsStats.performanceAnalyses > 0,
        alertsTriggered: metricsStats.alertsTriggered >= 0
      },
      alerting: {
        rulesActive: true, // Would check actual alert rules
        notificationChannels: true // Would check notification channels
      }
    };

    const allHealthy = Object.values(componentHealth).every(component =>
      Object.values(component).every(status => status === true)
    );

    res.status(allHealthy ? 200 : 503).json({
      status: allHealthy ? 'healthy' : 'unhealthy',
      service: 'analytics-service',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      components: componentHealth,
      metrics: {
        ...metricsStats,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage()
      }
    });

  } catch (error) {
    logger.error('Detailed health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      service: 'analytics-service',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Readiness probe
 * GET /health/ready
 */
router.get('/ready', async (req: Request, res: Response) => {
  try {
    const dbHealth = await db.healthCheck();
    
    if (dbHealth.postgres && dbHealth.redis) {
      res.json({
        status: 'ready',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(503).json({
        status: 'not ready',
        reason: 'Database connections not available',
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    logger.error('Readiness check failed:', error);
    res.status(503).json({
      status: 'not ready',
      reason: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Liveness probe
 * GET /health/live
 */
router.get('/live', (req: Request, res: Response) => {
  res.json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

export default router;