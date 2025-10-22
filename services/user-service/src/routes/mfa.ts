import { Router, Request, Response } from 'express';
import { MFAService } from '@/services/MFAService';
import { authenticateToken, requireOwnership, rateLimitByUser } from '@/middleware/auth';
import { logger } from '@/telemetry/logger';

const router = Router();
const mfaService = new MFAService();

// Setup MFA for a user
router.post('/setup/:userId', 
  authenticateToken,
  requireOwnership,
  rateLimitByUser(3, 15), // 3 attempts per 15 minutes
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      
      const setupResponse = await mfaService.setupMFA(userId);
      
      res.json({
        success: true,
        data: setupResponse,
        correlationId: req.correlationId
      });
    } catch (error) {
      logger.error('MFA setup failed', { 
        error, 
        userId: req.params.userId,
        correlationId: req.correlationId 
      });
      
      res.status(400).json({
        error: {
          code: 'MFA_SETUP_FAILED',
          message: error instanceof Error ? error.message : 'MFA setup failed',
          correlationId: req.correlationId
        }
      });
    }
  }
);

// Verify MFA setup
router.post('/verify-setup/:userId',
  authenticateToken,
  requireOwnership,
  rateLimitByUser(5, 15), // 5 attempts per 15 minutes
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({
          error: {
            code: 'MISSING_TOKEN',
            message: 'MFA token is required',
            correlationId: req.correlationId
          }
        });
      }

      const verified = await mfaService.verifyMFASetup(userId, token);
      
      if (verified) {
        res.json({
          success: true,
          message: 'MFA enabled successfully',
          correlationId: req.correlationId
        });
      } else {
        res.status(400).json({
          error: {
            code: 'INVALID_TOKEN',
            message: 'Invalid MFA token',
            correlationId: req.correlationId
          }
        });
      }
    } catch (error) {
      logger.error('MFA verification failed', { 
        error, 
        userId: req.params.userId,
        correlationId: req.correlationId 
      });
      
      res.status(400).json({
        error: {
          code: 'MFA_VERIFICATION_FAILED',
          message: error instanceof Error ? error.message : 'MFA verification failed',
          correlationId: req.correlationId
        }
      });
    }
  }
);

// Disable MFA
router.post('/disable/:userId',
  authenticateToken,
  requireOwnership,
  rateLimitByUser(3, 60), // 3 attempts per hour
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { currentPassword } = req.body;

      if (!currentPassword) {
        return res.status(400).json({
          error: {
            code: 'MISSING_PASSWORD',
            message: 'Current password is required to disable MFA',
            correlationId: req.correlationId
          }
        });
      }

      await mfaService.disableMFA(userId, currentPassword);
      
      res.json({
        success: true,
        message: 'MFA disabled successfully',
        correlationId: req.correlationId
      });
    } catch (error) {
      logger.error('MFA disable failed', { 
        error, 
        userId: req.params.userId,
        correlationId: req.correlationId 
      });
      
      res.status(400).json({
        error: {
          code: 'MFA_DISABLE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to disable MFA',
          correlationId: req.correlationId
        }
      });
    }
  }
);

// Regenerate backup codes
router.post('/backup-codes/:userId',
  authenticateToken,
  requireOwnership,
  rateLimitByUser(2, 60), // 2 attempts per hour
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      
      const backupCodes = await mfaService.regenerateBackupCodes(userId);
      
      res.json({
        success: true,
        data: { backupCodes },
        correlationId: req.correlationId
      });
    } catch (error) {
      logger.error('Backup code regeneration failed', { 
        error, 
        userId: req.params.userId,
        correlationId: req.correlationId 
      });
      
      res.status(400).json({
        error: {
          code: 'BACKUP_CODE_REGENERATION_FAILED',
          message: error instanceof Error ? error.message : 'Failed to regenerate backup codes',
          correlationId: req.correlationId
        }
      });
    }
  }
);

// Get MFA status
router.get('/status/:userId',
  authenticateToken,
  requireOwnership,
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      
      const status = await mfaService.getMFAStatus(userId);
      
      res.json({
        success: true,
        data: status,
        correlationId: req.correlationId
      });
    } catch (error) {
      logger.error('Failed to get MFA status', { 
        error, 
        userId: req.params.userId,
        correlationId: req.correlationId 
      });
      
      res.status(400).json({
        error: {
          code: 'MFA_STATUS_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get MFA status',
          correlationId: req.correlationId
        }
      });
    }
  }
);

export default router;