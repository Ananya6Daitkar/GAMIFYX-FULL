import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

export const correlationMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Get correlation ID from header or generate a new one
  const correlationId = req.headers['x-correlation-id'] as string || uuidv4();
  
  // Set correlation ID on request object
  req.correlationId = correlationId;
  
  // Set correlation ID in response header
  res.setHeader('X-Correlation-ID', correlationId);
  
  next();
};