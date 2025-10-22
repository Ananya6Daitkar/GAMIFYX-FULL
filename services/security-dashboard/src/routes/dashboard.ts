import { Router, Request, Response } from 'express';
import { SecurityMetricsService } from '@/services/SecurityMetricsService';
import { VulnerabilityService } from '@/services/VulnerabilityService';
import { ThreatIntelligenceService } from '@/services/ThreatIntelligenceService';
import { authenticateToken, requirePermission } from '@/middleware/auth';
import { logger } from '@/telemetry/logger';

const router = Router();

// Initialize services
const metricsService = new SecurityMetricsService();
const vulnerabilityService = new VulnerabilityService();
const threatService = new ThreatIntelligenceService();

// Get overall security dashboard metrics
router.get('/metrics',
  authenticateToken,
  requirePermission('security', 'read'),
  async (req: Request, res: Response) => {
    try {
      const metrics = await metricsService.getCurrentMetrics();
      
      res.json({
        success: true,
        data: metrics,
        correlationId: req.correlationId
      });

    } catch (error) {
      logger.error('Failed to get security metrics', { 
        error,
        userId: req.user?.id,
        correlationId: req.correlationId 
      });
      
      res.status(500).json({
        error: {
          code: 'METRICS_RETRIEVAL_FAILED',
          message: error instanceof Error ? error.message : 'Failed to retrieve security metrics',
          correlationId: req.correlationId
        }
      });
    }
  }
);

// Get security KPIs
router.get('/kpis',
  authenticateToken,
  requirePermission('security', 'read'),
  async (req: Request, res: Response) => {
    try {
      const kpis = await metricsService.getSecurityKPIs();
      
      res.json({
        success: true,
        data: { kpis },
        correlationId: req.correlationId
      });

    } catch (error) {
      logger.error('Failed to get security KPIs', { 
        error,
        userId: req.user?.id,
        correlationId: req.correlationId 
      });
      
      res.status(500).json({
        error: {
          code: 'KPIS_RETRIEVAL_FAILED',
          message: error instanceof Error ? error.message : 'Failed to retrieve security KPIs',
          correlationId: req.correlationId
        }
      });
    }
  }
);

// Get historical metrics
router.get('/metrics/history',
  authenticateToken,
  requirePermission('security', 'read'),
  async (req: Request, res: Response) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const historicalMetrics = await metricsService.getHistoricalMetrics(days);
      
      res.json({
        success: true,
        data: { metrics: historicalMetrics },
        correlationId: req.correlationId
      });

    } catch (error) {
      logger.error('Failed to get historical metrics', { 
        error,
        userId: req.user?.id,
        correlationId: req.correlationId 
      });
      
      res.status(500).json({
        error: {
          code: 'HISTORICAL_METRICS_FAILED',
          message: error instanceof Error ? error.message : 'Failed to retrieve historical metrics',
          correlationId: req.correlationId
        }
      });
    }
  }
);

// Get vulnerability dashboard
router.get('/vulnerabilities',
  authenticateToken,
  requirePermission('security', 'read'),
  async (req: Request, res: Response) => {
    try {
      const status = req.query.status as any;
      const severity = req.query.severity as any;
      const limit = parseInt(req.query.limit as string) || 100;

      const vulnerabilities = await vulnerabilityService.getVulnerabilities(status, severity, limit);
      const trends = await vulnerabilityService.getVulnerabilityTrends(30);
      
      res.json({
        success: true,
        data: { 
          vulnerabilities,
          trends
        },
        correlationId: req.correlationId
      });

    } catch (error) {
      logger.error('Failed to get vulnerability dashboard', { 
        error,
        userId: req.user?.id,
        correlationId: req.correlationId 
      });
      
      res.status(500).json({
        error: {
          code: 'VULNERABILITY_DASHBOARD_FAILED',
          message: error instanceof Error ? error.message : 'Failed to retrieve vulnerability dashboard',
          correlationId: req.correlationId
        }
      });
    }
  }
);

// Get threat intelligence dashboard
router.get('/threats',
  authenticateToken,
  requirePermission('security', 'read'),
  async (req: Request, res: Response) => {
    try {
      const type = req.query.type as any;
      const severity = req.query.severity as any;
      const limit = parseInt(req.query.limit as string) || 100;

      const threats = await threatService.getThreatIntelligence(type, severity, true, limit);
      const landscape = await threatService.getThreatLandscape();
      
      res.json({
        success: true,
        data: { 
          threats,
          landscape
        },
        correlationId: req.correlationId
      });

    } catch (error) {
      logger.error('Failed to get threat dashboard', { 
        error,
        userId: req.user?.id,
        correlationId: req.correlationId 
      });
      
      res.status(500).json({
        error: {
          code: 'THREAT_DASHBOARD_FAILED',
          message: error instanceof Error ? error.message : 'Failed to retrieve threat dashboard',
          correlationId: req.correlationId
        }
      });
    }
  }
);

