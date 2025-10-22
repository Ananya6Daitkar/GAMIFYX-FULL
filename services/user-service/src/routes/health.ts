import { Router, Request, Response } from 'express';

const router = Router();

// Health check endpoint
router.get('/', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'user-service',
    version: '1.0.0'
  });
});

export { router as healthRouter };