import winston from 'winston';
import { trace, context } from '@opentelemetry/api';

// Custom format for structured logging
const structuredFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf((info) => {
    // Get current trace context
    const span = trace.getActiveSpan();
    const traceId = span?.spanContext().traceId;
    const spanId = span?.spanContext().spanId;
    
    return JSON.stringify({
      timestamp: info.timestamp,
      level: info.level,
      message: info.message,
      service: process.env.SERVICE_NAME || 'feedback-service',
      traceId: traceId || 'no-trace',
      spanId: spanId || 'no-span',
      correlationId: info.correlationId || 'no-correlation',
      userId: info.userId,
      submissionId: info.submissionId,
      ...info.metadata
    });
  })
);

// Create Winston logger instance
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: structuredFormat,
  defaultMeta: {
    service: process.env.SERVICE_NAME || 'feedback-service',
    version: process.env.SERVICE_VERSION || '1.0.0'
  },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        structuredFormat
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

// Helper functions for structured logging
export const logInfo = (message: string, metadata?: any, correlationId?: string, userId?: string, submissionId?: string) => {
  logger.info(message, { metadata, correlationId, userId, submissionId });
};

export const logError = (message: string, error?: Error, metadata?: any, correlationId?: string, userId?: string, submissionId?: string) => {
  logger.error(message, { 
    error: error?.message,
    stack: error?.stack,
    metadata, 
    correlationId, 
    userId,
    submissionId 
  });
};

export const logWarn = (message: string, metadata?: any, correlationId?: string, userId?: string, submissionId?: string) => {
  logger.warn(message, { metadata, correlationId, userId, submissionId });
};

export const logDebug = (message: string, metadata?: any, correlationId?: string, userId?: string, submissionId?: string) => {
  logger.debug(message, { metadata, correlationId, userId, submissionId });
};

// Middleware to add correlation ID to requests
export const correlationIdMiddleware = (req: any, res: any, next: any) => {
  // Generate or extract correlation ID
  const correlationId = req.headers['x-correlation-id'] || 
                       req.headers['x-request-id'] || 
                       generateCorrelationId();
  
  // Add to request object
  req.correlationId = correlationId;
  
  // Add to response headers
  res.setHeader('x-correlation-id', correlationId);
  
  // Extract submission ID if available
  const submissionId = req.params?.submissionId || req.body?.submissionId;
  
  // Log request start
  logInfo('Request started', {
    method: req.method,
    url: req.url,
    userAgent: req.headers['user-agent'],
    ip: req.ip
  }, correlationId, req.user?.id, submissionId);
  
  // Override res.end to log request completion
  const originalEnd = res.end;
  res.end = function(...args: any[]) {
    logInfo('Request completed', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      responseTime: Date.now() - req.startTime
    }, correlationId, req.user?.id, submissionId);
    
    originalEnd.apply(this, args);
  };
  
  // Track request start time
  req.startTime = Date.now();
  
  next();
};

// Generate unique correlation ID
const generateCorrelationId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Export logger instance for direct use
export default logger;