import { Pool } from 'pg';
import { 
  SecurityMetrics, 
  VulnerabilityMetrics, 
  ThreatMetrics, 
  ComplianceMetrics, 
  IncidentMetrics, 
  AccessMetrics, 
  TrainingMetrics,
  SecurityKPI,
  KPICategory,
  TrendDirection
} from '@/models/Security';
import { logger } from '@/telemetry/logger';
// import { metrics } from '@opentelemetry/api';
import pool from '@/database/connection';

// const meter = metrics.getMeter('security-dashboard', '1.0.0');

// Security metrics - commented out for now
// const securityScore = meter.createObservableGauge('security_overall_score', {
//   description: 'Overall security score (0-100)'
// });

// const vulnerabilityCount = meter.createObservableGauge('vulnerability_count_total', {
//   description: 'Total number of vulnerabilities by severity'
// });

// const threatLevel = meter.createObservableGauge('threat_level_current', {
//   description: 'Current threat level (1-4: low to critical)'
// });

// const complianceScore = meter.createObservableGauge('compliance_score_total', {
//   description: 'Overall compliance score (0-100)'
// });

export class SecurityMetricsService {
  private pool: Pool;

  constructor(dbPool: Pool = pool) {
    this.pool = dbPool;
  }

  async getCurrentMetrics(): Promise<SecurityMetrics> {
    try {
      const [
        vulnerabilities,
        threats,
        compliance,
        incidents,
        access,
        training
      ] = await Promise.all([
        this.getVulnerabilityMetrics(),
        this.getThreatMetrics(),
        this.getComplianceMetrics(),
        this.getIncidentMetrics(),
        this.getAccessMetrics(),
        this.getTrainingMetrics()
      ]);

      const metrics: SecurityMetrics = {
        id: `metrics-${Date.now()}`,
        timestamp: new Date(),
        vulnerabilities,
        threats,
        compliance,
        incidents,
        access,
        training
      };

      // Update Prometheus metrics
      this.updatePrometheusMetrics(metrics);

      logger.info('Security metrics collected successfully');
      return metrics;

    } catch (error) {
      logger.error('Failed to collect security metrics', { error });
      throw error;
    }
  }

  private async getVulnerabilityMetrics(): Promise<VulnerabilityMetrics> {
    const client = await this.pool.connect();
    
    try {
      // Get vulnerability counts by severity
      const severityQuery = `
        SELECT 
          severity,
          COUNT(*) as count
        FROM vulnerabilities 
        WHERE status NOT IN ('resolved', 'false_positive')
        GROUP BY severity
      `;
      
      const severityResult = await client.query(severityQuery);
      const severityCounts = severityResult.rows.reduce((acc, row) => {
        acc[row.severity] = parseInt(row.count);
        return acc;
      }, { critical: 0, high: 0, medium: 0, low: 0 });

      // Get resolution metrics
      const resolutionQuery = `
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved,
          COUNT(CASE WHEN status NOT IN ('resolved', 'false_positive') THEN 1 END) as pending,
          AVG(CASE 
            WHEN resolved_at IS NOT NULL AND discovered_at IS NOT NULL 
            THEN EXTRACT(EPOCH FROM (resolved_at - discovered_at))/3600 
          END) as avg_resolution_hours
        FROM vulnerabilities
        WHERE discovered_at >= CURRENT_DATE - INTERVAL '30 days'
      `;

      const resolutionResult = await client.query(resolutionQuery);
      const resolution = resolutionResult.rows[0];

      // Get trend data
      const trendQuery = `
        SELECT COUNT(*) as new_this_week
        FROM vulnerabilities
        WHERE discovered_at >= CURRENT_DATE - INTERVAL '7 days'
      `;

      const trendResult = await client.query(trendQuery);
      const newThisWeek = parseInt(trendResult.rows[0].new_this_week);

      // Calculate trend direction (simplified)
      const lastWeekQuery = `
        SELECT COUNT(*) as last_week_count
        FROM vulnerabilities
        WHERE discovered_at >= CURRENT_DATE - INTERVAL '14 days'
          AND discovered_at < CURRENT_DATE - INTERVAL '7 days'
      `;

      const lastWeekResult = await client.query(lastWeekQuery);
      const lastWeekCount = parseInt(lastWeekResult.rows[0].last_week_count);
      
      let trendDirection: 'up' | 'down' | 'stable' = 'stable';
      if (newThisWeek > lastWeekCount * 1.1) trendDirection = 'up';
      else if (newThisWeek < lastWeekCount * 0.9) trendDirection = 'down';

      return {
        total: severityCounts.critical + severityCounts.high + severityCounts.medium + severityCounts.low,
        critical: severityCounts.critical,
        high: severityCounts.high,
        medium: severityCounts.medium,
        low: severityCounts.low,
        resolved: parseInt(resolution.resolved) || 0,
        pending: parseInt(resolution.pending) || 0,
        averageResolutionTime: parseFloat(resolution.avg_resolution_hours) || 0,
        newThisWeek,
        trendDirection
      };

    } catch (error) {
      logger.error('Failed to get vulnerability metrics', { error });
      throw error;
    } finally {
      client.release();
    }
  }