// Check threat indicator
router.post('/threats/check',
  authenticateToken,
  requirePermission('security', 'read'),
  async (req: Request, res: Response) => {
    try {
      const { indicator } = req.body;

      if (!indicator) {
        return res.status(400).json({
          error: {
            code: 'MISSING_INDICATOR',
            message: 'Indicator is required',
            correlationId: req.correlationId
          }
        });
      }

      const threat = await threatService.checkIndicator(indicator);
      
      res.json({
        success: true,
        data: { 
          indicator,
          threat,
          isThreat: threat !== null
        },
        correlationId: req.correlationId
      });

    } catch (error) {
      logger.error('Failed to check threat indicator', { 
        error,
        indicator: req.body.indicator,
        userId: req.user?.id,
        correlationId: req.correlationId 
      });
      
      res.status(500).json({
        error: {
          code: 'THREAT_CHECK_FAILED',
          message: error instanceof Error ? error.message : 'Failed to check threat indicator',
          correlationId: req.correlationId
        }
      });
    }
  }
);

// Trigger vulnerability scan
router.post('/vulnerabilities/scan',
  authenticateToken,
  requirePermission('security', 'manage'),
  async (req: Request, res: Response) => {
    try {
      const { type, target, branch } = req.body;

      if (!type || !target) {
        return res.status(400).json({
          error: {
            code: 'MISSING_PARAMETERS',
            message: 'Scan type and target are required',
            correlationId: req.correlationId
          }
        });
      }

      let vulnerabilities;
      
      switch (type) {
        case 'repository':
          vulnerabilities = await vulnerabilityService.scanRepository(target, branch || 'main');
          break;
        case 'container':
          vulnerabilities = await vulnerabilityService.scanContainer(target);
          break;
        case 'dependencies':
          vulnerabilities = await vulnerabilityService.scanDependencies(target);
          break;
        default:
          return res.status(400).json({
            error: {
              code: 'INVALID_SCAN_TYPE',
              message: 'Invalid scan type. Must be repository, container, or dependencies',
              correlationId: req.correlationId
            }
          });
      }
      
      res.json({
        success: true,
        data: { 
          scanType: type,
          target,
          vulnerabilities,
          count: vulnerabilities.length
        },
        message: `${type} scan completed successfully`,
        correlationId: req.correlationId
      });

    } catch (error) {
      logger.error('Failed to trigger vulnerability scan', { 
        error,
        requestBody: req.body,
        userId: req.user?.id,
        correlationId: req.correlationId 
      });
      
      res.status(500).json({
        error: {
          code: 'VULNERABILITY_SCAN_FAILED',
          message: error instanceof Error ? error.message : 'Failed to trigger vulnerability scan',
          correlationId: req.correlationId
        }
      });
    }
  }
);

// Update vulnerability status
router.put('/vulnerabilities/:id/status',
  authenticateToken,
  requirePermission('security', 'manage'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status, assignedTo, resolutionNotes } = req.body;

      if (!status) {
        return res.status(400).json({
          error: {
            code: 'MISSING_STATUS',
            message: 'Status is required',
            correlationId: req.correlationId
          }
        });
      }

      await vulnerabilityService.updateVulnerabilityStatus(
        id, 
        status, 
        assignedTo, 
        resolutionNotes
      );
      
      res.json({
        success: true,
        message: 'Vulnerability status updated successfully',
        correlationId: req.correlationId
      });

    } catch (error) {
      logger.error('Failed to update vulnerability status', { 
        error,
        vulnerabilityId: req.params.id,
        requestBody: req.body,
        userId: req.user?.id,
        correlationId: req.correlationId 
      });
      
      res.status(500).json({
        error: {
          code: 'VULNERABILITY_UPDATE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to update vulnerability status',
          correlationId: req.correlationId
        }
      });
    }
  }
);

// Generate SBOM
router.post('/sbom/generate',
  authenticateToken,
  requirePermission('security', 'manage'),
  async (req: Request, res: Response) => {
    try {
      const { component, version } = req.body;

      if (!component || !version) {
        return res.status(400).json({
          error: {
            code: 'MISSING_PARAMETERS',
            message: 'Component and version are required',
            correlationId: req.correlationId
          }
        });
      }

      const sbom = await vulnerabilityService.generateSBOM(component, version);
      
      res.json({
        success: true,
        data: { sbom },
        message: 'SBOM generated successfully',
        correlationId: req.correlationId
      });

    } catch (error) {
      logger.error('Failed to generate SBOM', { 
        error,
        requestBody: req.body,
        userId: req.user?.id,
        correlationId: req.correlationId 
      });
      
      res.status(500).json({
        error: {
          code: 'SBOM_GENERATION_FAILED',
          message: error instanceof Error ? error.message : 'Failed to generate SBOM',
          correlationId: req.correlationId
        }
      });
    }
  }
);

