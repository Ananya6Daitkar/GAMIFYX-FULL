import { Router, Request, Response } from 'express';
import { ComprehensiveAuditService } from '@/services/ComprehensiveAuditService';
import { SecretAccessService } from '@/services/SecretAccessService';
import { authenticateToken, requirePermission } from '@/middleware/auth';
import { logger } from '@/telemetry/logger';

const router = Router();

// Initialize services
const accessService = new SecretAccessService();
const auditService = new ComprehensiveAuditService(accessService);

// Get audit trail with filtering and pagination
router.get('/trail',
  authenticateToken,
  requirePermission('audit', 'read'),
  async (req: Request, res: Response) => {
    try {
      const filters = {
        userId: req.query.userId as string,
        secretPath: req.query.secretPath as string,
        eventType: req.query.eventType as string,
        riskLevel: req.query.riskLevel as string,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined
      };

      const pagination = {
        offset: parseInt(req.query.offset as string) || 0,
        limit: parseInt(req.query.limit as string) || 50
      };

      const result = await auditService.getAuditTrail(filters, pagination);

      res.json({
        success: true,
        data: result,
        correlationId: req.correlationId
      });

    } catch (error) {
      logger.error('Failed to get audit trail', { 
        error,
        query: req.query,
        userId: req.user?.id,
        correlationId: req.correlationId 
      });
      
      res.status(400).json({
        error: {
          code: 'AUDIT_TRAIL_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get audit trail',
          correlationId: req.correlationId
        }
      });
    }
  }
);

// Get security alerts
router.get('/alerts',
  authenticateToken,
  requirePermission('audit', 'read'),
  async (req: Request, res: Response) => {
    try {
      const filters = {
        severity: req.query.severity as string,
        status: req.query.status as string,
        userId: req.query.userId as string,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined
      };

      const alerts = await auditService.getSecurityAlerts(filters);

      res.json({
        success: true,
        data: { alerts },
        correlationId: req.correlationId
      });

    } catch (error) {
      logger.error('Failed to get security alerts', { 
        error,
        query: req.query,
        userId: req.user?.id,
        correlationId: req.correlationId 
      });
      
      res.status(400).json({
        error: {
          code: 'SECURITY_ALERTS_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get security alerts',
          correlationId: req.correlationId
        }
      });
    }
  }
);

// Generate compliance report
router.post('/compliance/report',
  authenticateToken,
  requirePermission('audit', 'admin'),
  async (req: Request, res: Response) => {
    try {
      const { framework, startDate, endDate } = req.body;

      if (!framework || !startDate || !endDate) {
        return res.status(400).json({
          error: {
            code: 'MISSING_PARAMETERS',
            message: 'framework, startDate, and endDate are required',
            correlationId: req.correlationId
          }
        });
      }

      const period = {
        start: new Date(startDate),
        end: new Date(endDate)
      };

      const report = await auditService.generateComplianceReport(framework, period);

      res.json({
        success: true,
        data: report,
        correlationId: req.correlationId
      });

    } catch (error) {
      logger.error('Failed to generate compliance report', { 
        error,
        requestBody: req.body,
        userId: req.user?.id,
        correlationId: req.correlationId 
      });
      
      res.status(400).json({
        error: {
          code: 'COMPLIANCE_REPORT_FAILED',
          message: error instanceof Error ? error.message : 'Failed to generate compliance report',
          correlationId: req.correlationId
        }
      });
    }
  }
);

// Get compliance reports
router.get('/compliance/reports',
  authenticateToken,
  requirePermission('audit', 'read'),
  async (req: Request, res: Response) => {
    try {
      const framework = req.query.framework as string;
      
      const reports = await auditService.getComplianceReports(framework);

      res.json({
        success: true,
        data: { reports },
        correlationId: req.correlationId
      });

    } catch (error) {
      logger.error('Failed to get compliance reports', { 
        error,
        query: req.query,
        userId: req.user?.id,
        correlationId: req.correlationId 
      });
      
      res.status(400).json({
        error: {
          code: 'COMPLIANCE_REPORTS_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get compliance reports',
          correlationId: req.correlationId
        }
      });
    }
  }
);

// Log custom audit event
router.post('/event',
  authenticateToken,
  requirePermission('audit', 'write'),
  async (req: Request, res: Response) => {
    try {
      const { eventType, action, result, secretPath, metadata, complianceFrameworks } = req.body;

      if (!eventType || !action || !result) {
        return res.status(400).json({
          error: {
            code: 'MISSING_PARAMETERS',
            message: 'eventType, action, and result are required',
            correlationId: req.correlationId
          }
        });
      }

      await auditService.logAuditEvent({
        eventType,
        userId: req.user.id,
        secretPath,
        action,
        result,
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown',
        metadata,
        complianceFrameworks
      });

      res.json({
        success: true,
        message: 'Audit event logged successfully',
        correlationId: req.correlationId
      });

    } catch (error) {
      logger.error('Failed to log audit event', { 
        error,
        requestBody: req.body,
        userId: req.user?.id,
        correlationId: req.correlationId 
      });
      
      res.status(400).json({
        error: {
          code: 'AUDIT_EVENT_FAILED',
          message: error instanceof Error ? error.message : 'Failed to log audit event',
          correlationId: req.correlationId
        }
      });
    }
  }
);

