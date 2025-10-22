/**
 * Enhanced Leaderboard service with real-time updates, animations, and cyberpunk features
 */

import { db } from '../database/connection';
import { logger } from '../telemetry/logger';
import { LeaderboardEntry, LeaderboardQuery, TeamLeaderboard, RecentActivity } from '../models';
import { WebSocketManager } from './websocketManager';
import { MetricsCollector } from './metricsCollector';

export interface LeaderboardUpdate {
  userId: string;
  oldRank: number;
  newRank: number;
  rankChange: number;
  trendDirection: 'up' | 'down' | 'stable';
  pointsGained: number;
}

export interface LeaderboardSnapshot {
  timestamp: Date;
  entries: LeaderboardEntry[];
  totalUsers: number;
  averagePoints: number;
  topPerformer: LeaderboardEntry;
  biggestMover: LeaderboardUpdate;
}

export class LeaderboardService {
  private static instance: LeaderboardService;
  private wsManager: WebSocketManager;
  private metrics: MetricsCollector;
  private previousRankings: Map<string, number> = new Map();

  private constructor() {
    this.wsManager = WebSocketManager.getInstance();
    this.metrics = MetricsCollector.getInstance();
  }

  public static getInstance(): LeaderboardService {
    if (!LeaderboardService.instance) {
      LeaderboardService.instance = new LeaderboardService();
    }
    return LeaderboardService.instance;
  }