// Update threat intelligence
router.post('/threats/update',
  authenticateToken,
  requirePermission('security', 'manage'),
  async (req: Request, res: Response) => {
    try {
      await threatService.updateThreatIntelligence();
      
      res.json({
        success: true,
        message: 'Threat intelligence updated successfully',
        correlationId: req.correlationId
      });

    } catch (error) {
      logger.error('Failed to update threat intelligence', { 
        error,
        userId: req.user?.id,
        correlationId: req.correlationId 
      });
      
      res.status(500).json({
        error: {
          code: 'THREAT_INTEL_UPDATE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to update threat intelligence',
          correlationId: req.correlationId
        }
      });
    }
  }
);

// Get executive summary
router.get('/executive-summary',
  authenticateToken,
  requirePermission('security', 'read'),
  async (req: Request, res: Response) => {
    try {
      const metrics = await metricsService.getCurrentMetrics();
      const kpis = await metricsService.getSecurityKPIs();
      
      // Calculate overall security posture score
      const overallScore = Math.round(
        (metrics.compliance.overallScore * 0.3 +
         (100 - (metrics.vulnerabilities.critical * 10 + metrics.vulnerabilities.high * 5)) * 0.3 +
         (metrics.threats.threatLevel === 'low' ? 100 : 
          metrics.threats.threatLevel === 'medium' ? 75 :
          metrics.threats.threatLevel === 'high' ? 50 : 25) * 0.2 +
         (metrics.access.mfaEnabled / Math.max(metrics.access.totalUsers, 1) * 100) * 0.2)
      );

      const summary = {
        overallSecurityScore: overallScore,
        securityPosture: overallScore >= 90 ? 'Excellent' :
                        overallScore >= 80 ? 'Good' :
                        overallScore >= 70 ? 'Fair' : 'Needs Improvement',
        keyMetrics: {
          criticalVulnerabilities: metrics.vulnerabilities.critical,
          highVulnerabilities: metrics.vulnerabilities.high,
          activeThreats: metrics.threats.activeThreats,
          threatLevel: metrics.threats.threatLevel,
          complianceScore: metrics.compliance.overallScore,
          mfaAdoption: Math.round((metrics.access.mfaEnabled / Math.max(metrics.access.totalUsers, 1)) * 100),
          openIncidents: metrics.incidents.openIncidents,
          trainingCompletion: Math.round((metrics.training.completedTraining / Math.max(metrics.training.totalUsers, 1)) * 100)
        },
        topRisks: [
          ...(metrics.vulnerabilities.critical > 0 ? [`${metrics.vulnerabilities.critical} critical vulnerabilities require immediate attention`] : []),
          ...(metrics.threats.threatLevel === 'high' || metrics.threats.threatLevel === 'critical' ? [`Threat level is ${metrics.threats.threatLevel}`] : []),
          ...(metrics.incidents.openIncidents > 5 ? [`${metrics.incidents.openIncidents} open security incidents`] : []),
          ...(metrics.compliance.overallScore < 80 ? [`Compliance score below target (${metrics.compliance.overallScore}%)`] : [])
        ].slice(0, 5),
        recommendations: [
          ...(metrics.vulnerabilities.critical > 0 ? ['Prioritize resolution of critical vulnerabilities'] : []),
          ...(metrics.access.mfaEnabled / Math.max(metrics.access.totalUsers, 1) < 0.9 ? ['Increase MFA adoption rate'] : []),
          ...(metrics.training.completedTraining / Math.max(metrics.training.totalUsers, 1) < 0.9 ? ['Improve security training completion rates'] : []),
          ...(metrics.compliance.overallScore < 90 ? ['Address compliance gaps'] : [])
        ].slice(0, 5),
        kpis: kpis.slice(0, 6), // Top 6 KPIs
        lastUpdated: new Date()
      };
      
      res.json({
        success: true,
        data: summary,
        correlationId: req.correlationId
      });

    } catch (error) {
      logger.error('Failed to get executive summary', { 
        error,
        userId: req.user?.id,
        correlationId: req.correlationId 
      });
      
      res.status(500).json({
        error: {
          code: 'EXECUTIVE_SUMMARY_FAILED',
          message: error instanceof Error ? error.message : 'Failed to retrieve executive summary',
          correlationId: req.correlationId
        }
      });
    }
  }
);

export default router;