  private async getThreatMetrics(): Promise<ThreatMetrics> {
    const client = await this.pool.connect();
    
    try {
      // Get active threats
      const threatsQuery = `
        SELECT 
          COUNT(*) as active_threats,
          severity
        FROM threat_intelligence 
        WHERE is_active = true
        GROUP BY severity
      `;

      const threatsResult = await client.query(threatsQuery);
      const activeThreats = threatsResult.rows.reduce((sum, row) => sum + parseInt(row.count || 0), 0);

      // Get blocked attacks from security events
      const attacksQuery = `
        SELECT COUNT(*) as blocked_attacks
        FROM security_events
        WHERE event_type = 'blocked_attack'
          AND timestamp >= CURRENT_DATE - INTERVAL '24 hours'
      `;

      const attacksResult = await client.query(attacksQuery);
      const blockedAttacks = parseInt(attacksResult.rows[0]?.blocked_attacks || 0);

      // Get suspicious activities
      const suspiciousQuery = `
        SELECT COUNT(*) as suspicious_count
        FROM security_events
        WHERE event_type = 'suspicious_activity'
          AND timestamp >= CURRENT_DATE - INTERVAL '24 hours'
      `;

      const suspiciousResult = await client.query(suspiciousQuery);
      const suspiciousActivities = parseInt(suspiciousResult.rows[0]?.suspicious_count || 0);

      // Calculate threat level
      let threatLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
      if (activeThreats > 10 || blockedAttacks > 100) threatLevel = 'critical';
      else if (activeThreats > 5 || blockedAttacks > 50) threatLevel = 'high';
      else if (activeThreats > 2 || blockedAttacks > 20) threatLevel = 'medium';

      // Get top threat types
      const topThreatsQuery = `
        SELECT type, COUNT(*) as count
        FROM threat_intelligence
        WHERE is_active = true
        GROUP BY type
        ORDER BY count DESC
        LIMIT 5
      `;

      const topThreatsResult = await client.query(topThreatsQuery);
      const topThreatTypes = topThreatsResult.rows.map(row => ({
        type: row.type,
        count: parseInt(row.count)
      }));

      return {
        activeThreats,
        blockedAttacks,
        suspiciousActivities,
        threatLevel,
        topThreatTypes,
        geographicDistribution: [] // Would be populated from threat intelligence feeds
      };

    } catch (error) {
      logger.error('Failed to get threat metrics', { error });
      throw error;
    } finally {
      client.release();
    }
  }

