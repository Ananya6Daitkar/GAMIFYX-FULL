/**
 * Enhanced Leaderboard service with real-time updates, animations, and cyberpunk features
 */

import { db } from '../database/connection';
import { logger } from '../telemetry/logger';
import { LeaderboardEntry, LeaderboardQuery, TeamLeaderboard, RecentActivity, CyberpunkTheme } from '../models';
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

export interface AnimatedLeaderboardEntry extends LeaderboardEntry {
  animationType: 'rise' | 'fall' | 'new' | 'stable';
  animationDuration: number;
  glowEffect: boolean;
  celebrationLevel: 'minimal' | 'standard' | 'epic';
}

export class EnhancedLeaderboardService {
  private static instance: EnhancedLeaderboardService;
  private wsManager: WebSocketManager;
  private metrics: MetricsCollector;
  private previousRankings: Map<string, number> = new Map();
  private rankUpdateInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.wsManager = WebSocketManager.getInstance();
    this.metrics = MetricsCollector.getInstance();
  }

  public static getInstance(): EnhancedLeaderboardService {
    if (!EnhancedLeaderboardService.instance) {
      EnhancedLeaderboardService.instance = new EnhancedLeaderboardService();
    }
    return EnhancedLeaderboardService.instance;
  }

  /**
   * Get enhanced global leaderboard with cyberpunk features
   */
  public async getEnhancedLeaderboard(query: LeaderboardQuery = {}): Promise<AnimatedLeaderboardEntry[]> {
    const { timeframe = 'all_time', limit = 50, offset = 0 } = query;
    const cacheKey = `leaderboard:enhanced:${timeframe}:${limit}:${offset}`;

    try {
      // Try cache first
      const cached = await db.cacheGet<AnimatedLeaderboardEntry[]>(cacheKey);
      if (cached) {
        return cached;
      }

      const baseQuery = `
        SELECT 
          ugp.user_id,
          'User' || ugp.user_id as username,
          ugp.total_points,
          ugp.level,
          ugp.prestige_level,
          ROW_NUMBER() OVER (ORDER BY ugp.total_points DESC, ugp.level DESC, ugp.created_at ASC) as rank,
          COUNT(DISTINCT ub.id) as badges,
          COUNT(DISTINCT ua.id) as achievements,
          ugp.current_streak as streak,
          ugp.cyberpunk_theme,
          ugp.team_affiliation,
          COALESCE(lh.previous_rank, 999999) as previous_rank,
          COALESCE(recent_points.points, 0) as recent_points,
          jsonb_agg(
            DISTINCT jsonb_build_object(
              'type', CASE 
                WHEN ub.earned_at >= NOW() - INTERVAL '24 hours' THEN 'badge'
                WHEN ua.earned_at >= NOW() - INTERVAL '24 hours' THEN 'achievement'
                WHEN ugp.updated_at >= NOW() - INTERVAL '24 hours' THEN 'level_up'
                ELSE 'points'
              END,
              'name', COALESCE(b.name, a.name, 'Level Up'),
              'timestamp', GREATEST(ub.earned_at, ua.earned_at, ugp.updated_at),
              'points', COALESCE(b.points, a.points, 0)
            )
          ) FILTER (WHERE 
            ub.earned_at >= NOW() - INTERVAL '24 hours' OR 
            ua.earned_at >= NOW() - INTERVAL '24 hours' OR
            ugp.updated_at >= NOW() - INTERVAL '24 hours'
          ) as recent_activity
        FROM user_game_profiles ugp
        LEFT JOIN user_badges ub ON ugp.user_id = ub.user_id
        LEFT JOIN user_achievements ua ON ugp.user_id = ua.user_id
        LEFT JOIN badges b ON ub.badge_id = b.id
        LEFT JOIN achievements a ON ua.achievement_id = a.id
        LEFT JOIN (
          SELECT DISTINCT ON (user_id) user_id, rank as previous_rank
          FROM leaderboard_history 
          WHERE created_at >= NOW() - INTERVAL '1 day'
          ORDER BY user_id, created_at DESC
        ) lh ON ugp.user_id = lh.user_id
        LEFT JOIN (
          SELECT user_id, SUM(points) as points
          FROM point_transactions
          WHERE created_at >= NOW() - INTERVAL '24 hours'
          GROUP BY user_id
        ) recent_points ON ugp.user_id = recent_points.user_id
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
        GROUP BY ugp.user_id, ugp.total_points, ugp.level, ugp.prestige_level, ugp.current_streak, 
                 ugp.created_at, ugp.cyberpunk_theme, ugp.team_affiliation, lh.previous_rank, recent_points.points
        ORDER BY ugp.total_points DESC, ugp.level DESC, ugp.created_at ASC
      `;

      const limitClause = `LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);

      const fullQuery = baseQuery + whereClause + groupByClause + limitClause;

      const result = await db.query(fullQuery, params);

      const leaderboard: AnimatedLeaderboardEntry[] = result.rows.map((row: any) => {
        const currentRank = parseInt(row.rank);
        const previousRank = parseInt(row.previous_rank);
        const rankChange = previousRank !== 999999 ? previousRank - currentRank : 0;
        const recentPoints = parseInt(row.recent_points) || 0;
        
        return {
          userId: row.user_id,
          username: row.username,
          totalPoints: row.total_points,
          level: row.level,
          rank: currentRank,
          badges: parseInt(row.badges),
          achievements: parseInt(row.achievements),
          streak: row.streak,
          // Enhanced features
          prestigeLevel: row.prestige_level || 0,
          teamAffiliation: row.team_affiliation ? JSON.parse(row.team_affiliation) : undefined,
          cyberpunkTheme: row.cyberpunk_theme ? JSON.parse(row.cyberpunk_theme) : this.getDefaultCyberpunkTheme(),
          recentActivity: row.recent_activity ? JSON.parse(row.recent_activity) : [],
          trendDirection: rankChange > 0 ? 'up' : rankChange < 0 ? 'down' : 'stable',
          rankChange: Math.abs(rankChange),
          // Animation features
          animationType: this.getAnimationType(rankChange, recentPoints),
          animationDuration: this.getAnimationDuration(rankChange),
          glowEffect: recentPoints > 100 || Math.abs(rankChange) > 5,
          celebrationLevel: this.getCelebrationLevel(rankChange, recentPoints)
        };
      });

      // Cache for 1 minute (very short for real-time feel)
      await db.cacheSet(cacheKey, leaderboard, 60);

      this.metrics.recordLeaderboardQuery(timeframe, leaderboard.length);

      return leaderboard;

    } catch (error) {
      logger.error('Failed to get enhanced leaderboard:', error);
      throw error;
    }
  }

  /**
   * Get team leaderboard with collaborative features
   */
  public async getTeamLeaderboard(limit: number = 20): Promise<TeamLeaderboard[]> {
    const cacheKey = `leaderboard:teams:${limit}`;

    try {
      const cached = await db.cacheGet<TeamLeaderboard[]>(cacheKey);
      if (cached) {
        return cached;
      }

      const query = `
        SELECT 
          t.team_id,
          t.team_name,
          SUM(ugp.total_points) as total_points,
          COUNT(ugp.user_id) as member_count,
          AVG(ugp.level) as average_level,
          ROW_NUMBER() OVER (ORDER BY SUM(ugp.total_points) DESC) as rank,
          COUNT(DISTINCT ub.id) as badges,
          COUNT(DISTINCT ua.id) as achievements,
          jsonb_agg(
            jsonb_build_object(
              'userId', ugp.user_id,
              'username', 'User' || ugp.user_id,
              'activity', 'Recent contribution',
              'points', COALESCE(recent_points.points, 0),
              'timestamp', ugp.updated_at
            ) ORDER BY ugp.updated_at DESC
          ) FILTER (WHERE ugp.updated_at >= NOW() - INTERVAL '24 hours') as recent_activity
        FROM teams t
        JOIN user_game_profiles ugp ON JSON_EXTRACT(ugp.team_affiliation, '$.teamId') = t.team_id
        LEFT JOIN user_badges ub ON ugp.user_id = ub.user_id
        LEFT JOIN user_achievements ua ON ugp.user_id = ua.user_id
        LEFT JOIN (
          SELECT user_id, SUM(points) as points
          FROM point_transactions
          WHERE created_at >= NOW() - INTERVAL '24 hours'
          GROUP BY user_id
        ) recent_points ON ugp.user_id = recent_points.user_id
        GROUP BY t.team_id, t.team_name
        ORDER BY total_points DESC
        LIMIT $1
      `;

      const result = await db.query(query, [limit]);

      const teamLeaderboard: TeamLeaderboard[] = result.rows.map((row: any, index: number) => ({
        teamId: row.team_id,
        teamName: row.team_name,
        totalPoints: parseInt(row.total_points),
        memberCount: parseInt(row.member_count),
        averageLevel: parseFloat(row.average_level),
        rank: index + 1,
        badges: parseInt(row.badges),
        achievements: parseInt(row.achievements),
        recentActivity: row.recent_activity ? JSON.parse(row.recent_activity) : []
      }));

      await db.cacheSet(cacheKey, teamLeaderboard, 300);

      return teamLeaderboard;

    } catch (error) {
      logger.error('Failed to get team leaderboard:', error);
      throw error;
    }
  }

  /**
   * Update ranks with real-time notifications and animations
   */
  public async updateRanksWithAnimations(): Promise<LeaderboardUpdate[]> {
    try {
      logger.info('Starting enhanced rank update with animations');

      // Get current rankings
      const currentRankings = await this.getCurrentRankings();
      const updates: LeaderboardUpdate[] = [];

      // Compare with previous rankings
      for (const [userId, newRank] of currentRankings) {
        const oldRank = this.previousRankings.get(userId) || newRank;
        const rankChange = oldRank - newRank;

        if (rankChange !== 0) {
          const pointsGained = await this.getRecentPointsGained(userId);
          
          const update: LeaderboardUpdate = {
            userId,
            oldRank,
            newRank,
            rankChange: Math.abs(rankChange),
            trendDirection: rankChange > 0 ? 'up' : 'down',
            pointsGained
          };

          updates.push(update);

          // Send enhanced real-time notification with animation data
          await this.wsManager.sendToUser(userId, {
            type: 'rank_changed',
            userId,
            data: {
              ...update,
              animationType: this.getAnimationType(rankChange, pointsGained),
              celebrationLevel: this.getCelebrationLevel(rankChange, pointsGained),
              visualEffects: this.getVisualEffects(rankChange)
            },
            timestamp: new Date(),
            celebrationLevel: this.getRankChangeCelebrationLevel(rankChange)
          });

          // Send animated update to leaderboard viewers
          await this.wsManager.sendToRoom('leaderboard', {
            type: 'leaderboard_animation',
            userId,
            data: {
              ...update,
              animationType: rankChange > 0 ? 'rise' : 'fall',
              duration: this.getAnimationDuration(rankChange)
            },
            timestamp: new Date()
          });
        }
      }

      // Update database ranks
      await this.updateDatabaseRanks(currentRankings);

      // Store current rankings for next comparison
      this.previousRankings = currentRankings;

      // Save leaderboard snapshot with animation data
      await this.saveLeaderboardSnapshot(updates);

      // Trigger leaderboard refresh for all viewers
      await this.wsManager.sendToRoom('leaderboard', {
        type: 'leaderboard_refresh',
        data: { updatesCount: updates.length },
        timestamp: new Date()
      });

      logger.info(`Processed ${updates.length} rank changes with animations`);

      return updates;

    } catch (error) {
      logger.error('Failed to update ranks with animations:', error);
      throw error;
    }
  }

  /**
   * Start real-time leaderboard updates with animations
   */
  public startRealTimeUpdates(): void {
    // Update ranks every 30 seconds for real-time feel
    this.rankUpdateInterval = setInterval(async () => {
      try {
        await this.updateRanksWithAnimations();
      } catch (error) {
        logger.error('Real-time rank update failed:', error);
      }
    }, 30 * 1000);

    logger.info('Real-time leaderboard updates started');
  }

  /**
   * Stop real-time updates
   */
  public stopRealTimeUpdates(): void {
    if (this.rankUpdateInterval) {
      clearInterval(this.rankUpdateInterval);
      this.rankUpdateInterval = null;
      logger.info('Real-time leaderboard updates stopped');
    }
  }

  /**
   * Subscribe user to live leaderboard updates
   */
  public async subscribeToLiveUpdates(userId: string): Promise<void> {
    try {
      // Join leaderboard room for real-time updates
      await this.wsManager.joinRoom(userId, 'leaderboard');

      // Send current enhanced position
      const enhancedLeaderboard = await this.getEnhancedLeaderboard({ limit: 100 });
      const userEntry = enhancedLeaderboard.find(entry => entry.userId === userId);

      if (userEntry) {
        await this.wsManager.sendToUser(userId, {
          type: 'current_position',
          userId,
          data: userEntry,
          timestamp: new Date()
        });
      }

      logger.info(`User ${userId} subscribed to live leaderboard updates`);

    } catch (error) {
      logger.error('Failed to subscribe to live updates:', error);
      throw error;
    }
  }

  /**
   * Get leaderboard with milestone celebrations
   */
  public async getLeaderboardWithMilestones(query: LeaderboardQuery = {}): Promise<{
    entries: AnimatedLeaderboardEntry[];
    milestones: any[];
    celebrations: any[];
  }> {
    try {
      const entries = await this.getEnhancedLeaderboard(query);
      const milestones = await this.getActiveMilestones();
      const celebrations = await this.getRecentCelebrations();

      return {
        entries,
        milestones,
        celebrations
      };

    } catch (error) {
      logger.error('Failed to get leaderboard with milestones:', error);
      throw error;
    }
  }

  // Private helper methods
  private getDefaultCyberpunkTheme(): CyberpunkTheme {
    return {
      selectedTheme: 'neon-blue',
      customColors: {
        primary: '#00FFFF',
        secondary: '#FF00FF',
        accent: '#FFFF00',
        background: '#000011'
      },
      effectsEnabled: true,
      animationSpeed: 'normal'
    };
  }

  private getAnimationType(rankChange: number, recentPoints: number): 'rise' | 'fall' | 'new' | 'stable' {
    if (recentPoints > 0 && rankChange === 0) return 'new';
    if (rankChange > 0) return 'rise';
    if (rankChange < 0) return 'fall';
    return 'stable';
  }

  private getAnimationDuration(rankChange: number): number {
    // Bigger rank changes get longer animations
    const baseMs = 1000;
    const changeMultiplier = Math.min(Math.abs(rankChange) * 200, 2000);
    return baseMs + changeMultiplier;
  }

  private getCelebrationLevel(rankChange: number, recentPoints: number): 'minimal' | 'standard' | 'epic' {
    if (rankChange >= 10 || recentPoints >= 500) return 'epic';
    if (rankChange >= 5 || recentPoints >= 200) return 'standard';
    return 'minimal';
  }

  private getRankChangeCelebrationLevel(rankChange: number): 'minimal' | 'standard' | 'epic' {
    if (Math.abs(rankChange) >= 10) return 'epic';
    if (Math.abs(rankChange) >= 5) return 'standard';
    return 'minimal';
  }

  private getVisualEffects(rankChange: number): any {
    return {
      glowIntensity: Math.min(Math.abs(rankChange) * 10, 100),
      particleCount: Math.min(Math.abs(rankChange) * 5, 50),
      animationType: rankChange > 0 ? 'rise' : 'fall',
      duration: this.getAnimationDuration(rankChange)
    };
  }

  private async getCurrentRankings(): Promise<Map<string, number>> {
    const result = await db.query(`
      SELECT 
        user_id,
        ROW_NUMBER() OVER (ORDER BY total_points DESC, level DESC, created_at ASC) as rank
      FROM user_game_profiles
      ORDER BY rank
    `);

    const rankings = new Map<string, number>();
    result.rows.forEach(row => {
      rankings.set(row.user_id, parseInt(row.rank));
    });

    return rankings;
  }

  private async getRecentPointsGained(userId: string): Promise<number> {
    const result = await db.query(
      `SELECT COALESCE(SUM(points), 0) as points
       FROM point_transactions
       WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '24 hours'`,
      [userId]
    );

    return parseInt(result.rows[0]?.points || '0');
  }

  private async updateDatabaseRanks(rankings: Map<string, number>): Promise<void> {
    const values = Array.from(rankings.entries()).map(([userId, rank]) => `('${userId}', ${rank})`).join(',');
    
    if (values) {
      await db.query(`
        UPDATE user_game_profiles 
        SET leaderboard_rank = v.rank, updated_at = NOW()
        FROM (VALUES ${values}) AS v(user_id, rank)
        WHERE user_game_profiles.user_id = v.user_id
      `);
    }
  }

  private async saveLeaderboardSnapshot(updates: LeaderboardUpdate[]): Promise<void> {
    const biggestMover = updates.reduce((max, update) => 
      update.rankChange > max.rankChange ? update : max, 
      updates[0] || { rankChange: 0 } as LeaderboardUpdate
    );

    await db.query(
      `INSERT INTO leaderboard_snapshots (timestamp, updates_count, biggest_mover, data)
       VALUES ($1, $2, $3, $4)`,
      [
        new Date(),
        updates.length,
        JSON.stringify(biggestMover),
        JSON.stringify(updates)
      ]
    );
  }

  private async getActiveMilestones(): Promise<any[]> {
    const result = await db.query(
      'SELECT * FROM milestones WHERE is_active = true ORDER BY threshold ASC'
    );

    return result.rows;
  }

  private async getRecentCelebrations(): Promise<any[]> {
    const result = await db.query(`
      SELECT * FROM celebrations 
      WHERE created_at >= NOW() - INTERVAL '1 hour'
      ORDER BY created_at DESC
      LIMIT 10
    `);

    return result.rows;
  }
}