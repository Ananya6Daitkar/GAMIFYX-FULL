/**
 * Logging configuration for gamification service
 */

import winston from 'winston';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

// Create logger instance
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'gamification-service',
    version: '1.0.0'
  },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Correlation ID middleware
export const correlationIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const correlationId = req.headers['x-correlation-id'] as string || uuidv4();
  
  // Add correlation ID to request
  (req as any).correlationId = correlationId;
  
  // Add correlation ID to response headers
  res.setHeader('x-correlation-id', correlationId);
  
  // Add correlation ID to logger context
  logger.defaultMeta = {
    ...logger.defaultMeta,
    correlationId
  };
  
  next();
};