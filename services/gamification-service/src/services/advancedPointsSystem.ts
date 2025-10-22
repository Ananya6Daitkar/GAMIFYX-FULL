/**
 * Advanced Points System with multiple scoring strategies and cyberpunk enhancements
 */

import { logger } from '../telemetry/logger';
import { db } from '../database/connection';
import { PointReason, UserGameProfile } from '../models';

export interface PointsCalculationStrategy {
  name: string;
  description: string;
  calculate(basePoints: number, context: PointsContext): Promise<number>;
}

export interface PointsContext {
  userId: string;
  reason: PointReason;
  metadata?: Record<string, any>;
  userProfile?: UserGameProfile;
  timeOfDay?: Date;
  streakMultiplier?: number;
  teamBonus?: number;
  seasonalMultiplier?: number;
}

export interface PointsBreakdown {
  basePoints: number;
  multipliers: PointsMultiplier[];
  bonuses: PointsBonus[];
  finalPoints: number;
  strategy: string;
}

export interface PointsMultiplier {
  name: string;
  value: number;
  reason: string;
}

export interface PointsBonus {
  name: string;
  points: number;
  reason: string;
}

export class AdvancedPointsSystem {
  private strategies: Map<string, PointsCalculationStrategy> = new Map();

  constructor() {
    this.initializeStrategies();
  }

  private initializeStrategies(): void {
    // Base strategy - simple points
    this.strategies.set('base', new BasePointsStrategy());
    
    // Quality-based strategy - rewards high quality work
    this.strategies.set('quality', new QualityBasedStrategy());
    
    // Streak-enhanced strategy - rewards consistency
    this.strategies.set('streak', new StreakEnhancedStrategy());
    
    // Team-collaborative strategy - rewards team participation
    this.strategies.set('team', new TeamCollaborativeStrategy());
    
    // Cyberpunk-themed strategy - adds thematic bonuses
    this.strategies.set('cyberpunk', new CyberpunkThemedStrategy());
    
    // Adaptive strategy - adjusts based on user performance
    this.strategies.set('adaptive', new AdaptiveStrategy());
  }

  /**
   * Calculate points using specified strategy
   */
  public async calculatePoints(
    basePoints: number,
    context: PointsContext,
    strategyName: string = 'cyberpunk'
  ): Promise<PointsBreakdown> {
    const strategy = this.strategies.get(strategyName);
    if (!strategy) {
      throw new Error(`Unknown points strategy: ${strategyName}`);
    }

    try {
      // Get user profile if not provided
      if (!context.userProfile) {
        context.userProfile = await this.getUserProfile(context.userId);
      }

      // Calculate final points
      const finalPoints = await strategy.calculate(basePoints, context);

      // Create breakdown (this is a simplified version - each strategy should provide detailed breakdown)
      const breakdown: PointsBreakdown = {
        basePoints,
        multipliers: await this.getMultipliers(context, strategyName),
        bonuses: await this.getBonuses(context, strategyName),
        finalPoints,
        strategy: strategyName
      };

      logger.info('Points calculated', {
        userId: context.userId,
        strategy: strategyName,
        basePoints,
        finalPoints,
        breakdown
      });

      return breakdown;

    } catch (error) {
      logger.error('Failed to calculate points:', error);
      // Fallback to base points
      return {
        basePoints,
        multipliers: [],
        bonuses: [],
        finalPoints: basePoints,
        strategy: 'fallback'
      };
    }
  }

  /**
   * Get available strategies
   */
  public getAvailableStrategies(): string[] {
    return Array.from(this.strategies.keys());
  }

  /**
   * Get strategy description
   */
  public getStrategyDescription(strategyName: string): string {
    const strategy = this.strategies.get(strategyName);
    return strategy?.description || 'Unknown strategy';
  }

