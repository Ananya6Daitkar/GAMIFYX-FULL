/**
 * Admin routes for gamification management
 */

import { Router, Request, Response } from 'express';
import { LeaderboardService } from '../services/leaderboardService';
import { MetricsCollector } from '../services/metricsCollector';
import { WebSocketManager } from '../services/websocketManager';
import { db } from '../database/connection';
import { logger } from '../telemetry/logger';

const router = Router();
const leaderboardService = LeaderboardService.getInstance();
const metricsCollector = MetricsCollector.getInstance();
const wsManager = WebSocketManager.getInstance();

/**
 * Get service health and statistics
 * GET /admin/health
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    // Database health check
    const dbHealth = await db.healthCheck();
    
    // WebSocket statistics
    const wsStats = wsManager.getStats();
    
    // Metrics summary
    const metricsStats = metricsCollector.getMetricsSummary();
    
    // Leaderboard statistics
    const leaderboardStats = await leaderboardService.getLeaderboardStats();

    const health = {
      status: dbHealth.postgres && dbHealth.redis ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      database: dbHealth,
      websockets: wsStats,
      metrics: metricsStats,
      leaderboard: leaderboardStats,
      uptime: process.uptime()
    };

    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);

  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Trigger manual rank update
 * POST /admin/update-ranks
 */
