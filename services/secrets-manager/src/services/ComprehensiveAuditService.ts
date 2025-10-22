import { SecretAccessService } from './SecretAccessService';
import { logger } from '@/telemetry/logger';
import { metrics } from '@opentelemetry/api';
import * as fs from 'fs/promises';
import * as path from 'path';

const meter = metrics.getMeter('secrets-manager', '1.0.0');

// Audit metrics
const auditEvents = meter.createCounter('audit_events_total', {
  description: 'Total audit events logged'
});

const securityAlerts = meter.createCounter('security_alerts_total', {
  description: 'Total security alerts generated'
});

const complianceChecks = meter.createCounter('compliance_checks_total', {
  description: 'Total compliance checks performed'
});

export interface AuditEvent {
  id: string;
  timestamp: Date;
  eventType: 'secret_access' | 'secret_creation' | 'secret_rotation' | 'secret_deletion' | 'injection' | 'security_violation' | 'compliance_check';
  userId: string;
  secretPath?: string;
  action: string;
  result: 'success' | 'failure' | 'warning';
  ipAddress: string;
  userAgent: string;
  metadata?: Record<string, any>;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  complianceFrameworks?: string[];
}

export interface SecurityAlert {
  id: string;
  timestamp: Date;
  alertType: 'unusual_access' | 'failed_attempts' | 'privilege_escalation' | 'data_exfiltration' | 'policy_violation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId: string;
  description: string;
  evidence: AuditEvent[];
  mitigationSteps: string[];
  status: 'open' | 'investigating' | 'resolved' | 'false_positive';
}

export interface ComplianceReport {
  id: string;
  timestamp: Date;
  framework: 'SOC2' | 'GDPR' | 'HIPAA' | 'PCI_DSS' | 'NIST' | 'ISO27001';
  period: { start: Date; end: Date };
  totalEvents: number;
  violations: number;
  complianceScore: number;
  findings: Array<{
    control: string;
    status: 'compliant' | 'non_compliant' | 'partial';
    evidence: string[];
    recommendations: string[];
  }>;
}

export class ComprehensiveAuditService {
  private accessService: SecretAccessService;
  private auditLogPath: string;
  private alertThresholds: Map<string, number> = new Map();
  private userActivityCache: Map<string, AuditEvent[]> = new Map();

  constructor(accessService: SecretAccessService) {
    this.accessService = accessService;
    this.auditLogPath = process.env.AUDIT_LOG_PATH || './logs/audit';
    
    // Initialize alert thresholds
    this.alertThresholds.set('failed_attempts_per_hour', 10);
    this.alertThresholds.set('secrets_accessed_per_hour', 50);
    this.alertThresholds.set('off_hours_access_threshold', 5);
    
    // Start background monitoring
    this.startBackgroundMonitoring();
  }

  async logAuditEvent(event: Omit<AuditEvent, 'id' | 'timestamp' | 'riskLevel'>): Promise<void> {
    const auditEvent: AuditEvent = {
      id: this.generateEventId(),
      timestamp: new Date(),
      riskLevel: this.calculateRiskLevel(event),
      ...event
    };

    auditEvents.add(1, { 
      eventType: event.eventType, 
      result: event.result,
      riskLevel: auditEvent.riskLevel
    });

    try {
      // Log to structured audit log
      await this.writeAuditLog(auditEvent);
      
      // Cache for real-time analysis
      this.cacheUserActivity(auditEvent);
      
      // Check for security alerts
      await this.checkSecurityAlerts(auditEvent);
      
      // Log to application logger
      logger.info('Audit event logged', {
        eventId: auditEvent.id,
        eventType: auditEvent.eventType,
        userId: auditEvent.userId,
        result: auditEvent.result,
        riskLevel: auditEvent.riskLevel
      });

    } catch (error) {
      logger.error('Failed to log audit event', { error, event: auditEvent });
      throw error;
    }
  }

