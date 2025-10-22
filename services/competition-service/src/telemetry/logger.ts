import winston from 'winston';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

// Extend Express Request type to include correlationId
declare global {
  namespace Express {
    interface Request {
      correlationId: string;
    }
  }
}

// Create Winston logger
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'competition-service',
    version: '1.0.0'
  },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error'
    }),
    new winston.transports.File({
      filename: 'logs/combined.log'
    })
  ]
});

// Correlation ID middleware
export const correlationIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
  req.correlationId = req.headers['x-correlation-id'] as string || uuidv4();
  res.setHeader('x-correlation-id', req.correlationId);
  next();
};

// Request logging middleware
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('HTTP Request', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      correlationId: req.correlationId,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });
  });
  
  next();
};