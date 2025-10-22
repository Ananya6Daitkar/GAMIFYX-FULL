/**
 * Core gamification engine for managing points, badges, achievements, and levels
 */

import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/connection';
import { logger } from '../telemetry/logger';
import {
  UserGameProfile,
  Badge,
  Achievement,
  PointTransaction,
  UserBadge,
  UserAchievement,
  PointReason,
  AwardPointsRequest,
  CheckAchievementsRequest,
  GameEvent,
  NotificationMessage
} from '../models';
import { WebSocketManager } from './websocketManager';
import { MetricsCollector } from './metricsCollector';

export class GamificationEngine {
  private static instance: GamificationEngine;
  private wsManager: WebSocketManager;
  private metrics: MetricsCollector;

  private constructor() {
    this.wsManager = WebSocketManager.getInstance();
    this.metrics = MetricsCollector.getInstance();
  }

  public static getInstance(): GamificationEngine {
    if (!GamificationEngine.instance) {
      GamificationEngine.instance = new GamificationEngine();
    }
    return GamificationEngine.instance;
  }

  /**
   * Award points to a user and trigger related events
   */
  public async awardPoints(request: AwardPointsRequest): Promise<{
    transaction: PointTransaction;
    events: GameEvent[];
  }> {
    const events: GameEvent[] = [];

    try {
      const result = await db.transaction(async (client) => {
        // Create point transaction
        const transactionId = uuidv4();
        const transaction: PointTransaction = {
          id: transactionId,
          userId: request.userId,
          points: request.points,
          reason: request.reason,
          source: request.source,
          description: request.description,
          metadata: request.metadata,
          createdAt: new Date()
        };

        await client.query(
          `INSERT INTO point_transactions (id, user_id, points, reason, source, description, metadata, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            transaction.id,
            transaction.userId,
            transaction.points,
            transaction.reason,
            transaction.source,
            transaction.description,
            JSON.stringify(transaction.metadata),
            transaction.createdAt
          ]
        );

        // Update user profile
        const profile = await this.updateUserProfile(client, request.userId, request.points);
        
        // Check for level up
        const levelUpEvent = await this.checkLevelUp(client, profile);
        if (levelUpEvent) {
          events.push(levelUpEvent);
        }

        // Check for milestones
        const milestoneEvents = await this.checkMilestones(client, profile);
        events.push(...milestoneEvents);

        // Create points awarded event
        events.push({
          type: 'points_awarded',
          userId: request.userId,
          data: {
            points: request.points,
            reason: request.reason,
            totalPoints: profile.totalPoints
          },
          timestamp: new Date()
        });

        return { transaction, profile };
      });

      // Record metrics
      this.metrics.recordPointsAwarded(request.points, request.reason);

      // Send real-time events
      for (const event of events) {
        await this.wsManager.sendToUser(event.userId, event);
        await this.createNotification(event);
      }

      logger.info('Points awarded successfully', {
        userId: request.userId,
        points: request.points,
        reason: request.reason,
        eventsTriggered: events.length
      });

      return { transaction: result.transaction, events };

    } catch (error) {
      logger.error('Failed to award points:', error);
      throw error;
    }
  }

  /**
   * Update user profile with new points and XP
   */
  private async updateUserProfile(client: any, userId: string, points: number): Promise<UserGameProfile> {
    // Get or create user profile
    let profileResult = await client.query(
      'SELECT * FROM user_game_profiles WHERE user_id = $1',
      [userId]
    );

    let profile: UserGameProfile;

    if (profileResult.rows.length === 0) {
      // Create new profile
      profile = {
        userId,
        totalPoints: points,
        level: 1,
        currentXp: points,
        xpToNextLevel: this.calculateXpForLevel(2),
        streaks: {
          current: 0,
          longest: 0,
          lastActivityDate: new Date()
        },
        leaderboardRank: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await client.query(
        `INSERT INTO user_game_profiles 
         (user_id, total_points, level, current_xp, xp_to_next_level, current_streak, longest_streak, last_activity_date, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          profile.userId,
          profile.totalPoints,
          profile.level,
          profile.currentXp,
          profile.xpToNextLevel,
          profile.streaks.current,
          profile.streaks.longest,
          profile.streaks.lastActivityDate,
          profile.createdAt,
          profile.updatedAt
        ]
      );
    } else {
      // Update existing profile
      const existing = profileResult.rows[0];
      profile = {
        userId: existing.user_id,
        totalPoints: existing.total_points + points,
        level: existing.level,
        currentXp: existing.current_xp + points,
        xpToNextLevel: existing.xp_to_next_level,
        streaks: {
          current: existing.current_streak,
          longest: existing.longest_streak,
          lastActivityDate: existing.last_activity_date
        },
        leaderboardRank: existing.leaderboard_rank,
        createdAt: existing.created_at,
        updatedAt: new Date()
      };

      // Check if level up is needed
      while (profile.currentXp >= profile.xpToNextLevel) {
        profile.level++;
        profile.currentXp -= profile.xpToNextLevel;
        profile.xpToNextLevel = this.calculateXpForLevel(profile.level + 1);
      }

      await client.query(
        `UPDATE user_game_profiles 
         SET total_points = $2, level = $3, current_xp = $4, xp_to_next_level = $5, updated_at = $6
         WHERE user_id = $1`,
        [
          profile.userId,
          profile.totalPoints,
          profile.level,
          profile.currentXp,
          profile.xpToNextLevel,
          profile.updatedAt
        ]
      );
    }

    return profile;
  }

  /**
   * Calculate XP required for a specific level
   */
  private calculateXpForLevel(level: number): number {
    // Exponential growth: level^2 * 100
    return Math.floor(Math.pow(level, 2) * 100);
  }

  /**
   * Check if user leveled up and create event
   */
  private async checkLevelUp(client: any, profile: UserGameProfile): Promise<GameEvent | null> {
    const previousResult = await client.query(
      'SELECT level FROM user_game_profiles WHERE user_id = $1',
      [profile.userId]
    );

    if (previousResult.rows.length > 0) {
      const previousLevel = previousResult.rows[0].level;
      if (profile.level > previousLevel) {
        return {
          type: 'level_up',
          userId: profile.userId,
          data: {
            newLevel: profile.level,
            previousLevel,
            totalPoints: profile.totalPoints
          },
          timestamp: new Date()
        };
      }
    }

    return null;
  }

  /**
   * Check for milestone achievements
   */
  private async checkMilestones(client: any, profile: UserGameProfile): Promise<GameEvent[]> {
    const events: GameEvent[] = [];

    const milestones = await client.query(
      `SELECT * FROM milestones 
       WHERE is_active = true 
       AND ((type = 'points' AND threshold <= $1) 
            OR (type = 'level' AND threshold <= $2))`,
      [profile.totalPoints, profile.level]
    );

    for (const milestone of milestones.rows) {
      // Check if user already achieved this milestone
      const existing = await client.query(
        'SELECT id FROM user_achievements WHERE user_id = $1 AND achievement_id = $2',
        [profile.userId, `milestone_${milestone.id}`]
      );

      if (existing.rows.length === 0) {
        // Award milestone achievement
        const achievementId = uuidv4();
        await client.query(
          `INSERT INTO user_achievements (id, user_id, achievement_id, earned_at, metadata)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            achievementId,
            profile.userId,
            `milestone_${milestone.id}`,
            new Date(),
            JSON.stringify({ milestone: milestone.name })
          ]
        );

        events.push({
          type: 'achievement_unlocked',
          userId: profile.userId,
          data: {
            achievementId: `milestone_${milestone.id}`,
            name: milestone.name,
            description: milestone.description,
            points: milestone.points
          },
          timestamp: new Date()
        });

        // Award milestone points
        if (milestone.points > 0) {
          await client.query(
            `INSERT INTO point_transactions (id, user_id, points, reason, source, description, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              uuidv4(),
              profile.userId,
              milestone.points,
              PointReason.MILESTONE,
              milestone.id,
              `Milestone: ${milestone.name}`,
              new Date()
            ]
          );
        }
      }
    }

    return events;
  }

  /**
   * Check and award badges based on user activity
   */
  public async checkBadges(request: CheckAchievementsRequest): Promise<GameEvent[]> {
    const events: GameEvent[] = [];

    try {
      const badges = await db.query(
        'SELECT * FROM badges WHERE is_active = true'
      );

      for (const badge of badges.rows) {
        const criteria = badge.criteria;
        const earned = await this.evaluateBadgeCriteria(request.userId, criteria, request.eventData);

        if (earned) {
          // Check if user already has this badge
          const existing = await db.query(
            'SELECT id FROM user_badges WHERE user_id = $1 AND badge_id = $2',
            [request.userId, badge.id]
          );

          if (existing.rows.length === 0) {
            // Award badge
            const userBadgeId = uuidv4();
            await db.query(
              `INSERT INTO user_badges (id, user_id, badge_id, earned_at, metadata)
               VALUES ($1, $2, $3, $4, $5)`,
              [
                userBadgeId,
                request.userId,
                badge.id,
                new Date(),
                JSON.stringify(request.eventData)
              ]
            );

            events.push({
              type: 'badge_earned',
              userId: request.userId,
              data: {
                badgeId: badge.id,
                name: badge.name,
                description: badge.description,
                rarity: badge.rarity,
                points: badge.points
              },
              timestamp: new Date()
            });

            // Award badge points
            if (badge.points > 0) {
              await this.awardPoints({
                userId: request.userId,
                points: badge.points,
                reason: PointReason.BADGE,
                source: badge.id,
                description: `Badge earned: ${badge.name}`
              });
            }

            this.metrics.recordBadgeEarned(badge.category, badge.rarity);
          }
        }
      }

      return events;

    } catch (error) {
      logger.error('Failed to check badges:', error);
      throw error;
    }
  }

  /**
   * Evaluate badge criteria against user data
   */
  private async evaluateBadgeCriteria(userId: string, criteria: any, eventData: any): Promise<boolean> {
    switch (criteria.type) {
      case 'submission_count':
        const submissionCount = await this.getUserSubmissionCount(userId, criteria.timeframe);
        return submissionCount >= criteria.threshold;

      case 'code_quality':
        return eventData.codeQuality >= criteria.threshold;

      case 'security_score':
        return eventData.securityScore >= criteria.threshold;

      case 'streak':
        const profile = await this.getUserProfile(userId);
        return profile.streaks.current >= criteria.threshold;

      case 'points':
        const userProfile = await this.getUserProfile(userId);
        return userProfile.totalPoints >= criteria.threshold;

      default:
        return false;
    }
  }

  /**
   * Update user streak based on activity
   */
  public async updateStreak(userId: string): Promise<GameEvent[]> {
    const events: GameEvent[] = [];

    try {
      const profile = await this.getUserProfile(userId);
      const now = new Date();
      const lastActivity = new Date(profile.streaks.lastActivityDate);
      const daysDiff = Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));

      let newStreak = profile.streaks.current;
      let longestStreak = profile.streaks.longest;

      if (daysDiff === 1) {
        // Continue streak
        newStreak++;
      } else if (daysDiff > 1) {
        // Streak broken
        newStreak = 1;
      }
      // If daysDiff === 0, same day activity, no change

      if (newStreak > longestStreak) {
        longestStreak = newStreak;
      }

      await db.query(
        `UPDATE user_game_profiles 
         SET current_streak = $2, longest_streak = $3, last_activity_date = $4, updated_at = $5
         WHERE user_id = $1`,
        [userId, newStreak, longestStreak, now, now]
      );

      // Check for streak milestones
      if (newStreak > profile.streaks.current && newStreak % 7 === 0) {
        events.push({
          type: 'streak_updated',
          userId,
          data: {
            currentStreak: newStreak,
            longestStreak,
            milestone: `${newStreak} day streak!`
          },
          timestamp: now
        });

        // Award streak bonus points
        const bonusPoints = newStreak * 10;
        await this.awardPoints({
          userId,
          points: bonusPoints,
          reason: PointReason.STREAK_BONUS,
          source: 'streak',
          description: `${newStreak}-day streak bonus`
        });
      }

      return events;

    } catch (error) {
      logger.error('Failed to update streak:', error);
      throw error;
    }
  }

  /**
   * Get user's game profile
   */
  public async getUserProfile(userId: string): Promise<UserGameProfile> {
    const cacheKey = `profile:${userId}`;
    
    // Try cache first
    const cached = await db.cacheGet<UserGameProfile>(cacheKey);
    if (cached) {
      return cached;
    }

    const result = await db.query(
      'SELECT * FROM user_game_profiles WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      // Create default profile
      const defaultProfile: UserGameProfile = {
        userId,
        totalPoints: 0,
        level: 1,
        currentXp: 0,
        xpToNextLevel: this.calculateXpForLevel(2),
        streaks: {
          current: 0,
          longest: 0,
          lastActivityDate: new Date()
        },
        leaderboardRank: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await db.query(
        `INSERT INTO user_game_profiles 
         (user_id, total_points, level, current_xp, xp_to_next_level, current_streak, longest_streak, last_activity_date, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          defaultProfile.userId,
          defaultProfile.totalPoints,
          defaultProfile.level,
          defaultProfile.currentXp,
          defaultProfile.xpToNextLevel,
          defaultProfile.streaks.current,
          defaultProfile.streaks.longest,
          defaultProfile.streaks.lastActivityDate,
          defaultProfile.createdAt,
          defaultProfile.updatedAt
        ]
      );

      // Cache the profile
      await db.cacheSet(cacheKey, defaultProfile, 300); // 5 minutes
      return defaultProfile;
    }

    const row = result.rows[0];
    const profile: UserGameProfile = {
      userId: row.user_id,
      totalPoints: row.total_points,
      level: row.level,
      currentXp: row.current_xp,
      xpToNextLevel: row.xp_to_next_level,
      streaks: {
        current: row.current_streak,
        longest: row.longest_streak,
        lastActivityDate: row.last_activity_date
      },
      leaderboardRank: row.leaderboard_rank,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };

    // Cache the profile
    await db.cacheSet(cacheKey, profile, 300); // 5 minutes
    return profile;
  }

  /**
   * Get user submission count
   */
  private async getUserSubmissionCount(userId: string, timeframe?: string): Promise<number> {
    let query = 'SELECT COUNT(*) FROM point_transactions WHERE user_id = $1 AND reason = $2';
    const params = [userId, PointReason.SUBMISSION];

    if (timeframe) {
      switch (timeframe) {
        case 'daily':
          query += ' AND created_at >= NOW() - INTERVAL \'1 day\'';
          break;
        case 'weekly':
          query += ' AND created_at >= NOW() - INTERVAL \'1 week\'';
          break;
        case 'monthly':
          query += ' AND created_at >= NOW() - INTERVAL \'1 month\'';
          break;
      }
    }

    const result = await db.query(query, params);
    return parseInt(result.rows[0].count);
  }

  /**
   * Create notification for game event
   */
  private async createNotification(event: GameEvent): Promise<void> {
    let title = '';
    let message = '';

    switch (event.type) {
      case 'badge_earned':
        title = 'Badge Earned!';
        message = `You earned the "${event.data.name}" badge!`;
        break;
      case 'achievement_unlocked':
        title = 'Achievement Unlocked!';
        message = `You unlocked "${event.data.name}"!`;
        break;
      case 'level_up':
        title = 'Level Up!';
        message = `Congratulations! You reached level ${event.data.newLevel}!`;
        break;
      case 'points_awarded':
        title = 'Points Earned!';
        message = `You earned ${event.data.points} points!`;
        break;
      case 'streak_updated':
        title = 'Streak Milestone!';
        message = event.data.milestone;
        break;
    }

    if (title && message) {
      await db.query(
        `INSERT INTO notifications (id, user_id, type, title, message, data, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          uuidv4(),
          event.userId,
          event.type,
          title,
          message,
          JSON.stringify(event.data),
          event.timestamp
        ]
      );
    }
  }
}