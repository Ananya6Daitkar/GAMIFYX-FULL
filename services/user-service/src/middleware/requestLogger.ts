import { Request, Response, NextFunction } from 'express';
import { logger } from '@/telemetry/logger';

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    logger.info('HTTP Request', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      correlationId: req.correlationId,
      userId: req.user?.id
    });
  });
  
  next();
};