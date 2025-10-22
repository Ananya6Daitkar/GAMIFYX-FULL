import { Request, Response, NextFunction } from 'express';
import { logger } from '@/telemetry/logger';
import { 
  CompetitionError, 
  ValidationError, 
  NotFoundError, 
  UnauthorizedError, 
  ExternalAPIError 
} from '@/types/competition';

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log the error
  logger.error('Unhandled error', {
    error: error.message,
    stack: error.stack,
    correlationId: req.correlationId,
    url: req.url,
    method: req.method,
    userId: req.user?.id
  });

  // Handle specific error types
  if (error instanceof ValidationError) {
    return res.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        field: error.field,
        correlationId: req.correlationId
      }
    });
  }

  if (error instanceof NotFoundError) {
    return res.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        correlationId: req.correlationId
      }
    });
  }

  if (error instanceof UnauthorizedError) {
    return res.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        correlationId: req.correlationId
      }
    });
  }

  if (error instanceof ExternalAPIError) {
    return res.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        platform: error.platform,
        correlationId: req.correlationId
      }
    });
  }

  if (error instanceof CompetitionError) {
    return res.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        correlationId: req.correlationId
      }
    });
  }

  // Handle JSON parsing errors
  if (error instanceof SyntaxError && 'body' in error) {
    return res.status(400).json({
      error: {
        code: 'INVALID_JSON',
        message: 'Invalid JSON in request body',
        correlationId: req.correlationId
      }
    });
  }

  // Handle JWT errors
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid token',
        correlationId: req.correlationId
      }
    });
  }

  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: {
        code: 'TOKEN_EXPIRED',
        message: 'Token has expired',
        correlationId: req.correlationId
      }
    });
  }

  // Handle database errors
  if (error.message.includes('duplicate key value')) {
    return res.status(409).json({
      error: {
        code: 'DUPLICATE_RESOURCE',
        message: 'Resource already exists',
        correlationId: req.correlationId
      }
    });
  }

  if (error.message.includes('foreign key constraint')) {
    return res.status(400).json({
      error: {
        code: 'INVALID_REFERENCE',
        message: 'Invalid reference to related resource',
        correlationId: req.correlationId
      }
    });
  }

  // Handle validation errors from Joi or similar
  if (error.name === 'ValidationError' && 'details' in error) {
    const details = (error as any).details;
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: details.map((detail: any) => ({
          field: detail.path?.join('.'),
          message: detail.message
        })),
        correlationId: req.correlationId
      }
    });
  }

  // Default error response
  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An internal server error occurred',
      correlationId: req.correlationId
    }
  });
};

// Async error wrapper
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};