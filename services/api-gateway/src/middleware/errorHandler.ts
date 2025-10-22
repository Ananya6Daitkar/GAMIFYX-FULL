import { Request, Response, NextFunction } from 'express';
import { logger } from '@/utils/logger';

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  logger.error('Unhandled error in API Gateway', {
    error: error.message,
    stack: error.stack,
    method: req.method,
    url: req.url,
    correlationId: req.correlationId,
  });

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
      correlationId: req.correlationId,
      ...(isDevelopment && { details: error.message, stack: error.stack }),
    }
  });
};