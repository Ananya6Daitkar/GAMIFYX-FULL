import { Request, Response, NextFunction } from 'express';
import { trace } from '@opentelemetry/api';

interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const span = trace.getActiveSpan();
  
  console.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    traceId: span?.spanContext().traceId
  });

  if (span) {
    span.recordException(err);
    span.setStatus({ code: 2, message: err.message });
  }

  const statusCode = err.statusCode || 500;
  const message = err.isOperational ? err.message : 'Internal Server Error';

  res.status(statusCode).json({
    error: {
      code: statusCode === 500 ? 'INTERNAL_ERROR' : 'CLIENT_ERROR',
      message,
      timestamp: new Date().toISOString(),
      traceId: span?.spanContext().traceId
    }
  });
};