  private async getComplianceMetrics(): Promise<ComplianceMetrics> {
    const client = await this.pool.connect();
    
    try {
      // Get overall compliance scores
      const complianceQuery = `
        SELECT 
          framework,
          AVG(current_score) as avg_score,
          COUNT(*) as total_controls,
          COUNT(CASE WHEN current_score >= target_score THEN 1 END) as implemented,
          COUNT(CASE WHEN current_score >= target_score * 0.5 AND current_score < target_score THEN 1 END) as partial,
          COUNT(CASE WHEN current_score < target_score * 0.5 THEN 1 END) as not_implemented,
          MAX(last_assessed) as last_assessment
        FROM security_benchmarks
        GROUP BY framework
      `;

      const complianceResult = await client.query(complianceQuery);
      const frameworks = complianceResult.rows.reduce((acc, row) => {
        acc[row.framework.toLowerCase().replace(/[^a-z0-9]/g, '')] = {
          score: Math.round(parseFloat(row.avg_score) || 0),
          totalControls: parseInt(row.total_controls),
          implementedControls: parseInt(row.implemented),
          partiallyImplemented: parseInt(row.partial),
          notImplemented: parseInt(row.not_implemented),
          lastAssessment: new Date(row.last_assessment || Date.now())
        };
        return acc;
      }, {});

      // Get audit findings
      const findingsQuery = `
        SELECT 
          COUNT(CASE WHEN status = 'open' THEN 1 END) as open_findings,
          COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_findings
        FROM audit_findings
        WHERE created_at >= CURRENT_DATE - INTERVAL '90 days'
      `;

      const findingsResult = await client.query(findingsQuery);
      const findings = findingsResult.rows[0];

      // Calculate overall score
      const overallScore = Math.round(
        Object.values(frameworks).reduce((sum: number, fw: any) => sum + fw.score, 0) / 
        Math.max(Object.keys(frameworks).length, 1)
      );

      return {
        overallScore,
        nist80053: frameworks.nist80053 || this.getDefaultFramework(),
        cisControls: frameworks.ciscontrols || this.getDefaultFramework(),
        gdpr: frameworks.gdpr || this.getDefaultFramework(),
        sox: frameworks.sox || this.getDefaultFramework(),
        lastAuditDate: new Date('2024-01-01'), // Would come from audit schedule
        nextAuditDate: new Date('2024-04-01'),
        openFindings: parseInt(findings?.open_findings || 0),
        resolvedFindings: parseInt(findings?.resolved_findings || 0)
      };

    } catch (error) {
      logger.error('Failed to get compliance metrics', { error });
      throw error;
    } finally {
      client.release();
    }
  }

  private async getIncidentMetrics(): Promise<IncidentMetrics> {
    const client = await this.pool.connect();
    
    try {
      // Get incident counts and resolution times
      const incidentsQuery = `
        SELECT 
          COUNT(*) as total_incidents,
          COUNT(CASE WHEN status NOT IN ('resolved', 'closed') THEN 1 END) as open_incidents,
          COUNT(CASE WHEN status IN ('resolved', 'closed') THEN 1 END) as resolved_incidents,
          AVG(CASE 
            WHEN resolved_at IS NOT NULL AND reported_at IS NOT NULL 
            THEN EXTRACT(EPOCH FROM (resolved_at - reported_at))/3600 
          END) as avg_resolution_hours,
          type,
          severity
        FROM security_incidents
        WHERE reported_at >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY type, severity
      `;

      const incidentsResult = await client.query(incidentsQuery);
      
      let totalIncidents = 0;
      let openIncidents = 0;
      let resolvedIncidents = 0;
      let totalResolutionTime = 0;
      let resolutionCount = 0;
      const incidentsByType: Array<{ type: string; count: number }> = [];
      const incidentsBySeverity: Array<{ severity: string; count: number }> = [];

      incidentsResult.rows.forEach(row => {
        const count = parseInt(row.total_incidents);
        totalIncidents += count;
        openIncidents += parseInt(row.open_incidents);
        resolvedIncidents += parseInt(row.resolved_incidents);
        
        if (row.avg_resolution_hours) {
          totalResolutionTime += parseFloat(row.avg_resolution_hours) * count;
          resolutionCount += count;
        }

        // Aggregate by type and severity
        const existingType = incidentsByType.find(item => item.type === row.type);
        if (existingType) {
          existingType.count += count;
        } else {
          incidentsByType.push({ type: row.type, count });
        }

        const existingSeverity = incidentsBySeverity.find(item => item.severity === row.severity);
        if (existingSeverity) {
          existingSeverity.count += count;
        } else {
          incidentsBySeverity.push({ severity: row.severity, count });
        }
      });

      const averageResolutionTime = resolutionCount > 0 ? totalResolutionTime / resolutionCount : 0;

      // Calculate MTTR and MTBF (simplified)
      const mttr = averageResolutionTime;
      const mtbf = totalIncidents > 0 ? (30 * 24) / totalIncidents : 720; // 30 days in hours / incidents

      return {
        totalIncidents,
        openIncidents,
        resolvedIncidents,
        averageResolutionTime,
        incidentsByType,
        incidentsBySeverity,
        mttr,
        mtbf
      };

    } catch (error) {
      logger.error('Failed to get incident metrics', { error });
      throw error;
    } finally {
      client.release();
    }
  }

