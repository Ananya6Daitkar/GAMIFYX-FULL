/**
 * Advanced Progress Tracking System with detailed historical analytics
 */

import { db } from '../database/connection';
import { logger } from '../telemetry/logger';
import { UserGameProfile, PointReason } from '../models';

export interface ProgressSnapshot {
  userId: string;
  timestamp: Date;
  totalPoints: number;
  level: number;
  badges: number;
  achievements: number;
  streak: number;
  weeklyProgress: number;
  monthlyProgress: number;
  skillScores: SkillScore[];
}

export interface SkillScore {
  skill: string;
  score: number;
  trend: 'improving' | 'stable' | 'declining';
  lastUpdated: Date;
}

export interface ProgressAnalytics {
  userId: string;
  timeframe: string;
  pointsGained: number;
  levelsGained: number;
  badgesEarned: number;
  achievementsUnlocked: number;
  averageDaily: number;
  bestDay: ProgressDay;
  worstDay: ProgressDay;
  consistency: number; // 0-100 score
  predictions: ProgressPrediction[];
}

export interface ProgressDay {
  date: Date;
  points: number;
  activities: number;
  quality: number;
}

export interface ProgressPrediction {
  metric: string;
  currentValue: number;
  predictedValue: number;
  timeframe: string;
  confidence: number;
}

export class ProgressTrackingSystem {
  private static instance: ProgressTrackingSystem;

  private constructor() {}

  public static getInstance(): ProgressTrackingSystem {
    if (!ProgressTrackingSystem.instance) {
      ProgressTrackingSystem.instance = new ProgressTrackingSystem();
    }
    return ProgressTrackingSystem.instance;
  }

