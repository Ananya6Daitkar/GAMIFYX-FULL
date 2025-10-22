/**
 * Advanced Streak Tracking System with milestone celebrations and visual rewards
 */

import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/connection';
import { logger } from '../telemetry/logger';
import { StreakMilestone, GameEvent, VisualEffects } from '../models';
import { WebSocketManager } from './websocketManager';
import { MetricsCollector } from './metricsCollector';

export interface StreakData {
  userId: string;
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: Date;
  milestones: StreakMilestone[];
  streakType: StreakType;
  multiplier: number;
  nextMilestone: StreakMilestone | null;
}

export interface StreakUpdate {
  userId: string;
  previousStreak: number;
  newStreak: number;
  streakBroken: boolean;
  milestoneAchieved: boolean;
  bonusPoints: number;
  celebration: StreakCelebration | null;
}

export interface StreakCelebration {
  type: 'milestone' | 'personal_best' | 'comeback' | 'legendary';
  title: string;
  message: string;
  visualEffects: VisualEffects;
  duration: number;
  rewards: StreakReward[];
}

export interface StreakReward {
  type: 'points' | 'badge' | 'title' | 'multiplier';
  value: any;
  description: string;
}

export enum StreakType {
  DAILY_SUBMISSION = 'daily_submission',
  WEEKLY_ACTIVITY = 'weekly_activity',
  QUALITY_STREAK = 'quality_streak',
  LEARNING_STREAK = 'learning_streak',
  COLLABORATION_STREAK = 'collaboration_streak'
}

export class StreakTrackingSystem {
  private static instance: StreakTrackingSystem;
  private wsManager: WebSocketManager;
  private metrics: MetricsCollector;

  // Predefined milestone thresholds
  private readonly MILESTONE_THRESHOLDS = [3, 7, 14, 30, 60, 100, 365];
  private readonly STREAK_MULTIPLIERS = {
    [StreakType.DAILY_SUBMISSION]: 1.0,
    [StreakType.WEEKLY_ACTIVITY]: 1.2,
    [StreakType.QUALITY_STREAK]: 1.5,
    [StreakType.LEARNING_STREAK]: 1.3,
    [StreakType.COLLABORATION_STREAK]: 1.4
  };

  private constructor() {
    this.wsManager = WebSocketManager.getInstance();
    this.metrics = MetricsCollector.getInstance();
  }

  public static getInstance(): StreakTrackingSystem {
    if (!StreakTrackingSystem.instance) {
      StreakTrackingSystem.instance = new StreakTrackingSystem();
    }
    return StreakTrackingSystem.instance;
  }

