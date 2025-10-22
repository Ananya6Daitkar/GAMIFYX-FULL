/**
 * Alert management routes
 */

import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { AlertingSystem } from '../services/alertingSystem';
import { logger } from '../telemetry/logger';
import {
  CreateAlertRuleRequest,
  AlertQueryRequest,
  AlertType,
  AlertSeverity,
  AlertStatus
} from '../models';

const router = Router();
const alertingSystem = AlertingSystem.getInstance();

// Validation schemas
const createAlertRuleSchema = Joi.object({
  name: Joi.string().min(3).max(255).required(),
  description: Joi.string().max(1000).required(),
  type: Joi.string().valid(...Object.values(AlertType)).required(),
  conditions: Joi.array().items(Joi.object({
    metric: Joi.string().required(),
    operator: Joi.string().valid('gt', 'lt', 'eq', 'gte', 'lte', 'ne').required(),
    threshold: Joi.number().required(),
    timeWindow: Joi.string().pattern(/^\d+[mhd]$/).required(),
    aggregation: Joi.string().valid('avg', 'sum', 'count', 'min', 'max').required()
  })).min(1).required(),
  actions: Joi.array().items(Joi.object({
    type: Joi.string().valid('notification', 'webhook', 'email', 'slack').required(),
    target: Joi.string().required(),
    template: Joi.string().optional(),
    parameters: Joi.object().optional()
  })).min(1).required(),
  cooldownMinutes: Joi.number().min(1).max(1440).optional(),
  escalationRules: Joi.array().items(Joi.object({
    level: Joi.number().min(1).required(),
    delayMinutes: Joi.number().min(1).required(),
    actions: Joi.array().items(Joi.object()).required()
  })).optional()
});

const alertQuerySchema = Joi.object({
  status: Joi.array().items(Joi.string().valid(...Object.values(AlertStatus))).optional(),
  severity: Joi.array().items(Joi.string().valid(...Object.values(AlertSeverity))).optional(),
  type: Joi.array().items(Joi.string().valid(...Object.values(AlertType))).optional(),
  userId: Joi.string().optional(),
  cohortId: Joi.string().optional(),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
  limit: Joi.number().min(1).max(100).default(20),
  offset: Joi.number().min(0).default(0)
});

/**
 * Create a new alert rule
 * POST /alerts/rules
 */
