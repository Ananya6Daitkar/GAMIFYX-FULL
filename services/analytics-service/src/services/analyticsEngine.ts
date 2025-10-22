/**
 * Core analytics engine for performance analysis and risk scoring
 */

import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/connection';
import { logger } from '../telemetry/logger';
import {
  StudentPerformanceData,
  RiskScore,
  RiskLevel,
  RiskFactor,
  PerformanceTrend,
  TrendDataPoint,
  TrendPrediction,
  CohortAnalysis,
  CohortMetrics,
  RiskDistribution,
  CalculateRiskRequest,
  RiskScoreResponse,
  AnalyzePerformanceRequest,
  PerformanceAnalysisResponse,
  CohortAnalysisRequest,
  CohortAnalysisResponse
} from '../models';
import { MetricsCollector } from './metricsCollector';

export class AnalyticsEngine {
  private static instance: AnalyticsEngine;
  private metrics: MetricsCollector;

  private constructor() {
    this.metrics = MetricsCollector.getInstance();
  }

  public static getInstance(): AnalyticsEngine {
    if (!AnalyticsEngine.instance) {
      AnalyticsEngine.instance = new AnalyticsEngine();
    }
    return AnalyticsEngine.instance;
  }

  /**
   * Calculate risk score for a student
   */
  public async calculateRiskScore(request: CalculateRiskRequest): Promise<RiskScoreResponse> {
    const startTime = Date.now();

    try {
      logger.info(`Calculating risk score for user ${request.userId}`);

      // Get recent performance data
      const performanceData = await this.getStudentPerformanceData(
        request.userId,
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        new Date()
      );

      if (performanceData.length === 0) {
        // New student with no data
        const defaultRisk: RiskScoreResponse = {
          userId: request.userId,
          riskScore: 0.5,
          riskLevel: RiskLevel.MEDIUM,
          calculatedAt: new Date(),
          validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000) // Valid for 24 hours
        };

        if (request.includeFactors) {
          defaultRisk.factors = [{
            factor: 'insufficient_data',
            weight: 1.0,
            value: 0.5,
            impact: 'neutral',
            description: 'Insufficient performance data for accurate risk assessment'
          }];
        }

        if (request.includeRecommendations) {
          defaultRisk.recommendations = [
            'Complete more assignments to establish performance baseline',
            'Engage with course materials regularly',
            'Seek help if struggling with concepts'
          ];
        }

        await this.storeRiskScore(defaultRisk);
        return defaultRisk;
      }

      // Calculate risk factors
      const factors = await this.calculateRiskFactors(performanceData);
      
      // Calculate weighted risk score
      const riskScore = this.calculateWeightedRiskScore(factors);
      const riskLevel = this.determineRiskLevel(riskScore);

      // Generate recommendations if requested
      let recommendations: string[] = [];
      if (request.includeRecommendations) {
        recommendations = this.generateRecommendations(factors, riskLevel);
      }

      const response: RiskScoreResponse = {
        userId: request.userId,
        riskScore: Math.round(riskScore * 100) / 100,
        riskLevel,
        calculatedAt: new Date(),
        validUntil: new Date(Date.now() + 4 * 60 * 60 * 1000), // Valid for 4 hours
        factors: request.includeFactors ? factors : undefined,
        recommendations: request.includeRecommendations ? recommendations : undefined
      };

      // Store risk score
      await this.storeRiskScore(response);

      // Record metrics
      this.metrics.recordRiskCalculation(
        Date.now() - startTime,
        riskLevel,
        factors.length
      );

      logger.info(`Risk score calculated for user ${request.userId}: ${riskScore} (${riskLevel})`);

      return response;

    } catch (error) {
      logger.error(`Failed to calculate risk score for user ${request.userId}:`, error);
      this.metrics.recordRiskCalculationError();
      throw error;
    }
  }

  /**
   * Analyze student performance trends
   */
  public async analyzePerformance(request: AnalyzePerformanceRequest): Promise<PerformanceAnalysisResponse> {
    const startTime = Date.now();

    try {
      logger.info(`Analyzing performance for user ${request.userId}`);

      const timeRange = this.parseTimeframe(request.timeframe);
      const performanceData = await this.getStudentPerformanceData(
        request.userId,
        timeRange.start,
        timeRange.end
      );

      const trends: PerformanceTrend[] = [];

      // Analyze each requested metric
      for (const metric of request.metrics) {
        const trend = await this.calculateTrend(
          request.userId,
          metric,
          performanceData,
          request.timeframe
        );
        trends.push(trend);
      }

      // Determine overall trend
      const overallTrend = this.determineOverallTrend(trends);
      
      // Generate insights and recommendations
      const keyInsights = this.generateInsights(trends);
      const recommendations = this.generatePerformanceRecommendations(trends, overallTrend);

      const response: PerformanceAnalysisResponse = {
        userId: request.userId,
        timeframe: request.timeframe,
        trends,
        summary: {
          overallTrend,
          keyInsights,
          recommendations
        },
        calculatedAt: new Date()
      };

      // Store trends
      await this.storeTrends(trends);

      // Record metrics
      this.metrics.recordPerformanceAnalysis(
        Date.now() - startTime,
        request.metrics.length,
        trends.length
      );

      logger.info(`Performance analysis completed for user ${request.userId}`);

      return response;

    } catch (error) {
      logger.error(`Failed to analyze performance for user ${request.userId}:`, error);
      this.metrics.recordPerformanceAnalysisError();
      throw error;
    }
  }

  /**
   * Analyze cohort performance
   */
  public async analyzeCohort(request: CohortAnalysisRequest): Promise<CohortAnalysisResponse> {
    const startTime = Date.now();

    try {
      const cohortId = request.cohortId || 'default';
      logger.info(`Analyzing cohort ${cohortId}`);

      const timeRange = this.parseTimeframe(request.timeframe);
      
      // Get student IDs for cohort
      const studentIds = request.studentIds || await this.getCohortStudents(cohortId);
      
      if (studentIds.length === 0) {
        throw new Error(`No students found for cohort ${cohortId}`);
      }

      // Get performance data for all students
      const cohortData = await this.getCohortPerformanceData(studentIds, timeRange.start, timeRange.end);
      
      // Calculate cohort metrics
      const metrics = this.calculateCohortMetrics(cohortData);
      
      // Calculate risk distribution
      const riskDistribution = await this.calculateCohortRiskDistribution(studentIds);
      
      // Generate trends for cohort
      const trends = await this.calculateCohortTrends(studentIds, request.timeframe);
      
      // Generate recommendations
      const recommendations = request.includeRecommendations 
        ? this.generateCohortRecommendations(metrics, riskDistribution, trends)
        : [];

      const cohortAnalysis: CohortAnalysis = {
        cohortId,
        name: `Cohort ${cohortId}`,
        studentCount: studentIds.length,
        metrics,
        riskDistribution,
        trends,
        recommendations,
        calculatedAt: new Date()
      };

      // Store cohort analysis
      await this.storeCohortAnalysis(cohortAnalysis);

      // Get comparison data
      const previousPeriod = await this.getPreviousPeriodMetrics(cohortId, timeRange);
      const benchmark = await this.getBenchmarkMetrics();

      const response: CohortAnalysisResponse = {
        cohort: cohortAnalysis,
        comparisons: {
          previousPeriod,
          benchmark
        },
        actionItems: this.generateActionItems(cohortAnalysis, previousPeriod)
      };

      // Record metrics
      this.metrics.recordCohortAnalysis(
        Date.now() - startTime,
        studentIds.length,
        trends.length
      );

      logger.info(`Cohort analysis completed for ${cohortId} with ${studentIds.length} students`);

      return response;

    } catch (error) {
      logger.error(`Failed to analyze cohort:`, error);
      this.metrics.recordCohortAnalysisError();
      throw error;
    }
  }

  /**
   * Get student performance data including GitHub PR metrics
   */
  private async getStudentPerformanceData(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<StudentPerformanceData[]> {
    const result = await db.query(`
      SELECT 
        user_id,
        timestamp,
        submission_id,
        code_quality_score,
        completion_time,
        test_coverage,
        security_score,
        feedback_implementation_rate,
        skill_tags,
        metadata
      FROM student_performance_data
      WHERE user_id = $1 AND timestamp >= $2 AND timestamp <= $3
      ORDER BY timestamp ASC
    `, [userId, startDate, endDate]);

    const performanceData = result.rows.map(row => ({
      userId: row.user_id,
      timestamp: row.timestamp,
      submissionId: row.submission_id,
      codeQualityScore: parseFloat(row.code_quality_score),
      completionTime: row.completion_time,
      testCoverage: parseFloat(row.test_coverage || 0),
      securityScore: parseFloat(row.security_score || 0),
      feedbackImplementationRate: parseFloat(row.feedback_implementation_rate || 0),
      skillTags: row.skill_tags || [],
      metadata: row.metadata
    }));

    // Enhance with GitHub PR metrics
    const enhancedData = await this.enhanceWithPRMetrics(performanceData, userId, startDate, endDate);
    
    return enhancedData;
  }

  /**
   * Enhance performance data with GitHub PR metrics
   */
  private async enhanceWithPRMetrics(
    performanceData: StudentPerformanceData[],
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<StudentPerformanceData[]> {
    try {
      // Get PR data for the student in the same time range
      const prResult = await db.query(`
        SELECT 
          sps.created_at,
          sps.pr_number,
          sps.lines_added,
          sps.lines_deleted,
          sps.files_changed,
          sps.review_comments,
          sps.status,
          sps.commit_count
        FROM student_pr_submissions sps
        JOIN student_github_profiles sgp ON sps.student_id = sgp.student_id
        WHERE sps.student_id = $1 
          AND sps.created_at >= $2 
          AND sps.created_at <= $3
        ORDER BY sps.created_at ASC
      `, [userId, startDate, endDate]);

      const prData = prResult.rows;

      // If no PR data, return original performance data
      if (prData.length === 0) {
        return performanceData;
      }

      // Calculate PR-based metrics
      const prMetrics = this.calculatePRMetrics(prData);

      // Enhance each performance data point with PR context
      return performanceData.map(data => {
        // Find PRs created around the same time as this performance data
        const contextualPRs = prData.filter(pr => {
          const prDate = new Date(pr.created_at);
          const dataDate = new Date(data.timestamp);
          const timeDiff = Math.abs(prDate.getTime() - dataDate.getTime());
          return timeDiff <= 24 * 60 * 60 * 1000; // Within 24 hours
        });

        // Add PR metrics to metadata
        const enhancedMetadata = {
          ...data.metadata,
          prMetrics: {
            ...prMetrics,
            contextualPRs: contextualPRs.length,
            recentPRActivity: contextualPRs.length > 0
          }
        };

        return {
          ...data,
          metadata: enhancedMetadata
        };
      });

    } catch (error) {
      logger.error('Error enhancing performance data with PR metrics:', error);
      return performanceData;
    }
  }

  /**
   * Calculate GitHub PR metrics
   */
  private calculatePRMetrics(prData: any[]): any {
    if (prData.length === 0) {
      return {
        totalPRs: 0,
        averagePRSize: 0,
        averageReviewComments: 0,
        mergedPRs: 0,
        prFrequency: 0
      };
    }

    const totalPRs = prData.length;
    const mergedPRs = prData.filter(pr => pr.status === 'merged').length;
    const totalLinesChanged = prData.reduce((sum, pr) => sum + (pr.lines_added || 0) + (pr.lines_deleted || 0), 0);
    const totalReviewComments = prData.reduce((sum, pr) => sum + (pr.review_comments || 0), 0);

    // Calculate PR frequency (PRs per week)
    const timeSpan = prData.length > 1 
      ? (new Date(prData[prData.length - 1].created_at).getTime() - new Date(prData[0].created_at).getTime()) / (1000 * 60 * 60 * 24 * 7)
      : 1;

    return {
      totalPRs,
      mergedPRs,
      mergeRate: totalPRs > 0 ? mergedPRs / totalPRs : 0,
      averagePRSize: totalPRs > 0 ? totalLinesChanged / totalPRs : 0,
      averageReviewComments: totalPRs > 0 ? totalReviewComments / totalPRs : 0,
      prFrequency: totalPRs / Math.max(timeSpan, 1),
      codeVelocity: totalLinesChanged / Math.max(timeSpan, 1)
    };
  }

  /**
   * Calculate risk factors from performance data
   */
  private async calculateRiskFactors(performanceData: StudentPerformanceData[]): Promise<RiskFactor[]> {
    const factors: RiskFactor[] = [];

    if (performanceData.length === 0) {
      return factors;
    }

    // Calculate averages
    const avgCodeQuality = performanceData.reduce((sum, d) => sum + d.codeQualityScore, 0) / performanceData.length;
    const avgCompletionTime = performanceData.reduce((sum, d) => sum + d.completionTime, 0) / performanceData.length;
    const avgTestCoverage = performanceData.reduce((sum, d) => sum + d.testCoverage, 0) / performanceData.length;
    const avgSecurityScore = performanceData.reduce((sum, d) => sum + d.securityScore, 0) / performanceData.length;
    const avgFeedbackRate = performanceData.reduce((sum, d) => sum + d.feedbackImplementationRate, 0) / performanceData.length;

    // Submission frequency
    const daySpan = (performanceData[performanceData.length - 1].timestamp.getTime() - performanceData[0].timestamp.getTime()) / (1000 * 60 * 60 * 24);
    const submissionFrequency = performanceData.length / Math.max(daySpan, 1);

    // Code quality factor
    factors.push({
      factor: 'code_quality',
      weight: 0.25,
      value: avgCodeQuality / 100,
      impact: avgCodeQuality >= 80 ? 'positive' : avgCodeQuality >= 60 ? 'neutral' : 'negative',
      description: `Average code quality: ${avgCodeQuality.toFixed(1)}%`
    });

    // Completion time factor (normalized, lower is better)
    const normalizedCompletionTime = Math.min(avgCompletionTime / 3600, 1); // Cap at 1 hour
    factors.push({
      factor: 'completion_time',
      weight: 0.15,
      value: 1 - normalizedCompletionTime,
      impact: normalizedCompletionTime <= 0.5 ? 'positive' : normalizedCompletionTime <= 0.8 ? 'neutral' : 'negative',
      description: `Average completion time: ${(avgCompletionTime / 60).toFixed(1)} minutes`
    });

    // Test coverage factor
    factors.push({
      factor: 'test_coverage',
      weight: 0.2,
      value: avgTestCoverage / 100,
      impact: avgTestCoverage >= 80 ? 'positive' : avgTestCoverage >= 60 ? 'neutral' : 'negative',
      description: `Average test coverage: ${avgTestCoverage.toFixed(1)}%`
    });

    // Security score factor
    factors.push({
      factor: 'security_score',
      weight: 0.2,
      value: avgSecurityScore / 100,
      impact: avgSecurityScore >= 90 ? 'positive' : avgSecurityScore >= 70 ? 'neutral' : 'negative',
      description: `Average security score: ${avgSecurityScore.toFixed(1)}%`
    });

    // Feedback implementation factor
    factors.push({
      factor: 'feedback_implementation',
      weight: 0.1,
      value: avgFeedbackRate / 100,
      impact: avgFeedbackRate >= 80 ? 'positive' : avgFeedbackRate >= 60 ? 'neutral' : 'negative',
      description: `Feedback implementation rate: ${avgFeedbackRate.toFixed(1)}%`
    });

    // Submission frequency factor
    factors.push({
      factor: 'submission_frequency',
      weight: 0.08,
      value: Math.min(submissionFrequency / 2, 1), // Normalize to 2 submissions per day max
      impact: submissionFrequency >= 1 ? 'positive' : submissionFrequency >= 0.5 ? 'neutral' : 'negative',
      description: `Submission frequency: ${submissionFrequency.toFixed(2)} per day`
    });

    // Add GitHub PR metrics factors
    const prFactors = await this.calculatePRRiskFactors(performanceData);
    factors.push(...prFactors);

    return factors;
  }

  /**
   * Calculate GitHub PR-based risk factors
   */
  private async calculatePRRiskFactors(performanceData: StudentPerformanceData[]): Promise<RiskFactor[]> {
    const factors: RiskFactor[] = [];

    try {
      // Extract PR metrics from enhanced performance data
      const prMetricsArray = performanceData
        .map(data => data.metadata?.prMetrics)
        .filter(metrics => metrics && metrics.totalPRs > 0);

      if (prMetricsArray.length === 0) {
        // No PR data available - this could be a risk factor
        factors.push({
          factor: 'github_activity',
          weight: 0.12,
          value: 0,
          impact: 'negative',
          description: 'No GitHub PR activity detected'
        });
        return factors;
      }

      // Calculate average PR metrics
      const avgMetrics = prMetricsArray.reduce((acc, metrics) => ({
        totalPRs: acc.totalPRs + metrics.totalPRs,
        mergeRate: acc.mergeRate + metrics.mergeRate,
        prFrequency: acc.prFrequency + metrics.prFrequency,
        averagePRSize: acc.averagePRSize + metrics.averagePRSize,
        averageReviewComments: acc.averageReviewComments + metrics.averageReviewComments,
        codeVelocity: acc.codeVelocity + metrics.codeVelocity
      }), {
        totalPRs: 0,
        mergeRate: 0,
        prFrequency: 0,
        averagePRSize: 0,
        averageReviewComments: 0,
        codeVelocity: 0
      });

      const count = prMetricsArray.length;
      Object.keys(avgMetrics).forEach(key => {
        avgMetrics[key] = avgMetrics[key] / count;
      });

      // PR Frequency Factor (PRs per week)
      factors.push({
        factor: 'pr_frequency',
        weight: 0.08,
        value: Math.min(avgMetrics.prFrequency / 2, 1), // Normalize to 2 PRs per week max
        impact: avgMetrics.prFrequency >= 1 ? 'positive' : avgMetrics.prFrequency >= 0.5 ? 'neutral' : 'negative',
        description: `PR frequency: ${avgMetrics.prFrequency.toFixed(2)} per week`
      });

      // PR Merge Rate Factor
      factors.push({
        factor: 'pr_merge_rate',
        weight: 0.06,
        value: avgMetrics.mergeRate,
        impact: avgMetrics.mergeRate >= 0.8 ? 'positive' : avgMetrics.mergeRate >= 0.6 ? 'neutral' : 'negative',
        description: `PR merge rate: ${(avgMetrics.mergeRate * 100).toFixed(1)}%`
      });

      // Code Review Engagement Factor
      factors.push({
        factor: 'code_review_engagement',
        weight: 0.04,
        value: Math.min(avgMetrics.averageReviewComments / 5, 1), // Normalize to 5 comments max
        impact: avgMetrics.averageReviewComments >= 2 ? 'positive' : avgMetrics.averageReviewComments >= 1 ? 'neutral' : 'negative',
        description: `Average review comments: ${avgMetrics.averageReviewComments.toFixed(1)} per PR`
      });

      // Code Velocity Factor (lines changed per week)
      const normalizedVelocity = Math.min(avgMetrics.codeVelocity / 500, 1); // Normalize to 500 lines per week
      factors.push({
        factor: 'code_velocity',
        weight: 0.04,
        value: normalizedVelocity,
        impact: normalizedVelocity >= 0.6 ? 'positive' : normalizedVelocity >= 0.3 ? 'neutral' : 'negative',
        description: `Code velocity: ${avgMetrics.codeVelocity.toFixed(0)} lines/week`
      });

    } catch (error) {
      logger.error('Error calculating PR risk factors:', error);
      // Add a neutral factor if calculation fails
      factors.push({
        factor: 'github_activity',
        weight: 0.12,
        value: 0.5,
        impact: 'neutral',
        description: 'GitHub PR metrics unavailable'
      });
    }

    return factors;
  }

  /**
   * Calculate weighted risk score
   */
  private calculateWeightedRiskScore(factors: RiskFactor[]): number {
    let weightedSum = 0;
    let totalWeight = 0;

    for (const factor of factors) {
      // Convert positive factors to risk (inverse)
      let riskValue = factor.impact === 'positive' ? 1 - factor.value : factor.value;
      if (factor.impact === 'neutral') {
        riskValue = 0.5;
      }

      weightedSum += riskValue * factor.weight;
      totalWeight += factor.weight;
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 0.5;
  }

  /**
   * Determine risk level from score
   */
  private determineRiskLevel(riskScore: number): RiskLevel {
    if (riskScore >= 0.8) return RiskLevel.CRITICAL;
    if (riskScore >= 0.6) return RiskLevel.HIGH;
    if (riskScore >= 0.4) return RiskLevel.MEDIUM;
    return RiskLevel.LOW;
  }

  /**
   * Generate recommendations based on risk factors
   */
  private generateRecommendations(factors: RiskFactor[], riskLevel: RiskLevel): string[] {
    const recommendations: string[] = [];

    // High-level recommendations based on risk level
    if (riskLevel === RiskLevel.CRITICAL) {
      recommendations.push('Immediate intervention required - schedule one-on-one meeting');
      recommendations.push('Consider additional tutoring or mentoring support');
    } else if (riskLevel === RiskLevel.HIGH) {
      recommendations.push('Close monitoring recommended - check in weekly');
      recommendations.push('Provide additional learning resources');
    }

    // Specific recommendations based on factors
    for (const factor of factors) {
      if (factor.impact === 'negative') {
        switch (factor.factor) {
          case 'code_quality':
            recommendations.push('Focus on code quality improvement - review best practices');
            break;
          case 'completion_time':
            recommendations.push('Work on time management and problem-solving efficiency');
            break;
          case 'test_coverage':
            recommendations.push('Emphasize importance of testing - provide testing tutorials');
            break;
          case 'security_score':
            recommendations.push('Review security best practices and common vulnerabilities');
            break;
          case 'feedback_implementation':
            recommendations.push('Encourage student to implement feedback suggestions');
            break;
          case 'submission_frequency':
            recommendations.push('Encourage more regular engagement with assignments');
            break;
        }
      }
    }

    return recommendations;
  }

  /**
   * Store risk score in database
   */
  private async storeRiskScore(riskScore: RiskScoreResponse): Promise<void> {
    await db.query(`
      INSERT INTO risk_scores (user_id, risk_score, risk_level, factors, recommendations, calculated_at, valid_until)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      riskScore.userId,
      riskScore.riskScore,
      riskScore.riskLevel,
      JSON.stringify(riskScore.factors || []),
      riskScore.recommendations || [],
      riskScore.calculatedAt,
      riskScore.validUntil
    ]);
  }

  /**
   * Calculate performance trend for a metric
   */
  private async calculateTrend(
    userId: string,
    metric: string,
    performanceData: StudentPerformanceData[],
    timeframe: string
  ): Promise<PerformanceTrend> {
    const dataPoints: TrendDataPoint[] = [];

    // Extract metric values
    for (const data of performanceData) {
      let value: number;
      switch (metric) {
        case 'code_quality':
          value = data.codeQualityScore;
          break;
        case 'completion_time':
          value = data.completionTime;
          break;
        case 'test_coverage':
          value = data.testCoverage;
          break;
        case 'security_score':
          value = data.securityScore;
          break;
        default:
          continue;
      }

      dataPoints.push({
        timestamp: data.timestamp,
        value,
        metadata: data.metadata
      });
    }

    // Calculate trend
    const { trend, trendStrength } = this.calculateTrendDirection(dataPoints);
    
    // Generate prediction
    const prediction = this.generateTrendPrediction(dataPoints, timeframe);

    return {
      userId,
      metric,
      timeframe,
      dataPoints,
      trend,
      trendStrength,
      prediction,
      calculatedAt: new Date()
    };
  }

  /**
   * Calculate trend direction and strength
   */
  private calculateTrendDirection(dataPoints: TrendDataPoint[]): { trend: 'improving' | 'declining' | 'stable'; trendStrength: number } {
    if (dataPoints.length < 2) {
      return { trend: 'stable', trendStrength: 0 };
    }

    // Simple linear regression
    const n = dataPoints.length;
    const sumX = dataPoints.reduce((sum, _, i) => sum + i, 0);
    const sumY = dataPoints.reduce((sum, point) => sum + point.value, 0);
    const sumXY = dataPoints.reduce((sum, point, i) => sum + i * point.value, 0);
    const sumXX = dataPoints.reduce((sum, _, i) => sum + i * i, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const normalizedSlope = Math.max(-1, Math.min(1, slope / 10)); // Normalize to -1 to 1

    let trend: 'improving' | 'declining' | 'stable';
    if (Math.abs(normalizedSlope) < 0.1) {
      trend = 'stable';
    } else if (normalizedSlope > 0) {
      trend = 'improving';
    } else {
      trend = 'declining';
    }

    return { trend, trendStrength: normalizedSlope };
  }

  /**
   * Generate trend prediction
   */
  private generateTrendPrediction(dataPoints: TrendDataPoint[], timeframe: string): TrendPrediction {
    if (dataPoints.length < 3) {
      return {
        nextValue: dataPoints[dataPoints.length - 1]?.value || 0,
        confidence: 0.3,
        timeHorizon: timeframe,
        factors: ['insufficient_data']
      };
    }

    // Simple prediction based on recent trend
    const recentPoints = dataPoints.slice(-5); // Last 5 points
    const avgValue = recentPoints.reduce((sum, point) => sum + point.value, 0) / recentPoints.length;
    const { trendStrength } = this.calculateTrendDirection(recentPoints);

    const nextValue = avgValue + (trendStrength * avgValue * 0.1); // 10% change based on trend
    const confidence = Math.min(0.9, 0.5 + Math.abs(trendStrength) * 0.4);

    return {
      nextValue: Math.max(0, nextValue),
      confidence,
      timeHorizon: timeframe,
      factors: ['recent_trend', 'historical_performance']
    };
  }

  /**
   * Parse timeframe string to date range
   */
  private parseTimeframe(timeframe: string): { start: Date; end: Date } {
    const end = new Date();
    let start: Date;

    switch (timeframe) {
      case '7d':
        start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        start = new Date(end.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    return { start, end };
  }

  /**
   * Store performance trends
   */
  private async storeTrends(trends: PerformanceTrend[]): Promise<void> {
    for (const trend of trends) {
      await db.query(`
        INSERT INTO performance_trends (user_id, metric, timeframe, data_points, trend, trend_strength, prediction, calculated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        trend.userId,
        trend.metric,
        trend.timeframe,
        JSON.stringify(trend.dataPoints),
        trend.trend,
        trend.trendStrength,
        JSON.stringify(trend.prediction),
        trend.calculatedAt
      ]);
    }
  }

  /**
   * Determine overall trend from multiple metric trends
   */
  private determineOverallTrend(trends: PerformanceTrend[]): 'improving' | 'declining' | 'stable' {
    if (trends.length === 0) return 'stable';

    const trendScores = trends.map(t => {
      switch (t.trend) {
        case 'improving': return t.trendStrength;
        case 'declining': return -Math.abs(t.trendStrength);
        case 'stable': return 0;
      }
    });

    const avgScore = trendScores.reduce((sum, score) => sum + score, 0) / trendScores.length;

    if (Math.abs(avgScore) < 0.1) return 'stable';
    return avgScore > 0 ? 'improving' : 'declining';
  }

  /**
   * Generate insights from trends
   */
  private generateInsights(trends: PerformanceTrend[]): string[] {
    const insights: string[] = [];

    for (const trend of trends) {
      if (trend.trend === 'improving' && trend.trendStrength > 0.3) {
        insights.push(`${trend.metric} is showing strong improvement`);
      } else if (trend.trend === 'declining' && Math.abs(trend.trendStrength) > 0.3) {
        insights.push(`${trend.metric} is declining and needs attention`);
      }
    }

    if (insights.length === 0) {
      insights.push('Performance metrics are relatively stable');
    }

    return insights;
  }

  /**
   * Generate performance recommendations
   */
  private generatePerformanceRecommendations(
    trends: PerformanceTrend[],
    overallTrend: 'improving' | 'declining' | 'stable'
  ): string[] {
    const recommendations: string[] = [];

    if (overallTrend === 'declining') {
      recommendations.push('Schedule a check-in to identify challenges');
      recommendations.push('Review recent submissions for common issues');
    } else if (overallTrend === 'improving') {
      recommendations.push('Continue current learning approach');
      recommendations.push('Consider taking on more challenging assignments');
    }

    // Specific recommendations based on declining metrics
    for (const trend of trends) {
      if (trend.trend === 'declining') {
        switch (trend.metric) {
          case 'code_quality':
            recommendations.push('Focus on code review and best practices');
            break;
          case 'test_coverage':
            recommendations.push('Emphasize test-driven development');
            break;
          case 'security_score':
            recommendations.push('Review security guidelines and common vulnerabilities');
            break;
        }
      }
    }

    return recommendations;
  }

  // Placeholder methods for cohort analysis (would be implemented based on specific requirements)
  private async getCohortStudents(cohortId: string): Promise<string[]> {
    // This would query a cohorts table or use some other method to get student IDs
    // For now, return empty array
    return [];
  }

  private async getCohortPerformanceData(studentIds: string[], startDate: Date, endDate: Date): Promise<StudentPerformanceData[]> {
    // Implementation would fetch data for all students in cohort
    return [];
  }

  private calculateCohortMetrics(cohortData: StudentPerformanceData[]): CohortMetrics {
    // Implementation would calculate aggregate metrics
    return {
      averageCodeQuality: 0,
      averageCompletionTime: 0,
      averageTestCoverage: 0,
      averageSecurityScore: 0,
      submissionFrequency: 0,
      engagementScore: 0,
      retentionRate: 0
    };
  }

  private async calculateCohortRiskDistribution(studentIds: string[]): Promise<RiskDistribution> {
    // Implementation would calculate risk distribution
    return { low: 0, medium: 0, high: 0, critical: 0 };
  }

  private async calculateCohortTrends(studentIds: string[], timeframe: string): Promise<PerformanceTrend[]> {
    // Implementation would calculate trends for cohort
    return [];
  }

  private generateCohortRecommendations(
    metrics: CohortMetrics,
    riskDistribution: RiskDistribution,
    trends: PerformanceTrend[]
  ): string[] {
    return [];
  }

  private async storeCohortAnalysis(analysis: CohortAnalysis): Promise<void> {
    // Implementation would store cohort analysis
  }

  private async getPreviousPeriodMetrics(cohortId: string, timeRange: { start: Date; end: Date }): Promise<CohortMetrics | undefined> {
    // Implementation would get previous period data
    return undefined;
  }

  private async getBenchmarkMetrics(): Promise<CohortMetrics | undefined> {
    // Implementation would get benchmark data
    return undefined;
  }

  private generateActionItems(analysis: CohortAnalysis, previousPeriod?: CohortMetrics): string[] {
    return [];
  }
}