/**
 * Main router for gamification service
 */

import { Router } from 'express';
import pointsRouter from './points';
import badgesRouter from './badges';
import achievementsRouter from './achievements';
import leaderboardRouter from './leaderboard';
import userRouter from './user';
import adminRouter from './admin';

const router = Router();

// Mount sub-routers
router.use('/points', pointsRouter);
router.use('/badges', badgesRouter);
router.use('/achievements', achievementsRouter);
router.use('/leaderboard', leaderboardRouter);
router.use('/user', userRouter);
router.use('/admin', adminRouter);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'gamification-service',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

export default router;