  private async getUserProfile(userId: string): Promise<UserGameProfile> {
    const result = await db.query(
      'SELECT * FROM user_game_profiles WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      throw new Error(`User profile not found: ${userId}`);
    }

    const row = result.rows[0];
    return {
      userId: row.user_id,
      totalPoints: row.total_points,
      level: row.level,
      currentXp: row.current_xp,
      xpToNextLevel: row.xp_to_next_level,
      streaks: {
        current: row.current_streak,
        longest: row.longest_streak,
        lastActivityDate: row.last_activity_date,
        milestones: []
      },
      leaderboardRank: row.leaderboard_rank,
      cyberpunkTheme: JSON.parse(row.cyberpunk_theme || '{}'),
      visualPreferences: JSON.parse(row.visual_preferences || '{}'),
      prestigeLevel: row.prestige_level || 0,
      seasonalStats: JSON.parse(row.seasonal_stats || '{}'),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private async getMultipliers(context: PointsContext, strategyName: string): Promise<PointsMultiplier[]> {
    const multipliers: PointsMultiplier[] = [];

    // Streak multiplier
    if (context.userProfile && context.userProfile.streaks.current > 0) {
      const streakMultiplier = Math.min(1 + (context.userProfile.streaks.current * 0.1), 3.0);
      multipliers.push({
        name: 'Streak Bonus',
        value: streakMultiplier,
        reason: `${context.userProfile.streaks.current}-day streak`
      });
    }

    // Level multiplier
    if (context.userProfile && context.userProfile.level > 1) {
      const levelMultiplier = 1 + (context.userProfile.level * 0.05);
      multipliers.push({
        name: 'Level Bonus',
        value: levelMultiplier,
        reason: `Level ${context.userProfile.level}`
      });
    }

    // Time-based multiplier (peak hours bonus)
    const hour = new Date().getHours();
    if (hour >= 9 && hour <= 17) {
      multipliers.push({
        name: 'Peak Hours',
        value: 1.2,
        reason: 'Active during peak learning hours'
      });
    }

    return multipliers;
  }

  private async getBonuses(context: PointsContext, strategyName: string): Promise<PointsBonus[]> {
    const bonuses: PointsBonus[] = [];

    // First submission of the day bonus
    const todaySubmissions = await this.getTodaySubmissionCount(context.userId);
    if (todaySubmissions === 0 && context.reason === PointReason.SUBMISSION) {
      bonuses.push({
        name: 'First Daily Submission',
        points: 50,
        reason: 'First submission of the day'
      });
    }

    // Quality bonus
    if (context.metadata?.codeQuality && context.metadata.codeQuality >= 90) {
      bonuses.push({
        name: 'High Quality Code',
        points: Math.floor((context.metadata.codeQuality - 90) * 10),
        reason: `${context.metadata.codeQuality}% code quality`
      });
    }

    // Security bonus
    if (context.metadata?.securityScore && context.metadata.securityScore >= 95) {
      bonuses.push({
        name: 'Security Excellence',
        points: 100,
        reason: `${context.metadata.securityScore}% security score`
      });
    }

    return bonuses;
  }

  private async getTodaySubmissionCount(userId: string): Promise<number> {
    const result = await db.query(
      `SELECT COUNT(*) FROM point_transactions 
       WHERE user_id = $1 AND reason = $2 AND created_at >= CURRENT_DATE`,
      [userId, PointReason.SUBMISSION]
    );
    return parseInt(result.rows[0].count);
  }
}

// Strategy implementations
class BasePointsStrategy implements PointsCalculationStrategy {
  name = 'Base Points';
  description = 'Simple 1:1 points calculation without modifiers';

  async calculate(basePoints: number, context: PointsContext): Promise<number> {
    return basePoints;
  }
}

class QualityBasedStrategy implements PointsCalculationStrategy {
  name = 'Quality-Based';
  description = 'Rewards high-quality code with bonus multipliers';

  async calculate(basePoints: number, context: PointsContext): Promise<number> {
    let multiplier = 1.0;

    if (context.metadata?.codeQuality) {
      const quality = context.metadata.codeQuality;
      if (quality >= 95) multiplier = 2.0;
      else if (quality >= 90) multiplier = 1.5;
      else if (quality >= 80) multiplier = 1.2;
    }

    if (context.metadata?.securityScore && context.metadata.securityScore >= 95) {
      multiplier += 0.5;
    }

    return Math.floor(basePoints * multiplier);
  }
}

class StreakEnhancedStrategy implements PointsCalculationStrategy {
  name = 'Streak Enhanced';
  description = 'Heavily rewards consistency and daily activity';

  async calculate(basePoints: number, context: PointsContext): Promise<number> {
    let multiplier = 1.0;

    if (context.userProfile?.streaks.current) {
      const streak = context.userProfile.streaks.current;
      multiplier = 1 + (streak * 0.15); // 15% per day
      
      // Bonus for milestone streaks
      if (streak >= 30) multiplier += 1.0; // 30-day streak bonus
      else if (streak >= 14) multiplier += 0.5; // 2-week streak bonus
      else if (streak >= 7) multiplier += 0.25; // 1-week streak bonus
    }

    return Math.floor(basePoints * Math.min(multiplier, 5.0)); // Cap at 5x
  }
}

class TeamCollaborativeStrategy implements PointsCalculationStrategy {
  name = 'Team Collaborative';
  description = 'Rewards team participation and collaborative achievements';

  async calculate(basePoints: number, context: PointsContext): Promise<number> {
    let multiplier = 1.0;
    let bonus = 0;

    // Team member bonus
    if (context.userProfile?.teamAffiliation) {
      multiplier = 1.2;
      
      // Team leader bonus
      if (context.userProfile.teamAffiliation.role === 'leader') {
        multiplier = 1.5;
      }
    }

    // Collaboration bonus
    if (context.reason === PointReason.PEER_REVIEW || context.reason === PointReason.HELP_OTHERS) {
      bonus = basePoints * 0.5; // 50% bonus for helping others
    }

    return Math.floor((basePoints * multiplier) + bonus);
  }
}

class CyberpunkThemedStrategy implements PointsCalculationStrategy {
  name = 'Cyberpunk Themed';
  description = 'Adds thematic bonuses and cyberpunk-style calculations';

  async calculate(basePoints: number, context: PointsContext): Promise<number> {
    let multiplier = 1.0;
    let bonus = 0;

    // Cyberpunk theme bonus
    if (context.userProfile?.cyberpunkTheme) {
      multiplier = 1.1; // Base cyberpunk bonus
      
      // Theme-specific bonuses
      switch (context.userProfile.cyberpunkTheme.selectedTheme) {
        case 'matrix-green':
          if (context.reason === PointReason.CODE_QUALITY) multiplier += 0.2;
          break;
        case 'cyber-red':
          if (context.reason === PointReason.SECURITY_SCORE) multiplier += 0.3;
          break;
        case 'neon-blue':
          if (context.reason === PointReason.SUBMISSION) multiplier += 0.15;
          break;
        case 'hologram-purple':
          if (context.userProfile.streaks.current > 0) multiplier += 0.1 * context.userProfile.streaks.current;
          break;
        case 'glitch-orange':
          // Random bonus (glitch effect)
          const randomBonus = Math.random() * 0.5;
          multiplier += randomBonus;
          break;
      }
    }

    // Prestige level bonus
    if (context.userProfile?.prestigeLevel && context.userProfile.prestigeLevel > 0) {
      bonus = basePoints * (context.userProfile.prestigeLevel * 0.1);
    }

    // Night owl bonus (cyberpunk theme)
    const hour = new Date().getHours();
    if (hour >= 22 || hour <= 6) {
      multiplier += 0.2; // Night coding bonus
    }

    return Math.floor((basePoints * multiplier) + bonus);
  }
}

class AdaptiveStrategy implements PointsCalculationStrategy {
  name = 'Adaptive';
  description = 'Adjusts rewards based on user performance and needs';

  async calculate(basePoints: number, context: PointsContext): Promise<number> {
    let multiplier = 1.0;

    if (!context.userProfile) return basePoints;

    // Adaptive based on recent performance
    const recentPerformance = await this.getRecentPerformance(context.userId);
    
    if (recentPerformance < 0.5) {
      // User struggling, provide encouragement bonus
      multiplier = 1.5;
    } else if (recentPerformance > 0.8) {
      // High performer, standard rewards
      multiplier = 1.0;
    } else {
      // Average performer, slight bonus
      multiplier = 1.2;
    }

    // Adaptive based on rank
    if (context.userProfile.leaderboardRank > 100) {
      multiplier += 0.3; // Help lower-ranked users catch up
    }

    return Math.floor(basePoints * multiplier);
  }

  private async getRecentPerformance(userId: string): Promise<number> {
    // Simplified performance calculation
    // In a real implementation, this would analyze recent submissions, quality scores, etc.
    const result = await db.query(
      `SELECT AVG(CASE 
        WHEN reason = 'code_quality' THEN points / 100.0
        WHEN reason = 'security_score' THEN points / 100.0
        ELSE 0.5
      END) as avg_performance
      FROM point_transactions 
      WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '7 days'`,
      [userId]
    );

    return parseFloat(result.rows[0]?.avg_performance || '0.5');
  }
}