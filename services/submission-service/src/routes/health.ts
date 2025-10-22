import { Router, Request, Response } from 'express';
import { metrics } from '@opentelemetry/api';

const router = Router();
const meter = metrics.getMeter('submission-service', '1.0.0');

const healthCheckCounter = meter.createCounter('health_checks_total', {
  description: 'Total number of health check requests'
});

router.get('/', (req: Request, res: Response) => {
  healthCheckCounter.add(1, { endpoint: '/health' });
  
  res.status(200).json({
    status: 'healthy',
    service: 'submission-service',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

router.get('/ready', (req: Request, res: Response) => {
  healthCheckCounter.add(1, { endpoint: '/health/ready' });
  
  res.status(200).json({
    status: 'ready',
    service: 'submission-service',
    timestamp: new Date().toISOString()
  });
});

router.get('/live', (req: Request, res: Response) => {
  healthCheckCounter.add(1, { endpoint: '/health/live' });
  
  res.status(200).json({
    status: 'alive',
    service: 'submission-service',
    timestamp: new Date().toISOString()
  });
});

export { router as healthRouter };