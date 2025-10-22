import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '@/telemetry/logger';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
        permissions: string[];
      };
    }
  }
}

export interface JWTPayload {
  id: string;
  email: string;
  role: string;
  permissions: string[];
  iat: number;
  exp: number;
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      error: {
        code: 'MISSING_TOKEN',
        message: 'Access token is required',
        correlationId: req.correlationId
      }
    });
  }

  try {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      logger.error('JWT_SECRET environment variable is not set');
      return res.status(500).json({
        error: {
          code: 'SERVER_CONFIGURATION_ERROR',
          message: 'Server configuration error',
          correlationId: req.correlationId
        }
      });
    }

    const decoded = jwt.verify(token, jwtSecret) as JWTPayload;
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      permissions: decoded.permissions || []
    };

    logger.debug('Token authenticated successfully', {
      userId: req.user.id,
      role: req.user.role,
      correlationId: req.correlationId
    });

    next();
  } catch (error) {
    logger.warn('Token authentication failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      correlationId: req.correlationId
    });

    return res.status(403).json({
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
      return res.status(401).json({
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required',
          correlationId: req.correlationId
        }
      });
    }

    const requiredPermission = `${resource}:${action}`;
    const hasPermission = req.user.permissions.includes(requiredPermission) || 
                         req.user.permissions.includes(`${resource}:*`) ||
                         req.user.permissions.includes('*:*') ||
                         req.user.role === 'admin';

    if (!hasPermission) {
      logger.warn('Permission denied', {
        userId: req.user.id,
        requiredPermission,
        userPermissions: req.user.permissions,
        correlationId: req.correlationId
      });

      return res.status(403).json({
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: `Permission denied. Required: ${requiredPermission}`,
          correlationId: req.correlationId
        }
      });
    }

    next();
  };
};

export const requireRole = (roles: string | string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required',
          correlationId: req.correlationId
        }
      });
    }

    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    const hasRole = allowedRoles.includes(req.user.role);

    if (!hasRole) {
      logger.warn('Role access denied', {
        userId: req.user.id,
        userRole: req.user.role,
        requiredRoles: allowedRoles,
        correlationId: req.correlationId
      });

      return res.status(403).json({
        error: {
          code: 'INSUFFICIENT_ROLE',
          message: `Access denied. Required role: ${allowedRoles.join(' or ')}`,
          correlationId: req.correlationId
        }
      });
    }

    next();
  };
};

export const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    // No token provided, continue without authentication
    return next();
  }

  try {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      logger.error('JWT_SECRET environment variable is not set');
      return next();
    }

    const decoded = jwt.verify(token, jwtSecret) as JWTPayload;
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      permissions: decoded.permissions || []
    };

    logger.debug('Optional token authenticated successfully', {
      userId: req.user.id,
      role: req.user.role,
      correlationId: req.correlationId
    });
  } catch (error) {
    logger.debug('Optional token authentication failed, continuing without auth', {
      error: error instanceof Error ? error.message : 'Unknown error',
      correlationId: req.correlationId
    });
  }

  next();
};