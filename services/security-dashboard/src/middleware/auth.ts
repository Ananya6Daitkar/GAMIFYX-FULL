import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '@/telemetry/logger';

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: any;
      correlationId: string;
    }
  }
}

export const authenticateToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({
        error: {
          code: 'MISSING_TOKEN',
          message: 'Access token is required',
          correlationId: req.correlationId
        }
      });
      return;
    }

    const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
    const decoded = jwt.verify(token, jwtSecret) as any;
    
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role
    };
    
    next();
  } catch (error) {
    logger.error('Token authentication failed', { 
      error, 
      correlationId: req.correlationId 
    });
    
    res.status(401).json({
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired token',
        correlationId: req.correlationId
      }
    });
  }
};

export const requirePermission = (resource: string, action: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          correlationId: req.correlationId
        }
      });
      return;
    }

    // Simple role-based permission check for security dashboard
    const userRole = req.user.role;
    
    if (resource === 'security') {
      // Admin can do everything
      if (userRole === 'admin') {
        next();
        return;
      }
      
      // Teachers can read security information
      if (userRole === 'teacher' && action === 'read') {
        next();
        return;
      }
      
      // Security managers can manage security
      if (userRole === 'security_manager') {
        next();
        return;
      }
    }

    logger.warn('Insufficient permissions for security dashboard', {
      userId: req.user.id,
      userRole: req.user.role,
      resource,
      action,
      correlationId: req.correlationId
    });
    
    res.status(403).json({
      error: {
        code: 'INSUFFICIENT_PERMISSIONS',
        message: `Insufficient permissions to ${action} ${resource}`,
        correlationId: req.correlationId
      }
    });
  };
};

export const rateLimitByUser = (maxAttempts: number, windowMinutes: number) => {
  const attempts = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id || req.ip;
    const now = Date.now();
    const windowMs = windowMinutes * 60 * 1000;

    const userAttempts = attempts.get(userId);
    
    if (!userAttempts || now > userAttempts.resetTime) {
      attempts.set(userId, { count: 1, resetTime: now + windowMs });
      next();
      return;
    }

    if (userAttempts.count >= maxAttempts) {
      res.status(429).json({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests. Please try again later.',
          correlationId: req.correlationId,
          retryAfter: Math.ceil((userAttempts.resetTime - now) / 1000)
        }
      });
      return;
    }

    userAttempts.count++;
    next();
  };
};