  private async getAccessMetrics(): Promise<AccessMetrics> {
    const client = await this.pool.connect();
    
    try {
      // Get user access metrics
      const accessQuery = `
        SELECT 
          COUNT(*) as total_users,
          COUNT(CASE WHEN is_active = true THEN 1 END) as active_users,
          COUNT(CASE WHEN role IN ('admin', 'teacher') THEN 1 END) as privileged_users,
          COUNT(CASE WHEN mfa_enabled = true THEN 1 END) as mfa_enabled,
          COUNT(CASE WHEN last_password_change < CURRENT_DATE - INTERVAL '90 days' THEN 1 END) as password_expiring,
          COUNT(CASE WHEN last_login < CURRENT_DATE - INTERVAL '90 days' THEN 1 END) as dormant_accounts
        FROM users
      `;

      const accessResult = await client.query(accessQuery);
      const access = accessResult.rows[0];

      // Get failed login attempts
      const failedLoginsQuery = `
        SELECT COUNT(*) as failed_logins
        FROM access_audit_logs
        WHERE action = 'login' 
          AND result = 'denied'
          AND timestamp >= CURRENT_DATE - INTERVAL '24 hours'
      `;

      const failedLoginsResult = await client.query(failedLoginsQuery);
      const failedLogins = parseInt(failedLoginsResult.rows[0]?.failed_logins || 0);

      // Get suspicious logins (simplified - multiple failures from same IP)
      const suspiciousLoginsQuery = `
        SELECT COUNT(DISTINCT ip_address) as suspicious_logins
        FROM access_audit_logs
        WHERE action = 'login' 
          AND result = 'denied'
          AND timestamp >= CURRENT_DATE - INTERVAL '24 hours'
        GROUP BY ip_address
        HAVING COUNT(*) >= 5
      `;

      const suspiciousLoginsResult = await client.query(suspiciousLoginsQuery);
      const suspiciousLogins = suspiciousLoginsResult.rows.length;

      return {
        totalUsers: parseInt(access.total_users) || 0,
        activeUsers: parseInt(access.active_users) || 0,
        privilegedUsers: parseInt(access.privileged_users) || 0,
        mfaEnabled: parseInt(access.mfa_enabled) || 0,
        failedLogins,
        suspiciousLogins,
        passwordExpiring: parseInt(access.password_expiring) || 0,
        dormantAccounts: parseInt(access.dormant_accounts) || 0
      };

    } catch (error) {
      logger.error('Failed to get access metrics', { error });
      throw error;
    } finally {
      client.release();
    }
  }

