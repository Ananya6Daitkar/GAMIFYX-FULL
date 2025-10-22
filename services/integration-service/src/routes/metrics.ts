import { Router, Request, Response } from 'express';
import { register } from 'prom-client';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    res.set('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.end(metrics);
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'METRICS_ERROR',
        message: 'Failed to collect metrics',
        timestamp: new Date().toISOString()
      }
    });
  }
});

export { router as metricsRouter };