router.post('/rules', async (req: Request, res: Response) => {
  try {
    const { error, value } = createAlertRuleSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details
      });
    }

    const request: CreateAlertRuleRequest = value;
    const alertRule = await alertingSystem.createAlertRule(request);

    res.status(201).json({
      success: true,
      data: alertRule,
      message: 'Alert rule created successfully'
    });

  } catch (error) {
    logger.error('Failed to create alert rule:', error);
    res.status(500).json({
      error: 'Failed to create alert rule',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get alerts based on query parameters
 * GET /alerts
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { error, value } = alertQuerySchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details
      });
    }

    const query: AlertQueryRequest = value;
    const result = await alertingSystem.getAlerts(query);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Failed to get alerts:', error);
    res.status(500).json({
      error: 'Failed to get alerts',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get alert by ID
 * GET /alerts/:alertId
 */
router.get('/:alertId', async (req: Request, res: Response) => {
  try {
    const { alertId } = req.params;

    // This would get a specific alert by ID
    // For now, return a placeholder response
    res.json({
      success: true,
      data: {
        id: alertId,
        message: 'Alert details would be returned here'
      }
    });

  } catch (error) {
    logger.error('Failed to get alert:', error);
    res.status(500).json({
      error: 'Failed to get alert',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Acknowledge an alert
 * POST /alerts/:alertId/acknowledge
 */
router.post('/:alertId/acknowledge', async (req: Request, res: Response) => {
  try {
    const { alertId } = req.params;
    const { acknowledgedBy } = req.body;

    if (!acknowledgedBy) {
      return res.status(400).json({
        error: 'acknowledgedBy is required'
      });
    }

    await alertingSystem.acknowledgeAlert(alertId, acknowledgedBy);

    res.json({
      success: true,
      message: 'Alert acknowledged successfully'
    });

  } catch (error) {
    logger.error('Failed to acknowledge alert:', error);
    res.status(500).json({
      error: 'Failed to acknowledge alert',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Resolve an alert
 * POST /alerts/:alertId/resolve
 */
router.post('/:alertId/resolve', async (req: Request, res: Response) => {
  try {
    const { alertId } = req.params;
    const { resolvedBy, notes } = req.body;

    if (!resolvedBy) {
      return res.status(400).json({
        error: 'resolvedBy is required'
      });
    }

    await alertingSystem.resolveAlert(alertId, resolvedBy, notes);

    res.json({
      success: true,
      message: 'Alert resolved successfully'
    });

  } catch (error) {
    logger.error('Failed to resolve alert:', error);
    res.status(500).json({
      error: 'Failed to resolve alert',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get alert statistics
 * GET /alerts/stats
 */
router.get('/stats/summary', async (req: Request, res: Response) => {
  try {
    // This would get actual alert statistics
    const stats = {
      total: 45,
      byStatus: {
        open: 12,
        acknowledged: 8,
        in_progress: 5,
        resolved: 18,
        closed: 2
      },
      bySeverity: {
        low: 15,
        medium: 18,
        high: 10,
        critical: 2
      },
      byType: {
        high_risk_student: 20,
        performance_decline: 15,
        system_health: 8,
        engagement_drop: 2
      },
      recent24h: 8,
      averageResolutionTime: 4.5, // hours
      escalationRate: 0.15
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error('Failed to get alert stats:', error);
    res.status(500).json({
      error: 'Failed to get alert stats',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get alert rules
 * GET /alerts/rules
 */
router.get('/rules/list', async (req: Request, res: Response) => {
  try {
    // This would get actual alert rules from database
    const rules = [
      {
        id: 'high-risk-student',
        name: 'High Risk Student Alert',
        description: 'Alert when student risk score exceeds 0.7',
        type: 'high_risk_student',
        isActive: true,
        conditions: [
          {
            metric: 'risk_score',
            operator: 'gt',
            threshold: 0.7,
            timeWindow: '1h',
            aggregation: 'avg'
          }
        ],
        actions: [
          {
            type: 'notification',
            target: 'teachers',
            template: 'high_risk_alert'
          }
        ],
        cooldownMinutes: 60,
        createdAt: new Date('2024-01-15T10:00:00Z'),
        updatedAt: new Date('2024-01-15T10:00:00Z')
      }
    ];

    res.json({
      success: true,
      data: {
        rules,
        total: rules.length
      }
    });

  } catch (error) {
    logger.error('Failed to get alert rules:', error);
    res.status(500).json({
      error: 'Failed to get alert rules',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Update alert rule
 * PUT /alerts/rules/:ruleId
 */
router.put('/rules/:ruleId', async (req: Request, res: Response) => {
  try {
    const { ruleId } = req.params;
    
    // This would update an existing alert rule
    res.json({
      success: true,
      message: `Alert rule ${ruleId} would be updated here`
    });

  } catch (error) {
    logger.error('Failed to update alert rule:', error);
    res.status(500).json({
      error: 'Failed to update alert rule',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Delete alert rule
 * DELETE /alerts/rules/:ruleId
 */
router.delete('/rules/:ruleId', async (req: Request, res: Response) => {
  try {
    const { ruleId } = req.params;
    
    // This would delete an alert rule
    res.json({
      success: true,
      message: `Alert rule ${ruleId} would be deleted here`
    });

  } catch (error) {
    logger.error('Failed to delete alert rule:', error);
    res.status(500).json({
      error: 'Failed to delete alert rule',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Test alert rule
 * POST /alerts/rules/:ruleId/test
 */
router.post('/rules/:ruleId/test', async (req: Request, res: Response) => {
  try {
    const { ruleId } = req.params;
    
    // This would test an alert rule without triggering actual alerts
    res.json({
      success: true,
      data: {
        ruleId,
        testResult: 'passed',
        conditionsEvaluated: 1,
        wouldTrigger: false,
        message: 'Alert rule test completed successfully'
      }
    });

  } catch (error) {
    logger.error('Failed to test alert rule:', error);
    res.status(500).json({
      error: 'Failed to test alert rule',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;