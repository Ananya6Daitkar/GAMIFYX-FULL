import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
    permissions: string[];
  };
}

export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      error: 'Access token required',
      message: 'Please provide a valid access token',
      timestamp: new Date().toISOString()
    });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err: any, decoded: any) => {
    if (err) {
      return res.status(403).json({
        error: 'Invalid token',
        message: 'The provided token is invalid or expired',
        timestamp: new Date().toISOString()
      });
    }

    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      permissions: decoded.permissions || []
    };

    next();
  });
};

export const requireRole = (roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Please authenticate first',
        timestamp: new Date().toISOString()
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        message: `This endpoint requires one of the following roles: ${roles.join(', ')}`,
        timestamp: new Date().toISOString()
      });
    }

    next();
  };
};

export const requirePermission = (permission: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Please authenticate first',
        timestamp: new Date().toISOString()
      });
    }

    if (!req.user.permissions.includes(permission)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        message: `This endpoint requires the '${permission}' permission`,
        timestamp: new Date().toISOString()
      });
    }

    next();
  };
};

export default {
  authenticateToken,
  requireRole,
  requirePermission
};