// Generate security alert
router.post('/alert',
  authenticateToken,
  requirePermission('audit', 'admin'),
  async (req: Request, res: Response) => {
    try {
      const { alertType, severity, userId, description, evidence, mitigationSteps } = req.body;

      if (!alertType || !severity || !userId || !description) {
        return res.status(400).json({
          error: {
            code: 'MISSING_PARAMETERS',
            message: 'alertType, severity, userId, and description are required',
            correlationId: req.correlationId
          }
        });
      }

      const alert = await auditService.generateSecurityAlert(
        alertType,
        severity,
        userId,
        description,
        evidence || [],
        mitigationSteps || []
      );

      res.json({
        success: true,
        data: alert,
        correlationId: req.correlationId
      });

    } catch (error) {
      logger.error('Failed to generate security alert', { 
        error,
        requestBody: req.body,
        userId: req.user?.id,
        correlationId: req.correlationId 
      });
      
      res.status(400).json({
        error: {
          code: 'SECURITY_ALERT_FAILED',
          message: error instanceof Error ? error.message : 'Failed to generate security alert',
          correlationId: req.correlationId
        }
      });
    }
  }
);

// Get audit statistics
router.get('/stats',
  authenticateToken,
  requirePermission('audit', 'read'),
  async (req: Request, res: Response) => {
    try {
      const { startDate, endDate } = req.query;
      
      const period = {
        start: startDate ? new Date(startDate as string) : new Date(Date.now() - 24 * 60 * 60 * 1000),
        end: endDate ? new Date(endDate as string) : new Date()
      };

      // Get audit trail for statistics
      const auditResult = await auditService.getAuditTrail({}, { offset: 0, limit: 1000 });
      const alerts = await auditService.getSecurityAlerts({});

      const stats = {
        period,
        totalEvents: auditResult.total,
        eventsByType: this.groupEventsByType(auditResult.events),
        eventsByRiskLevel: this.groupEventsByRiskLevel(auditResult.events),
        totalAlerts: alerts.length,
        alertsBySeverity: this.groupAlertsBySeverity(alerts),
        alertsByStatus: this.groupAlertsByStatus(alerts),
        topUsers: this.getTopUsers(auditResult.events),
        riskTrends: this.calculateRiskTrends(auditResult.events)
      };

      res.json({
        success: true,
        data: stats,
        correlationId: req.correlationId
      });

    } catch (error) {
      logger.error('Failed to get audit statistics', { 
        error,
        query: req.query,
        userId: req.user?.id,
        correlationId: req.correlationId 
      });
      
      res.status(400).json({
        error: {
          code: 'AUDIT_STATS_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get audit statistics',
          correlationId: req.correlationId
        }
      });
    }
  }
);

// Helper functions for statistics
function groupEventsByType(events: any[]): Record<string, number> {
  return events.reduce((acc, event) => {
    acc[event.eventType] = (acc[event.eventType] || 0) + 1;
    return acc;
  }, {});
}

function groupEventsByRiskLevel(events: any[]): Record<string, number> {
  return events.reduce((acc, event) => {
    acc[event.riskLevel] = (acc[event.riskLevel] || 0) + 1;
    return acc;
  }, {});
}

function groupAlertsBySeverity(alerts: any[]): Record<string, number> {
  return alerts.reduce((acc, alert) => {
    acc[alert.severity] = (acc[alert.severity] || 0) + 1;
    return acc;
  }, {});
}

function groupAlertsByStatus(alerts: any[]): Record<string, number> {
  return alerts.reduce((acc, alert) => {
    acc[alert.status] = (acc[alert.status] || 0) + 1;
    return acc;
  }, {});
}

function getTopUsers(events: any[]): Array<{ userId: string; eventCount: number }> {
  const userCounts = events.reduce((acc, event) => {
    acc[event.userId] = (acc[event.userId] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(userCounts)
    .map(([userId, count]) => ({ userId, eventCount: count as number }))
    .sort((a, b) => b.eventCount - a.eventCount)
    .slice(0, 10);
}

function calculateRiskTrends(events: any[]): Array<{ date: string; riskScore: number }> {
  // Group events by date and calculate average risk score
  const dailyEvents = events.reduce((acc, event) => {
    const date = event.timestamp.toISOString().split('T')[0];
    if (!acc[date]) acc[date] = [];
    acc[date].push(event);
    return acc;
  }, {});

  return Object.entries(dailyEvents).map(([date, dayEvents]: [string, any[]]) => {
    const riskScores = dayEvents.map(e => {
      switch (e.riskLevel) {
        case 'critical': return 4;
        case 'high': return 3;
        case 'medium': return 2;
        case 'low': return 1;
        default: return 0;
      }
    });
    
    const avgRiskScore = riskScores.reduce((sum, score) => sum + score, 0) / riskScores.length;
    
    return { date, riskScore: Math.round(avgRiskScore * 100) / 100 };
  }).sort((a, b) => a.date.localeCompare(b.date));
}

export default router;