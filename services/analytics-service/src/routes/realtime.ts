import { Router } from 'express';
import { logger } from '../telemetry/logger';
import { RealTimeService } from '../services/realTimeService';
import { GitHubPRCacheService } from '../services/githubPRCacheService';
import { EventDrivenService } from '../services/eventDrivenService';

const router = Router();
const realTimeService = RealTimeService.getInstance();
const cacheService = GitHubPRCacheService.getInstance();
const eventService = EventDrivenService.getInstance();

/**
 * GET /realtime/status
 * Get real-time service connection status
 */
router.get('/status', async (req, res) => {
  try {
    const stats = realTimeService.getConnectionStats();
    
    res.json({
      success: true,
      data: {
        ...stats,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Error getting real-time status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get real-time status'
    });
  }
});

/**
 * POST /realtime/broadcast/pr-update
 * Broadcast PR update to connected clients
 */
router.post('/broadcast/pr-update', async (req, res) => {
  try {
    const { studentId, teacherId, prData, action } = req.body;

    if (!studentId || !teacherId || !prData || !action) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: studentId, teacherId, prData, action'
      });
    }

    // Handle the PR update event
    await eventService.handlePRUpdateEvent({
      type: action,
      studentId,
      teacherId,
      prData
    });

    res.json({
      success: true,
      message: 'PR update broadcasted successfully'
    });

  } catch (error) {
    logger.error('Error broadcasting PR update:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to broadcast PR update'
    });
  }
});

/**
 * POST /realtime/broadcast/sync-status
 * Broadcast sync status to connected clients
 */
router.post('/broadcast/sync-status', async (req, res) => {
  try {
    const { teacherId, status, studentsProcessed, prsFound, duration } = req.body;

    if (!teacherId || !status) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: teacherId, status'
      });
    }

    if (status === 'completed') {
      await eventService.handleSyncCompletionEvent({
        teacherId,
        studentsProcessed: studentsProcessed || 0,
        prsFound: prsFound || 0,
        duration: duration || 0
      });
    } else {
      // Broadcast sync status update
      const realTimeEvent = {
        type: 'sync_status' as const,
        teacherId,
        data: {
          status,
          studentsProcessed,
          prsFound,
          duration,
          timestamp: new Date().toISOString()
        },
        timestamp: new Date()
      };

      realTimeService.broadcastEvent(realTimeEvent);
    }

    res.json({
      success: true,
      message: 'Sync status broadcasted successfully'
    });

  } catch (error) {
    logger.error('Error broadcasting sync status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to broadcast sync status'
    });
  }
});

/**
 * POST /realtime/broadcast/progress-analysis
 * Broadcast progress analysis to connected clients
 */
router.post('/broadcast/progress-analysis', async (req, res) => {
  try {
    const { studentId, teacherId, analysisData } = req.body;

    if (!studentId || !teacherId || !analysisData) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: studentId, teacherId, analysisData'
      });
    }

    const realTimeEvent = {
      type: 'progress_update' as const,
      teacherId,
      studentId,
      data: {
        ...analysisData,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date()
    };

    realTimeService.broadcastEvent(realTimeEvent);

    res.json({
      success: true,
      message: 'Progress analysis broadcasted successfully'
    });

  } catch (error) {
    logger.error('Error broadcasting progress analysis:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to broadcast progress analysis'
    });
  }
});

/**
 * GET /realtime/cache/student/:studentId/teacher/:teacherId
 * Get cached student PR data
 */
router.get('/cache/student/:studentId/teacher/:teacherId', async (req, res) => {
  try {
    const { studentId, teacherId } = req.params;

    const cachedData = await cacheService.getStudentPRData(studentId, teacherId);

    if (!cachedData) {
      return res.status(404).json({
        success: false,
        error: 'No cached data found for student'
      });
    }

    res.json({
      success: true,
      data: cachedData
    });

  } catch (error) {
    logger.error('Error getting cached student data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get cached student data'
    });
  }
});

/**
 * GET /realtime/cache/class/:teacherId
 * Get cached class PR overview
 */
router.get('/cache/class/:teacherId', async (req, res) => {
  try {
    const { teacherId } = req.params;

    const cachedData = await cacheService.getClassPROverview(teacherId);

    if (!cachedData) {
      return res.status(404).json({
        success: false,
        error: 'No cached data found for class'
      });
    }

    res.json({
      success: true,
      data: cachedData
    });

  } catch (error) {
    logger.error('Error getting cached class data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get cached class data'
    });
  }
});

/**
 * DELETE /realtime/cache/student/:studentId/teacher/:teacherId
 * Invalidate cache for specific student
 */
router.delete('/cache/student/:studentId/teacher/:teacherId', async (req, res) => {
  try {
    const { studentId, teacherId } = req.params;

    await cacheService.invalidateStudentCache(studentId, teacherId);

    res.json({
      success: true,
      message: 'Student cache invalidated successfully'
    });

  } catch (error) {
    logger.error('Error invalidating student cache:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to invalidate student cache'
    });
  }
});

/**
 * DELETE /realtime/cache/class/:teacherId
 * Invalidate cache for entire class
 */
router.delete('/cache/class/:teacherId', async (req, res) => {
  try {
    const { teacherId } = req.params;

    await cacheService.invalidateClassCache(teacherId);

    res.json({
      success: true,
      message: 'Class cache invalidated successfully'
    });

  } catch (error) {
    logger.error('Error invalidating class cache:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to invalidate class cache'
    });
  }
});

/**
 * POST /realtime/cache/preload/:teacherId
 * Preload cache for a teacher's class
 */
router.post('/cache/preload/:teacherId', async (req, res) => {
  try {
    const { teacherId } = req.params;

    // Start preloading in background
    cacheService.preloadClassCache(teacherId).catch(error => {
      logger.error(`Error preloading cache for teacher ${teacherId}:`, error);
    });

    res.json({
      success: true,
      message: 'Cache preloading started'
    });

  } catch (error) {
    logger.error('Error starting cache preload:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start cache preload'
    });
  }
});

/**
 * GET /realtime/cache/stats/:teacherId
 * Get cache statistics for a teacher
 */
router.get('/cache/stats/:teacherId', async (req, res) => {
  try {
    const { teacherId } = req.params;

    const stats = await cacheService.getCacheStats(teacherId);

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error('Error getting cache stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get cache stats'
    });
  }
});

/**
 * GET /realtime/events/recent/:teacherId
 * Get recent real-time events for a teacher
 */
router.get('/events/recent/:teacherId', async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { eventType, limit } = req.query;

    const events = await realTimeService.getRecentEvents(
      teacherId,
      eventType as string,
      limit ? parseInt(limit as string) : 50
    );

    res.json({
      success: true,
      data: events
    });

  } catch (error) {
    logger.error('Error getting recent events:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get recent events'
    });
  }
});

export default router;