  /**
   * Update user streak based on activity
   */
  public async updateStreak(
    userId: string, 
    streakType: StreakType = StreakType.DAILY_SUBMISSION,
    activityMetadata?: any
  ): Promise<StreakUpdate> {
    try {
      const currentStreak = await this.getCurrentStreak(userId, streakType);
      const now = new Date();
      const lastActivity = currentStreak.lastActivityDate;
      
      // Calculate time difference
      const timeDiff = this.calculateTimeDifference(now, lastActivity, streakType);
      
      let newStreakCount = currentStreak.currentStreak;
      let streakBroken = false;
      let milestoneAchieved = false;
      let bonusPoints = 0;
      let celebration: StreakCelebration | null = null;

      // Determine streak update logic based on type
      const streakLogic = this.getStreakLogic(streakType);
      const streakResult = streakLogic.calculateNewStreak(currentStreak.currentStreak, timeDiff, activityMetadata);
      
      newStreakCount = streakResult.newStreak;
      streakBroken = streakResult.broken;

      // Check for milestone achievement
      const milestoneResult = await this.checkMilestoneAchievement(
        userId, 
        currentStreak.currentStreak, 
        newStreakCount, 
        streakType
      );
      
      milestoneAchieved = milestoneResult.achieved;
      bonusPoints = milestoneResult.bonusPoints;

      // Create celebration if milestone achieved or personal best
      if (milestoneAchieved || newStreakCount > currentStreak.longestStreak) {
        celebration = await this.createStreakCelebration(
          userId,
          newStreakCount,
          streakType,
          milestoneAchieved,
          newStreakCount > currentStreak.longestStreak
        );
      }

      // Update database
      await this.updateStreakInDatabase(userId, newStreakCount, streakType, now);

      // Create streak update object
      const streakUpdate: StreakUpdate = {
        userId,
        previousStreak: currentStreak.currentStreak,
        newStreak: newStreakCount,
        streakBroken,
        milestoneAchieved,
        bonusPoints,
        celebration
      };

      // Send real-time notifications
      await this.sendStreakNotifications(streakUpdate);

      // Record metrics
      this.metrics.recordStreakUpdate(streakType, newStreakCount, milestoneAchieved);

      logger.info('Streak updated successfully', {
        userId,
        streakType,
        previousStreak: currentStreak.currentStreak,
        newStreak: newStreakCount,
        milestoneAchieved,
        bonusPoints
      });

      return streakUpdate;

    } catch (error) {
      logger.error('Failed to update streak:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive streak data for user
   */
  public async getUserStreakData(userId: string): Promise<StreakData[]> {
    try {
      const streakTypes = Object.values(StreakType);
      const streakDataPromises = streakTypes.map(type => this.getStreakDataForType(userId, type));
      
      const streakData = await Promise.all(streakDataPromises);
      
      return streakData;

    } catch (error) {
      logger.error('Failed to get user streak data:', error);
      throw error;
    }
  }

  /**
   * Get streak leaderboard for specific type
   */
  public async getStreakLeaderboard(
    streakType: StreakType, 
    timeframe: 'current' | 'longest' = 'current',
    limit: number = 50
  ): Promise<any[]> {
    try {
      const column = timeframe === 'current' ? 'current_streak' : 'longest_streak';
      
      const query = `
        SELECT 
          us.user_id,
          'User' || us.user_id as username,
          us.${column} as streak_value,
          us.last_activity_date,
          us.streak_multiplier,
          ROW_NUMBER() OVER (ORDER BY us.${column} DESC, us.last_activity_date DESC) as rank,
          ugp.total_points,
          ugp.level
        FROM user_streaks us
        JOIN user_game_profiles ugp ON us.user_id = ugp.user_id
        WHERE us.streak_type = $1 AND us.${column} > 0
        ORDER BY us.${column} DESC, us.last_activity_date DESC
        LIMIT $2
      `;

      const result = await db.query(query, [streakType, limit]);

      return result.rows.map(row => ({
        rank: parseInt(row.rank),
        userId: row.user_id,
        username: row.username,
        streakValue: parseInt(row.streak_value),
        lastActivity: row.last_activity_date,
        multiplier: parseFloat(row.streak_multiplier),
        totalPoints: parseInt(row.total_points),
        level: parseInt(row.level)
      }));

    } catch (error) {
      logger.error('Failed to get streak leaderboard:', error);
      throw error;
    }
  }

  /**
   * Get streak statistics and insights
   */
  public async getStreakStatistics(): Promise<any> {
    try {
      const query = `
        SELECT 
          streak_type,
          COUNT(DISTINCT user_id) as active_users,
          AVG(current_streak) as avg_current_streak,
          MAX(current_streak) as max_current_streak,
          AVG(longest_streak) as avg_longest_streak,
          MAX(longest_streak) as max_longest_streak,
          COUNT(*) FILTER (WHERE current_streak >= 7) as weekly_streakers,
          COUNT(*) FILTER (WHERE current_streak >= 30) as monthly_streakers,
          COUNT(*) FILTER (WHERE current_streak >= 100) as legendary_streakers
        FROM user_streaks
        WHERE current_streak > 0
        GROUP BY streak_type
      `;

      const result = await db.query(query);

      const statistics = {};
      result.rows.forEach(row => {
        statistics[row.streak_type] = {
          activeUsers: parseInt(row.active_users),
          averageCurrentStreak: parseFloat(row.avg_current_streak),
          maxCurrentStreak: parseInt(row.max_current_streak),
          averageLongestStreak: parseFloat(row.avg_longest_streak),
          maxLongestStreak: parseInt(row.max_longest_streak),
          weeklyStreakers: parseInt(row.weekly_streakers),
          monthlyStreakers: parseInt(row.monthly_streakers),
          legendaryStreakers: parseInt(row.legendary_streakers)
        };
      });

      return statistics;

    } catch (error) {
      logger.error('Failed to get streak statistics:', error);
      throw error;
    }
  }

  /**
   * Create streak challenge for users
   */
  public async createStreakChallenge(
    name: string,
    description: string,
    streakType: StreakType,
    targetStreak: number,
    duration: number, // days
    rewards: StreakReward[]
  ): Promise<string> {
    try {
      const challengeId = uuidv4();
      const startDate = new Date();
      const endDate = new Date(startDate.getTime() + (duration * 24 * 60 * 60 * 1000));

      await db.query(
        `INSERT INTO streak_challenges 
         (id, name, description, streak_type, target_streak, start_date, end_date, rewards, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          challengeId,
          name,
          description,
          streakType,
          targetStreak,
          startDate,
          endDate,
          JSON.stringify(rewards),
          true
        ]
      );

      // Notify all users about new challenge
      await this.wsManager.sendToAll({
        type: 'streak_challenge_created',
        data: {
          challengeId,
          name,
          description,
          streakType,
          targetStreak,
          duration,
          rewards
        },
        timestamp: new Date()
      });

      logger.info('Streak challenge created', {
        challengeId,
        name,
        streakType,
        targetStreak,
        duration
      });

      return challengeId;

    } catch (error) {
      logger.error('Failed to create streak challenge:', error);
      throw error;
    }
  }

  // Private helper methods
  private async getCurrentStreak(userId: string, streakType: StreakType): Promise<{
    currentStreak: number;
    longestStreak: number;
    lastActivityDate: Date;
  }> {
    const result = await db.query(
      `SELECT current_streak, longest_streak, last_activity_date
       FROM user_streaks
       WHERE user_id = $1 AND streak_type = $2`,
      [userId, streakType]
    );

    if (result.rows.length === 0) {
      // Create initial streak record
      const now = new Date();
      await db.query(
        `INSERT INTO user_streaks (user_id, streak_type, current_streak, longest_streak, last_activity_date)
         VALUES ($1, $2, 0, 0, $3)`,
        [userId, streakType, now]
      );

      return {
        currentStreak: 0,
        longestStreak: 0,
        lastActivityDate: now
      };
    }

    const row = result.rows[0];
    return {
      currentStreak: row.current_streak,
      longestStreak: row.longest_streak,
      lastActivityDate: row.last_activity_date
    };
  }

  private calculateTimeDifference(now: Date, lastActivity: Date, streakType: StreakType): number {
    const diffMs = now.getTime() - lastActivity.getTime();
    
    switch (streakType) {
      case StreakType.DAILY_SUBMISSION:
        return Math.floor(diffMs / (1000 * 60 * 60 * 24)); // days
      case StreakType.WEEKLY_ACTIVITY:
        return Math.floor(diffMs / (1000 * 60 * 60 * 24 * 7)); // weeks
      default:
        return Math.floor(diffMs / (1000 * 60 * 60 * 24)); // days
    }
  }

  private getStreakLogic(streakType: StreakType): any {
    const logicMap = {
      [StreakType.DAILY_SUBMISSION]: {
        calculateNewStreak: (current: number, timeDiff: number, metadata?: any) => {
          if (timeDiff === 1) {
            return { newStreak: current + 1, broken: false };
          } else if (timeDiff > 1) {
            return { newStreak: 1, broken: current > 0 };
          } else {
            return { newStreak: current, broken: false }; // Same day
          }
        }
      },
      [StreakType.QUALITY_STREAK]: {
        calculateNewStreak: (current: number, timeDiff: number, metadata?: any) => {
          const qualityThreshold = 85;
          const quality = metadata?.codeQuality || 0;
          
          if (timeDiff === 1 && quality >= qualityThreshold) {
            return { newStreak: current + 1, broken: false };
          } else if (timeDiff > 1 || quality < qualityThreshold) {
            return { newStreak: quality >= qualityThreshold ? 1 : 0, broken: current > 0 };
          } else {
            return { newStreak: current, broken: false };
          }
        }
      },
      // Add more streak types as needed
    };

    return logicMap[streakType] || logicMap[StreakType.DAILY_SUBMISSION];
  }

  private async checkMilestoneAchievement(
    userId: string,
    previousStreak: number,
    newStreak: number,
    streakType: StreakType
  ): Promise<{ achieved: boolean; bonusPoints: number }> {
    // Check if new streak crosses any milestone threshold
    const crossedMilestone = this.MILESTONE_THRESHOLDS.find(
      threshold => previousStreak < threshold && newStreak >= threshold
    );

    if (crossedMilestone) {
      // Calculate bonus points based on milestone and streak type
      const baseBonus = crossedMilestone * 10;
      const typeMultiplier = this.STREAK_MULTIPLIERS[streakType];
      const bonusPoints = Math.floor(baseBonus * typeMultiplier);

      // Record milestone achievement
      await db.query(
        `INSERT INTO streak_milestones (user_id, streak_type, milestone_days, achieved_at, bonus_points)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, streakType, crossedMilestone, new Date(), bonusPoints]
      );

      return { achieved: true, bonusPoints };
    }

    return { achieved: false, bonusPoints: 0 };
  }

  private async createStreakCelebration(
    userId: string,
    streakCount: number,
    streakType: StreakType,
    milestoneAchieved: boolean,
    personalBest: boolean
  ): Promise<StreakCelebration> {
    let celebrationType: 'milestone' | 'personal_best' | 'comeback' | 'legendary';
    let title: string;
    let message: string;
    let visualEffects: VisualEffects;
    let rewards: StreakReward[] = [];

    if (streakCount >= 365) {
      celebrationType = 'legendary';
      title = '🔥 LEGENDARY STREAK! 🔥';
      message = `Incredible! You've maintained a ${streakCount}-day streak!`;
      visualEffects = {
        glowIntensity: 100,
        animationType: 'glitch',
        particleEffects: true,
        soundEffect: 'legendary_streak.mp3',
        celebrationDuration: 10000
      };
      rewards.push({
        type: 'badge',
        value: 'legendary-streaker',
        description: 'Legendary Streaker Badge'
      });
    } else if (milestoneAchieved) {
      celebrationType = 'milestone';
      title = `🎯 ${streakCount}-Day Milestone!`;
      message = `Amazing consistency! You've reached ${streakCount} days!`;
      visualEffects = {
        glowIntensity: Math.min(streakCount * 2, 80),
        animationType: 'pulse',
        particleEffects: true,
        celebrationDuration: 5000
      };
    } else if (personalBest) {
      celebrationType = 'personal_best';
      title = '🏆 Personal Best!';
      message = `New personal record: ${streakCount} days!`;
      visualEffects = {
        glowIntensity: 60,
        animationType: 'rotate',
        particleEffects: true,
        celebrationDuration: 4000
      };
    } else {
      celebrationType = 'milestone';
      title = '🔥 Streak Continues!';
      message = `Keep it up! ${streakCount} days strong!`;
      visualEffects = {
        glowIntensity: 40,
        animationType: 'pulse',
        particleEffects: false,
        celebrationDuration: 2000
      };
    }

    return {
      type: celebrationType,
      title,
      message,
      visualEffects,
      duration: visualEffects.celebrationDuration,
      rewards
    };
  }

  private async updateStreakInDatabase(
    userId: string,
    newStreak: number,
    streakType: StreakType,
    activityDate: Date
  ): Promise<void> {
    await db.query(
      `INSERT INTO user_streaks (user_id, streak_type, current_streak, longest_streak, last_activity_date, streak_multiplier)
       VALUES ($1, $2, $3, $3, $4, $5)
       ON CONFLICT (user_id, streak_type)
       DO UPDATE SET
         current_streak = $3,
         longest_streak = GREATEST(user_streaks.longest_streak, $3),
         last_activity_date = $4,
         streak_multiplier = $5,
         updated_at = NOW()`,
      [
        userId,
        streakType,
        newStreak,
        activityDate,
        this.STREAK_MULTIPLIERS[streakType]
      ]
    );
  }

  private async sendStreakNotifications(streakUpdate: StreakUpdate): Promise<void> {
    // Send to user
    await this.wsManager.sendToUser(streakUpdate.userId, {
      type: 'streak_updated',
      userId: streakUpdate.userId,
      data: streakUpdate,
      timestamp: new Date(),
      celebrationLevel: streakUpdate.celebration ? 'epic' : 'standard'
    });

    // Send celebration if exists
    if (streakUpdate.celebration) {
      await this.wsManager.sendToUser(streakUpdate.userId, {
        type: 'streak_celebration',
        userId: streakUpdate.userId,
        data: streakUpdate.celebration,
        timestamp: new Date(),
        visualEffects: streakUpdate.celebration.visualEffects,
        celebrationLevel: 'epic'
      });
    }

    // Notify team if user is in a team and achieved milestone
    if (streakUpdate.milestoneAchieved) {
      // Implementation for team notifications would go here
    }
  }

  private async getStreakDataForType(userId: string, streakType: StreakType): Promise<StreakData> {
    const streakInfo = await this.getCurrentStreak(userId, streakType);
    
    // Get milestones for this streak type
    const milestonesResult = await db.query(
      `SELECT milestone_days, achieved_at, bonus_points
       FROM streak_milestones
       WHERE user_id = $1 AND streak_type = $2
       ORDER BY milestone_days ASC`,
      [userId, streakType]
    );

    const milestones: StreakMilestone[] = milestonesResult.rows.map(row => ({
      days: row.milestone_days,
      achievedAt: row.achieved_at,
      bonusPoints: row.bonus_points
    }));

    // Find next milestone
    const nextMilestone = this.MILESTONE_THRESHOLDS.find(
      threshold => threshold > streakInfo.currentStreak
    );

    return {
      userId,
      currentStreak: streakInfo.currentStreak,
      longestStreak: streakInfo.longestStreak,
      lastActivityDate: streakInfo.lastActivityDate,
      milestones,
      streakType,
      multiplier: this.STREAK_MULTIPLIERS[streakType],
      nextMilestone: nextMilestone ? {
        days: nextMilestone,
        achievedAt: new Date(), // placeholder
        bonusPoints: nextMilestone * 10
      } : null
    };
  }
}