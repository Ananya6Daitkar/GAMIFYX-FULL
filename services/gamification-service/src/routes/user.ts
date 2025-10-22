/**
 * User-specific gamification routes
 */

import { Router, Request, Response } from 'express';
import { GamificationEngine } from '../services/gamificationEngine';
import { LeaderboardService } from '../services/leaderboardService';
import { db } from '../database/connection';
import { logger } from '../telemetry/logger';
import { UserStatsResponse } from '../models';

const router = Router();
const gamificationEngine = GamificationEngine.getInstance();
const leaderboardService = LeaderboardService.getInstance();

/**
 * Get user's complete gamification profile
 * GET /user/:userId/profile
 */
router.get('/:userId/profile', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    // Get user profile
    const profile = await gamificationEngine.getUserProfile(userId);

    // Get user badges
    const badgesResult = await db.query(`
      SELECT ub.*, b.name, b.description, b.icon_url, b.category, b.rarity, b.points
      FROM user_badges ub
      JOIN badges b ON ub.badge_id = b.id
      WHERE ub.user_id = $1
      ORDER BY ub.earned_at DESC
    `, [userId]);

    const badges = badgesResult.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      badgeId: row.badge_id,
      earnedAt: row.earned_at,
      progress: row.progress,
      metadata: row.metadata,
      badge: {
        name: row.name,
        description: row.description,
        iconUrl: row.icon_url,
        category: row.category,
        rarity: row.rarity,
        points: row.points
      }
    }));

    // Get user achievements
    const achievementsResult = await db.query(`
      SELECT ua.*, a.name, a.description, a.category, a.points, a.is_repeatable
      FROM user_achievements ua
      JOIN achievements a ON ua.achievement_id = a.id
      WHERE ua.user_id = $1
      ORDER BY ua.earned_at DESC
    `, [userId]);

    const achievements = achievementsResult.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      achievementId: row.achievement_id,
      earnedAt: row.earned_at,
      count: row.count,
      metadata: row.metadata,
      achievement: {
        name: row.name,
        description: row.description,
        category: row.category,
        points: row.points,
        isRepeatable: row.is_repeatable
      }
    }));

    // Get recent transactions
    const transactionsResult = await db.query(`
      SELECT id, points, reason, source, description, metadata, created_at
      FROM point_transactions
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 10
    `, [userId]);

    const recentTransactions = transactionsResult.rows;

    // Get next milestones
    const milestonesResult = await db.query(`
      SELECT m.*
      FROM milestones m
      WHERE m.is_active = true
      AND ((m.type = 'points' AND m.threshold > $1)
           OR (m.type = 'level' AND m.threshold > $2)
           OR (m.type = 'badges' AND m.threshold > $3))
      ORDER BY 
        CASE 
          WHEN m.type = 'points' THEN m.threshold - $1
          WHEN m.type = 'level' THEN m.threshold - $2
          WHEN m.type = 'badges' THEN m.threshold - $3
        END
      LIMIT 5
    `, [profile.totalPoints, profile.level, badges.length]);

    const nextMilestones = milestonesResult.rows;

    // Get leaderboard position
    const rankInfo = await leaderboardService.getUserRank(userId);

    const response: UserStatsResponse = {
      profile,
      badges,
      achievements,
      recentTransactions,
      nextMilestones,
      leaderboardPosition: rankInfo.rank
    };

    res.json(response);

  } catch (error) {
    logger.error('Failed to get user profile:', error);
    res.status(500).json({
      error: 'Failed to get user profile',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get user's badges
 * GET /user/:userId/badges
 */
router.get('/:userId/badges', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const category = req.query.category as string;

    let query = `
      SELECT ub.*, b.name, b.description, b.icon_url, b.category, b.rarity, b.points
      FROM user_badges ub
      JOIN badges b ON ub.badge_id = b.id
      WHERE ub.user_id = $1
    `;
    const params = [userId];

    if (category) {
      query += ` AND b.category = $2`;
      params.push(category);
    }

    query += ` ORDER BY ub.earned_at DESC`;

    const result = await db.query(query, params);

    const badges = result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      badgeId: row.badge_id,
      earnedAt: row.earned_at,
      progress: row.progress,
      metadata: row.metadata,
      badge: {
        name: row.name,
        description: row.description,
        iconUrl: row.icon_url,
        category: row.category,
        rarity: row.rarity,
        points: row.points
      }
    }));

    // Get badge statistics
    const statsResult = await db.query(`
      SELECT 
        b.category,
        COUNT(*) as count,
        SUM(b.points) as total_points
      FROM user_badges ub
      JOIN badges b ON ub.badge_id = b.id
      WHERE ub.user_id = $1
      GROUP BY b.category
      ORDER BY count DESC
    `, [userId]);

    const badgeStats = statsResult.rows.map(row => ({
      category: row.category,
      count: parseInt(row.count),
      totalPoints: parseInt(row.total_points)
    }));

    res.json({
      userId,
      badges,
      statistics: {
        totalBadges: badges.length,
        byCategory: badgeStats
      }
    });

  } catch (error) {
    logger.error('Failed to get user badges:', error);
    res.status(500).json({
      error: 'Failed to get user badges',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get user's achievements
 * GET /user/:userId/achievements
 */
router.get('/:userId/achievements', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const category = req.query.category as string;

    let query = `
      SELECT ua.*, a.name, a.description, a.category, a.points, a.is_repeatable
      FROM user_achievements ua
      JOIN achievements a ON ua.achievement_id = a.id
      WHERE ua.user_id = $1
    `;
    const params = [userId];

    if (category) {
      query += ` AND a.category = $2`;
      params.push(category);
    }

    query += ` ORDER BY ua.earned_at DESC`;

    const result = await db.query(query, params);

    const achievements = result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      achievementId: row.achievement_id,
      earnedAt: row.earned_at,
      count: row.count,
      metadata: row.metadata,
      achievement: {
        name: row.name,
        description: row.description,
        category: row.category,
        points: row.points,
        isRepeatable: row.is_repeatable
      }
    }));

    res.json({
      userId,
      achievements,
      totalAchievements: achievements.length
    });

  } catch (error) {
    logger.error('Failed to get user achievements:', error);
    res.status(500).json({
      error: 'Failed to get user achievements',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get user's progress and statistics
 * GET /user/:userId/progress
 */
router.get('/:userId/progress', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const timeframe = req.query.timeframe as string || 'all_time';

    // Get user profile
    const profile = await gamificationEngine.getUserProfile(userId);

    // Get progress over time
    let progressQuery = `
      SELECT 
        DATE_TRUNC('day', created_at) as date,
        SUM(points) as daily_points,
        COUNT(*) as daily_transactions
      FROM point_transactions
      WHERE user_id = $1
    `;
    const params = [userId];

    if (timeframe !== 'all_time') {
      let interval = '';
      switch (timeframe) {
        case 'weekly':
          interval = '7 days';
          break;
        case 'monthly':
          interval = '30 days';
          break;
        case 'yearly':
          interval = '365 days';
          break;
      }

      if (interval) {
        progressQuery += ` AND created_at >= NOW() - INTERVAL '${interval}'`;
      }
    }

    progressQuery += ` GROUP BY DATE_TRUNC('day', created_at) ORDER BY date DESC LIMIT 30`;

    const progressResult = await db.query(progressQuery, params);

    const dailyProgress = progressResult.rows.map(row => ({
      date: row.date,
      points: parseInt(row.daily_points),
      transactions: parseInt(row.daily_transactions)
    }));

    // Get level progression
    const levelProgressQuery = `
      SELECT 
        level,
        MIN(created_at) as level_reached_at
      FROM (
        SELECT 
          created_at,
          SUM(points) OVER (ORDER BY created_at) as cumulative_points,
          FLOOR(SQRT(SUM(points) OVER (ORDER BY created_at) / 100)) + 1 as level
        FROM point_transactions
        WHERE user_id = $1
      ) level_calc
      GROUP BY level
      ORDER BY level
    `;

    const levelProgressResult = await db.query(levelProgressQuery, [userId]);

    const levelProgression = levelProgressResult.rows.map(row => ({
      level: parseInt(row.level),
      reachedAt: row.level_reached_at
    }));

    // Calculate statistics
    const totalPoints = profile.totalPoints;
    const pointsToNextLevel = profile.xpToNextLevel - profile.currentXp;
    const levelProgress = profile.currentXp / profile.xpToNextLevel;

    res.json({
      userId,
      currentLevel: profile.level,
      totalPoints,
      currentXp: profile.currentXp,
      pointsToNextLevel,
      levelProgress: Math.round(levelProgress * 100),
      streak: profile.streaks,
      dailyProgress,
      levelProgression,
      timeframe
    });

  } catch (error) {
    logger.error('Failed to get user progress:', error);
    res.status(500).json({
      error: 'Failed to get user progress',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get user's notifications
 * GET /user/:userId/notifications
 */
router.get('/:userId/notifications', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;
    const unreadOnly = req.query.unreadOnly === 'true';

    let query = `
      SELECT id, type, title, message, data, is_read, created_at
      FROM notifications
      WHERE user_id = $1
    `;
    const params = [userId];

    if (unreadOnly) {
      query += ` AND is_read = false`;
    }

    query += ` ORDER BY created_at DESC LIMIT $2 OFFSET $3`;
    params.push(limit, offset);

    const result = await db.query(query, params);

    const notifications = result.rows.map(row => ({
      id: row.id,
      type: row.type,
      title: row.title,
      message: row.message,
      data: row.data,
      isRead: row.is_read,
      createdAt: row.created_at
    }));

    // Get unread count
    const unreadCountResult = await db.query(
      'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false',
      [userId]
    );
    const unreadCount = parseInt(unreadCountResult.rows[0].count);

    res.json({
      userId,
      notifications,
      unreadCount,
      pagination: {
        limit,
        offset,
        hasMore: notifications.length === limit
      }
    });

  } catch (error) {
    logger.error('Failed to get user notifications:', error);
    res.status(500).json({
      error: 'Failed to get user notifications',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Mark notifications as read
 * PUT /user/:userId/notifications/read
 */
router.put('/:userId/notifications/read', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { notificationIds } = req.body;

    if (!notificationIds || !Array.isArray(notificationIds)) {
      return res.status(400).json({
        error: 'notificationIds array is required'
      });
    }

    if (notificationIds.length === 0) {
      return res.status(400).json({
        error: 'At least one notification ID is required'
      });
    }

    const placeholders = notificationIds.map((_, index) => `$${index + 2}`).join(',');
    const query = `
      UPDATE notifications 
      SET is_read = true, updated_at = NOW()
      WHERE user_id = $1 AND id IN (${placeholders})
      RETURNING id
    `;

    const result = await db.query(query, [userId, ...notificationIds]);

    res.json({
      success: true,
      markedAsRead: result.rows.length,
      notificationIds: result.rows.map(row => row.id)
    });

  } catch (error) {
    logger.error('Failed to mark notifications as read:', error);
    res.status(500).json({
      error: 'Failed to mark notifications as read',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get user comparison with peers
 * GET /user/:userId/compare
 */
router.get('/:userId/compare', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const timeframe = req.query.timeframe as string || 'all_time';

    // Get user's rank and stats
    const userRank = await leaderboardService.getUserRank(userId, timeframe);
    const userProfile = await gamificationEngine.getUserProfile(userId);

    // Get users around this user
    const nearbyUsers = await leaderboardService.getLeaderboardAroundUser(userId, 3, timeframe);

    // Get class/cohort average (simplified - in real app you'd have cohort info)
    const averageStatsResult = await db.query(`
      SELECT 
        AVG(total_points) as avg_points,
        AVG(level) as avg_level,
        AVG(current_streak) as avg_streak
      FROM user_game_profiles
    `);

    const averageStats = averageStatsResult.rows[0];

    const comparison = {
      user: {
        userId,
        rank: userRank.rank,
        totalPoints: userProfile.totalPoints,
        level: userProfile.level,
        streak: userProfile.streaks.current,
        percentile: userRank.percentile
      },
      classAverage: {
        points: parseFloat(averageStats.avg_points || 0),
        level: parseFloat(averageStats.avg_level || 1),
        streak: parseFloat(averageStats.avg_streak || 0)
      },
      nearbyUsers: nearbyUsers.map(user => ({
        userId: user.userId,
        rank: user.rank,
        totalPoints: user.totalPoints,
        level: user.level,
        streak: user.streak
      })),
      performance: {
        pointsVsAverage: userProfile.totalPoints - parseFloat(averageStats.avg_points || 0),
        levelVsAverage: userProfile.level - parseFloat(averageStats.avg_level || 1),
        streakVsAverage: userProfile.streaks.current - parseFloat(averageStats.avg_streak || 0)
      }
    };

    res.json({
      timeframe,
      comparison,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to get user comparison:', error);
    res.status(500).json({
      error: 'Failed to get user comparison',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;