  /**
   * Get global leaderboard
   */
  public async getGlobalLeaderboard(query: LeaderboardQuery = {}): Promise<LeaderboardEntry[]> {
    const { timeframe = 'all_time', limit = 50, offset = 0 } = query;
    const cacheKey = `leaderboard:global:${timeframe}:${limit}:${offset}`;

    try {
      // Try cache first
      const cached = await db.cacheGet<LeaderboardEntry[]>(cacheKey);
      if (cached) {
        return cached;
      }

      let baseQuery = `
        SELECT 
          ugp.user_id,
          'User' || ugp.user_id as username,
          ugp.total_points,
          ugp.level,
          ROW_NUMBER() OVER (ORDER BY ugp.total_points DESC, ugp.level DESC, ugp.created_at ASC) as rank,
          COUNT(DISTINCT ub.id) as badges,
          COUNT(DISTINCT ua.id) as achievements,
          ugp.current_streak as streak
        FROM user_game_profiles ugp
        LEFT JOIN user_badges ub ON ugp.user_id = ub.user_id
        LEFT JOIN user_achievements ua ON ugp.user_id = ua.user_id
      `;

      let whereClause = '';
      const params: any[] = [];

      // Add timeframe filter if not all_time
      if (timeframe !== 'all_time') {
        let interval = '';
        switch (timeframe) {
          case 'daily':
            interval = '1 day';
            break;
          case 'weekly':
            interval = '1 week';
            break;
          case 'monthly':
            interval = '1 month';
            break;
        }

        if (interval) {
          whereClause = `WHERE ugp.updated_at >= NOW() - INTERVAL '${interval}'`;
        }
      }

      const groupByClause = `
        GROUP BY ugp.user_id, ugp.total_points, ugp.level, ugp.current_streak, ugp.created_at
        ORDER BY ugp.total_points DESC, ugp.level DESC, ugp.created_at ASC
      `;

      const limitClause = `LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);

      const fullQuery = baseQuery + whereClause + groupByClause + limitClause;

      const result = await db.query(fullQuery, params);

      const leaderboard: LeaderboardEntry[] = result.rows.map((row: any) => ({
        userId: row.user_id,
        username: row.username,
        totalPoints: row.total_points,
        level: row.level,
        rank: parseInt(row.rank),
        badges: parseInt(row.badges),
        achievements: parseInt(row.achievements),
        streak: row.streak
      }));

      // Cache for 5 minutes
      await db.cacheSet(cacheKey, leaderboard, 300);

      this.metrics.recordLeaderboardQuery(timeframe, leaderboard.length);

      return leaderboard;

    } catch (error) {
      logger.error('Failed to get global leaderboard:', error);
      throw error;
    }
  }

  /**
   * Get user's position in leaderboard
   */
  public async getUserRank(userId: string, timeframe: string = 'all_time'): Promise<{
    rank: number;
    totalUsers: number;
    percentile: number;
  }> {
    const cacheKey = `rank:${userId}:${timeframe}`;

    try {
      // Try cache first
      const cached = await db.cacheGet<any>(cacheKey);
      if (cached) {
        return cached;
      }

      let query = `
        WITH ranked_users AS (
          SELECT 
            user_id,
            total_points,
            ROW_NUMBER() OVER (ORDER BY total_points DESC, level DESC, created_at ASC) as rank
          FROM user_game_profiles
      `;

      // Add timeframe filter
      if (timeframe !== 'all_time') {
        let interval = '';
        switch (timeframe) {
          case 'daily':
            interval = '1 day';
            break;
          case 'weekly':
            interval = '1 week';
            break;
          case 'monthly':
            interval = '1 month';
            break;
        }

        if (interval) {
          query += ` WHERE updated_at >= NOW() - INTERVAL '${interval}'`;
        }
      }

      query += `
        ),
        user_rank AS (
          SELECT rank FROM ranked_users WHERE user_id = $1
        ),
        total_count AS (
          SELECT COUNT(*) as total FROM ranked_users
        )
        SELECT 
          COALESCE(ur.rank, 0) as rank,
          tc.total as total_users,
          CASE 
            WHEN tc.total > 0 THEN ROUND((COALESCE(ur.rank, tc.total)::float / tc.total::float) * 100, 2)
            ELSE 0
          END as percentile
        FROM user_rank ur
        CROSS JOIN total_count tc
      `;

      const result = await db.query(query, [userId]);

      const rankInfo = {
        rank: parseInt(result.rows[0]?.rank || 0),
        totalUsers: parseInt(result.rows[0]?.total_users || 0),
        percentile: parseFloat(result.rows[0]?.percentile || 0)
      };

      // Cache for 5 minutes
      await db.cacheSet(cacheKey, rankInfo, 300);

      return rankInfo;

    } catch (error) {
      logger.error('Failed to get user rank:', error);
      throw error;
    }
  }

  /**
   * Get leaderboard around a specific user
   */
  public async getLeaderboardAroundUser(
    userId: string, 
    range: number = 5, 
    timeframe: string = 'all_time'
  ): Promise<LeaderboardEntry[]> {
    try {
      const userRank = await this.getUserRank(userId, timeframe);
      
      if (userRank.rank === 0) {
        // User not found, return top users
        return this.getGlobalLeaderboard({ timeframe, limit: range * 2 + 1 });
      }

      const startRank = Math.max(1, userRank.rank - range);
      const offset = startRank - 1;
      const limit = range * 2 + 1;

      return this.getGlobalLeaderboard({ timeframe, limit, offset });

    } catch (error) {
      logger.error('Failed to get leaderboard around user:', error);
      throw error;
    }
  }

  /**
   * Get category-specific leaderboard (e.g., by badge category)
   */
  public async getCategoryLeaderboard(
    category: string,
    query: LeaderboardQuery = {}
  ): Promise<LeaderboardEntry[]> {
    const { limit = 50, offset = 0 } = query;
    const cacheKey = `leaderboard:category:${category}:${limit}:${offset}`;

    try {
      // Try cache first
      const cached = await db.cacheGet<LeaderboardEntry[]>(cacheKey);
      if (cached) {
        return cached;
      }

      const sqlQuery = `
        SELECT 
          ugp.user_id,
          'User' || ugp.user_id as username,
          ugp.total_points,
          ugp.level,
          ROW_NUMBER() OVER (ORDER BY category_points DESC, ugp.total_points DESC) as rank,
          COUNT(DISTINCT ub.id) as badges,
          COUNT(DISTINCT ua.id) as achievements,
          ugp.current_streak as streak,
          COALESCE(category_points, 0) as category_points
        FROM user_game_profiles ugp
        LEFT JOIN user_badges ub ON ugp.user_id = ub.user_id
        LEFT JOIN user_achievements ua ON ugp.user_id = ua.user_id
        LEFT JOIN (
          SELECT 
            pt.user_id,
            SUM(pt.points) as category_points
          FROM point_transactions pt
          JOIN badges b ON pt.source = b.id
          WHERE b.category = $1
          GROUP BY pt.user_id
        ) cp ON ugp.user_id = cp.user_id
        GROUP BY ugp.user_id, ugp.total_points, ugp.level, ugp.current_streak, ugp.created_at, category_points
        ORDER BY category_points DESC, ugp.total_points DESC
        LIMIT $2 OFFSET $3
      `;

      const result = await db.query(sqlQuery, [category, limit, offset]);

      const leaderboard: LeaderboardEntry[] = result.rows.map((row: any) => ({
        userId: row.user_id,
        username: row.username,
        totalPoints: row.total_points,
        level: row.level,
        rank: parseInt(row.rank),
        badges: parseInt(row.badges),
        achievements: parseInt(row.achievements),
        streak: row.streak
      }));

      // Cache for 10 minutes
      await db.cacheSet(cacheKey, leaderboard, 600);

      return leaderboard;

    } catch (error) {
      logger.error('Failed to get category leaderboard:', error);
      throw error;
    }
  }

  /**
   * Update all user ranks (background job)
   */
  public async updateAllRanks(): Promise<void> {
    try {
      logger.info('Starting rank update for all users');

      const updateQuery = `
        WITH ranked_users AS (
          SELECT 
            user_id,
            ROW_NUMBER() OVER (ORDER BY total_points DESC, level DESC, created_at ASC) as new_rank
          FROM user_game_profiles
        )
        UPDATE user_game_profiles 
        SET leaderboard_rank = ru.new_rank, updated_at = NOW()
        FROM ranked_users ru
        WHERE user_game_profiles.user_id = ru.user_id
        AND user_game_profiles.leaderboard_rank != ru.new_rank
      `;

      const result = await db.query(updateQuery);
      
      logger.info(`Updated ranks for ${result.rowCount} users`);

      // Clear leaderboard cache
      await this.clearLeaderboardCache();

      this.metrics.recordRankUpdate(result.rowCount || 0);

    } catch (error) {
      logger.error('Failed to update user ranks:', error);
      throw error;
    }
  }

  /**
   * Get leaderboard statistics
   */
  public async getLeaderboardStats(): Promise<{
    totalUsers: number;
    averagePoints: number;
    topUserPoints: number;
    averageLevel: number;
    totalBadgesEarned: number;
    totalAchievementsUnlocked: number;
  }> {
    const cacheKey = 'leaderboard:stats';

    try {
      // Try cache first
      const cached = await db.cacheGet<any>(cacheKey);
      if (cached) {
        return cached;
      }

      const query = `
        SELECT 
          COUNT(DISTINCT ugp.user_id) as total_users,
          ROUND(AVG(ugp.total_points), 2) as average_points,
          MAX(ugp.total_points) as top_user_points,
          ROUND(AVG(ugp.level), 2) as average_level,
          COUNT(DISTINCT ub.id) as total_badges_earned,
          COUNT(DISTINCT ua.id) as total_achievements_unlocked
        FROM user_game_profiles ugp
        LEFT JOIN user_badges ub ON ugp.user_id = ub.user_id
        LEFT JOIN user_achievements ua ON ugp.user_id = ua.user_id
      `;

      const result = await db.query(query);
      const row = result.rows[0];

      const stats = {
        totalUsers: parseInt(row.total_users || 0),
        averagePoints: parseFloat(row.average_points || 0),
        topUserPoints: parseInt(row.top_user_points || 0),
        averageLevel: parseFloat(row.average_level || 1),
        totalBadgesEarned: parseInt(row.total_badges_earned || 0),
        totalAchievementsUnlocked: parseInt(row.total_achievements_unlocked || 0)
      };

      // Cache for 15 minutes
      await db.cacheSet(cacheKey, stats, 900);

      return stats;

    } catch (error) {
      logger.error('Failed to get leaderboard stats:', error);
      throw error;
    }
  }

  /**
   * Get trending users (users with recent activity)
   */
  public async getTrendingUsers(limit: number = 20): Promise<LeaderboardEntry[]> {
    const cacheKey = `leaderboard:trending:${limit}`;

    try {
      // Try cache first
      const cached = await db.cacheGet<LeaderboardEntry[]>(cacheKey);
      if (cached) {
        return cached;
      }

      const query = `
        SELECT 
          ugp.user_id,
          'User' || ugp.user_id as username,
          ugp.total_points,
          ugp.level,
          ROW_NUMBER() OVER (ORDER BY recent_points DESC, ugp.total_points DESC) as rank,
          COUNT(DISTINCT ub.id) as badges,
          COUNT(DISTINCT ua.id) as achievements,
          ugp.current_streak as streak,
          COALESCE(rp.recent_points, 0) as recent_points
        FROM user_game_profiles ugp
        LEFT JOIN user_badges ub ON ugp.user_id = ub.user_id
        LEFT JOIN user_achievements ua ON ugp.user_id = ua.user_id
        LEFT JOIN (
          SELECT 
            user_id,
            SUM(points) as recent_points
          FROM point_transactions
          WHERE created_at >= NOW() - INTERVAL '7 days'
          GROUP BY user_id
        ) rp ON ugp.user_id = rp.user_id
        WHERE rp.recent_points > 0
        GROUP BY ugp.user_id, ugp.total_points, ugp.level, ugp.current_streak, ugp.created_at, rp.recent_points
        ORDER BY rp.recent_points DESC, ugp.total_points DESC
        LIMIT $1
      `;

      const result = await db.query(query, [limit]);

      const trending: LeaderboardEntry[] = result.rows.map((row: any) => ({
        userId: row.user_id,
        username: row.username,
        totalPoints: row.total_points,
        level: row.level,
        rank: parseInt(row.rank),
        badges: parseInt(row.badges),
        achievements: parseInt(row.achievements),
        streak: row.streak
      }));

      // Cache for 10 minutes
      await db.cacheSet(cacheKey, trending, 600);

      return trending;

    } catch (error) {
      logger.error('Failed to get trending users:', error);
      throw error;
    }
  }

  /**
   * Clear leaderboard cache
   */
  private async clearLeaderboardCache(): Promise<void> {
    try {
      // In a real implementation, you'd use Redis pattern matching
      // For now, we'll clear specific known cache keys
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

      logger.info('Leaderboard cache cleared');

    } catch (error) {
      logger.error('Failed to clear leaderboard cache:', error);
    }
  }

  /**
   * Schedule periodic rank updates
   */
  public startRankUpdateScheduler(): void {
    // Update ranks every 5 minutes
    setInterval(async () => {
      try {
        await this.updateAllRanks();
      } catch (error) {
        logger.error('Scheduled rank update failed:', error);
      }
    }, 5 * 60 * 1000);

    logger.info('Rank update scheduler started');
  }
}