import { Request, Response, NextFunction } from 'express';
import { logger } from '@/telemetry/logger';

export const sessionTrackingMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Simple session tracking middleware
  if (req.user) {
    logger.debug('User session tracked', {
      userId: req.user.id,
      correlationId: req.correlationId,
      endpoint: req.path
    });
  }
  
  next();
};