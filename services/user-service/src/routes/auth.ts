import { Router, Request, Response } from 'express';
import { AuthService } from '@/services/AuthService';
import { logger } from '@/telemetry/logger';

const router = Router();
const authService = new AuthService();

// Register endpoint
router.post('/register', async (req: Request, res: Response) => {
  try {
    const result = await authService.register(req.body);
    res.status(201).json({
      success: true,
      data: result,
      correlationId: req.correlationId
    });
  } catch (error) {
    logger.error('Registration failed', { error, correlationId: req.correlationId });
    res.status(400).json({
      error: {
        code: 'REGISTRATION_FAILED',
        message: error instanceof Error ? error.message : 'Registration failed',
        correlationId: req.correlationId
      }
    });
  }
});

// Login endpoint
router.post('/login', async (req: Request, res: Response) => {
  try {
    const result = await authService.login(req.body);
    res.json({
      success: true,
      data: result,
      correlationId: req.correlationId
    });
  } catch (error) {
    logger.error('Login failed', { error, correlationId: req.correlationId });
    res.status(401).json({
      error: {
        code: 'LOGIN_FAILED',
        message: error instanceof Error ? error.message : 'Login failed',
        correlationId: req.correlationId
      }
    });
  }
});

// Refresh token endpoint
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    const result = await authService.refreshToken(refreshToken);
    res.json({
      success: true,
      data: result,
      correlationId: req.correlationId
    });
  } catch (error) {
    logger.error('Token refresh failed', { error, correlationId: req.correlationId });
    res.status(401).json({
      error: {
        code: 'TOKEN_REFRESH_FAILED',
        message: error instanceof Error ? error.message : 'Token refresh failed',
        correlationId: req.correlationId
      }
    });
  }
});

export { router as authRouter };