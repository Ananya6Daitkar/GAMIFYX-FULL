/**
 * Competition-specific leaderboard service with separate ranking systems
 */

import { db } from '../database/connection';
import { logger } from '../telemetry/logger';
import { CompetitionType } from '../models';

export interface CompetitionLeaderboardEntry {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  totalPoints: number;
  rank: number;
  competitionSpecificPoints: number;
  badgeCount: number;
  achievementCount: number;
  level: number;
  streak: number;
  lastActivity: Date;
  competitionJoinDate: Date;
  progress: {
    completedTasks: number;
    totalTasks: number;
    completionPercentage: number;
  };
}

export interface CompetitionLeaderboardStats {
  totalParticipants: number;
  averagePoints: number;
  topScore: number;
  competitionDuration: number;
  activeParticipants: number;
  completionRate: number;
}

export class CompetitionLeaderboardService {
  /**
   * Get competition leaderboard with enhanced data
   */
  public async getCompetitionLeaderboard(
    competitionId: string,
    options: {
      limit?: number;
      offset?: number;
      timeframe?: 'all' | 'daily' | 'weekly' | 'monthly';
      includeInactive?: boolean;
    } = {}
  ): Promise<{
    entries: CompetitionLeaderboardEntry[];
    stats: CompetitionLeaderboardStats;
    pagination: {
      total: number;
      limit: number;
      offset: number;
      hasMore: boolean;
    };
  }> {
    const { limit = 50, offset = 0, timeframe = 'all', includeInactive = false } = options;

    try {
      // Build time filter
      let timeFilter = '';
      if (timeframe !== 'all') {
        const intervals = {
          daily: '1 day',
          weekly: '1 week',
          monthly: '1 month'
        };
        timeFilter = `AND pt.created_at >= NOW() - INTERVAL '${intervals[timeframe]}'`;
      }

      // Build activity filter
      const activityFilter = includeInactive 
        ? '' 
        : 'AND ugp.last_activity_date >= NOW() - INTERVAL \'7 days\'';

      // Get leaderboard entries
      const entriesQuery = `
        SELECT 
          u.id as user_id,
          u.username,
          u.display_name,
          u.avatar_url,
          COALESCE(comp_points.total_points, 0) as competition_points,
          COALESCE(ugp.total_points, 0) as total_points,
          COALESCE(ugp.level, 1) as level,
          COALESCE(ugp.current_streak, 0) as streak,
          COALESCE(ugp.last_activity_date, u.created_at) as last_activity,
          COALESCE(cp.joined_at, u.created_at) as competition_join_date,
          COALESCE(badge_count.count, 0) as badge_count,
          COALESCE(achievement_count.count, 0) as achievement_count,
          COALESCE(progress.completed_tasks, 0) as completed_tasks,
          COALESCE(progress.total_tasks, 0) as total_tasks,
          CASE 
            WHEN COALESCE(progress.total_tasks, 0) > 0 
            THEN (COALESCE(progress.completed_tasks, 0)::float / progress.total_tasks * 100)
            ELSE 0 
          END as completion_percentage
        FROM users u
        LEFT JOIN user_game_profiles ugp ON u.id = ugp.user_id
        LEFT JOIN competition_participants cp ON u.id = cp.user_id AND cp.competition_id = $1
        LEFT JOIN (
          SELECT 
            pt.user_id,
            SUM(pt.points) as total_points
          FROM point_transactions pt
          WHERE pt.source = $1 ${timeFilter}
          GROUP BY pt.user_id
        ) comp_points ON u.id = comp_points.user_id
        LEFT JOIN (
          SELECT 
            ub.user_id,
            COUNT(*) as count
          FROM user_badges ub
          JOIN badges b ON ub.badge_id = b.id
          WHERE b.category LIKE 'competition_%'
          GROUP BY ub.user_id
        ) badge_count ON u.id = badge_count.user_id
        LEFT JOIN (
          SELECT 
            ua.user_id,
            COUNT(*) as count
          FROM user_achievements ua
          WHERE ua.achievement_id LIKE 'competition_%'
          GROUP BY ua.user_id
        ) achievement_count ON u.id = achievement_count.user_id
        LEFT JOIN (
          SELECT 
            user_id,
            COUNT(CASE WHEN completed = true THEN 1 END) as completed_tasks,
            COUNT(*) as total_tasks
          FROM competition_tasks ct
          WHERE ct.competition_id = $1
          GROUP BY user_id
        ) progress ON u.id = progress.user_id
        WHERE cp.competition_id = $1 ${activityFilter}
        ORDER BY COALESCE(comp_points.total_points, 0) DESC, ugp.level DESC, u.username ASC
        LIMIT $2 OFFSET $3
      `;

      const entriesResult = await db.query(entriesQuery, [competitionId, limit, offset]);

      // Add ranks to entries
      const entries: CompetitionLeaderboardEntry[] = entriesResult.rows.map((row, index) => ({
        userId: row.user_id,
        username: row.username,
        displayName: row.display_name || row.username,
        avatarUrl: row.avatar_url,
        totalPoints: parseInt(row.total_points),
        rank: offset + index + 1,
        competitionSpecificPoints: parseInt(row.competition_points),
        badgeCount: parseInt(row.badge_count),
        achievementCount: parseInt(row.achievement_count),
        level: parseInt(row.level),
        streak: parseInt(row.streak),
        lastActivity: row.last_activity,
        competitionJoinDate: row.competition_join_date,
        progress: {
          completedTasks: parseInt(row.completed_tasks),
          totalTasks: parseInt(row.total_tasks),
          completionPercentage: parseFloat(row.completion_percentage)
        }
      }));

      // Get statistics
      const stats = await this.getCompetitionStats(competitionId, timeframe);

      // Get total count for pagination
      const countQuery = `
        SELECT COUNT(DISTINCT u.id) as total
        FROM users u
        JOIN competition_participants cp ON u.id = cp.user_id
        LEFT JOIN user_game_profiles ugp ON u.id = ugp.user_id
        WHERE cp.competition_id = $1 ${activityFilter}
      `;

      const countResult = await db.query(countQuery, [competitionId]);
      const total = parseInt(countResult.rows[0].total);

      return {
        entries,
        stats,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total
        }
      };

    } catch (error) {
      logger.error('Failed to get competition leaderboard:', error);
      throw error;
    }
  }

  /**
   * Get competition statistics
   */
  private async getCompetitionStats(
    competitionId: string,
    timeframe: string
  ): Promise<CompetitionLeaderboardStats> {
    try {
      let timeFilter = '';
      if (timeframe !== 'all') {
        const intervals = {
          daily: '1 day',
          weekly: '1 week',
          monthly: '1 month'
        };
        timeFilter = `AND pt.created_at >= NOW() - INTERVAL '${intervals[timeframe]}'`;
      }

      const statsQuery = `
        SELECT 
          COUNT(DISTINCT cp.user_id) as total_participants,
          COALESCE(AVG(comp_points.total_points), 0) as average_points,
          COALESCE(MAX(comp_points.total_points), 0) as top_score,
          COUNT(DISTINCT CASE 
            WHEN ugp.last_activity_date >= NOW() - INTERVAL '7 days' 
            THEN cp.user_id 
          END) as active_participants,
          COUNT(DISTINCT CASE 
            WHEN progress.completion_percentage >= 100 
            THEN cp.user_id 
          END)::float / COUNT(DISTINCT cp.user_id) * 100 as completion_rate
        FROM competition_participants cp
        LEFT JOIN user_game_profiles ugp ON cp.user_id = ugp.user_id
        LEFT JOIN (
          SELECT 
            pt.user_id,
            SUM(pt.points) as total_points
          FROM point_transactions pt
          WHERE pt.source = $1 ${timeFilter}
          GROUP BY pt.user_id
        ) comp_points ON cp.user_id = comp_points.user_id
        LEFT JOIN (
          SELECT 
            user_id,
            CASE 
              WHEN COUNT(*) > 0 
              THEN (COUNT(CASE WHEN completed = true THEN 1 END)::float / COUNT(*) * 100)
              ELSE 0 
            END as completion_percentage
          FROM competition_tasks
          WHERE competition_id = $1
          GROUP BY user_id
        ) progress ON cp.user_id = progress.user_id
        WHERE cp.competition_id = $1
      `;

      const statsResult = await db.query(statsQuery, [competitionId]);
      const row = statsResult.rows[0];

      // Get competition duration
      const durationQuery = `
        SELECT 
          EXTRACT(EPOCH FROM (end_date - start_date)) / 86400 as duration_days
        FROM competitions 
        WHERE id = $1
      `;

      const durationResult = await db.query(durationQuery, [competitionId]);
      const competitionDuration = durationResult.rows.length > 0 
        ? parseFloat(durationResult.rows[0].duration_days) 
        : 0;

      return {
        totalParticipants: parseInt(row.total_participants),
        averagePoints: parseFloat(row.average_points),
        topScore: parseInt(row.top_score),
        competitionDuration,
        activeParticipants: parseInt(row.active_participants),
        completionRate: parseFloat(row.completion_rate)
      };

    } catch (error) {
      logger.error('Failed to get competition stats:', error);
      return {
        totalParticipants: 0,
        averagePoints: 0,
        topScore: 0,
        competitionDuration: 0,
        activeParticipants: 0,
        completionRate: 0
      };
    }
  }

  /**
   * Get user's position in competition leaderboard
   */
  public async getUserCompetitionRank(
    userId: string,
    competitionId: string
  ): Promise<{
    rank: number;
    totalPoints: number;
    competitionPoints: number;
    percentile: number;
    totalParticipants: number;
  }> {
    try {
      const query = `
        WITH user_stats AS (
          SELECT 
            cp.user_id,
            COALESCE(SUM(pt.points), 0) as competition_points,
            COALESCE(ugp.total_points, 0) as total_points
          FROM competition_participants cp
          LEFT JOIN point_transactions pt ON cp.user_id = pt.user_id AND pt.source = $2
          LEFT JOIN user_game_profiles ugp ON cp.user_id = ugp.user_id
          WHERE cp.competition_id = $2
          GROUP BY cp.user_id, ugp.total_points
        ),
        ranked_users AS (
          SELECT 
            user_id,
            competition_points,
            total_points,
            ROW_NUMBER() OVER (ORDER BY competition_points DESC, total_points DESC) as rank
          FROM user_stats
        )
        SELECT 
          ru.rank,
          ru.total_points,
          ru.competition_points,
          (SELECT COUNT(*) FROM ranked_users) as total_participants
        FROM ranked_users ru
        WHERE ru.user_id = $1
      `;

      const result = await db.query(query, [userId, competitionId]);

      if (result.rows.length === 0) {
        return {
          rank: 0,
          totalPoints: 0,
          competitionPoints: 0,
          percentile: 0,
          totalParticipants: 0
        };
      }

      const row = result.rows[0];
      const rank = parseInt(row.rank);
      const totalParticipants = parseInt(row.total_participants);
      const percentile = totalParticipants > 0 ? (rank / totalParticipants) * 100 : 0;

      return {
        rank,
        totalPoints: parseInt(row.total_points),
        competitionPoints: parseInt(row.competition_points),
        percentile,
        totalParticipants
      };

    } catch (error) {
      logger.error('Failed to get user competition rank:', error);
      throw error;
    }
  }

  /**
   * Get competition type leaderboard (across all competitions of same type)
   */
  public async getCompetitionTypeLeaderboard(
    competitionType: CompetitionType,
    limit: number = 50
  ): Promise<CompetitionLeaderboardEntry[]> {
    try {
      const query = `
        SELECT 
          u.id as user_id,
          u.username,
          u.display_name,
          u.avatar_url,
          SUM(COALESCE(pt.points, 0)) as competition_points,
          COALESCE(ugp.total_points, 0) as total_points,
          COALESCE(ugp.level, 1) as level,
          COALESCE(ugp.current_streak, 0) as streak,
          COALESCE(ugp.last_activity_date, u.created_at) as last_activity,
          MIN(cp.joined_at) as first_competition_join,
          COUNT(DISTINCT c.id) as competitions_participated,
          COUNT(DISTINCT ub.id) as badge_count,
          COUNT(DISTINCT ua.id) as achievement_count
        FROM users u
        JOIN competition_participants cp ON u.id = cp.user_id
        JOIN competitions c ON cp.competition_id = c.id
        LEFT JOIN user_game_profiles ugp ON u.id = ugp.user_id
        LEFT JOIN point_transactions pt ON u.id = pt.user_id AND pt.source = c.id
        LEFT JOIN user_badges ub ON u.id = ub.user_id
        LEFT JOIN badges b ON ub.badge_id = b.id AND b.category = $1
        LEFT JOIN user_achievements ua ON u.id = ua.user_id AND ua.achievement_id LIKE $2
        WHERE c.type = $1
        GROUP BY u.id, u.username, u.display_name, u.avatar_url, ugp.total_points, ugp.level, ugp.current_streak, ugp.last_activity_date
        ORDER BY SUM(COALESCE(pt.points, 0)) DESC, ugp.level DESC, u.username ASC
        LIMIT $3
      `;

      const result = await db.query(query, [
        `competition_${competitionType}`,
        `competition_${competitionType}_%`,
        limit
      ]);

      return result.rows.map((row, index) => ({
        userId: row.user_id,
        username: row.username,
        displayName: row.display_name || row.username,
        avatarUrl: row.avatar_url,
        totalPoints: parseInt(row.total_points),
        rank: index + 1,
        competitionSpecificPoints: parseInt(row.competition_points),
        badgeCount: parseInt(row.badge_count),
        achievementCount: parseInt(row.achievement_count),
        level: parseInt(row.level),
        streak: parseInt(row.streak),
        lastActivity: row.last_activity,
        competitionJoinDate: row.first_competition_join,
        progress: {
          completedTasks: parseInt(row.competitions_participated),
          totalTasks: parseInt(row.competitions_participated),
          completionPercentage: 100 // Simplified for type leaderboard
        }
      }));

    } catch (error) {
      logger.error('Failed to get competition type leaderboard:', error);
      throw error;
    }
  }
}