  private async getTrainingMetrics(): Promise<TrainingMetrics> {
    const client = await this.pool.connect();
    
    try {
      // Get training completion metrics
      const trainingQuery = `
        SELECT 
          COUNT(DISTINCT user_id) as total_users,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
          COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as pending,
          COUNT(CASE WHEN due_date < CURRENT_DATE AND status != 'completed' THEN 1 END) as overdue,
          AVG(CASE WHEN score IS NOT NULL THEN score END) as avg_score
        FROM security_training
        WHERE created_at >= CURRENT_DATE - INTERVAL '365 days'
      `;

      const trainingResult = await client.query(trainingQuery);
      const training = trainingResult.rows[0];

      // Get phishing test results
      const phishingQuery = `
        SELECT 
          COUNT(*) as total_tests,
          COUNT(CASE WHEN action = 'clicked' THEN 1 END) as clicked,
          COUNT(CASE WHEN action = 'reported' THEN 1 END) as reported,
          COUNT(CASE WHEN action = 'ignored' THEN 1 END) as ignored
        FROM phishing_tests
        WHERE sent_at >= CURRENT_DATE - INTERVAL '90 days'
      `;

      const phishingResult = await client.query(phishingQuery);
      const phishing = phishingResult.rows[0];

      const totalTests = parseInt(phishing.total_tests) || 0;
      const clicked = parseInt(phishing.clicked) || 0;
      const clickRate = totalTests > 0 ? (clicked / totalTests) * 100 : 0;

      return {
        totalUsers: parseInt(training.total_users) || 0,
        completedTraining: parseInt(training.completed) || 0,
        pendingTraining: parseInt(training.pending) || 0,
        overdue: parseInt(training.overdue) || 0,
        averageScore: parseFloat(training.avg_score) || 0,
        phishingTestResults: {
          totalTests,
          clicked,
          reported: parseInt(phishing.reported) || 0,
          ignored: parseInt(phishing.ignored) || 0,
          clickRate
        },
        lastTrainingDate: new Date('2024-01-15'), // Would come from training schedule
        nextTrainingDate: new Date('2024-04-15')
      };

    } catch (error) {
      logger.error('Failed to get training metrics', { error });
      throw error;
    } finally {
      client.release();
    }
  }

  private getDefaultFramework() {
    return {
      score: 0,
      totalControls: 0,
      implementedControls: 0,
      partiallyImplemented: 0,
      notImplemented: 0,
      lastAssessment: new Date()
    };
  }

  private updatePrometheusMetrics(metrics: SecurityMetrics): void {
    try {
      // Update security score (weighted average)
      const overallScore = Math.round(
        (metrics.compliance.overallScore * 0.3 +
         (100 - (metrics.vulnerabilities.critical * 10 + metrics.vulnerabilities.high * 5)) * 0.3 +
         (metrics.threats.threatLevel === 'low' ? 100 : 
          metrics.threats.threatLevel === 'medium' ? 75 :
          metrics.threats.threatLevel === 'high' ? 50 : 25) * 0.2 +
         (metrics.access.mfaEnabled / Math.max(metrics.access.totalUsers, 1) * 100) * 0.2)
      );
      
      securityScore.record(overallScore);

      // Update vulnerability counts
      vulnerabilityCount.record(metrics.vulnerabilities.critical, { severity: 'critical' });
      vulnerabilityCount.record(metrics.vulnerabilities.high, { severity: 'high' });
      vulnerabilityCount.record(metrics.vulnerabilities.medium, { severity: 'medium' });
      vulnerabilityCount.record(metrics.vulnerabilities.low, { severity: 'low' });

      // Update threat level
      const threatLevelValue = 
        metrics.threats.threatLevel === 'low' ? 1 :
        metrics.threats.threatLevel === 'medium' ? 2 :
        metrics.threats.threatLevel === 'high' ? 3 : 4;
      
      threatLevel.record(threatLevelValue);

      // Update compliance score
      complianceScore.record(metrics.compliance.overallScore);

    } catch (error) {
      logger.error('Failed to update Prometheus metrics', { error });
    }
  }

