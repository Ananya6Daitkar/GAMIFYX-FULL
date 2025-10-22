import { logger } from '../telemetry/logger';
import { db } from '../database/connection';
import { StudentProgress, ProgressTrend, StudentPRStatsResponse } from '../models';

export interface ProgressAnalysisResult {
  studentId: string;
  githubUsername: string;
  analysisDate: Date;
  prActivity: PRActivityAnalysis;
  progressScore: ProgressScore;
  trend: ProgressTrend;
  insights: ProgressInsight[];
  recommendations: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface PRActivityAnalysis {
  totalPRs: number;
  mergedPRs: number;
  openPRs: number;
  closedPRs: number;
  prsThisWeek: number;
  prsThisMonth: number;
  prsLast30Days: number;
  averagePRsPerWeek: number;
  prFrequency: number; // PRs per day
  lastPRDate?: Date;
  daysSinceLastPR?: number;
  longestStreak: number;
  currentStreak: number;
}

export interface ProgressScore {
  overall: number; // 0-100
  activity: number; // Based on PR frequency
  quality: number; // Based on merge rate and PR size
  consistency: number; // Based on regular submissions
  improvement: number; // Based on trend analysis
  breakdown: {
    prCount: number;
    mergeRate: number;
    frequency: number;
    consistency: number;
    recentActivity: number;
  };
}

export interface ProgressInsight {
  type: 'positive' | 'negative' | 'neutral' | 'warning';
  category: 'activity' | 'quality' | 'consistency' | 'improvement' | 'engagement';
  message: string;
  impact: 'high' | 'medium' | 'low';
  confidence: number; // 0-1
  data?: Record<string, any>;
}

export interface TrendAnalysisConfig {
  shortTermDays: number;
  longTermDays: number;
  minimumDataPoints: number;
  trendThreshold: number; // Minimum change % to be considered a trend
}

/**
 * Progress Analysis Engine
 * Analyzes student GitHub PR activity to generate progress insights and scores
 */
export class ProgressAnalysisEngine {
  private static instance: ProgressAnalysisEngine;
  private config: TrendAnalysisConfig;

  private constructor() {
    this.config = {
      shortTermDays: 14,
      longTermDays: 60,
      minimumDataPoints: 3,
      trendThreshold: 15 // 15% change to be considered significant
    };
  }

  public static getInstance(): ProgressAnalysisEngine {
    if (!ProgressAnalysisEngine.instance) {
      ProgressAnalysisEngine.instance = new ProgressAnalysisEngine();
    }
    return ProgressAnalysisEngine.instance;
  }

  /**
   * Analyze progress for a single student
   */
  public async analyzeStudentProgress(
    studentId: string, 
    teacherId: string
  ): Promise<ProgressAnalysisResult | null> {
    try {
      // Get student's GitHub username
      const githubUsername = await this.getGitHubUsername(studentId, teacherId);
      if (!githubUsername) {
        logger.warn(`No GitHub username found for student ${studentId}`);
        return null;
      }

      // Get PR activity data
      const prActivity = await this.analyzePRActivity(studentId, githubUsername);
      
      // Calculate progress score
      const progressScore = await this.calculateProgressScore(prActivity);
      
      // Analyze trends
      const trend = await this.analyzeTrend(studentId, githubUsername);
      
      // Generate insights
      const insights = await this.generateInsights(prActivity, progressScore, trend);
      
      // Generate recommendations
      const recommendations = await this.generateRecommendations(prActivity, progressScore, trend, insights);
      
      // Determine risk level
      const riskLevel = this.determineRiskLevel(progressScore, trend, prActivity);

      const result: ProgressAnalysisResult = {
        studentId,
        githubUsername,
        analysisDate: new Date(),
        prActivity,
        progressScore,
        trend,
        insights,
        recommendations,
        riskLevel
      };

      // Cache the analysis
      await this.cacheAnalysis(result);

      logger.info(`Completed progress analysis for student ${studentId}: score ${progressScore.overall}, trend ${trend.direction}`);
      return result;

    } catch (error) {
      logger.error(`Failed to analyze progress for student ${studentId}:`, error);
      return null;
    }
  }

