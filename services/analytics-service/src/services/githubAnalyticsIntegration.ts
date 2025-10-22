import { logger } from '../telemetry/logger';
import { db } from '../database/connection';
import { 
  StudentPerformanceData, 
  PerformanceTrend, 
  TrendDataPoint,
  StudentProgress,
  StudentPRStatsResponse,
  ClassPROverviewResponse
} from '../models';

/**
 * GitHub Analytics Integration Service
 * Integrates GitHub PR data with existing analytics and reporting systems
 */
export class GitHubAnalyticsIntegration {
  private static instance: GitHubAnalyticsIntegration;

  private constructor() {}

  public static getInstance(): GitHubAnalyticsIntegration {
    if (!GitHubAnalyticsIntegration.instance) {
      GitHubAnalyticsIntegration.instance = new GitHubAnalyticsIntegration();
    }
    return GitHubAnalyticsIntegration.instance;
  }

  /**
   * Get comprehensive student analytics including PR metrics
   */
  public async getStudentAnalytics(
    studentId: string, 
    teacherId: string,
    timeframe: string = '30d'
  ): Promise<{
    performance: StudentPerformanceData[];
    prStats: StudentPRStatsResponse;
    trends: PerformanceTrend[];
    insights: string[];
  }> {
    try {
      logger.info(`Getting comprehensive analytics for student ${studentId}`);

      const timeRange = this.parseTimeframe(timeframe);

      // Get traditional performance data
      const performanceData = await this.getStudentPerformanceData(
        studentId, 
        timeRange.start, 
        timeRange.end
      );

      // Get PR statistics
      const prStats = await this.getStudentPRStats(studentId, teacherId);

      // Calculate performance trends including PR metrics
      const trends = await this.calculatePerformanceTrends(studentId, timeRange);

      // Generate insights combining both traditional and PR metrics
      const insights = await this.generateStudentInsights(studentId, performanceData, prStats);

      return {
        performance: performanceData,
        prStats,
        trends,
        insights
      };

    } catch (error) {
      logger.error(`Error getting student analytics for ${studentId}:`, error);
      throw error;
    }
  }

  /**
   * Get class-wide analytics including PR metrics
   */
  public async getClassAnalytics(
    teacherId: string,
    timeframe: string = '30d'
  ): Promise<{
    classOverview: ClassPROverviewResponse;
    studentPerformance: Array<{
      studentId: string;
      performance: StudentPerformanceData[];
      prStats: StudentPRStatsResponse;
    }>;
    classInsights: string[];
  }> {
    try {
      logger.info(`Getting class analytics for teacher ${teacherId}`);

      const timeRange = this.parseTimeframe(timeframe);

      // Get class PR overview
      const classOverview = await this.getClassPROverview(teacherId);

      // Get all students in the class
      const studentsResult = await db.query(`
        SELECT DISTINCT student_id 
        FROM student_github_profiles 
        WHERE teacher_id = $1 AND is_verified = true
      `, [teacherId]);

      // Get performance data for each student
      const studentPerformance = await Promise.all(
        studentsResult.rows.map(async (row) => {
          const studentId = row.student_id;
          const performance = await this.getStudentPerformanceData(
            studentId, 
            timeRange.start, 
            timeRange.end
          );
          const prStats = await this.getStudentPRStats(studentId, teacherId);

          return {
            studentId,
            performance,
            prStats
          };
        })
      );

      // Generate class-level insights
      const classInsights = await this.generateClassInsights(teacherId, studentPerformance);

      return {
        classOverview,
        studentPerformance,
        classInsights
      };

    } catch (error) {
      logger.error(`Error getting class analytics for teacher ${teacherId}:`, error);
      throw error;
    }
  }

  /**
   * Generate performance report including PR metrics
   */
  public async generatePerformanceReport(
    teacherId: string,
    studentIds?: string[],
    timeframe: string = '30d'
  ): Promise<{
    reportId: string;
    generatedAt: Date;
    summary: {
      totalStudents: number;
      averagePerformanceScore: number;
      averagePRActivity: number;
      topPerformers: Array<{ studentId: string; score: number; prCount: number }>;
      atRiskStudents: Array<{ studentId: string; riskFactors: string[] }>;
    };
    details: any[];
  }> {
    try {
      const reportId = `report_${Date.now()}`;
      const timeRange = this.parseTimeframe(timeframe);

      // Get students to include in report
      let targetStudents = studentIds;
      if (!targetStudents) {
        const studentsResult = await db.query(`
          SELECT DISTINCT student_id 
          FROM student_github_profiles 
          WHERE teacher_id = $1 AND is_verified = true
        `, [teacherId]);
        targetStudents = studentsResult.rows.map(row => row.student_id);
      }

      // Collect data for each student
      const studentData = await Promise.all(
        targetStudents.map(async (studentId) => {
          const analytics = await this.getStudentAnalytics(studentId, teacherId, timeframe);
          return {
            studentId,
            ...analytics
          };
        })
      );

      // Calculate summary statistics
      const summary = this.calculateReportSummary(studentData);

      // Store report in database
      await this.storePerformanceReport(reportId, teacherId, summary, studentData);

      return {
        reportId,
        generatedAt: new Date(),
        summary,
        details: studentData
      };

    } catch (error) {
      logger.error('Error generating performance report:', error);
      throw error;
    }
  }

