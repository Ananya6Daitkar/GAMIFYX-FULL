import { Router, Request, Response } from 'express';
import { PermissionService } from '@/services/PermissionService';
import { authenticateToken, requirePermission, requireRole } from '@/middleware/auth';
import { logger } from '@/telemetry/logger';

const router = Router();
const permissionService = new PermissionService();

// Get user permissions
router.get('/user/:userId',
  authenticateToken,
  requirePermission('user', 'read'),
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      
      const permissions = await permissionService.getUserPermissions(userId);
      
      res.json({
        success: true,
        data: { permissions },
        correlationId: req.correlationId
      });
    } catch (error) {
      logger.error('Failed to get user permissions', { 
        error, 
        userId: req.params.userId,
        correlationId: req.correlationId 
      });
      
      res.status(400).json({
        error: {
          code: 'GET_PERMISSIONS_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get permissions',
          correlationId: req.correlationId
        }
      });
    }
  }
);

// Assign role to user
router.post('/assign-role',
  authenticateToken,
  requireRole(['admin']),
  async (req: Request, res: Response) => {
    try {
      const { userId, roleName, expiresAt } = req.body;

      if (!userId || !roleName) {
        return res.status(400).json({
          error: {
            code: 'MISSING_PARAMETERS',
            message: 'userId and roleName are required',
            correlationId: req.correlationId
          }
        });
      }

      const expirationDate = expiresAt ? new Date(expiresAt) : undefined;
      
      await permissionService.assignRole(userId, roleName, req.user.id, expirationDate);
      
      res.json({
        success: true,
        message: `Role ${roleName} assigned to user successfully`,
        correlationId: req.correlationId
      });
    } catch (error) {
      logger.error('Role assignment failed', { 
        error, 
        requestBody: req.body,
        assignedBy: req.user.id,
        correlationId: req.correlationId 
      });
      
      res.status(400).json({
        error: {
          code: 'ROLE_ASSIGNMENT_FAILED',
          message: error instanceof Error ? error.message : 'Failed to assign role',
          correlationId: req.correlationId
        }
      });
    }
  }
);

// Revoke role from user
router.post('/revoke-role',
  authenticateToken,
  requireRole(['admin']),
  async (req: Request, res: Response) => {
    try {
      const { userId, roleName } = req.body;

      if (!userId || !roleName) {
        return res.status(400).json({
          error: {
            code: 'MISSING_PARAMETERS',
            message: 'userId and roleName are required',
            correlationId: req.correlationId
          }
        });
      }
      
      await permissionService.revokeRole(userId, roleName, req.user.id);
      
      res.json({
        success: true,
        message: `Role ${roleName} revoked from user successfully`,
        correlationId: req.correlationId
      });
    } catch (error) {
      logger.error('Role revocation failed', { 
        error, 
        requestBody: req.body,
        revokedBy: req.user.id,
        correlationId: req.correlationId 
      });
      
      res.status(400).json({
        error: {
          code: 'ROLE_REVOCATION_FAILED',
          message: error instanceof Error ? error.message : 'Failed to revoke role',
          correlationId: req.correlationId
        }
      });
    }
  }
);

// Check specific permission
router.post('/check',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const { resource, action, context = {} } = req.body;

      if (!resource || !action) {
        return res.status(400).json({
          error: {
            code: 'MISSING_PARAMETERS',
            message: 'resource and action are required',
            correlationId: req.correlationId
          }
        });
      }

      // Add request context
      const fullContext = {
        ...context,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent')
      };
      
      const hasPermission = await permissionService.checkPermission(
        req.user.id,
        resource,
        action,
        fullContext
      );
      
      res.json({
        success: true,
        data: { hasPermission },
        correlationId: req.correlationId
      });
    } catch (error) {
      logger.error('Permission check failed', { 
        error, 
        requestBody: req.body,
        userId: req.user.id,
        correlationId: req.correlationId 
      });
      
      res.status(400).json({
        error: {
          code: 'PERMISSION_CHECK_FAILED',
          message: error instanceof Error ? error.message : 'Failed to check permission',
          correlationId: req.correlationId
        }
      });
    }
  }
);

// Get audit logs
router.get('/audit',
  authenticateToken,
  requireRole(['admin']),
  async (req: Request, res: Response) => {
    try {
      const { userId, startDate, endDate, action, resource } = req.query;
      
      const auditRequest = {
        userId: userId as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        action: action as string,
        resource: resource as string
      };
      
      const auditLogs = await permissionService.auditPermissions(auditRequest);
      
      res.json({
        success: true,
        data: { auditLogs },
        correlationId: req.correlationId
      });
    } catch (error) {
      logger.error('Audit retrieval failed', { 
        error, 
        query: req.query,
        correlationId: req.correlationId 
      });
      
      res.status(400).json({
        error: {
          code: 'AUDIT_RETRIEVAL_FAILED',
          message: error instanceof Error ? error.message : 'Failed to retrieve audit logs',
          correlationId: req.correlationId
        }
      });
    }
  }
);

// Validate IAM policy
router.post('/validate-policy',
  authenticateToken,
  requireRole(['admin']),
  async (req: Request, res: Response) => {
    try {
      const { policy } = req.body;

      if (!policy) {
        return res.status(400).json({
          error: {
            code: 'MISSING_POLICY',
            message: 'Policy document is required',
            correlationId: req.correlationId
          }
        });
      }
      
      const validation = await permissionService.validatePolicyWithSimulator(policy);
      
      res.json({
        success: true,
        data: validation,
        correlationId: req.correlationId
      });
    } catch (error) {
      logger.error('Policy validation failed', { 
        error, 
        correlationId: req.correlationId 
      });
      
      res.status(400).json({
        error: {
          code: 'POLICY_VALIDATION_FAILED',
          message: error instanceof Error ? error.message : 'Failed to validate policy',
          correlationId: req.correlationId
        }
      });
    }
  }
);

// Schedule quarterly review
router.post('/schedule-review',
  authenticateToken,
  requireRole(['admin']),
  async (req: Request, res: Response) => {
    try {
      await permissionService.scheduleQuarterlyReview();
      
      res.json({
        success: true,
        message: 'Quarterly permission review scheduled successfully',
        correlationId: req.correlationId
      });
    } catch (error) {
      logger.error('Failed to schedule quarterly review', { 
        error, 
        correlationId: req.correlationId 
      });
      
      res.status(400).json({
        error: {
          code: 'SCHEDULE_REVIEW_FAILED',
          message: error instanceof Error ? error.message : 'Failed to schedule review',
          correlationId: req.correlationId
        }
      });
    }
  }
);

export default router;