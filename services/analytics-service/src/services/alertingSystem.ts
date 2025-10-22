/**
 * Real-time alerting system for performance and risk monitoring
 */

import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/connection';
import { logger } from '../telemetry/logger';
import {
  Alert,
  AlertRule,
  AlertType,
  AlertSeverity,
  AlertStatus,
  AlertCondition,
  AlertAction,
  EscalationRule,
  NotificationChannel,
  CreateAlertRuleRequest,
  AlertQueryRequest,
  AlertsResponse
} from '../models';
import { NotificationService } from './notificationService';
import { MetricsCollector } from './metricsCollector';

export class AlertingSystem {
  private static instance: AlertingSystem;
  private notificationService: NotificationService;
  private metrics: MetricsCollector;
  private evaluationInterval: NodeJS.Timeout | null = null;
  private isRunning = false;

  private constructor() {
    this.notificationService = NotificationService.getInstance();
    this.metrics = MetricsCollector.getInstance();
  }

  public static getInstance(): AlertingSystem {
    if (!AlertingSystem.instance) {
      AlertingSystem.instance = new AlertingSystem();
    }
    return AlertingSystem.instance;
  }

  /**
   * Start the alerting system
   */
  public async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Alerting system is already running');
      return;
    }

    try {
      // Start periodic evaluation of alert rules
      this.evaluationInterval = setInterval(async () => {
        await this.evaluateAllRules();
      }, 60000); // Evaluate every minute

      // Subscribe to real-time events
      await this.subscribeToEvents();

      this.isRunning = true;
      logger.info('Alerting system started');

    } catch (error) {
      logger.error('Failed to start alerting system:', error);
      throw error;
    }
  }

  /**
   * Stop the alerting system
   */
  public async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    if (this.evaluationInterval) {
      clearInterval(this.evaluationInterval);
      this.evaluationInterval = null;
    }

    this.isRunning = false;
    logger.info('Alerting system stopped');
  }

  /**
   * Create a new alert rule
   */
  public async createAlertRule(request: CreateAlertRuleRequest): Promise<AlertRule> {
    try {
      const ruleId = uuidv4();
      const now = new Date();

      const alertRule: AlertRule = {
        id: ruleId,
        name: request.name,
        description: request.description,
        type: request.type,
        conditions: request.conditions,
        actions: request.actions,
        isActive: true,
        cooldownMinutes: request.cooldownMinutes || 60,
        escalationRules: request.escalationRules || [],
        createdAt: now,
        updatedAt: now
      };

      await db.query(`
        INSERT INTO alert_rules (id, name, description, type, conditions, actions, cooldown_minutes, escalation_rules, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        alertRule.id,
        alertRule.name,
        alertRule.description,
        alertRule.type,
        JSON.stringify(alertRule.conditions),
        JSON.stringify(alertRule.actions),
        alertRule.cooldownMinutes,
        JSON.stringify(alertRule.escalationRules),
        alertRule.createdAt,
        alertRule.updatedAt
      ]);

      logger.info(`Created alert rule: ${alertRule.name} (${alertRule.id})`);
      this.metrics.recordAlertRuleCreated(alertRule.type);

      return alertRule;

    } catch (error) {
      logger.error('Failed to create alert rule:', error);
      throw error;
    }
  }

  /**
   * Evaluate all active alert rules
   */
  private async evaluateAllRules(): Promise<void> {
    try {
      const rules = await this.getActiveAlertRules();
      
      for (const rule of rules) {
        await this.evaluateRule(rule);
      }

    } catch (error) {
      logger.error('Failed to evaluate alert rules:', error);
    }
  }

  /**
   * Evaluate a specific alert rule
   */
  private async evaluateRule(rule: AlertRule): Promise<void> {
    try {
      // Check if rule is in cooldown
      if (await this.isRuleInCooldown(rule.id)) {
        return;
      }

      // Evaluate all conditions
      const conditionResults = await Promise.all(
        rule.conditions.map(condition => this.evaluateCondition(condition))
      );

      // Check if all conditions are met (AND logic)
      const allConditionsMet = conditionResults.every(result => result.met);

      if (allConditionsMet) {
        // Create alert
        const alert = await this.createAlert(rule, conditionResults);
        
        // Execute actions
        await this.executeActions(alert, rule.actions);
        
        // Start escalation if configured
        if (rule.escalationRules.length > 0) {
          await this.scheduleEscalation(alert, rule.escalationRules);
        }

        this.metrics.recordAlertTriggered(rule.type, alert.severity);
        logger.info(`Alert triggered: ${alert.title} (${alert.id})`);
      }

    } catch (error) {
      logger.error(`Failed to evaluate rule ${rule.id}:`, error);
    }
  }

  /**
   * Evaluate a single condition
   */
  private async evaluateCondition(condition: AlertCondition): Promise<{ met: boolean; value: number; threshold: number }> {
    try {
      const value = await this.getMetricValue(condition);
      const met = this.compareValues(value, condition.operator, condition.threshold);

      return { met, value, threshold: condition.threshold };

    } catch (error) {
      logger.error(`Failed to evaluate condition for metric ${condition.metric}:`, error);
      return { met: false, value: 0, threshold: condition.threshold };
    }
  }

  /**
   * Get metric value for condition evaluation
   */
  private async getMetricValue(condition: AlertCondition): Promise<number> {
    const timeWindow = this.parseTimeWindow(condition.timeWindow);
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - timeWindow);

    switch (condition.metric) {
      case 'risk_score':
        return await this.getAverageRiskScore(startTime, endTime);
      
      case 'code_quality_trend':
        return await this.getCodeQualityTrend(startTime, endTime);
      
      case 'error_rate':
        return await this.getSystemErrorRate(startTime, endTime);
      
      case 'submission_frequency':
        return await this.getSubmissionFrequency(startTime, endTime);
      
      case 'engagement_score':
        return await this.getEngagementScore(startTime, endTime);
      
      default:
        logger.warn(`Unknown metric: ${condition.metric}`);
        return 0;
    }
  }

  /**
   * Compare values based on operator
   */
  private compareValues(value: number, operator: string, threshold: number): boolean {
    switch (operator) {
      case 'gt': return value > threshold;
      case 'gte': return value >= threshold;
      case 'lt': return value < threshold;
      case 'lte': return value <= threshold;
      case 'eq': return value === threshold;
      case 'ne': return value !== threshold;
      default: return false;
    }
  }

  /**
   * Create an alert
   */
  private async createAlert(rule: AlertRule, conditionResults: any[]): Promise<Alert> {
    const alertId = uuidv4();
    const now = new Date();

    // Determine severity based on rule type and condition values
    const severity = this.determineSeverity(rule, conditionResults);
    
    // Generate alert title and message
    const { title, message } = this.generateAlertContent(rule, conditionResults);

    const alert: Alert = {
      id: alertId,
      type: rule.type,
      severity,
      title,
      message,
      data: {
        ruleId: rule.id,
        ruleName: rule.name,
        conditions: conditionResults,
        evaluatedAt: now
      },
      status: AlertStatus.OPEN,
      createdAt: now,
      updatedAt: now,
      escalationLevel: 0,
      notificationChannels: this.extractNotificationChannels(rule.actions)
    };

    // Determine if this is a user-specific or cohort-specific alert
    if (rule.type === AlertType.HIGH_RISK_STUDENT || rule.type === AlertType.PERFORMANCE_DECLINE) {
      // For now, we'll leave userId empty - in a real implementation,
      // this would be determined from the condition evaluation
      alert.userId = undefined;
    }

    await db.query(`
      INSERT INTO alerts (id, type, severity, title, message, data, status, escalation_level, notification_channels, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `, [
      alert.id,
      alert.type,
      alert.severity,
      alert.title,
      alert.message,
      JSON.stringify(alert.data),
      alert.status,
      alert.escalationLevel,
      alert.notificationChannels,
      alert.createdAt,
      alert.updatedAt
    ]);

    return alert;
  }

  /**
   * Execute alert actions
   */
  private async executeActions(alert: Alert, actions: AlertAction[]): Promise<void> {
    for (const action of actions) {
      try {
        await this.executeAction(alert, action);
      } catch (error) {
        logger.error(`Failed to execute action ${action.type} for alert ${alert.id}:`, error);
      }
    }
  }

  /**
   * Execute a single action
   */
  private async executeAction(alert: Alert, action: AlertAction): Promise<void> {
    switch (action.type) {
      case 'notification':
        await this.notificationService.sendNotification({
          channel: NotificationChannel.IN_APP,
          recipients: [action.target],
          subject: alert.title,
          message: alert.message,
          data: alert.data
        });
        break;

      case 'email':
        await this.notificationService.sendNotification({
          channel: NotificationChannel.EMAIL,
          recipients: [action.target],
          subject: alert.title,
          message: alert.message,
          data: alert.data
        });
        break;

      case 'slack':
        await this.notificationService.sendNotification({
          channel: NotificationChannel.SLACK,
          recipients: [action.target],
          subject: alert.title,
          message: alert.message,
          data: alert.data
        });
        break;

      case 'webhook':
        await this.notificationService.sendWebhook(action.target, {
          alert,
          action,
          timestamp: new Date()
        });
        break;

      default:
        logger.warn(`Unknown action type: ${action.type}`);
    }
  }

  /**
   * Get alerts based on query parameters
   */
  public async getAlerts(query: AlertQueryRequest): Promise<AlertsResponse> {
    try {
      const {
        status,
        severity,
        type,
        userId,
        cohortId,
        startDate,
        endDate,
        limit = 50,
        offset = 0
      } = query;

      let whereClause = 'WHERE 1=1';
      const params: any[] = [];
      let paramIndex = 1;

      // Build WHERE clause
      if (status && status.length > 0) {
        whereClause += ` AND status = ANY($${paramIndex})`;
        params.push(status);
        paramIndex++;
      }

      if (severity && severity.length > 0) {
        whereClause += ` AND severity = ANY($${paramIndex})`;
        params.push(severity);
        paramIndex++;
      }

      if (type && type.length > 0) {
        whereClause += ` AND type = ANY($${paramIndex})`;
        params.push(type);
        paramIndex++;
      }

      if (userId) {
        whereClause += ` AND user_id = $${paramIndex}`;
        params.push(userId);
        paramIndex++;
      }

      if (cohortId) {
        whereClause += ` AND cohort_id = $${paramIndex}`;
        params.push(cohortId);
        paramIndex++;
      }

      if (startDate) {
        whereClause += ` AND created_at >= $${paramIndex}`;
        params.push(startDate);
        paramIndex++;
      }

      if (endDate) {
        whereClause += ` AND created_at <= $${paramIndex}`;
        params.push(endDate);
        paramIndex++;
      }

      // Get alerts
      const alertsQuery = `
        SELECT * FROM alerts
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      params.push(limit, offset);

      const alertsResult = await db.query(alertsQuery, params);

      // Get total count
      const countQuery = `SELECT COUNT(*) FROM alerts ${whereClause}`;
      const countResult = await db.query(countQuery, params.slice(0, -2)); // Remove limit and offset

      const alerts: Alert[] = alertsResult.rows.map(row => ({
        id: row.id,
        type: row.type,
        severity: row.severity,
        userId: row.user_id,
        cohortId: row.cohort_id,
        title: row.title,
        message: row.message,
        data: row.data,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        resolvedAt: row.resolved_at,
        assignedTo: row.assigned_to,
        escalationLevel: row.escalation_level,
        notificationChannels: row.notification_channels
      }));

      // Get summary
      const summary = await this.getAlertsSummary();

      return {
        alerts,
        pagination: {
          total: parseInt(countResult.rows[0].count),
          limit,
          offset,
          hasMore: offset + limit < parseInt(countResult.rows[0].count)
        },
        summary
      };

    } catch (error) {
      logger.error('Failed to get alerts:', error);
      throw error;
    }
  }

  /**
   * Acknowledge an alert
   */
  public async acknowledgeAlert(alertId: string, acknowledgedBy: string): Promise<void> {
    try {
      await db.query(`
        UPDATE alerts 
        SET status = $1, updated_at = $2
        WHERE id = $3 AND status = $4
      `, [AlertStatus.ACKNOWLEDGED, new Date(), alertId, AlertStatus.OPEN]);

      // Log the acknowledgment
      await db.query(`
        INSERT INTO alert_actions (alert_id, action_type, performed_by, notes)
        VALUES ($1, $2, $3, $4)
      `, [alertId, 'acknowledge', acknowledgedBy, 'Alert acknowledged']);

      this.metrics.recordAlertAcknowledged();
      logger.info(`Alert ${alertId} acknowledged by ${acknowledgedBy}`);

    } catch (error) {
      logger.error(`Failed to acknowledge alert ${alertId}:`, error);
      throw error;
    }
  }

  /**
   * Resolve an alert
   */
  public async resolveAlert(alertId: string, resolvedBy: string, notes?: string): Promise<void> {
    try {
      const now = new Date();

      await db.query(`
        UPDATE alerts 
        SET status = $1, resolved_at = $2, updated_at = $3
        WHERE id = $4 AND status IN ($5, $6)
      `, [AlertStatus.RESOLVED, now, now, alertId, AlertStatus.OPEN, AlertStatus.ACKNOWLEDGED]);

      // Log the resolution
      await db.query(`
        INSERT INTO alert_actions (alert_id, action_type, performed_by, notes)
        VALUES ($1, $2, $3, $4)
      `, [alertId, 'resolve', resolvedBy, notes || 'Alert resolved']);

      this.metrics.recordAlertResolved();
      logger.info(`Alert ${alertId} resolved by ${resolvedBy}`);

    } catch (error) {
      logger.error(`Failed to resolve alert ${alertId}:`, error);
      throw error;
    }
  }

  // Helper methods
  private async getActiveAlertRules(): Promise<AlertRule[]> {
    const result = await db.query('SELECT * FROM alert_rules WHERE is_active = true');
    
    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      type: row.type,
      conditions: row.conditions,
      actions: row.actions,
      isActive: row.is_active,
      cooldownMinutes: row.cooldown_minutes,
      escalationRules: row.escalation_rules || [],
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }

  private async isRuleInCooldown(ruleId: string): Promise<boolean> {
    const result = await db.query(`
      SELECT created_at FROM alerts 
      WHERE data->>'ruleId' = $1 
      ORDER BY created_at DESC 
      LIMIT 1
    `, [ruleId]);

    if (result.rows.length === 0) {
      return false;
    }

    const lastAlert = new Date(result.rows[0].created_at);
    const cooldownEnd = new Date(lastAlert.getTime() + 60 * 60 * 1000); // 1 hour cooldown
    
    return new Date() < cooldownEnd;
  }

  private parseTimeWindow(timeWindow: string): number {
    const match = timeWindow.match(/^(\d+)([mhd])$/);
    if (!match) return 60 * 60 * 1000; // Default 1 hour

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      default: return 60 * 60 * 1000;
    }
  }

  private async getAverageRiskScore(startTime: Date, endTime: Date): Promise<number> {
    const result = await db.query(`
      SELECT AVG(risk_score) as avg_risk
      FROM risk_scores
      WHERE calculated_at >= $1 AND calculated_at <= $2
    `, [startTime, endTime]);

    return parseFloat(result.rows[0]?.avg_risk || 0);
  }

  private async getCodeQualityTrend(startTime: Date, endTime: Date): Promise<number> {
    // This would calculate the trend in code quality
    // For now, return a placeholder
    return 0;
  }

  private async getSystemErrorRate(startTime: Date, endTime: Date): Promise<number> {
    // This would get system error rate from monitoring data
    // For now, return a placeholder
    return 0.02; // 2% error rate
  }

  private async getSubmissionFrequency(startTime: Date, endTime: Date): Promise<number> {
    const result = await db.query(`
      SELECT COUNT(*) as submission_count
      FROM student_performance_data
      WHERE timestamp >= $1 AND timestamp <= $2
    `, [startTime, endTime]);

    const hours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
    return parseInt(result.rows[0]?.submission_count || 0) / hours;
  }

  private async getEngagementScore(startTime: Date, endTime: Date): Promise<number> {
    // This would calculate engagement score
    // For now, return a placeholder
    return 0.75;
  }

  private determineSeverity(rule: AlertRule, conditionResults: any[]): AlertSeverity {
    // Simple severity determination based on rule type
    switch (rule.type) {
      case AlertType.HIGH_RISK_STUDENT:
        return AlertSeverity.HIGH;
      case AlertType.SYSTEM_HEALTH:
        return AlertSeverity.CRITICAL;
      case AlertType.PERFORMANCE_DECLINE:
        return AlertSeverity.MEDIUM;
      default:
        return AlertSeverity.LOW;
    }
  }

  private generateAlertContent(rule: AlertRule, conditionResults: any[]): { title: string; message: string } {
    const title = `${rule.name}`;
    const message = `Alert triggered: ${rule.description}. Conditions met: ${conditionResults.length}`;
    
    return { title, message };
  }

  private extractNotificationChannels(actions: AlertAction[]): NotificationChannel[] {
    return actions.map(action => {
      switch (action.type) {
        case 'email': return NotificationChannel.EMAIL;
        case 'slack': return NotificationChannel.SLACK;
        case 'webhook': return NotificationChannel.WEBHOOK;
        default: return NotificationChannel.IN_APP;
      }
    });
  }

  private async subscribeToEvents(): Promise<void> {
    // Subscribe to real-time events that might trigger alerts
    await db.subscribeToEvents('risk_score_updated', async (event) => {
      // Handle risk score updates
      await this.handleRiskScoreUpdate(event);
    });

    await db.subscribeToEvents('performance_data_updated', async (event) => {
      // Handle performance data updates
      await this.handlePerformanceUpdate(event);
    });
  }

  private async handleRiskScoreUpdate(event: any): Promise<void> {
    // Implementation would check if risk score triggers any alerts
  }

  private async handlePerformanceUpdate(event: any): Promise<void> {
    // Implementation would check if performance data triggers any alerts
  }

  private async scheduleEscalation(alert: Alert, escalationRules: EscalationRule[]): Promise<void> {
    // Implementation would schedule escalation actions
  }

  private async getAlertsSummary(): Promise<any> {
    const result = await db.query(`
      SELECT 
        status,
        severity,
        COUNT(*) as count
      FROM alerts
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY status, severity
    `);

    const summary = {
      total: 0,
      byStatus: {} as Record<string, number>,
      bySeverity: {} as Record<string, number>,
      recentAlerts: []
    };

    for (const row of result.rows) {
      const count = parseInt(row.count);
      summary.total += count;
      summary.byStatus[row.status] = (summary.byStatus[row.status] || 0) + count;
      summary.bySeverity[row.severity] = (summary.bySeverity[row.severity] || 0) + count;
    }

    return summary;
  }
}