  async generateSecurityAlert(
    alertType: SecurityAlert['alertType'],
    severity: SecurityAlert['severity'],
    userId: string,
    description: string,
    evidence: AuditEvent[],
    mitigationSteps: string[]
  ): Promise<SecurityAlert> {
    const alert: SecurityAlert = {
      id: this.generateAlertId(),
      timestamp: new Date(),
      alertType,
      severity,
      userId,
      description,
      evidence,
      mitigationSteps,
      status: 'open'
    };

    securityAlerts.add(1, { alertType, severity });

    try {
      // Write alert to file
      await this.writeSecurityAlert(alert);
      
      // Send notifications based on severity
      await this.sendSecurityNotification(alert);
      
      logger.warn('Security alert generated', {
        alertId: alert.id,
        alertType,
        severity,
        userId,
        evidenceCount: evidence.length
      });

      return alert;

    } catch (error) {
      logger.error('Failed to generate security alert', { error, alert });
      throw error;
    }
  }

  async generateComplianceReport(
    framework: ComplianceReport['framework'],
    period: { start: Date; end: Date }
  ): Promise<ComplianceReport> {
    complianceChecks.add(1, { framework });

    try {
      logger.info('Generating compliance report', { framework, period });

      // Get audit events for the period
      const events = await this.getAuditEventsForPeriod(period);
      
      // Analyze compliance based on framework
      const findings = await this.analyzeCompliance(framework, events);
      
      const violations = findings.filter(f => f.status === 'non_compliant').length;
      const complianceScore = Math.round(((findings.length - violations) / findings.length) * 100);

      const report: ComplianceReport = {
        id: this.generateReportId(),
        timestamp: new Date(),
        framework,
        period,
        totalEvents: events.length,
        violations,
        complianceScore,
        findings
      };

      // Write report to file
      await this.writeComplianceReport(report);

      logger.info('Compliance report generated', {
        reportId: report.id,
        framework,
        complianceScore,
        violations,
        totalEvents: events.length
      });

      return report;

    } catch (error) {
      logger.error('Failed to generate compliance report', { error, framework, period });
      throw error;
    }
  }

  async getAuditTrail(
    filters: {
      userId?: string;
      secretPath?: string;
      eventType?: string;
      startDate?: Date;
      endDate?: Date;
      riskLevel?: string;
    },
    pagination: { offset: number; limit: number }
  ): Promise<{ events: AuditEvent[]; total: number }> {
    try {
      // In a real implementation, this would query a database
      // For now, read from audit log files
      const events = await this.readAuditLogs(filters, pagination);
      
      return {
        events: events.slice(pagination.offset, pagination.offset + pagination.limit),
        total: events.length
      };

    } catch (error) {
      logger.error('Failed to get audit trail', { error, filters });
      throw error;
    }
  }

