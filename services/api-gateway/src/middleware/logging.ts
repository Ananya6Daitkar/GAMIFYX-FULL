import { Request, Response, NextFunction } from 'express';
import { logger } from '@/utils/logger';

export const loggingMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  
  // Log incoming request
  logger.info('Incoming request', {
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    correlationId: req.correlationId,
  });

  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any) {
    const duration = Date.now() - startTime;
    
    logger.info('Request completed', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      correlationId: req.correlationId,
    });

    originalEnd.call(this, chunk, encoding);
  };

  next();
};