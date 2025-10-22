import { Router } from 'express';
import { logger } from '../telemetry/logger';
import { GitHubAnalyticsIntegration } from '../services/githubAnalyticsIntegration';
import { AnalyticsEngine } from '../services/analyticsEngine';

const router = Router();
const githubAnalytics = GitHubAnalyticsIntegration.getInstance();
const analyticsEngine = AnalyticsEngine.getInstance();

/**
 * GET /github-analytics/student/:studentId/teacher/:teacherId
 * Get comprehensive student analytics including PR metrics
 */
router.get('/student/:studentId/teacher/:teacherId', async (req, res) => {
  try {
    const { studentId, teacherId } = req.params;
    const { timeframe = '30d' } = req.query;

    const analytics = await githubAnalytics.getStudentAnalytics(
      studentId,
      teacherId,
      timeframe as string
    );

    res.json({
      success: true,
      data: analytics
    });

  } catch (error) {
    logger.error('Error getting student GitHub analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get student analytics'
    });
  }
});

/**
 * GET /github-analytics/class/:teacherId
 * Get class-wide analytics including PR metrics
 */
router.get('/class/:teacherId', async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { timeframe = '30d' } = req.query;

    const analytics = await githubAnalytics.getClassAnalytics(
      teacherId,
      timeframe as string
    );

    res.json({
      success: true,
      data: analytics
    });

  } catch (error) {
    logger.error('Error getting class GitHub analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get class analytics'
    });
  }
});

/**
 * POST /github-analytics/report/generate
 * Generate comprehensive performance report including PR metrics
 */
router.post('/report/generate', async (req, res) => {
  try {
    const { teacherId, studentIds, timeframe = '30d' } = req.body;

    if (!teacherId) {
      return res.status(400).json({
        success: false,
        error: 'Teacher ID is required'
      });
    }

    const report = await githubAnalytics.generatePerformanceReport(
      teacherId,
      studentIds,
      timeframe
    );

    res.json({
      success: true,
      data: report
    });

  } catch (error) {
    logger.error('Error generating performance report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate performance report'
    });
  }
});

/**
 * GET /github-analytics/risk-score/:studentId
 * Get enhanced risk score including GitHub PR metrics
 */
router.get('/risk-score/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    const { includeFactors = 'true', includeRecommendations = 'true' } = req.query;

    const riskScore = await analyticsEngine.calculateRiskScore({
      userId: studentId,
      includeFactors: includeFactors === 'true',
      includeRecommendations: includeRecommendations === 'true'
    });

    res.json({
      success: true,
      data: riskScore
    });

  } catch (error) {
    logger.error('Error calculating enhanced risk score:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate risk score'
    });
  }
});

/**
 * GET /github-analytics/performance/:studentId
 * Get enhanced performance analysis including GitHub PR metrics
 */
router.get('/performance/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    const { timeframe = '30d', metrics } = req.query;

    const metricsArray = metrics 
      ? (metrics as string).split(',')
      : ['code_quality', 'completion_time', 'pr_frequency', 'merge_rate'];

    const performance = await analyticsEngine.analyzePerformance({
      userId: studentId,
      timeframe: timeframe as string,
      metrics: metricsArray
    });

    res.json({
      success: true,
      data: performance
    });

  } catch (error) {
    logger.error('Error analyzing enhanced performance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze performance'
    });
  }
});

/**
 * GET /github-analytics/insights/:teacherId
 * Get AI-powered insights combining traditional and GitHub metrics
 */
router.get('/insights/:teacherId', async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { timeframe = '30d' } = req.query;

    // Get class analytics
    const classAnalytics = await githubAnalytics.getClassAnalytics(
      teacherId,
      timeframe as string
    );

    // Generate enhanced insights
    const insights = {
      classOverview: classAnalytics.classOverview,
      keyInsights: classAnalytics.classInsights,
      studentSummary: classAnalytics.studentPerformance.map(student => ({
        studentId: student.studentId,
        performanceScore: student.prStats.progressScore,
        prActivity: student.prStats.totalPRs,
        riskLevel: student.prStats.progressScore < 30 ? 'high' : 
                   student.prStats.progressScore < 60 ? 'medium' : 'low',
        recommendations: generateStudentRecommendations(student.prStats)
      })),
      actionItems: generateActionItems(classAnalytics)
    };

    res.json({
      success: true,
      data: insights
    });

  } catch (error) {
    logger.error('Error getting GitHub analytics insights:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get insights'
    });
  }
});

/**
 * GET /github-analytics/trends/:studentId
 * Get performance trends including GitHub PR metrics
 */
router.get('/trends/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    const { timeframe = '90d', metrics } = req.query;

    // This would calculate trends over time
    // For now, return basic trend data
    const trends = {
      prActivity: {
        trend: 'increasing',
        percentage: 15.5,
        dataPoints: [] // Would contain historical PR counts
      },
      codeQuality: {
        trend: 'stable',
        percentage: 2.1,
        dataPoints: [] // Would contain quality scores over time
      },
      engagement: {
        trend: 'increasing',
        percentage: 8.3,
        dataPoints: [] // Would contain engagement metrics
      }
    };

    res.json({
      success: true,
      data: trends
    });

  } catch (error) {
    logger.error('Error getting performance trends:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get trends'
    });
  }
});

/**
 * Helper function to generate student recommendations
 */
function generateStudentRecommendations(prStats: any): string[] {
  const recommendations: string[] = [];

  if (prStats.totalPRs === 0) {
    recommendations.push('Encourage GitHub usage and PR creation');
    recommendations.push('Provide GitHub workflow training');
  } else if (prStats.totalPRs > 0) {
    const mergeRate = prStats.mergedPRs / prStats.totalPRs;
    if (mergeRate < 0.5) {
      recommendations.push('Focus on code quality improvement');
      recommendations.push('Provide code review training');
    }
  }

  if (prStats.prsThisWeek === 0 && prStats.totalPRs > 0) {
    recommendations.push('Check in on recent progress');
    recommendations.push('Provide motivation and support');
  }

  return recommendations;
}

/**
 * Helper function to generate action items
 */
function generateActionItems(classAnalytics: any): string[] {
  const actionItems: string[] = [];

  const studentsWithoutPRs = classAnalytics.studentPerformance.filter(
    (s: any) => s.prStats.totalPRs === 0
  ).length;

  if (studentsWithoutPRs > 0) {
    actionItems.push(`${studentsWithoutPRs} students need GitHub onboarding`);
  }

  const lowPerformers = classAnalytics.studentPerformance.filter(
    (s: any) => s.prStats.progressScore < 30
  ).length;

  if (lowPerformers > 0) {
    actionItems.push(`${lowPerformers} students need additional support`);
  }

  if (classAnalytics.classOverview.averagePRsPerStudent < 2) {
    actionItems.push('Consider increasing GitHub assignment frequency');
  }

  return actionItems;
}

export default router;