  /**
   * Get student performance data
   */
  private async getStudentPerformanceData(
    studentId: string,
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
    `, [studentId, startDate, endDate]);

    return result.rows.map(row => ({
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
  }

  /**
   * Get student PR statistics
   */
  private async getStudentPRStats(studentId: string, teacherId: string): Promise<StudentPRStatsResponse> {
    const result = await db.query(`
      SELECT 
        sps.student_id,
        sgp.github_username,
        COUNT(*) as total_prs,
        COUNT(CASE WHEN sps.status = 'merged' THEN 1 END) as merged_prs,
        COUNT(CASE WHEN sps.status = 'open' THEN 1 END) as open_prs,
        COUNT(CASE WHEN sps.created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as prs_this_week,
        COUNT(CASE WHEN sps.created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as prs_this_month,
        MAX(sps.created_at) as last_pr_date,
        AVG(sps.lines_added + sps.lines_deleted) as avg_pr_size
      FROM student_pr_submissions sps
      JOIN student_github_profiles sgp ON sps.student_id = sgp.student_id
      WHERE sps.student_id = $1 AND sgp.teacher_id = $2
      GROUP BY sps.student_id, sgp.github_username
    `, [studentId, teacherId]);

    if (result.rows.length === 0) {
      return {
        studentId,
        githubUsername: '',
        totalPRs: 0,
        mergedPRs: 0,
        openPRs: 0,
        prsThisWeek: 0,
        prsThisMonth: 0,
        lastPRDate: new Date(),
        avgPRSize: 0,
        trend: {
          direction: 'stable',
          percentage: 0
        },
        progressScore: 0
      };
    }

    const row = result.rows[0];
    return {
      studentId: row.student_id,
      githubUsername: row.github_username,
      totalPRs: parseInt(row.total_prs),
      mergedPRs: parseInt(row.merged_prs),
      openPRs: parseInt(row.open_prs),
      prsThisWeek: parseInt(row.prs_this_week),
      prsThisMonth: parseInt(row.prs_this_month),
      lastPRDate: row.last_pr_date || new Date(),
      avgPRSize: parseFloat(row.avg_pr_size) || 0,
      trend: {
        direction: 'stable', // This would be calculated based on historical data
        percentage: 0
      },
      progressScore: this.calculateProgressScore(row)
    };
  }

  /**
   * Get class PR overview
   */
  private async getClassPROverview(teacherId: string): Promise<ClassPROverviewResponse> {
    const result = await db.query(`
      SELECT 
        COUNT(DISTINCT sgp.student_id) as total_students,
        COUNT(sps.id) as total_prs,
        COUNT(CASE WHEN sps.status = 'merged' THEN 1 END) as merged_prs,
        COUNT(CASE WHEN sps.created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as prs_this_week
      FROM student_github_profiles sgp
      LEFT JOIN student_pr_submissions sps ON sgp.student_id = sps.student_id
      WHERE sgp.teacher_id = $1 AND sgp.is_verified = true
    `, [teacherId]);

    const topContributorsResult = await db.query(`
      SELECT 
        sps.student_id,
        sgp.github_username,
        COUNT(*) as pr_count
      FROM student_pr_submissions sps
      JOIN student_github_profiles sgp ON sps.student_id = sgp.student_id
      WHERE sgp.teacher_id = $1
      GROUP BY sps.student_id, sgp.github_username
      ORDER BY pr_count DESC
      LIMIT 5
    `, [teacherId]);

    const row = result.rows[0];
    return {
      totalStudents: parseInt(row.total_students) || 0,
      totalPRs: parseInt(row.total_prs) || 0,
      mergedPRs: parseInt(row.merged_prs) || 0,
      prsThisWeek: parseInt(row.prs_this_week) || 0,
      averagePRsPerStudent: row.total_students > 0 ? (row.total_prs / row.total_students) : 0,
      topContributors: topContributorsResult.rows.map(contributor => ({
        studentId: contributor.student_id,
        githubUsername: contributor.github_username,
        prCount: parseInt(contributor.pr_count)
      })),
      repositoryStats: [] // This would be populated with repository-specific stats
    };
  }

  /**
   * Calculate performance trends including PR metrics
   */
  private async calculatePerformanceTrends(
    studentId: string,
    timeRange: { start: Date; end: Date }
  ): Promise<PerformanceTrend[]> {
    // This would calculate trends for various metrics including PR activity
    // For now, return empty array - full implementation would analyze historical data
    return [];
  }

  /**
   * Generate student insights
   */
  private async generateStudentInsights(
    studentId: string,
    performanceData: StudentPerformanceData[],
    prStats: StudentPRStatsResponse
  ): Promise<string[]> {
    const insights: string[] = [];

    // PR activity insights
    if (prStats.totalPRs === 0) {
      insights.push('No GitHub PR activity detected. Consider encouraging code collaboration.');
    } else if (prStats.totalPRs > 10) {
      insights.push(`High PR activity (${prStats.totalPRs} PRs). Shows strong engagement with version control.`);
    }

    // Merge rate insights
    if (prStats.totalPRs > 0) {
      const mergeRate = prStats.mergedPRs / prStats.totalPRs;
      if (mergeRate < 0.5) {
        insights.push('Low PR merge rate. May need support with code quality or review process.');
      } else if (mergeRate > 0.8) {
        insights.push('Excellent PR merge rate. Shows good code quality and collaboration skills.');
      }
    }

    // Recent activity insights
    if (prStats.prsThisWeek === 0 && prStats.totalPRs > 0) {
      insights.push('No recent PR activity. Check if student needs support or motivation.');
    }

    return insights;
  }

  /**
   * Generate class insights
   */
  private async generateClassInsights(
    teacherId: string,
    studentPerformance: Array<{ studentId: string; prStats: StudentPRStatsResponse }>
  ): Promise<string[]> {
    const insights: string[] = [];

    const studentsWithPRs = studentPerformance.filter(s => s.prStats.totalPRs > 0);
    const totalStudents = studentPerformance.length;

    if (studentsWithPRs.length < totalStudents * 0.5) {
      insights.push(`Only ${studentsWithPRs.length}/${totalStudents} students have GitHub PR activity. Consider providing GitHub training.`);
    }

    const avgPRs = studentsWithPRs.reduce((sum, s) => sum + s.prStats.totalPRs, 0) / studentsWithPRs.length;
    if (avgPRs > 5) {
      insights.push(`Class shows strong GitHub engagement with average ${avgPRs.toFixed(1)} PRs per active student.`);
    }

    return insights;
  }

  /**
   * Calculate progress score based on PR metrics
   */
  private calculateProgressScore(prData: any): number {
    const totalPRs = parseInt(prData.total_prs) || 0;
    const mergedPRs = parseInt(prData.merged_prs) || 0;
    const recentActivity = parseInt(prData.prs_this_week) || 0;

    // Simple scoring algorithm
    let score = 0;
    score += Math.min(totalPRs * 5, 50); // Up to 50 points for total PRs
    score += Math.min(mergedPRs * 3, 30); // Up to 30 points for merged PRs
    score += Math.min(recentActivity * 10, 20); // Up to 20 points for recent activity

    return Math.min(score, 100);
  }

  /**
   * Calculate report summary
   */
  private calculateReportSummary(studentData: any[]): any {
    const totalStudents = studentData.length;
    const avgPerformanceScore = studentData.reduce((sum, s) => sum + s.prStats.progressScore, 0) / totalStudents;
    const avgPRActivity = studentData.reduce((sum, s) => sum + s.prStats.totalPRs, 0) / totalStudents;

    const topPerformers = studentData
      .sort((a, b) => b.prStats.progressScore - a.prStats.progressScore)
      .slice(0, 5)
      .map(s => ({
        studentId: s.studentId,
        score: s.prStats.progressScore,
        prCount: s.prStats.totalPRs
      }));

    const atRiskStudents = studentData
      .filter(s => s.prStats.progressScore < 30 || s.prStats.totalPRs === 0)
      .map(s => ({
        studentId: s.studentId,
        riskFactors: s.prStats.totalPRs === 0 ? ['No GitHub activity'] : ['Low performance score']
      }));

    return {
      totalStudents,
      averagePerformanceScore: avgPerformanceScore,
      averagePRActivity: avgPRActivity,
      topPerformers,
      atRiskStudents
    };
  }

  /**
   * Store performance report
   */
  private async storePerformanceReport(
    reportId: string,
    teacherId: string,
    summary: any,
    details: any[]
  ): Promise<void> {
    try {
      await db.query(`
        INSERT INTO analytics_reports (
          id, teacher_id, report_type, summary, details, generated_at
        ) VALUES ($1, $2, $3, $4, $5, NOW())
      `, [reportId, teacherId, 'github_performance', JSON.stringify(summary), JSON.stringify(details)]);

      logger.info(`Stored performance report ${reportId} for teacher ${teacherId}`);
    } catch (error) {
      logger.error('Error storing performance report:', error);
    }
  }

  /**
   * Parse timeframe string to date range
   */
  private parseTimeframe(timeframe: string): { start: Date; end: Date } {
    const end = new Date();
    const start = new Date();

    const match = timeframe.match(/^(\d+)([dwmy])$/);
    if (!match) {
      // Default to 30 days
      start.setDate(start.getDate() - 30);
      return { start, end };
    }

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 'd':
        start.setDate(start.getDate() - value);
        break;
      case 'w':
        start.setDate(start.getDate() - (value * 7));
        break;
      case 'm':
        start.setMonth(start.getMonth() - value);
        break;
      case 'y':
        start.setFullYear(start.getFullYear() - value);
        break;
    }

    return { start, end };
  }
}