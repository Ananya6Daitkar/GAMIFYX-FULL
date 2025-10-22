import { Request, Response, NextFunction } from 'express';
import { AuthService } from '@/services/AuthService';
import { PermissionService } from '@/services/PermissionService';
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

    const authService = new AuthService();
    const user = await authService.verifyToken(token);
    
    req.user = user;
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

export const requireRole = (roles: string | string[]) => {
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

    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    
    if (!allowedRoles.includes(req.user.role)) {
      logger.warn('Insufficient permissions', {
        userId: req.user.id,
        userRole: req.user.role,
        requiredRoles: allowedRoles,
        correlationId: req.correlationId
      });
      
      res.status(403).json({
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Insufficient permissions to access this resource',
          correlationId: req.correlationId
        }
      });
      return;
    }

    next();
  };
};

export const requireOwnership = (req: Request, res: Response, next: NextFunction): void => {
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

  const resourceUserId = req.params.id || req.params.userId;
  
  // Allow access if user is accessing their own resource or if they're an admin/teacher
  if (req.user.id === resourceUserId || ['admin', 'teacher'].includes(req.user.role)) {
    next();
    return;
  }

  logger.warn('Ownership check failed', {
    userId: req.user.id,
    resourceUserId,
    userRole: req.user.role,
    correlationId: req.correlationId
  });

  res.status(403).json({
    error: {
      code: 'ACCESS_DENIED',
      message: 'You can only access your own resources',
      correlationId: req.correlationId
    }
  });
};export c
onst requirePermission = (resource: string, action: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
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

    try {
      const permissionService = new PermissionService();
      
      // Build context for permission check
      const context = {
        resourceUserId: req.params.id || req.params.userId,
        studentId: req.params.studentId,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent')
      };

      const hasPermission = await permissionService.checkPermission(
        req.user.id,
        resource,
        action,
        context
      );

      if (!hasPermission) {
        res.status(403).json({
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: `Insufficient permissions to ${action} ${resource}`,
            correlationId: req.correlationId
          }
        });
        return;
      }

      next();
    } catch (error) {
      logger.error('Permission check failed', {
        error,
        userId: req.user.id,
        resource,
        action,
        correlationId: req.correlationId
      });

      res.status(500).json({
        error: {
          code: 'PERMISSION_CHECK_FAILED',
          message: 'Failed to verify permissions',
          correlationId: req.correlationId
        }
      });
    }
  };
};

export const requireMFA = async (req: Request, res: Response, next: NextFunction) => {
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

  // Only require MFA for teachers and admins
  if (['teacher', 'admin'].includes(req.user.role) && !req.user.mfaEnabled) {
    res.status(403).json({
      error: {
        code: 'MFA_REQUIRED',
        message: 'Multi-factor authentication is required for this account type',
        correlationId: req.correlationId
      }
    });
    return;
  }

  next();
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