  /**
   * Analyze PR activity for a student
   */
  private async analyzePRActivity(studentId: string, githubUsername: string): Promise<PRActivityAnalysis> {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_prs,
          COUNT(CASE WHEN status = 'merged' THEN 1 END) as merged_prs,
          COUNT(CASE WHEN status = 'open' THEN 1 END) as open_prs,
          COUNT(CASE WHEN status = 'closed' AND merged_at IS NULL THEN 1 END) as closed_prs,
          COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as prs_this_week,
          COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as prs_this_month,
          COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as prs_last_30_days,
          MAX(created_at) as last_pr_date,
          MIN(created_at) as first_pr_date
        FROM student_pr_submissions 
        WHERE student_id = $1 AND github_username = $2
      `;

      const result = await db.query(query, [studentId, githubUsername]);
      const row = result.rows[0];

      const totalPRs = parseInt(row.total_prs);
      const lastPRDate = row.last_pr_date ? new Date(row.last_pr_date) : undefined;
      const firstPRDate = row.first_pr_date ? new Date(row.first_pr_date) : undefined;

      // Calculate frequency and streaks
      const daysSinceLastPR = lastPRDate ? 
        Math.floor((new Date().getTime() - lastPRDate.getTime()) / (1000 * 60 * 60 * 24)) : 
        undefined;

      const totalDays = firstPRDate && lastPRDate ? 
        Math.max(1, Math.floor((lastPRDate.getTime() - firstPRDate.getTime()) / (1000 * 60 * 60 * 24))) : 
        1;

      const prFrequency = totalPRs / totalDays;
      const averagePRsPerWeek = (totalPRs / totalDays) * 7;

      // Calculate streaks
      const { longestStreak, currentStreak } = await this.calculateStreaks(studentId, githubUsername);

      return {
        totalPRs,
        mergedPRs: parseInt(row.merged_prs),
        openPRs: parseInt(row.open_prs),
        closedPRs: parseInt(row.closed_prs),
        prsThisWeek: parseInt(row.prs_this_week),
        prsThisMonth: parseInt(row.prs_this_month),
        prsLast30Days: parseInt(row.prs_last_30_days),
        averagePRsPerWeek,
        prFrequency,
        lastPRDate,
        daysSinceLastPR,
        longestStreak,
        currentStreak
      };

    } catch (error) {
      logger.error(`Failed to analyze PR activity for student ${studentId}:`, error);
      throw error;
    }
  }

  /**
   * Calculate progress score based on multiple factors
   */
  private async calculateProgressScore(prActivity: PRActivityAnalysis): Promise<ProgressScore> {
    try {
      // Activity score (0-100) - based on PR count and frequency
      const activityScore = Math.min(100, (prActivity.totalPRs / 20) * 100); // Max score at 20 PRs
      
      // Quality score (0-100) - based on merge rate
      const mergeRate = prActivity.totalPRs > 0 ? prActivity.mergedPRs / prActivity.totalPRs : 0;
      const qualityScore = mergeRate * 100;
      
      // Consistency score (0-100) - based on regular submissions
      const consistencyScore = this.calculateConsistencyScore(prActivity);
      
      // Recent activity score (0-100) - based on recent PRs
      const recentActivityScore = Math.min(100, (prActivity.prsLast30Days / 10) * 100); // Max score at 10 PRs in 30 days
      
      // Improvement score (0-100) - based on streak and frequency
      const improvementScore = Math.min(100, (prActivity.currentStreak / 7) * 100); // Max score at 7-day streak

      // Weighted overall score
      const overall = Math.round(
        activityScore * 0.25 +
        qualityScore * 0.25 +
        consistencyScore * 0.20 +
        recentActivityScore * 0.20 +
        improvementScore * 0.10
      );

      return {
        overall,
        activity: Math.round(activityScore),
        quality: Math.round(qualityScore),
        consistency: Math.round(consistencyScore),
        improvement: Math.round(improvementScore),
        breakdown: {
          prCount: Math.round(activityScore),
          mergeRate: Math.round(qualityScore),
          frequency: Math.round(prActivity.prFrequency * 100),
          consistency: Math.round(consistencyScore),
          recentActivity: Math.round(recentActivityScore)
        }
      };

    } catch (error) {
      logger.error('Failed to calculate progress score:', error);
      throw error;
    }
  }

  /**
   * Calculate consistency score based on PR submission patterns
   */
  private calculateConsistencyScore(prActivity: PRActivityAnalysis): number {
    // If no PRs, consistency is 0
    if (prActivity.totalPRs === 0) return 0;

    // If only recent activity, base on current streak
    if (prActivity.totalPRs <= 3) {
      return Math.min(100, (prActivity.currentStreak / 3) * 100);
    }

    // Calculate based on streak ratio and frequency
    const streakRatio = prActivity.longestStreak / Math.max(1, prActivity.totalPRs);
    const frequencyConsistency = Math.min(1, prActivity.prFrequency * 7); // Normalize to weekly frequency
    
    return Math.round((streakRatio * 50 + frequencyConsistency * 50));
  }

  /**
   * Analyze trend in PR activity
   */
  private async analyzeTrend(studentId: string, githubUsername: string): Promise<ProgressTrend> {
    try {
      // Get PR counts for different time periods
      const shortTermQuery = `
        SELECT COUNT(*) as count
        FROM student_pr_submissions 
        WHERE student_id = $1 AND github_username = $2 
        AND created_at >= NOW() - INTERVAL '${this.config.shortTermDays} days'
      `;

      const longTermQuery = `
        SELECT COUNT(*) as count
        FROM student_pr_submissions 
        WHERE student_id = $1 AND github_username = $2 
        AND created_at >= NOW() - INTERVAL '${this.config.longTermDays} days'
        AND created_at < NOW() - INTERVAL '${this.config.shortTermDays} days'
      `;

      const [shortTermResult, longTermResult] = await Promise.all([
        db.query(shortTermQuery, [studentId, githubUsername]),
        db.query(longTermQuery, [studentId, githubUsername])
      ]);

      const shortTermCount = parseInt(shortTermResult.rows[0].count);
      const longTermCount = parseInt(longTermResult.rows[0].count);

      // Normalize by time period
      const shortTermRate = shortTermCount / this.config.shortTermDays;
      const longTermRate = longTermCount / (this.config.longTermDays - this.config.shortTermDays);

      let direction: 'improving' | 'stable' | 'declining' = 'stable';
      let percentage = 0;

      if (longTermRate === 0 && shortTermRate > 0) {
        direction = 'improving';
        percentage = 100;
      } else if (longTermRate > 0) {
        const change = ((shortTermRate - longTermRate) / longTermRate) * 100;
        percentage = Math.abs(change);
        
        if (change > this.config.trendThreshold) {
          direction = 'improving';
        } else if (change < -this.config.trendThreshold) {
          direction = 'declining';
        }
      }

      return {
        direction,
        percentage: Math.round(percentage),
        timeframe: `${this.config.shortTermDays} days`
      };

    } catch (error) {
      logger.error(`Failed to analyze trend for student ${studentId}:`, error);
      return {
        direction: 'stable',
        percentage: 0,
        timeframe: `${this.config.shortTermDays} days`
      };
    }
  }

  /**
   * Generate insights based on analysis
   */
  private async generateInsights(
    prActivity: PRActivityAnalysis,
    progressScore: ProgressScore,
    trend: ProgressTrend
  ): Promise<ProgressInsight[]> {
    const insights: ProgressInsight[] = [];

    // Activity insights
    if (prActivity.totalPRs === 0) {
      insights.push({
        type: 'warning',
        category: 'activity',
        message: 'No pull requests found. Student may need help getting started with GitHub.',
        impact: 'high',
        confidence: 1.0
      });
    } else if (prActivity.totalPRs < 5) {
      insights.push({
        type: 'neutral',
        category: 'activity',
        message: 'Limited PR activity. Consider encouraging more frequent submissions.',
        impact: 'medium',
        confidence: 0.8
      });
    } else if (prActivity.totalPRs > 20) {
      insights.push({
        type: 'positive',
        category: 'activity',
        message: 'Excellent PR activity! Student is actively contributing to repositories.',
        impact: 'high',
        confidence: 0.9
      });
    }

    // Quality insights
    const mergeRate = prActivity.totalPRs > 0 ? prActivity.mergedPRs / prActivity.totalPRs : 0;
    if (mergeRate > 0.8) {
      insights.push({
        type: 'positive',
        category: 'quality',
        message: 'High merge rate indicates good code quality and collaboration skills.',
        impact: 'high',
        confidence: 0.9,
        data: { mergeRate: Math.round(mergeRate * 100) }
      });
    } else if (mergeRate < 0.3 && prActivity.totalPRs > 3) {
      insights.push({
        type: 'negative',
        category: 'quality',
        message: 'Low merge rate may indicate issues with code quality or PR process.',
        impact: 'medium',
        confidence: 0.7,
        data: { mergeRate: Math.round(mergeRate * 100) }
      });
    }

    // Consistency insights
    if (prActivity.daysSinceLastPR && prActivity.daysSinceLastPR > 14) {
      insights.push({
        type: 'warning',
        category: 'consistency',
        message: `No recent activity (${prActivity.daysSinceLastPR} days since last PR). Student may need re-engagement.`,
        impact: 'high',
        confidence: 0.9,
        data: { daysSinceLastPR: prActivity.daysSinceLastPR }
      });
    } else if (prActivity.currentStreak > 7) {
      insights.push({
        type: 'positive',
        category: 'consistency',
        message: `Great consistency! Current streak of ${prActivity.currentStreak} days.`,
        impact: 'medium',
        confidence: 0.8,
        data: { currentStreak: prActivity.currentStreak }
      });
    }

    // Trend insights
    if (trend.direction === 'improving' && trend.percentage > 50) {
      insights.push({
        type: 'positive',
        category: 'improvement',
        message: `Strong upward trend! Activity increased by ${trend.percentage}% over ${trend.timeframe}.`,
        impact: 'high',
        confidence: 0.8,
        data: { trendPercentage: trend.percentage }
      });
    } else if (trend.direction === 'declining' && trend.percentage > 50) {
      insights.push({
        type: 'negative',
        category: 'improvement',
        message: `Concerning downward trend. Activity decreased by ${trend.percentage}% over ${trend.timeframe}.`,
        impact: 'high',
        confidence: 0.8,
        data: { trendPercentage: trend.percentage }
      });
    }

    return insights;
  }

  /**
   * Generate recommendations based on analysis
   */
  private async generateRecommendations(
    prActivity: PRActivityAnalysis,
    progressScore: ProgressScore,
    trend: ProgressTrend,
    insights: ProgressInsight[]
  ): Promise<string[]> {
    const recommendations: string[] = [];

    // Activity-based recommendations
    if (prActivity.totalPRs === 0) {
      recommendations.push('Schedule a one-on-one session to help student set up GitHub workflow');
      recommendations.push('Provide step-by-step guide for creating first pull request');
    } else if (prActivity.totalPRs < 5) {
      recommendations.push('Encourage more frequent small commits and PRs');
      recommendations.push('Consider pair programming sessions to build confidence');
    }

    // Quality-based recommendations
    const mergeRate = prActivity.totalPRs > 0 ? prActivity.mergedPRs / prActivity.totalPRs : 0;
    if (mergeRate < 0.5 && prActivity.totalPRs > 3) {
      recommendations.push('Review PR feedback patterns to identify common issues');
      recommendations.push('Provide additional code review training');
      recommendations.push('Consider implementing PR templates or checklists');
    }

    // Consistency-based recommendations
    if (prActivity.daysSinceLastPR && prActivity.daysSinceLastPR > 7) {
      recommendations.push('Reach out to check on student progress and obstacles');
      recommendations.push('Consider adjusting assignment deadlines or expectations');
    } else if (progressScore.consistency < 50) {
      recommendations.push('Encourage regular, smaller commits over large infrequent ones');
      recommendations.push('Set up reminders or check-ins for consistent progress');
    }

    // Trend-based recommendations
    if (trend.direction === 'declining') {
      recommendations.push('Investigate potential blockers or challenges student is facing');
      recommendations.push('Consider additional support or modified learning path');
    } else if (trend.direction === 'improving') {
      recommendations.push('Acknowledge and celebrate the positive progress');
      recommendations.push('Consider increasing challenge level or additional responsibilities');
    }

    // Score-based recommendations
    if (progressScore.overall < 30) {
      recommendations.push('Schedule immediate intervention meeting');
      recommendations.push('Consider alternative learning approaches or additional resources');
    } else if (progressScore.overall > 80) {
      recommendations.push('Consider advanced projects or mentoring opportunities');
      recommendations.push('Explore leadership roles in group projects');
    }

    return recommendations;
  }

  /**
   * Determine risk level based on analysis
   */
  private determineRiskLevel(
    progressScore: ProgressScore,
    trend: ProgressTrend,
    prActivity: PRActivityAnalysis
  ): 'low' | 'medium' | 'high' | 'critical' {
    // Critical risk factors
    if (prActivity.totalPRs === 0 || 
        (prActivity.daysSinceLastPR && prActivity.daysSinceLastPR > 21) ||
        progressScore.overall < 20) {
      return 'critical';
    }

    // High risk factors
    if (progressScore.overall < 40 ||
        trend.direction === 'declining' && trend.percentage > 60 ||
        (prActivity.daysSinceLastPR && prActivity.daysSinceLastPR > 14)) {
      return 'high';
    }

    // Medium risk factors
    if (progressScore.overall < 60 ||
        trend.direction === 'declining' && trend.percentage > 30 ||
        progressScore.consistency < 40) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Calculate PR submission streaks
   */
  private async calculateStreaks(studentId: string, githubUsername: string): Promise<{
    longestStreak: number;
    currentStreak: number;
  }> {
    try {
      // Get all PR dates ordered by creation date
      const query = `
        SELECT DATE(created_at) as pr_date
        FROM student_pr_submissions 
        WHERE student_id = $1 AND github_username = $2
        ORDER BY created_at DESC
      `;

      const result = await db.query(query, [studentId, githubUsername]);
      const prDates = result.rows.map(row => new Date(row.pr_date));

      if (prDates.length === 0) {
        return { longestStreak: 0, currentStreak: 0 };
      }

      let longestStreak = 1;
      let currentStreak = 1;
      let tempStreak = 1;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Calculate current streak (from most recent PR)
      const mostRecentPR = prDates[0];
      const daysSinceLastPR = Math.floor((today.getTime() - mostRecentPR.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysSinceLastPR <= 1) {
        // Start counting from most recent
        for (let i = 1; i < prDates.length; i++) {
          const daysDiff = Math.floor((prDates[i-1].getTime() - prDates[i].getTime()) / (1000 * 60 * 60 * 24));
          if (daysDiff <= 7) { // Allow up to 7 days between PRs for streak
            currentStreak++;
          } else {
            break;
          }
        }
      } else {
        currentStreak = 0;
      }

      // Calculate longest streak
      for (let i = 1; i < prDates.length; i++) {
        const daysDiff = Math.floor((prDates[i-1].getTime() - prDates[i].getTime()) / (1000 * 60 * 60 * 24));
        if (daysDiff <= 7) {
          tempStreak++;
        } else {
          longestStreak = Math.max(longestStreak, tempStreak);
          tempStreak = 1;
        }
      }
      longestStreak = Math.max(longestStreak, tempStreak);

      return { longestStreak, currentStreak };

    } catch (error) {
      logger.error(`Failed to calculate streaks for student ${studentId}:`, error);
      return { longestStreak: 0, currentStreak: 0 };
    }
  }

  /**
   * Get GitHub username for student
   */
  private async getGitHubUsername(studentId: string, teacherId: string): Promise<string | null> {
    try {
      const query = `
        SELECT github_username 
        FROM student_github_profiles 
        WHERE student_id = $1 AND teacher_id = $2 AND is_verified = true
      `;
      
      const result = await db.query(query, [studentId, teacherId]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0].github_username;
    } catch (error) {
      logger.error(`Failed to get GitHub username for student ${studentId}:`, error);
      return null;
    }
  }

  /**
   * Cache analysis results
   */
  private async cacheAnalysis(analysis: ProgressAnalysisResult): Promise<void> {
    try {
      const cacheKey = `progress_analysis:${analysis.studentId}`;
      await db.cacheSet(cacheKey, analysis, 3600); // Cache for 1 hour
    } catch (error) {
      logger.error('Failed to cache progress analysis:', error);
    }
  }

  /**
   * Get cached analysis if available
   */
  public async getCachedAnalysis(studentId: string): Promise<ProgressAnalysisResult | null> {
    try {
      const cacheKey = `progress_analysis:${studentId}`;
      return await db.cacheGet<ProgressAnalysisResult>(cacheKey);
    } catch (error) {
      logger.error('Failed to get cached analysis:', error);
      return null;
    }
  }

  /**
   * Batch analyze multiple students
   */
  public async batchAnalyzeProgress(
    studentIds: string[], 
    teacherId: string
  ): Promise<ProgressAnalysisResult[]> {
    const results: ProgressAnalysisResult[] = [];

    for (const studentId of studentIds) {
      try {
        const analysis = await this.analyzeStudentProgress(studentId, teacherId);
        if (analysis) {
          results.push(analysis);
        }
      } catch (error) {
        logger.error(`Failed to analyze student ${studentId} in batch:`, error);
      }
    }

    logger.info(`Completed batch analysis for ${results.length}/${studentIds.length} students`);
    return results;
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<TrendAnalysisConfig>): void {
    this.config = { ...this.config, ...config };
    logger.info('Updated progress analysis configuration:', this.config);
  }
}