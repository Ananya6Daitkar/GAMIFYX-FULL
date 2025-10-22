/**
 * Analytics routes for risk scoring and performance analysis
 */

import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { AnalyticsEngine } from '../services/analyticsEngine';
import { logger } from '../telemetry/logger';
import {
  CalculateRiskRequest,
  AnalyzePerformanceRequest,
  CohortAnalysisRequest,
  TrendAnalysisRequest
} from '../models';

const router = Router();
const analyticsEngine = AnalyticsEngine.getInstance();

// Validation schemas
const calculateRiskSchema = Joi.object({
  userId: Joi.string().required(),
  includeFactors: Joi.boolean().default(true),
  includeRecommendations: Joi.boolean().default(true)
});

const analyzePerformanceSchema = Joi.object({
  userId: Joi.string().required(),
  timeframe: Joi.string().valid('7d', '30d', '90d').default('30d'),
  metrics: Joi.array().items(Joi.string().valid(
    'code_quality', 'completion_time', 'test_coverage', 'security_score'
  )).min(1).required()
});

const cohortAnalysisSchema = Joi.object({
  cohortId: Joi.string().optional(),
  studentIds: Joi.array().items(Joi.string()).optional(),
  timeframe: Joi.string().valid('7d', '30d', '90d').default('30d'),
  includeRecommendations: Joi.boolean().default(true)
});

/**
 * Calculate risk score for a student
 * POST /analytics/risk-score
 */
router.post('/risk-score', async (req: Request, res: Response) => {
  try {
    const { error, value } = calculateRiskSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details
      });
    }

    const request: CalculateRiskRequest = value;
    const result = await analyticsEngine.calculateRiskScore(request);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Failed to calculate risk score:', error);
    res.status(500).json({
      error: 'Failed to calculate risk score',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get risk score for a student
 * GET /analytics/risk-score/:userId
 */
router.get('/risk-score/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const includeFactors = req.query.includeFactors === 'true';
    const includeRecommendations = req.query.includeRecommendations === 'true';

    const request: CalculateRiskRequest = {
      userId,
      includeFactors,
      includeRecommendations
    };

    const result = await analyticsEngine.calculateRiskScore(request);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Failed to get risk score:', error);
    res.status(500).json({
      error: 'Failed to get risk score',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Analyze student performance
 * POST /analytics/performance
 */
router.post('/performance', async (req: Request, res: Response) => {
  try {
    const { error, value } = analyzePerformanceSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details
      });
    }

    const request: AnalyzePerformanceRequest = value;
    const result = await analyticsEngine.analyzePerformance(request);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Failed to analyze performance:', error);
    res.status(500).json({
      error: 'Failed to analyze performance',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get performance analysis for a student
 * GET /analytics/performance/:userId
 */
router.get('/performance/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const timeframe = req.query.timeframe as string || '30d';
    const metrics = (req.query.metrics as string)?.split(',') || ['code_quality', 'completion_time'];

    const request: AnalyzePerformanceRequest = {
      userId,
      timeframe,
      metrics
    };

    const result = await analyticsEngine.analyzePerformance(request);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Failed to get performance analysis:', error);
    res.status(500).json({
      error: 'Failed to get performance analysis',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Analyze cohort performance
 * POST /analytics/cohort
 */
router.post('/cohort', async (req: Request, res: Response) => {
  try {
    const { error, value } = cohortAnalysisSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details
      });
    }

    const request: CohortAnalysisRequest = value;
    const result = await analyticsEngine.analyzeCohort(request);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Failed to analyze cohort:', error);
    res.status(500).json({
      error: 'Failed to analyze cohort',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get system health metrics
 * GET /analytics/system-health
 */
router.get('/system-health', async (req: Request, res: Response) => {
  try {
    // This would collect system health metrics from various sources
    const systemHealth = {
      status: 'healthy',
      goldenSignals: {
        latency: { p50: 120, p95: 250, p99: 500, average: 150 },
        traffic: { requestsPerSecond: 45, activeUsers: 120, peakConcurrency: 200 },
        errors: { errorRate: 0.02, totalErrors: 15, errorsByType: { '4xx': 10, '5xx': 5 } },
        saturation: { cpuUtilization: 65, memoryUtilization: 70, diskUtilization: 45, networkUtilization: 30 }
      },
      services: [
        { serviceName: 'user-service', status: 'healthy', responseTime: 120, errorRate: 0.01, throughput: 50, availability: 99.9 },
        { serviceName: 'submission-service', status: 'healthy', responseTime: 200, errorRate: 0.02, throughput: 30, availability: 99.8 },
        { serviceName: 'gamification-service', status: 'healthy', responseTime: 100, errorRate: 0.005, throughput: 25, availability: 99.95 }
      ],
      alerts: {
        total: 3,
        byStatus: { open: 1, acknowledged: 1, resolved: 1 },
        bySeverity: { low: 1, medium: 1, high: 1 },
        recentAlerts: []
      },
      performance: {
        totalStudents: 150,
        activeStudents: 120,
        averageRiskScore: 0.35,
        studentsAtRisk: 15,
        improvingStudents: 45,
        decliningStudents: 12
      },
      timestamp: new Date()
    };

    res.json({
      success: true,
      data: systemHealth
    });

  } catch (error) {
    logger.error('Failed to get system health:', error);
    res.status(500).json({
      error: 'Failed to get system health',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get analytics statistics
 * GET /analytics/stats
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    // This would get actual analytics statistics
    const stats = {
      riskCalculations: {
        total: 1250,
        last24h: 85,
        averageScore: 0.42,
        distribution: {
          low: 60,
          medium: 25,
          high: 12,
          critical: 3
        }
      },
      performanceAnalyses: {
        total: 890,
        last24h: 45,
        trendsIdentified: 234,
        improvingStudents: 45,
        decliningStudents: 12
      },
      cohortAnalyses: {
        total: 25,
        lastWeek: 5,
        averageCohortSize: 30,
        totalStudentsAnalyzed: 750
      },
      systemHealth: {
        overallScore: 85,
        servicesHealthy: 8,
        servicesTotal: 8,
        averageResponseTime: 150,
        errorRate: 0.02
      }
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error('Failed to get analytics stats:', error);
    res.status(500).json({
      error: 'Failed to get analytics stats',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Batch risk score calculation
 * POST /analytics/batch/risk-scores
 */
router.post('/batch/risk-scores', async (req: Request, res: Response) => {
  try {
    const { userIds, includeFactors = false, includeRecommendations = false } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        error: 'userIds array is required and must not be empty'
      });
    }

    if (userIds.length > 100) {
      return res.status(400).json({
        error: 'Maximum 100 users can be processed in a single batch'
      });
    }

    const results = [];
    const errors = [];

    for (const userId of userIds) {
      try {
        const request: CalculateRiskRequest = {
          userId,
          includeFactors,
          includeRecommendations
        };

        const result = await analyticsEngine.calculateRiskScore(request);
        results.push(result);

      } catch (error) {
        errors.push({
          userId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    res.json({
      success: true,
      data: {
        results,
        errors,
        summary: {
          total: userIds.length,
          successful: results.length,
          failed: errors.length
        }
      }
    });

  } catch (error) {
    logger.error('Failed to process batch risk scores:', error);
    res.status(500).json({
      error: 'Failed to process batch risk scores',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;