/**
 * Main router for analytics service
 */

import { Router } from 'express';
import analyticsRouter from './analytics';
import alertsRouter from './alerts';
import reportsRouter from './reports';
import healthRouter from './health';
import githubRouter from './github';
import realtimeRouter from './realtime';
import githubAnalyticsRouter from './githubAnalytics';
import databaseIntegrationRouter from './databaseIntegration';

const router = Router();

// Mount sub-routers
router.use('/analytics', analyticsRouter);
router.use('/alerts', alertsRouter);
router.use('/reports', reportsRouter);
router.use('/health', healthRouter);
router.use('/github', githubRouter);
router.use('/realtime', realtimeRouter);
router.use('/github-analytics', githubAnalyticsRouter);
router.use('/database-integration', databaseIntegrationRouter);

export default router;