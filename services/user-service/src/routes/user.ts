import { Router, Request, Response } from 'express';
import { UserRepository } from '@/database/repositories/UserRepository';
import { authenticateToken, requireOwnership } from '@/middleware/auth';
import { logger } from '@/telemetry/logger';

const router = Router();
const userRepository = new UserRepository();

// Get user profile
router.get('/profile/:id',
  authenticateToken,
  requireOwnership,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const profile = await userRepository.getProfile(id);
      
      if (!profile) {
        return res.status(404).json({
          error: {
            code: 'PROFILE_NOT_FOUND',
            message: 'User profile not found',
            correlationId: req.correlationId
          }
        });
      }

      res.json({
        success: true,
        data: profile,
        correlationId: req.correlationId
      });
    } catch (error) {
      logger.error('Failed to get user profile', { error, correlationId: req.correlationId });
      res.status(500).json({
        error: {
          code: 'PROFILE_RETRIEVAL_FAILED',
          message: error instanceof Error ? error.message : 'Failed to retrieve profile',
          correlationId: req.correlationId
        }
      });
    }
  }
);

// Update user profile
router.put('/profile/:id',
  authenticateToken,
  requireOwnership,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const profile = await userRepository.updateProfile(id, req.body);
      
      res.json({
        success: true,
        data: profile,
        correlationId: req.correlationId
      });
    } catch (error) {
      logger.error('Failed to update user profile', { error, correlationId: req.correlationId });
      res.status(500).json({
        error: {
          code: 'PROFILE_UPDATE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to update profile',
          correlationId: req.correlationId
        }
      });
    }
  }
);

export { router as userRouter };