router.post('/update-ranks', async (req: Request, res: Response) => {
  try {
    await leaderboardService.updateAllRanks();
    
    res.json({
      success: true,
      message: 'Rank update completed',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Manual rank update failed:', error);
    res.status(500).json({
      error: 'Failed to update ranks',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get system statistics
 * GET /admin/stats
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const systemStatsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM user_game_profiles) as total_users,
        (SELECT COUNT(*) FROM badges WHERE is_active = true) as active_badges,
        (SELECT COUNT(*) FROM achievements WHERE is_active = true) as active_achievements,
        (SELECT COUNT(*) FROM user_badges) as total_badges_earned,
        (SELECT COUNT(*) FROM user_achievements) as total_achievements_unlocked,
        (SELECT COUNT(*) FROM point_transactions) as total_transactions,
        (SELECT SUM(points) FROM point_transactions) as total_points_awarded,
        (SELECT COUNT(*) FROM notifications WHERE is_read = false) as unread_notifications
    `;

    const result = await db.query(systemStatsQuery);
    const stats = result.rows[0];

    // Recent activity (last 24 hours)
    const recentActivityQuery = `
      SELECT 
        (SELECT COUNT(*) FROM point_transactions WHERE created_at >= NOW() - INTERVAL '24 hours') as transactions_24h,
        (SELECT COUNT(*) FROM user_badges WHERE earned_at >= NOW() - INTERVAL '24 hours') as badges_earned_24h,
        (SELECT COUNT(*) FROM user_achievements WHERE earned_at >= NOW() - INTERVAL '24 hours') as achievements_unlocked_24h,
        (SELECT COUNT(DISTINCT user_id) FROM point_transactions WHERE created_at >= NOW() - INTERVAL '24 hours') as active_users_24h
    `;

    const recentResult = await db.query(recentActivityQuery);
    const recentStats = recentResult.rows[0];

    res.json({
      system: {
        totalUsers: parseInt(stats.total_users || 0),
        activeBadges: parseInt(stats.active_badges || 0),
        activeAchievements: parseInt(stats.active_achievements || 0),
        totalBadgesEarned: parseInt(stats.total_badges_earned || 0),
        totalAchievementsUnlocked: parseInt(stats.total_achievements_unlocked || 0),
        totalTransactions: parseInt(stats.total_transactions || 0),
        totalPointsAwarded: parseInt(stats.total_points_awarded || 0),
        unreadNotifications: parseInt(stats.unread_notifications || 0)
      },
      recent24h: {
        transactions: parseInt(recentStats.transactions_24h || 0),
        badgesEarned: parseInt(recentStats.badges_earned_24h || 0),
        achievementsUnlocked: parseInt(recentStats.achievements_unlocked_24h || 0),
        activeUsers: parseInt(recentStats.active_users_24h || 0)
      },
      websockets: wsManager.getStats(),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to get admin stats:', error);
    res.status(500).json({
      error: 'Failed to get admin stats',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Clear cache
 * POST /admin/clear-cache
 */
router.post('/clear-cache', async (req: Request, res: Response) => {
  try {
    const { pattern } = req.body;
    
    // In a real implementation, you'd clear Redis cache by pattern
    // For now, we'll just clear some known cache keys
    const cacheKeys = [
      'leaderboard:global:all_time:50:0',
      'leaderboard:global:weekly:50:0',
      'leaderboard:global:monthly:50:0',
      'leaderboard:stats',
      'leaderboard:trending:20'
    ];

    for (const key of cacheKeys) {
      await db.cacheDel(key);
    }

    res.json({
      success: true,
      message: 'Cache cleared successfully',
      clearedKeys: cacheKeys.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to clear cache:', error);
    res.status(500).json({
      error: 'Failed to clear cache',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Broadcast message to all connected users
 * POST /admin/broadcast
 */
router.post('/broadcast', async (req: Request, res: Response) => {
  try {
    const { type, title, message, data } = req.body;

    if (!type || !title || !message) {
      return res.status(400).json({
        error: 'type, title, and message are required'
      });
    }

    const gameEvent = {
      type: 'announcement',
      userId: 'system',
      data: {
        title,
        message,
        data: data || {}
      },
      timestamp: new Date()
    };

    await wsManager.broadcast(gameEvent);

    res.json({
      success: true,
      message: 'Broadcast sent successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to broadcast message:', error);
    res.status(500).json({
      error: 'Failed to broadcast message',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get user activity report
 * GET /admin/users/activity
 */
router.get('/users/activity', async (req: Request, res: Response) => {
  try {
    const days = Math.min(parseInt(req.query.days as string) || 7, 30);
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);

    const activityQuery = `
      SELECT 
        ugp.user_id,
        ugp.total_points,
        ugp.level,
        ugp.current_streak,
        ugp.last_activity_date,
        COUNT(DISTINCT pt.id) as recent_transactions,
        SUM(pt.points) as recent_points,
        COUNT(DISTINCT ub.id) as recent_badges,
        COUNT(DISTINCT ua.id) as recent_achievements
      FROM user_game_profiles ugp
      LEFT JOIN point_transactions pt ON ugp.user_id = pt.user_id 
        AND pt.created_at >= NOW() - INTERVAL '${days} days'
      LEFT JOIN user_badges ub ON ugp.user_id = ub.user_id 
        AND ub.earned_at >= NOW() - INTERVAL '${days} days'
      LEFT JOIN user_achievements ua ON ugp.user_id = ua.user_id 
        AND ua.earned_at >= NOW() - INTERVAL '${days} days'
      GROUP BY ugp.user_id, ugp.total_points, ugp.level, ugp.current_streak, ugp.last_activity_date
      ORDER BY recent_points DESC, ugp.total_points DESC
      LIMIT $1
    `;

    const result = await db.query(activityQuery, [limit]);

    const userActivity = result.rows.map(row => ({
      userId: row.user_id,
      totalPoints: parseInt(row.total_points),
      level: parseInt(row.level),
      currentStreak: parseInt(row.current_streak),
      lastActivityDate: row.last_activity_date,
      recentActivity: {
        transactions: parseInt(row.recent_transactions || 0),
        points: parseInt(row.recent_points || 0),
        badges: parseInt(row.recent_badges || 0),
        achievements: parseInt(row.recent_achievements || 0)
      }
    }));

    res.json({
      days,
      userActivity,
      total: userActivity.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to get user activity report:', error);
    res.status(500).json({
      error: 'Failed to get user activity report',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;