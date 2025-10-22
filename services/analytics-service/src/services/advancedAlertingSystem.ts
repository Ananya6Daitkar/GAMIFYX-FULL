/**
 * Advanced Real-time Alerting System with customizable thresholds and intelligent escalation
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
  NotificationChannel
} from '../models';

export interface AlertingSystemConfig {
  enableRealTimeProcessing: boolean;
  maxAlertsPerMinute: number;
  defaultCooldownMinutes: number;
  escalationDelayMinutes: number;
  retentionDays: number;
}

export interface AlertMetrics {
  totalAlerts: number;
  alertsByStatus: Record<AlertStatus, number>;
  alertsBySeverity: Record<AlertSeverity, number>;
  alertsByType: Record<AlertType, number>;
  averageResolutionTime: number;
  escalationRate: number;
  falsePositiveRate: number;
}

export interface AlertContext {
  userId?: string;
  cohortId?: string;
  timestamp: Date;
  metadata: Record<string, any>;
  relatedAlerts: string[];
}

export interface SmartThreshold {
  id: string;
  metric: string;
  baseThreshold: number;
  adaptiveEnabled: boolean;
  learningRate: number;
  historicalData: ThresholdDataPoint[];
  lastUpdated: Date;
}

export interface ThresholdDataPoint {
  timestamp: Date;
  value: number;
  wasAlert: boolean;
  wasFalsePositive: boolean;
}

export interface AlertCorrelation {
  primaryAlertId: string;
  relatedAlertIds: string[];
  correlationType: 'causal' | 'temporal' | 'contextual';
  confidence: number;
  description: string;
}

export interface AlertInsight {
  alertId: string;
  insights: string[];
  suggestedActions: string[];
  similarHistoricalAlerts: string[];
  predictedResolutionTime: number;
  confidence: number;
}

export class AdvancedAlertingSystem {
  private static instance: AdvancedAlertingSystem;
  private config: AlertingSystemConfig;
  private activeRules: Map<string, AlertRule> = new Map();
  private smartThresholds: Map<string, SmartThreshold> = new Map();
  private alertQueue: Alert[] = [];
  private processingInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.config = {
      enableRealTimeProcessing: true,
      maxAlertsPerMinute: 100,
      defaultCooldownMinutes: 15,
      escalationDelayMinutes: 30,
      retentionDays: 90
    };
  }

  public static getInstance(): AdvancedAlertingSystem {
    if (!AdvancedAlertingSystem.instance) {
      AdvancedAlertingSystem.instance = new AdvancedAlertingSystem();
    }
    return AdvancedAlertingSystem.instance;
  }

  /**
   * Start the advanced alerting system
   */
  public async start(): Promise<void> {
    try {
      logger.info('Starting advanced alerting system');

      // Load active alert rules
      await this.loadAlertRules();

      // Initialize smart thresholds
      await this.initializeSmartThresholds();

      // Start real-time processing
      if (this.config.enableRealTimeProcessing) {
        this.startRealTimeProcessing();
      }

      // Start maintenance tasks
      this.startMaintenanceTasks();

      logger.info('Advanced alerting system started successfully');

    } catch (error) {
      logger.error('Failed to start advanced alerting system:', error);
      throw error;
    }
  }

  /**
   * Stop the alerting system
   */
  public async stop(): Promise<void> {
    try {
      logger.info('Stopping advanced alerting system');

      if (this.processingInterval) {
        clearInterval(this.processingInterval);
        this.processingInterval = null;
      }

      // Process remaining alerts in queue
      await this.processAlertQueue();

      logger.info('Advanced alerting system stopped');

    } catch (error) {
      logger.error('Error stopping advanced alerting system:', error);
      throw error;
    }
  }

  /**
   * Create a new alert rule with smart thresholds
   */
  public async createAlertRule(rule: Omit<AlertRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<AlertRule> {
    try {
      const alertRule: AlertRule = {
        id: uuidv4(),
        ...rule,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Store in database
      await db.query(`
        INSERT INTO alert_rules (id, name, description, type, conditions, actions, is_active, cooldown_minutes, escalation_rules, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
        alertRule.id,
        alertRule.name,
        alertRule.description,
        alertRule.type,
        JSON.stringify(alertRule.conditions),
        JSON.stringify(alertRule.actions),
        alertRule.isActive,
        alertRule.cooldownMinutes,
        JSON.stringify(alertRule.escalationRules),
        alertRule.createdAt,
        alertRule.updatedAt
      ]);

      // Add to active rules if enabled
      if (alertRule.isActive) {
        this.activeRules.set(alertRule.id, alertRule);

        // Initialize smart thresholds for conditions
        await this.initializeRuleThresholds(alertRule);
      }

      logger.info(`Created alert rule: ${alertRule.name} (${alertRule.id})`);

      return alertRule;

    } catch (error) {
      logger.error('Failed to create alert rule:', error);
      throw error;
    }
  }

  /**
   * Evaluate metrics against alert rules
   */
  public async evaluateMetrics(metrics: Record<string, number>, context: AlertContext): Promise<Alert[]> {
    try {
      const triggeredAlerts: Alert[] = [];

      for (const [ruleId, rule] of this.activeRules) {
        // Check cooldown
        if (await this.isInCooldown(ruleId, context)) {
          continue;
        }

        // Evaluate conditions
        const conditionResults = await this.evaluateConditions(rule.conditions, metrics, context);
        
        if (conditionResults.triggered) {
          const alert = await this.createAlert(rule, conditionResults, context);
          triggeredAlerts.push(alert);

          // Add to processing queue
          this.alertQueue.push(alert);
        }
      }

      // Process correlations
      if (triggeredAlerts.length > 1) {
        await this.processAlertCorrelations(triggeredAlerts);
      }

      return triggeredAlerts;

    } catch (error) {
      logger.error('Failed to evaluate metrics:', error);
      throw error;
    }
  }

  /**
   * Generate AI-powered alert insights
   */
  public async generateAlertInsights(alertId: string): Promise<AlertInsight> {
    try {
      const alert = await this.getAlert(alertId);
      if (!alert) {
        throw new Error(`Alert not found: ${alertId}`);
      }

      // Analyze alert patterns
      const insights = await this.analyzeAlertPatterns(alert);
      
      // Generate suggested actions
      const suggestedActions = await this.generateSuggestedActions(alert);
      
      // Find similar historical alerts
      const similarAlerts = await this.findSimilarAlerts(alert);
      
      // Predict resolution time
      const predictedResolutionTime = await this.predictResolutionTime(alert, similarAlerts);

      const alertInsight: AlertInsight = {
        alertId,
        insights,
        suggestedActions,
        similarHistoricalAlerts: similarAlerts.map(a => a.id),
        predictedResolutionTime,
        confidence: this.calculateInsightConfidence(insights, similarAlerts)
      };

      // Store insights
      await this.storeAlertInsights(alertInsight);

      return alertInsight;

    } catch (error) {
      logger.error(`Failed to generate insights for alert ${alertId}:`, error);
      throw error;
    }
  }

  /**
   * Update alert status with intelligent routing
   */
  public async updateAlertStatus(
    alertId: string, 
    status: AlertStatus, 
    assignedTo?: string,
    notes?: string
  ): Promise<Alert> {
    try {
      const alert = await this.getAlert(alertId);
      if (!alert) {
        throw new Error(`Alert not found: ${alertId}`);
      }

      const previousStatus = alert.status;
      alert.status = status;
      alert.updatedAt = new Date();

      if (assignedTo) {
        alert.assignedTo = assignedTo;
      }

      if (status === AlertStatus.RESOLVED || status === AlertStatus.CLOSED) {
        alert.resolvedAt = new Date();
        
        // Update smart thresholds based on resolution
        await this.updateSmartThresholds(alert, true);
      }

      // Store update
      await db.query(`
        UPDATE alerts 
        SET status = $2, assigned_to = $3, resolved_at = $4, updated_at = $5
        WHERE id = $1
      `, [
        alertId,
        alert.status,
        alert.assignedTo,
        alert.resolvedAt,
        alert.updatedAt
      ]);

      // Log status change
      await this.logAlertStatusChange(alert, previousStatus, notes);

      // Send notifications for status changes
      await this.sendStatusChangeNotifications(alert, previousStatus);

      logger.info(`Alert ${alertId} status updated: ${previousStatus} -> ${status}`);

      return alert;

    } catch (error) {
      logger.error(`Failed to update alert status for ${alertId}:`, error);
      throw error;
    }
  }

  /**
   * Get comprehensive alert metrics
   */
  public async getAlertMetrics(timeframe: 'hour' | 'day' | 'week' | 'month' = 'day'): Promise<AlertMetrics> {
    try {
      const interval = this.getTimeframeInterval(timeframe);
      const startTime = new Date(Date.now() - interval);

      const metricsQuery = `
        SELECT 
          COUNT(*) as total_alerts,
          COUNT(*) FILTER (WHERE status = 'open') as open_alerts,
          COUNT(*) FILTER (WHERE status = 'acknowledged') as acknowledged_alerts,
          COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_alerts,
          COUNT(*) FILTER (WHERE status = 'resolved') as resolved_alerts,
          COUNT(*) FILTER (WHERE status = 'closed') as closed_alerts,
          COUNT(*) FILTER (WHERE severity = 'low') as low_severity,
          COUNT(*) FILTER (WHERE severity = 'medium') as medium_severity,
          COUNT(*) FILTER (WHERE severity = 'high') as high_severity,
          COUNT(*) FILTER (WHERE severity = 'critical') as critical_severity,
          AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/3600) FILTER (WHERE resolved_at IS NOT NULL) as avg_resolution_hours,
          COUNT(*) FILTER (WHERE escalation_level > 0) as escalated_alerts,
          COUNT(*) FILTER (WHERE data->>'false_positive' = 'true') as false_positives
        FROM alerts
        WHERE created_at >= $1
      `;

      const result = await db.query(metricsQuery, [startTime]);
      const row = result.rows[0];

      const totalAlerts = parseInt(row.total_alerts);

      const metrics: AlertMetrics = {
        totalAlerts,
        alertsByStatus: {
          [AlertStatus.OPEN]: parseInt(row.open_alerts),
          [AlertStatus.ACKNOWLEDGED]: parseInt(row.acknowledged_alerts),
          [AlertStatus.IN_PROGRESS]: parseInt(row.in_progress_alerts),
          [AlertStatus.RESOLVED]: parseInt(row.resolved_alerts),
          [AlertStatus.CLOSED]: parseInt(row.closed_alerts)
        },
        alertsBySeverity: {
          [AlertSeverity.LOW]: parseInt(row.low_severity),
          [AlertSeverity.MEDIUM]: parseInt(row.medium_severity),
          [AlertSeverity.HIGH]: parseInt(row.high_severity),
          [AlertSeverity.CRITICAL]: parseInt(row.critical_severity)
        },
        alertsByType: await this.getAlertsByType(startTime),
        averageResolutionTime: parseFloat(row.avg_resolution_hours || '0'),
        escalationRate: totalAlerts > 0 ? parseInt(row.escalated_alerts) / totalAlerts : 0,
        falsePositiveRate: totalAlerts > 0 ? parseInt(row.false_positives) / totalAlerts : 0
      };

      return metrics;

    } catch (error) {
      logger.error('Failed to get alert metrics:', error);
      throw error;
    }
  }

  /**
   * Optimize alert thresholds using machine learning
   */
  public async optimizeThresholds(): Promise<void> {
    try {
      logger.info('Starting threshold optimization');

      for (const [thresholdId, threshold] of this.smartThresholds) {
        if (!threshold.adaptiveEnabled || threshold.historicalData.length < 10) {
          continue;
        }

        const optimizedThreshold = await this.calculateOptimalThreshold(threshold);
        
        if (Math.abs(optimizedThreshold - threshold.baseThreshold) > threshold.baseThreshold * 0.1) {
          // Significant change detected
          threshold.baseThreshold = optimizedThreshold;
          threshold.lastUpdated = new Date();

          await this.updateThresholdInDatabase(threshold);

          logger.info(`Optimized threshold for ${threshold.metric}: ${optimizedThreshold}`);
        }
      }

      logger.info('Threshold optimization completed');

    } catch (error) {
      logger.error('Failed to optimize thresholds:', error);
      throw error;
    }
  }

  // Private helper methods
  private async loadAlertRules(): Promise<void> {
    const result = await db.query('SELECT * FROM alert_rules WHERE is_active = true');
    
    for (const row of result.rows) {
      const rule: AlertRule = {
        id: row.id,
        name: row.name,
        description: row.description,
        type: row.type,
        conditions: JSON.parse(row.conditions),
        actions: JSON.parse(row.actions),
        isActive: row.is_active,
        cooldownMinutes: row.cooldown_minutes,
        escalationRules: JSON.parse(row.escalation_rules || '[]'),
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };

      this.activeRules.set(rule.id, rule);
    }

    logger.info(`Loaded ${this.activeRules.size} active alert rules`);
  }

  private async initializeSmartThresholds(): Promise<void> {
    // Load existing smart thresholds
    const result = await db.query('SELECT * FROM smart_thresholds');
    
    for (const row of result.rows) {
      const threshold: SmartThreshold = {
        id: row.id,
        metric: row.metric,
        baseThreshold: row.base_threshold,
        adaptiveEnabled: row.adaptive_enabled,
        learningRate: row.learning_rate,
        historicalData: JSON.parse(row.historical_data || '[]'),
        lastUpdated: row.last_updated
      };

      this.smartThresholds.set(threshold.id, threshold);
    }

    logger.info(`Initialized ${this.smartThresholds.size} smart thresholds`);
  }

  private startRealTimeProcessing(): void {
    this.processingInterval = setInterval(async () => {
      try {
        await this.processAlertQueue();
        await this.processEscalations();
        await this.cleanupOldAlerts();
      } catch (error) {
        logger.error('Error in real-time processing:', error);
      }
    }, 10000); // Process every 10 seconds

    logger.info('Started real-time alert processing');
  }

  private startMaintenanceTasks(): void {
    // Optimize thresholds every hour
    setInterval(async () => {
      try {
        await this.optimizeThresholds();
      } catch (error) {
        logger.error('Error in threshold optimization:', error);
      }
    }, 60 * 60 * 1000);

    // Generate insights for unresolved alerts every 30 minutes
    setInterval(async () => {
      try {
        await this.generateInsightsForUnresolvedAlerts();
      } catch (error) {
        logger.error('Error generating insights:', error);
      }
    }, 30 * 60 * 1000);
  }

  private async processAlertQueue(): Promise<void> {
    if (this.alertQueue.length === 0) return;

    const alertsToProcess = this.alertQueue.splice(0, this.config.maxAlertsPerMinute);

    for (const alert of alertsToProcess) {
      try {
        // Send notifications
        await this.sendAlertNotifications(alert);

        // Generate initial insights
        await this.generateAlertInsights(alert.id);

        // Check for immediate escalation
        if (alert.severity === AlertSeverity.CRITICAL) {
          await this.escalateAlert(alert);
        }

      } catch (error) {
        logger.error(`Error processing alert ${alert.id}:`, error);
      }
    }
  }

  private async evaluateConditions(
    conditions: AlertCondition[],
    metrics: Record<string, number>,
    context: AlertContext
  ): Promise<{ triggered: boolean; matchedConditions: AlertCondition[] }> {
    const matchedConditions: AlertCondition[] = [];

    for (const condition of conditions) {
      const metricValue = metrics[condition.metric];
      if (metricValue === undefined) continue;

      // Get smart threshold if available
      const threshold = await this.getSmartThreshold(condition.metric, condition.threshold);

      let conditionMet = false;
      switch (condition.operator) {
        case 'gt':
          conditionMet = metricValue > threshold;
          break;
        case 'gte':
          conditionMet = metricValue >= threshold;
          break;
        case 'lt':
          conditionMet = metricValue < threshold;
          break;
        case 'lte':
          conditionMet = metricValue <= threshold;
          break;
        case 'eq':
          conditionMet = metricValue === threshold;
          break;
        case 'ne':
          conditionMet = metricValue !== threshold;
          break;
      }

      if (conditionMet) {
        matchedConditions.push(condition);
      }
    }

    return {
      triggered: matchedConditions.length > 0,
      matchedConditions
    };
  }

  private async createAlert(
    rule: AlertRule,
    conditionResults: { matchedConditions: AlertCondition[] },
    context: AlertContext
  ): Promise<Alert> {
    const alert: Alert = {
      id: uuidv4(),
      type: rule.type,
      severity: this.determineSeverity(rule, conditionResults),
      userId: context.userId,
      cohortId: context.cohortId,
      title: this.generateAlertTitle(rule, conditionResults),
      message: this.generateAlertMessage(rule, conditionResults, context),
      data: {
        ruleId: rule.id,
        matchedConditions: conditionResults.matchedConditions,
        context: context.metadata
      },
      status: AlertStatus.OPEN,
      createdAt: new Date(),
      updatedAt: new Date(),
      escalationLevel: 0,
      notificationChannels: rule.actions.map(action => action.type as NotificationChannel)
    };

    // Store in database
    await db.query(`
      INSERT INTO alerts (id, type, severity, user_id, cohort_id, title, message, data, status, created_at, updated_at, escalation_level, notification_channels)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    `, [
      alert.id,
      alert.type,
      alert.severity,
      alert.userId,
      alert.cohortId,
      alert.title,
      alert.message,
      JSON.stringify(alert.data),
      alert.status,
      alert.createdAt,
      alert.updatedAt,
      alert.escalationLevel,
      alert.notificationChannels
    ]);

    return alert;
  }

  private async getSmartThreshold(metric: string, baseThreshold: number): Promise<number> {
    const smartThreshold = Array.from(this.smartThresholds.values())
      .find(t => t.metric === metric);

    if (smartThreshold && smartThreshold.adaptiveEnabled) {
      return smartThreshold.baseThreshold;
    }

    return baseThreshold;
  }

  private determineSeverity(rule: AlertRule, conditionResults: any): AlertSeverity {
    // Logic to determine severity based on rule and conditions
    // This is simplified - in reality would be more sophisticated
    const criticalConditions = conditionResults.matchedConditions.filter(c => c.threshold > 0.9);
    
    if (criticalConditions.length > 0) return AlertSeverity.CRITICAL;
    if (conditionResults.matchedConditions.length > 2) return AlertSeverity.HIGH;
    if (conditionResults.matchedConditions.length > 1) return AlertSeverity.MEDIUM;
    return AlertSeverity.LOW;
  }

  private generateAlertTitle(rule: AlertRule, conditionResults: any): string {
    return `${rule.name} - ${conditionResults.matchedConditions.length} condition(s) triggered`;
  }

  private generateAlertMessage(rule: AlertRule, conditionResults: any, context: AlertContext): string {
    const conditions = conditionResults.matchedConditions
      .map(c => `${c.metric} ${c.operator} ${c.threshold}`)
      .join(', ');
    
    return `Alert triggered for rule "${rule.name}". Conditions: ${conditions}`;
  }

  // Additional placeholder methods for complex operations
  private async isInCooldown(ruleId: string, context: AlertContext): Promise<boolean> {
    // Check if rule is in cooldown period
    return false;
  }

  private async processAlertCorrelations(alerts: Alert[]): Promise<void> {
    // Process correlations between alerts
  }

  private async getAlert(alertId: string): Promise<Alert | null> {
    const result = await db.query('SELECT * FROM alerts WHERE id = $1', [alertId]);
    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      id: row.id,
      type: row.type,
      severity: row.severity,
      userId: row.user_id,
      cohortId: row.cohort_id,
      title: row.title,
      message: row.message,
      data: JSON.parse(row.data),
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      resolvedAt: row.resolved_at,
      assignedTo: row.assigned_to,
      escalationLevel: row.escalation_level,
      notificationChannels: row.notification_channels
    };
  }

  private async analyzeAlertPatterns(alert: Alert): Promise<string[]> {
    // AI-powered pattern analysis
    return ['Pattern analysis insights would go here'];
  }

  private async generateSuggestedActions(alert: Alert): Promise<string[]> {
    // Generate AI-powered suggested actions
    return ['Suggested actions would go here'];
  }

  private async findSimilarAlerts(alert: Alert): Promise<Alert[]> {
    // Find similar historical alerts
    return [];
  }

  private async predictResolutionTime(alert: Alert, similarAlerts: Alert[]): Promise<number> {
    // Predict resolution time based on similar alerts
    return 60; // minutes
  }

  private calculateInsightConfidence(insights: string[], similarAlerts: Alert[]): number {
    return 0.8;
  }

  private async storeAlertInsights(insight: AlertInsight): Promise<void> {
    await db.query(`
      INSERT INTO alert_insights (alert_id, insights, suggested_actions, similar_alerts, predicted_resolution_time, confidence, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      insight.alertId,
      JSON.stringify(insight.insights),
      JSON.stringify(insight.suggestedActions),
      JSON.stringify(insight.similarHistoricalAlerts),
      insight.predictedResolutionTime,
      insight.confidence,
      new Date()
    ]);
  }

  private async updateSmartThresholds(alert: Alert, wasResolved: boolean): Promise<void> {
    // Update smart thresholds based on alert outcome
  }

  private async logAlertStatusChange(alert: Alert, previousStatus: AlertStatus, notes?: string): Promise<void> {
    await db.query(`
      INSERT INTO alert_status_history (alert_id, previous_status, new_status, changed_by, notes, changed_at)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      alert.id,
      previousStatus,
      alert.status,
      alert.assignedTo,
      notes,
      new Date()
    ]);
  }

  private async sendStatusChangeNotifications(alert: Alert, previousStatus: AlertStatus): Promise<void> {
    // Send notifications for status changes
  }

  private async sendAlertNotifications(alert: Alert): Promise<void> {
    // Send alert notifications through configured channels
  }

  private async escalateAlert(alert: Alert): Promise<void> {
    // Escalate alert based on escalation rules
  }

  private async processEscalations(): Promise<void> {
    // Process pending escalations
  }

  private async cleanupOldAlerts(): Promise<void> {
    // Clean up old alerts based on retention policy
    const cutoffDate = new Date(Date.now() - this.config.retentionDays * 24 * 60 * 60 * 1000);
    
    await db.query(
      'DELETE FROM alerts WHERE created_at < $1 AND status IN ($2, $3)',
      [cutoffDate, AlertStatus.RESOLVED, AlertStatus.CLOSED]
    );
  }

  private async generateInsightsForUnresolvedAlerts(): Promise<void> {
    // Generate insights for alerts that have been open for a while
    const result = await db.query(`
      SELECT id FROM alerts 
      WHERE status IN ('open', 'acknowledged', 'in_progress') 
      AND created_at < NOW() - INTERVAL '1 hour'
      AND id NOT IN (SELECT alert_id FROM alert_insights)
    `);

    for (const row of result.rows) {
      try {
        await this.generateAlertInsights(row.id);
      } catch (error) {
        logger.error(`Failed to generate insights for alert ${row.id}:`, error);
      }
    }
  }

  private getTimeframeInterval(timeframe: string): number {
    const intervals = {
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000
    };

    return intervals[timeframe] || intervals.day;
  }

  private async getAlertsByType(startTime: Date): Promise<Record<AlertType, number>> {
    const result = await db.query(`
      SELECT type, COUNT(*) as count
      FROM alerts
      WHERE created_at >= $1
      GROUP BY type
    `, [startTime]);

    const alertsByType = {} as Record<AlertType, number>;
    
    // Initialize all types to 0
    Object.values(AlertType).forEach(type => {
      alertsByType[type] = 0;
    });

    // Fill in actual counts
    result.rows.forEach(row => {
      alertsByType[row.type as AlertType] = parseInt(row.count);
    });

    return alertsByType;
  }

  private async initializeRuleThresholds(rule: AlertRule): Promise<void> {
    // Initialize smart thresholds for rule conditions
    for (const condition of rule.conditions) {
      const thresholdId = `${rule.id}_${condition.metric}`;
      
      if (!this.smartThresholds.has(thresholdId)) {
        const smartThreshold: SmartThreshold = {
          id: thresholdId,
          metric: condition.metric,
          baseThreshold: condition.threshold,
          adaptiveEnabled: true,
          learningRate: 0.1,
          historicalData: [],
          lastUpdated: new Date()
        };

        this.smartThresholds.set(thresholdId, smartThreshold);
        await this.storeSmartThreshold(smartThreshold);
      }
    }
  }

  private async storeSmartThreshold(threshold: SmartThreshold): Promise<void> {
    await db.query(`
      INSERT INTO smart_thresholds (id, metric, base_threshold, adaptive_enabled, learning_rate, historical_data, last_updated)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) DO UPDATE SET
        base_threshold = $3,
        adaptive_enabled = $4,
        learning_rate = $5,
        historical_data = $6,
        last_updated = $7
    `, [
      threshold.id,
      threshold.metric,
      threshold.baseThreshold,
      threshold.adaptiveEnabled,
      threshold.learningRate,
      JSON.stringify(threshold.historicalData),
      threshold.lastUpdated
    ]);
  }

  private async calculateOptimalThreshold(threshold: SmartThreshold): Promise<number> {
    // Machine learning algorithm to optimize threshold
    // This is a simplified version - in reality would use more sophisticated ML
    
    const recentData = threshold.historicalData.slice(-100); // Last 100 data points
    const falsePositives = recentData.filter(d => d.wasAlert && d.wasFalsePositive);
    const truePositives = recentData.filter(d => d.wasAlert && !d.wasFalsePositive);
    
    if (falsePositives.length > truePositives.length) {
      // Too many false positives, increase threshold
      return threshold.baseThreshold * 1.1;
    } else if (truePositives.length > falsePositives.length * 2) {
      // Good ratio, might be able to lower threshold for more sensitivity
      return threshold.baseThreshold * 0.95;
    }
    
    return threshold.baseThreshold;
  }

  private async updateThresholdInDatabase(threshold: SmartThreshold): Promise<void> {
    await db.query(`
      UPDATE smart_thresholds 
      SET base_threshold = $2, last_updated = $3
      WHERE id = $1
    `, [threshold.id, threshold.baseThreshold, threshold.lastUpdated]);
  }
}