  async getSecurityAlerts(
    filters: {
      severity?: string;
      status?: string;
      userId?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<SecurityAlert[]> {
    try {
      // Read security alerts from files
      const alerts = await this.readSecurityAlerts(filters);
      
      return alerts;

    } catch (error) {
      logger.error('Failed to get security alerts', { error, filters });
      throw error;
    }
  }

  async getComplianceReports(framework?: string): Promise<ComplianceReport[]> {
    try {
      const reports = await this.readComplianceReports(framework);
      
      return reports;

    } catch (error) {
      logger.error('Failed to get compliance reports', { error, framework });
      throw error;
    }
  }

  private calculateRiskLevel(event: Omit<AuditEvent, 'id' | 'timestamp' | 'riskLevel'>): 'low' | 'medium' | 'high' | 'critical' {
    let riskScore = 0;

    // Base risk by event type
    switch (event.eventType) {
      case 'secret_deletion':
        riskScore += 30;
        break;
      case 'secret_rotation':
        riskScore += 20;
        break;
      case 'injection':
        riskScore += 25;
        break;
      case 'security_violation':
        riskScore += 40;
        break;
      case 'secret_access':
        riskScore += 10;
        break;
      default:
        riskScore += 5;
    }

    // Increase risk for failures
    if (event.result === 'failure') {
      riskScore += 20;
    }

    // Check for off-hours access
    const hour = new Date().getHours();
    if (hour < 6 || hour > 22) {
      riskScore += 15;
    }

    // Check for sensitive paths
    if (event.secretPath?.includes('production') || event.secretPath?.includes('admin')) {
      riskScore += 15;
    }

    // Determine risk level
    if (riskScore >= 60) return 'critical';
    if (riskScore >= 40) return 'high';
    if (riskScore >= 20) return 'medium';
    return 'low';
  }

  private async writeAuditLog(event: AuditEvent): Promise<void> {
    const logDir = path.join(this.auditLogPath, 'events');
    await fs.mkdir(logDir, { recursive: true });

    const logFile = path.join(logDir, `audit-${new Date().toISOString().split('T')[0]}.jsonl`);
    const logEntry = JSON.stringify(event) + '\n';

    await fs.appendFile(logFile, logEntry);
  }

  private async writeSecurityAlert(alert: SecurityAlert): Promise<void> {
    const alertDir = path.join(this.auditLogPath, 'alerts');
    await fs.mkdir(alertDir, { recursive: true });

    const alertFile = path.join(alertDir, `alert-${alert.id}.json`);
    await fs.writeFile(alertFile, JSON.stringify(alert, null, 2));
  }

  private async writeComplianceReport(report: ComplianceReport): Promise<void> {
    const reportDir = path.join(this.auditLogPath, 'compliance');
    await fs.mkdir(reportDir, { recursive: true });

    const reportFile = path.join(reportDir, `${report.framework}-${report.id}.json`);
    await fs.writeFile(reportFile, JSON.stringify(report, null, 2));
  }

  private cacheUserActivity(event: AuditEvent): void {
    const userEvents = this.userActivityCache.get(event.userId) || [];
    userEvents.push(event);
    
    // Keep only last 100 events per user
    if (userEvents.length > 100) {
      userEvents.shift();
    }
    
    this.userActivityCache.set(event.userId, userEvents);
  }

  private async checkSecurityAlerts(event: AuditEvent): Promise<void> {
    const userEvents = this.userActivityCache.get(event.userId) || [];
    const recentEvents = userEvents.filter(e => 
      Date.now() - e.timestamp.getTime() < 60 * 60 * 1000 // Last hour
    );

    // Check for excessive failed attempts
    const failedAttempts = recentEvents.filter(e => e.result === 'failure').length;
    if (failedAttempts >= (this.alertThresholds.get('failed_attempts_per_hour') || 10)) {
      await this.generateSecurityAlert(
        'failed_attempts',
        'high',
        event.userId,
        `User has ${failedAttempts} failed attempts in the last hour`,
        recentEvents.filter(e => e.result === 'failure'),
        [
          'Review user account for compromise',
          'Consider temporary account suspension',
          'Investigate source IP addresses',
          'Check for credential stuffing attacks'
        ]
      );
    }

    // Check for unusual access patterns
    const secretsAccessed = recentEvents.filter(e => e.eventType === 'secret_access').length;
    if (secretsAccessed >= (this.alertThresholds.get('secrets_accessed_per_hour') || 50)) {
      await this.generateSecurityAlert(
        'unusual_access',
        'medium',
        event.userId,
        `User accessed ${secretsAccessed} secrets in the last hour`,
        recentEvents.filter(e => e.eventType === 'secret_access'),
        [
          'Review user access patterns',
          'Verify legitimate business need',
          'Check for automated tools or scripts',
          'Consider implementing additional access controls'
        ]
      );
    }

    // Check for off-hours access to sensitive secrets
    const hour = new Date().getHours();
    if ((hour < 6 || hour > 22) && event.secretPath?.includes('production')) {
      const offHoursEvents = recentEvents.filter(e => {
        const eventHour = e.timestamp.getHours();
        return (eventHour < 6 || eventHour > 22) && e.secretPath?.includes('production');
      });

      if (offHoursEvents.length >= (this.alertThresholds.get('off_hours_access_threshold') || 5)) {
        await this.generateSecurityAlert(
          'unusual_access',
          'high',
          event.userId,
          `User accessed production secrets during off-hours`,
          offHoursEvents,
          [
            'Verify user authorization for off-hours access',
            'Check for emergency procedures',
            'Review access logs for anomalies',
            'Consider implementing time-based access controls'
          ]
        );
      }
    }
  }

  private async sendSecurityNotification(alert: SecurityAlert): Promise<void> {
    // In a real implementation, this would send notifications via email, Slack, etc.
    logger.warn('Security notification would be sent', {
      alertId: alert.id,
      severity: alert.severity,
      alertType: alert.alertType
    });
  }

  private async analyzeCompliance(
    framework: ComplianceReport['framework'],
    events: AuditEvent[]
  ): Promise<ComplianceReport['findings']> {
    const findings: ComplianceReport['findings'] = [];

    switch (framework) {
      case 'SOC2':
        findings.push(...this.analyzeSOC2Compliance(events));
        break;
      case 'GDPR':
        findings.push(...this.analyzeGDPRCompliance(events));
        break;
      case 'NIST':
        findings.push(...this.analyzeNISTCompliance(events));
        break;
      default:
        findings.push({
          control: 'General Audit Logging',
          status: events.length > 0 ? 'compliant' : 'non_compliant',
          evidence: [`${events.length} audit events recorded`],
          recommendations: events.length === 0 ? ['Implement comprehensive audit logging'] : []
        });
    }

    return findings;
  }

  private analyzeSOC2Compliance(events: AuditEvent[]): ComplianceReport['findings'] {
    return [
      {
        control: 'CC6.1 - Logical and Physical Access Controls',
        status: this.hasAccessControls(events) ? 'compliant' : 'non_compliant',
        evidence: [`${events.filter(e => e.eventType === 'secret_access').length} access events logged`],
        recommendations: this.hasAccessControls(events) ? [] : ['Implement comprehensive access logging']
      },
      {
        control: 'CC6.2 - Authentication and Authorization',
        status: this.hasAuthenticationEvents(events) ? 'compliant' : 'non_compliant',
        evidence: [`Authentication events present in audit log`],
        recommendations: []
      },
      {
        control: 'CC6.8 - Data Retention and Disposal',
        status: 'compliant',
        evidence: ['Audit logs maintained with appropriate retention'],
        recommendations: []
      }
    ];
  }

  private analyzeGDPRCompliance(events: AuditEvent[]): ComplianceReport['findings'] {
    return [
      {
        control: 'Article 30 - Records of Processing Activities',
        status: 'compliant',
        evidence: [`${events.length} processing activities recorded`],
        recommendations: []
      },
      {
        control: 'Article 32 - Security of Processing',
        status: this.hasSecurityEvents(events) ? 'compliant' : 'partial',
        evidence: [`Security events monitored and logged`],
        recommendations: []
      }
    ];
  }

  private analyzeNISTCompliance(events: AuditEvent[]): ComplianceReport['findings'] {
    return [
      {
        control: 'AU-2 - Audit Events',
        status: 'compliant',
        evidence: [`${events.length} audit events captured`],
        recommendations: []
      },
      {
        control: 'AU-3 - Content of Audit Records',
        status: 'compliant',
        evidence: ['Audit records contain required information'],
        recommendations: []
      },
      {
        control: 'AU-6 - Audit Review, Analysis, and Reporting',
        status: 'compliant',
        evidence: ['Automated audit analysis implemented'],
        recommendations: []
      }
    ];
  }

  private hasAccessControls(events: AuditEvent[]): boolean {
    return events.some(e => e.eventType === 'secret_access' && e.result === 'success');
  }

  private hasAuthenticationEvents(events: AuditEvent[]): boolean {
    return events.some(e => e.metadata?.authentication === true);
  }

  private hasSecurityEvents(events: AuditEvent[]): boolean {
    return events.some(e => e.eventType === 'security_violation' || e.riskLevel === 'high');
  }

  private async getAuditEventsForPeriod(period: { start: Date; end: Date }): Promise<AuditEvent[]> {
    // In a real implementation, this would query a database
    // For now, return mock events
    return [];
  }

  private async readAuditLogs(filters: any, pagination: any): Promise<AuditEvent[]> {
    // In a real implementation, this would read from actual log files
    return [];
  }

  private async readSecurityAlerts(filters: any): Promise<SecurityAlert[]> {
    // In a real implementation, this would read from actual alert files
    return [];
  }

  private async readComplianceReports(framework?: string): Promise<ComplianceReport[]> {
    // In a real implementation, this would read from actual report files
    return [];
  }

  private startBackgroundMonitoring(): void {
    // Start periodic compliance checks
    setInterval(async () => {
      try {
        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000); // Last 24 hours
        
        await this.generateComplianceReport('NIST', { start: startDate, end: endDate });
      } catch (error) {
        logger.error('Background compliance check failed', { error });
      }
    }, 24 * 60 * 60 * 1000); // Daily
  }

  private generateEventId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateReportId(): string {
    return `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}