  async getSecurityKPIs(): Promise<SecurityKPI[]> {
    try {
      const metrics = await this.getCurrentMetrics();
      
      const kpis: SecurityKPI[] = [
        {
          id: 'vuln-resolution-time',
          name: 'Average Vulnerability Resolution Time',
          category: KPICategory.VULNERABILITY_MANAGEMENT,
          value: metrics.vulnerabilities.averageResolutionTime,
          target: 72, // 72 hours target
          unit: 'hours',
          trend: metrics.vulnerabilities.averageResolutionTime <= 72 ? TrendDirection.DOWN : TrendDirection.UP,
          lastUpdated: new Date(),
          description: 'Average time to resolve vulnerabilities'
        },
        {
          id: 'critical-vulns',
          name: 'Critical Vulnerabilities',
          category: KPICategory.VULNERABILITY_MANAGEMENT,
          value: metrics.vulnerabilities.critical,
          target: 0,
          unit: 'count',
          trend: metrics.vulnerabilities.trendDirection === 'down' ? TrendDirection.DOWN : 
                 metrics.vulnerabilities.trendDirection === 'up' ? TrendDirection.UP : TrendDirection.STABLE,
          lastUpdated: new Date(),
          description: 'Number of critical vulnerabilities'
        },
        {
          id: 'incident-mttr',
          name: 'Mean Time to Resolution (MTTR)',
          category: KPICategory.INCIDENT_RESPONSE,
          value: metrics.incidents.mttr,
          target: 24, // 24 hours target
          unit: 'hours',
          trend: metrics.incidents.mttr <= 24 ? TrendDirection.DOWN : TrendDirection.UP,
          lastUpdated: new Date(),
          description: 'Average time to resolve security incidents'
        },
        {
          id: 'compliance-score',
          name: 'Overall Compliance Score',
          category: KPICategory.COMPLIANCE,
          value: metrics.compliance.overallScore,
          target: 95,
          unit: 'percentage',
          trend: metrics.compliance.overallScore >= 95 ? TrendDirection.UP : TrendDirection.DOWN,
          lastUpdated: new Date(),
          description: 'Overall compliance score across all frameworks'
        },
        {
          id: 'mfa-adoption',
          name: 'MFA Adoption Rate',
          category: KPICategory.ACCESS_MANAGEMENT,
          value: Math.round((metrics.access.mfaEnabled / Math.max(metrics.access.totalUsers, 1)) * 100),
          target: 100,
          unit: 'percentage',
          trend: TrendDirection.UP,
          lastUpdated: new Date(),
          description: 'Percentage of users with MFA enabled'
        },
        {
          id: 'training-completion',
          name: 'Security Training Completion Rate',
          category: KPICategory.TRAINING,
          value: Math.round((metrics.training.completedTraining / Math.max(metrics.training.totalUsers, 1)) * 100),
          target: 95,
          unit: 'percentage',
          trend: TrendDirection.UP,
          lastUpdated: new Date(),
          description: 'Percentage of users who completed security training'
        }
      ];

      return kpis;

    } catch (error) {
      logger.error('Failed to get security KPIs', { error });
      throw error;
    }
  }

  async getHistoricalMetrics(days: number = 30): Promise<SecurityMetrics[]> {
    const client = await this.pool.connect();
    
    try {
      // Get historical metrics from stored snapshots
      const query = `
        SELECT 
          id,
          timestamp,
          metrics_data
        FROM security_metrics_snapshots
        WHERE timestamp >= CURRENT_DATE - INTERVAL '${days} days'
        ORDER BY timestamp DESC
      `;

      const result = await client.query(query);
      
      return result.rows.map(row => ({
        id: row.id,
        timestamp: new Date(row.timestamp),
        ...JSON.parse(row.metrics_data)
      }));

    } catch (error) {
      logger.error('Failed to get historical metrics', { error });
      throw error;
    } finally {
      client.release();
    }
  }

  async saveMetricsSnapshot(metrics: SecurityMetrics): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        INSERT INTO security_metrics_snapshots (id, timestamp, metrics_data)
        VALUES ($1, $2, $3)
      `;

      await client.query(query, [
        metrics.id,
        metrics.timestamp,
        JSON.stringify(metrics)
      ]);

      logger.info('Security metrics snapshot saved', { id: metrics.id });

    } catch (error) {
      logger.error('Failed to save metrics snapshot', { error });
      throw error;
    } finally {
      client.release();
    }
  }
}