  /**
   * Create progress snapshot for user
   */
  public async createProgressSnapshot(userId: string): Promise<ProgressSnapshot> {
    try {
      const now = new Date();

      // Get current user profile
      const profileResult = await db.query(
        'SELECT * FROM user_game_profiles WHERE user_id = $1',
        [userId]
      );

      if (profileResult.rows.length === 0) {
        throw new Error('User profile not found');
      }

      const profile = profileResult.rows[0];

      // Get badge count
      const badgeCount = await db.query(
        'SELECT COUNT(*) FROM user_badges WHERE user_id = $1',
        [userId]
      );

      // Get achievement count
      const achievementCount = await db.query(
        'SELECT COUNT(*) FROM user_achievements WHERE user_id = $1',
        [userId]
      );

      // Calculate weekly progress
      const weeklyProgress = await this.calculateWeeklyProgress(userId);

      // Calculate monthly progress
      const monthlyProgress = await this.calculateMonthlyProgress(userId);

      // Get skill scores
      const skillScores = await this.calculateSkillScores(userId);

      const snapshot: ProgressSnapshot = {
        userId,
        timestamp: now,
        totalPoints: profile.total_points,
        level: profile.level,
        badges: parseInt(badgeCount.rows[0].count),
        achievements: parseInt(achievementCount.rows[0].count),
        streak: profile.current_streak,
        weeklyProgress,
        monthlyProgress,
        skillScores
      };

      // Save snapshot to database
      await db.query(
        `INSERT INTO progress_snapshots 
         (user_id, timestamp, total_points, level, badges, achievements, streak, weekly_progress, monthly_progress, skill_scores)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          snapshot.userId,
          snapshot.timestamp,
          snapshot.totalPoints,
          snapshot.level,
          snapshot.badges,
          snapshot.achievements,
          snapshot.streak,
          snapshot.weeklyProgress,
          snapshot.monthlyProgress,
          JSON.stringify(snapshot.skillScores)
        ]
      );

      logger.info('Progress snapshot created', {
        userId,
        totalPoints: snapshot.totalPoints,
        level: snapshot.level,
        weeklyProgress: snapshot.weeklyProgress
      });

      return snapshot;

    } catch (error) {
      logger.error('Failed to create progress snapshot:', error);
      throw error;
    }
  }

  /**
   * Get detailed progress analytics for user
   */
  public async getProgressAnalytics(
    userId: string,
    timeframe: 'week' | 'month' | 'quarter' | 'year' = 'month'
  ): Promise<ProgressAnalytics> {
    try {
      const interval = this.getTimeframeInterval(timeframe);
      const startDate = new Date();
      startDate.setTime(startDate.getTime() - interval);

      // Get progress data for timeframe
      const progressData = await db.query(
        `SELECT 
           DATE(created_at) as date,
           SUM(points) as daily_points,
           COUNT(*) as activities,
           AVG(CASE WHEN reason = 'code_quality' THEN points ELSE NULL END) as avg_quality
         FROM point_transactions
         WHERE user_id = $1 AND created_at >= $2
         GROUP BY DATE(created_at)
         ORDER BY date`,
        [userId, startDate]
      );

      const dailyData = progressData.rows.map(row => ({
        date: new Date(row.date),
        points: parseInt(row.daily_points),
        activities: parseInt(row.activities),
        quality: parseFloat(row.avg_quality) || 0
      }));

      // Calculate metrics
      const totalPoints = dailyData.reduce((sum, day) => sum + day.points, 0);
      const averageDaily = totalPoints / Math.max(dailyData.length, 1);

      const bestDay = dailyData.reduce((best, day) => 
        day.points > best.points ? day : best, 
        dailyData[0] || { date: new Date(), points: 0, activities: 0, quality: 0 }
      );

      const worstDay = dailyData.reduce((worst, day) => 
        day.points < worst.points ? day : worst, 
        dailyData[0] || { date: new Date(), points: 0, activities: 0, quality: 0 }
      );

      // Calculate consistency (how consistent daily activity is)
      const consistency = this.calculateConsistency(dailyData);

      // Get level and badge changes
      const levelsGained = await this.getLevelsGained(userId, startDate);
      const badgesEarned = await this.getBadgesEarned(userId, startDate);
      const achievementsUnlocked = await this.getAchievementsUnlocked(userId, startDate);

      // Generate predictions
      const predictions = await this.generatePredictions(userId, dailyData);

      const analytics: ProgressAnalytics = {
        userId,
        timeframe,
        pointsGained: totalPoints,
        levelsGained,
        badgesEarned,
        achievementsUnlocked,
        averageDaily,
        bestDay,
        worstDay,
        consistency,
        predictions
      };

      return analytics;

    } catch (error) {
      logger.error('Failed to get progress analytics:', error);
      throw error;
    }
  }

  /**
   * Get progress comparison between users
   */
  public async getProgressComparison(
    userId: string,
    compareWithUserId: string,
    timeframe: 'week' | 'month' = 'month'
  ): Promise<any> {
    try {
      const userAnalytics = await this.getProgressAnalytics(userId, timeframe);
      const compareAnalytics = await this.getProgressAnalytics(compareWithUserId, timeframe);

      return {
        user: userAnalytics,
        comparison: compareAnalytics,
        differences: {
          pointsGained: userAnalytics.pointsGained - compareAnalytics.pointsGained,
          levelsGained: userAnalytics.levelsGained - compareAnalytics.levelsGained,
          badgesEarned: userAnalytics.badgesEarned - compareAnalytics.badgesEarned,
          averageDaily: userAnalytics.averageDaily - compareAnalytics.averageDaily,
          consistency: userAnalytics.consistency - compareAnalytics.consistency
        },
        betterIn: this.calculateBetterAreas(userAnalytics, compareAnalytics)
      };

    } catch (error) {
      logger.error('Failed to get progress comparison:', error);
      throw error;
    }
  }

  /**
   * Get progress trends and insights
   */
  public async getProgressTrends(userId: string): Promise<any> {
    try {
      // Get last 12 weeks of snapshots
      const snapshotsResult = await db.query(
        `SELECT * FROM progress_snapshots 
         WHERE user_id = $1 AND timestamp >= NOW() - INTERVAL '12 weeks'
         ORDER BY timestamp`,
        [userId]
      );

      const snapshots = snapshotsResult.rows;

      if (snapshots.length < 2) {
        return { trends: [], insights: ['Not enough data for trend analysis'] };
      }

      // Calculate trends
      const trends = {
        points: this.calculateTrend(snapshots.map(s => s.total_points)),
        level: this.calculateTrend(snapshots.map(s => s.level)),
        badges: this.calculateTrend(snapshots.map(s => s.badges)),
        achievements: this.calculateTrend(snapshots.map(s => s.achievements)),
        streak: this.calculateTrend(snapshots.map(s => s.streak))
      };

      // Generate insights
      const insights = this.generateInsights(trends, snapshots);

      return {
        trends,
        insights,
        snapshots: snapshots.slice(-4) // Last 4 snapshots for visualization
      };

    } catch (error) {
      logger.error('Failed to get progress trends:', error);
      throw error;
    }
  }

  // Private helper methods
  private async calculateWeeklyProgress(userId: string): Promise<number> {
    const result = await db.query(
      `SELECT COALESCE(SUM(points), 0) as points
       FROM point_transactions
       WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '1 week'`,
      [userId]
    );

    return parseInt(result.rows[0].points);
  }

  private async calculateMonthlyProgress(userId: string): Promise<number> {
    const result = await db.query(
      `SELECT COALESCE(SUM(points), 0) as points
       FROM point_transactions
       WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '1 month'`,
      [userId]
    );

    return parseInt(result.rows[0].points);
  }

  private async calculateSkillScores(userId: string): Promise<SkillScore[]> {
    const skills = ['coding', 'security', 'testing', 'collaboration', 'consistency'];
    const skillScores: SkillScore[] = [];

    for (const skill of skills) {
      const score = await this.calculateSkillScore(userId, skill);
      const trend = await this.calculateSkillTrend(userId, skill);

      skillScores.push({
        skill,
        score,
        trend,
        lastUpdated: new Date()
      });
    }

    return skillScores;
  }

  private async calculateSkillScore(userId: string, skill: string): Promise<number> {
    // Simplified skill calculation - in reality this would be more complex
    const reasonMap = {
      coding: [PointReason.SUBMISSION, PointReason.CODE_QUALITY],
      security: [PointReason.SECURITY_SCORE],
      testing: [PointReason.TEST_COVERAGE],
      collaboration: [PointReason.PEER_REVIEW, PointReason.HELP_OTHERS],
      consistency: [PointReason.STREAK_BONUS]
    };

    const reasons = reasonMap[skill] || [];
    if (reasons.length === 0) return 0;

    const result = await db.query(
      `SELECT AVG(points) as avg_score
       FROM point_transactions
       WHERE user_id = $1 AND reason = ANY($2) AND created_at >= NOW() - INTERVAL '1 month'`,
      [userId, reasons]
    );

    return Math.min(Math.round(parseFloat(result.rows[0]?.avg_score || '0')), 100);
  }

  private async calculateSkillTrend(userId: string, skill: string): Promise<'improving' | 'stable' | 'declining'> {
    // Compare last 2 weeks vs previous 2 weeks
    const recent = await this.calculateSkillScoreForPeriod(userId, skill, 14);
    const previous = await this.calculateSkillScoreForPeriod(userId, skill, 28, 14);

    if (recent > previous * 1.1) return 'improving';
    if (recent < previous * 0.9) return 'declining';
    return 'stable';
  }

  private async calculateSkillScoreForPeriod(
    userId: string, 
    skill: string, 
    daysBack: number, 
    daysOffset: number = 0
  ): Promise<number> {
    const reasonMap = {
      coding: [PointReason.SUBMISSION, PointReason.CODE_QUALITY],
      security: [PointReason.SECURITY_SCORE],
      testing: [PointReason.TEST_COVERAGE],
      collaboration: [PointReason.PEER_REVIEW, PointReason.HELP_OTHERS],
      consistency: [PointReason.STREAK_BONUS]
    };

    const reasons = reasonMap[skill] || [];
    if (reasons.length === 0) return 0;

    const result = await db.query(
      `SELECT AVG(points) as avg_score
       FROM point_transactions
       WHERE user_id = $1 AND reason = ANY($2) 
       AND created_at >= NOW() - INTERVAL '${daysBack + daysOffset} days'
       AND created_at <= NOW() - INTERVAL '${daysOffset} days'`,
      [userId, reasons]
    );

    return parseFloat(result.rows[0]?.avg_score || '0');
  }

  private getTimeframeInterval(timeframe: string): number {
    const intervals = {
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000,
      quarter: 90 * 24 * 60 * 60 * 1000,
      year: 365 * 24 * 60 * 60 * 1000
    };

    return intervals[timeframe] || intervals.month;
  }

  private calculateConsistency(dailyData: ProgressDay[]): number {
    if (dailyData.length === 0) return 0;

    const activeDays = dailyData.filter(day => day.points > 0).length;
    const totalDays = dailyData.length;

    return Math.round((activeDays / totalDays) * 100);
  }

  private async getLevelsGained(userId: string, startDate: Date): Promise<number> {
    const result = await db.query(
      `SELECT 
         (SELECT level FROM user_game_profiles WHERE user_id = $1) -
         COALESCE((SELECT level FROM progress_snapshots WHERE user_id = $1 AND timestamp <= $2 ORDER BY timestamp DESC LIMIT 1), 1) as levels_gained`,
      [userId, startDate]
    );

    return Math.max(parseInt(result.rows[0]?.levels_gained || '0'), 0);
  }

  private async getBadgesEarned(userId: string, startDate: Date): Promise<number> {
    const result = await db.query(
      'SELECT COUNT(*) FROM user_badges WHERE user_id = $1 AND earned_at >= $2',
      [userId, startDate]
    );

    return parseInt(result.rows[0].count);
  }

  private async getAchievementsUnlocked(userId: string, startDate: Date): Promise<number> {
    const result = await db.query(
      'SELECT COUNT(*) FROM user_achievements WHERE user_id = $1 AND earned_at >= $2',
      [userId, startDate]
    );

    return parseInt(result.rows[0].count);
  }

  private async generatePredictions(userId: string, dailyData: ProgressDay[]): Promise<ProgressPrediction[]> {
    const predictions: ProgressPrediction[] = [];

    if (dailyData.length < 7) {
      return predictions; // Not enough data for predictions
    }

    // Predict points for next week
    const recentAverage = dailyData.slice(-7).reduce((sum, day) => sum + day.points, 0) / 7;
    const overallAverage = dailyData.reduce((sum, day) => sum + day.points, 0) / dailyData.length;
    const trend = recentAverage / overallAverage;

    predictions.push({
      metric: 'points',
      currentValue: dailyData[dailyData.length - 1]?.points || 0,
      predictedValue: Math.round(recentAverage * trend * 7),
      timeframe: 'next_week',
      confidence: Math.min(Math.max(dailyData.length / 30, 0.3), 0.9)
    });

    return predictions;
  }

  private calculateBetterAreas(user: ProgressAnalytics, comparison: ProgressAnalytics): string[] {
    const betterIn: string[] = [];

    if (user.pointsGained > comparison.pointsGained) betterIn.push('points_gained');
    if (user.levelsGained > comparison.levelsGained) betterIn.push('levels_gained');
    if (user.badgesEarned > comparison.badgesEarned) betterIn.push('badges_earned');
    if (user.averageDaily > comparison.averageDaily) betterIn.push('daily_average');
    if (user.consistency > comparison.consistency) betterIn.push('consistency');

    return betterIn;
  }

  private calculateTrend(values: number[]): { direction: 'up' | 'down' | 'stable'; strength: number } {
    if (values.length < 2) return { direction: 'stable', strength: 0 };

    const first = values[0];
    const last = values[values.length - 1];
    const change = (last - first) / first;

    if (Math.abs(change) < 0.05) return { direction: 'stable', strength: 0 };
    
    return {
      direction: change > 0 ? 'up' : 'down',
      strength: Math.min(Math.abs(change), 1)
    };
  }

  private generateInsights(trends: any, snapshots: any[]): string[] {
    const insights: string[] = [];

    if (trends.points.direction === 'up') {
      insights.push(`Your points are trending upward with ${Math.round(trends.points.strength * 100)}% growth`);
    }

    if (trends.streak.direction === 'down') {
      insights.push('Your streak consistency could use improvement - try to maintain daily activity');
    }

    if (trends.badges.direction === 'up') {
      insights.push('Great job earning new badges! Keep up the diverse skill development');
    }

    // Add more insight generation logic based on trends

    return insights;
  }
}