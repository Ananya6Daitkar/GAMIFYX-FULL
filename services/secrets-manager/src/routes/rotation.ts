import { Router, Request, Response } from 'express';
import { RotationService } from '@/services/RotationService';
import { VaultService } from '@/services/VaultService';
import { SecretAccessService } from '@/services/SecretAccessService';
import { NotificationService } from '@/services/NotificationService';
import { authenticateToken, requirePermission } from '@/middleware/auth';
import { logger } from '@/telemetry/logger';

const router = Router();

// Initialize services
const vaultService = new VaultService();
const accessService = new SecretAccessService();
const notificationService = new NotificationService();
const rotationService = new RotationService(vaultService, accessService, notificationService);

// Get rotation schedule
router.get('/schedule',
  authenticateToken,
  requirePermission('secrets', 'read'),
  async (req: Request, res: Response) => {
    try {
      const schedule = await rotationService.getRotationSchedule();
      
      res.json({
        success: true,
        data: { schedule },
        correlationId: req.correlationId
      });

    } catch (error) {
      logger.error('Failed to get rotation schedule', { 
        error,
        userId: req.user?.id,
        correlationId: req.correlationId 
      });
      
      res.status(400).json({
        error: {
          code: 'ROTATION_SCHEDULE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get rotation schedule',
          correlationId: req.correlationId
        }
      });
    }
  }
);

// Get rotation jobs
router.get('/jobs',
  authenticateToken,
  requirePermission('secrets', 'read'),
  async (req: Request, res: Response) => {
    try {
      const secretPath = req.query.secretPath as string;
      const jobs = await rotationService.getRotationJobs(secretPath);
      
      res.json({
        success: true,
        data: { jobs },
        correlationId: req.correlationId
      });

    } catch (error) {
      logger.error('Failed to get rotation jobs', { 
        error,
        secretPath: req.query.secretPath,
        userId: req.user?.id,
        correlationId: req.correlationId 
      });
      
      res.status(400).json({
        error: {
          code: 'ROTATION_JOBS_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get rotation jobs',
          correlationId: req.correlationId
        }
      });
    }
  }
);

// Force rotation of a secret
router.post('/force',
  authenticateToken,
  requirePermission('secrets', 'rotate'),
  async (req: Request, res: Response) => {
    try {
      const { secretPath, reason } = req.body;

      if (!secretPath) {
        return res.status(400).json({
          error: {
            code: 'MISSING_SECRET_PATH',
            message: 'Secret path is required',
            correlationId: req.correlationId
          }
        });
      }

      const job = await rotationService.forceRotation(
        secretPath, 
        reason || `Manual rotation by ${req.user.email}`
      );
      
      res.json({
        success: true,
        data: { job },
        message: 'Rotation job scheduled successfully',
        correlationId: req.correlationId
      });

    } catch (error) {
      logger.error('Failed to force rotation', { 
        error,
        secretPath: req.body.secretPath,
        userId: req.user?.id,
        correlationId: req.correlationId 
      });
      
      res.status(400).json({
        error: {
          code: 'FORCE_ROTATION_FAILED',
          message: error instanceof Error ? error.message : 'Failed to force rotation',
          correlationId: req.correlationId
        }
      });
    }
  }
);

// Cancel a rotation job
router.post('/cancel/:jobId',
  authenticateToken,
  requirePermission('secrets', 'rotate'),
  async (req: Request, res: Response) => {
    try {
      const { jobId } = req.params;
      
      await rotationService.cancelRotation(jobId);
      
      res.json({
        success: true,
        message: 'Rotation job cancelled successfully',
        correlationId: req.correlationId
      });

    } catch (error) {
      logger.error('Failed to cancel rotation', { 
        error,
        jobId: req.params.jobId,
        userId: req.user?.id,
        correlationId: req.correlationId 
      });
      
      res.status(400).json({
        error: {
          code: 'CANCEL_ROTATION_FAILED',
          message: error instanceof Error ? error.message : 'Failed to cancel rotation',
          correlationId: req.correlationId
        }
      });
    }
  }
);

// Rotate a specific secret immediately
router.post('/rotate/*',
  authenticateToken,
  requirePermission('secrets', 'rotate'),
  async (req: Request, res: Response) => {
    try {
      const secretPath = req.params[0];
      
      const rotatedSecret = await vaultService.rotateSecret(secretPath);
      
      // Don't return the actual secret value
      const { value, ...secretResponse } = rotatedSecret;
      
      res.json({
        success: true,
        data: secretResponse,
        message: 'Secret rotated successfully',
        correlationId: req.correlationId
      });

    } catch (error) {
      logger.error('Failed to rotate secret', { 
        error,
        secretPath: req.params[0],
        userId: req.user?.id,
        correlationId: req.correlationId 
      });
      
      res.status(400).json({
        error: {
          code: 'SECRET_ROTATION_FAILED',
          message: error instanceof Error ? error.message : 'Failed to rotate secret',
          correlationId: req.correlationId
        }
      });
    }
  }
);

// Check rotation status for secrets
router.post('/check',
  authenticateToken,
  requirePermission('secrets', 'read'),
  async (req: Request, res: Response) => {
    try {
      // Trigger rotation check manually
      await rotationService.checkAndScheduleRotations();
      
      res.json({
        success: true,
        message: 'Rotation check completed successfully',
        correlationId: req.correlationId
      });

    } catch (error) {
      logger.error('Failed to check rotations', { 
        error,
        userId: req.user?.id,
        correlationId: req.correlationId 
      });
      
      res.status(400).json({
        error: {
          code: 'ROTATION_CHECK_FAILED',
          message: error instanceof Error ? error.message : 'Failed to check rotations',
          correlationId: req.correlationId
        }
      });
    }
  }
);

export default router;