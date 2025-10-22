/**
 * Metrics collection for analytics service
 */

import { register, Counter, Histogram, Gauge } from 'prom-client';
import { logger } from '../telemetry/logger';

export class MetricsCollector {
  private static instance: MetricsCollector;

  // Counters
  private riskCalculationsTotal: Counter<string>;
  private performanceAnalysesTotal: Counter<string>;
  private cohortAnalysesTotal: Counter<string>;
  private alertsTriggeredTotal: Counter<string>;
  private alertsAcknowledgedTotal: Counter<string>;
  private alertsResolvedTotal: Counter<string>;
  private alertRulesCreatedTotal: Counter<string>;
  private notificationsSentTotal: Counter<string>;
  private errorsTotal: Counter<string>;

  // Histograms
  private riskCalculationDuration: Histogram<string>;
  private performanceAnalysisDuration: Histogram<string>;
  private cohortAnalysisDuration: Histogram<string>;
  private alertEvaluationDuration: Histogram<string>;
  private notificationDeliveryDuration: Histogram<string>;

  // Gauges
  private activeAlerts: Gauge<string>;
  private studentsAtRisk: Gauge<string>;
  private averageRiskScore: Gauge<string>;
  private systemHealthScore: Gauge<string>;
  private alertRulesActive: Gauge<string>;

  private constructor() {
    this.initializeMetrics();
  }

  public static getInstance(): MetricsCollector {
    if (!MetricsCollector.instance) {
      MetricsCollector.instance = new MetricsCollector();
    }
    return MetricsCollector.instance;
  }

  private initializeMetrics(): void {
    // Risk calculation metrics
    this.riskCalculationsTotal = new Counter({
      name: 'analytics_risk_calculations_total',
      help: 'Total number of risk calculations performed',
      labelNames: ['risk_level', 'user_type'],
      registers: [register]
    });

    this.riskCalculationDuration = new Histogram({
      name: 'analytics_risk_calculation_duration_seconds',
      help: 'Duration of risk calculations',
      labelNames: ['risk_level'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
      registers: [register]
    });

    // Performance analysis metrics
    this.performanceAnalysesTotal = new Counter({
      name: 'analytics_performance_analyses_total',
      help: 'Total number of performance analyses performed',
      labelNames: ['timeframe', 'metrics_count'],
      registers: [register]
    });

    this.performanceAnalysisDuration = new Histogram({
      name: 'analytics_performance_analysis_duration_seconds',
      help: 'Duration of performance analyses',
      labelNames: ['timeframe'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
      registers: [register]
    });

    // Cohort analysis metrics
    this.cohortAnalysesTotal = new Counter({
      name: 'analytics_cohort_analyses_total',
      help: 'Total number of cohort analyses performed',
      labelNames: ['student_count_range'],
      registers: [register]
    });

    this.cohortAnalysisDuration = new Histogram({
      name: 'analytics_cohort_analysis_duration_seconds',
      help: 'Duration of cohort analyses',
      labelNames: ['student_count_range'],
      buckets: [0.5, 1, 2, 5, 10, 30, 60],
      registers: [register]
    });

    // Alert metrics
    this.alertsTriggeredTotal = new Counter({
      name: 'analytics_alerts_triggered_total',
      help: 'Total number of alerts triggered',
      labelNames: ['type', 'severity'],
      registers: [register]
    });

    this.alertsAcknowledgedTotal = new Counter({
      name: 'analytics_alerts_acknowledged_total',
      help: 'Total number of alerts acknowledged',
      registers: [register]
    });

    this.alertsResolvedTotal = new Counter({
      name: 'analytics_alerts_resolved_total',
      help: 'Total number of alerts resolved',
      registers: [register]
    });

    this.alertRulesCreatedTotal = new Counter({
      name: 'analytics_alert_rules_created_total',
      help: 'Total number of alert rules created',
      labelNames: ['type'],
      registers: [register]
    });

    this.alertEvaluationDuration = new Histogram({
      name: 'analytics_alert_evaluation_duration_seconds',
      help: 'Duration of alert rule evaluations',
      labelNames: ['rule_type'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
      registers: [register]
    });

    // Notification metrics
    this.notificationsSentTotal = new Counter({
      name: 'analytics_notifications_sent_total',
      help: 'Total number of notifications sent',
      labelNames: ['channel', 'status'],
      registers: [register]
    });

    this.notificationDeliveryDuration = new Histogram({
      name: 'analytics_notification_delivery_duration_seconds',
      help: 'Duration of notification delivery',
      labelNames: ['channel'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
      registers: [register]
    });

    // Error metrics
    this.errorsTotal = new Counter({
      name: 'analytics_errors_total',
      help: 'Total number of errors',
      labelNames: ['operation', 'error_type'],
      registers: [register]
    });

    // Gauge metrics
    this.activeAlerts = new Gauge({
      name: 'analytics_active_alerts',
      help: 'Number of currently active alerts',
      labelNames: ['severity'],
      registers: [register]
    });

    this.studentsAtRisk = new Gauge({
      name: 'analytics_students_at_risk',
      help: 'Number of students currently at risk',
      labelNames: ['risk_level'],
      registers: [register]
    });

    this.averageRiskScore = new Gauge({
      name: 'analytics_average_risk_score',
      help: 'Average risk score across all students',
      registers: [register]
    });

    this.systemHealthScore = new Gauge({
      name: 'analytics_system_health_score',
      help: 'Overall system health score',
      registers: [register]
    });

    this.alertRulesActive = new Gauge({
      name: 'analytics_alert_rules_active',
      help: 'Number of active alert rules',
      labelNames: ['type'],
      registers: [register]
    });

    logger.info('Analytics metrics initialized');
  }

  // Recording methods
  public recordRiskCalculation(duration: number, riskLevel: string, factorCount: number): void {
    this.riskCalculationsTotal.labels(riskLevel, 'student').inc();
    this.riskCalculationDuration.labels(riskLevel).observe(duration / 1000);
  }

  public recordRiskCalculationError(): void {
    this.errorsTotal.labels('risk_calculation', 'calculation_error').inc();
  }

  public recordPerformanceAnalysis(duration: number, metricsCount: number, trendsCount: number): void {
    const metricsRange = this.getMetricsCountRange(metricsCount);
    this.performanceAnalysesTotal.labels('30d', metricsRange).inc();
    this.performanceAnalysisDuration.labels('30d').observe(duration / 1000);
  }

  public recordPerformanceAnalysisError(): void {
    this.errorsTotal.labels('performance_analysis', 'analysis_error').inc();
  }

  public recordCohortAnalysis(duration: number, studentCount: number, trendsCount: number): void {
    const studentRange = this.getStudentCountRange(studentCount);
    this.cohortAnalysesTotal.labels(studentRange).inc();
    this.cohortAnalysisDuration.labels(studentRange).observe(duration / 1000);
  }

  public recordCohortAnalysisError(): void {
    this.errorsTotal.labels('cohort_analysis', 'analysis_error').inc();
  }

  public recordAlertTriggered(type: string, severity: string): void {
    this.alertsTriggeredTotal.labels(type, severity).inc();
  }

  public recordAlertAcknowledged(): void {
    this.alertsAcknowledgedTotal.inc();
  }

  public recordAlertResolved(): void {
    this.alertsResolvedTotal.inc();
  }

  public recordAlertRuleCreated(type: string): void {
    this.alertRulesCreatedTotal.labels(type).inc();
  }

  public recordAlertEvaluation(duration: number, ruleType: string): void {
    this.alertEvaluationDuration.labels(ruleType).observe(duration / 1000);
  }

  public recordNotificationSent(channel: string, success: boolean): void {
    const status = success ? 'success' : 'failure';
    this.notificationsSentTotal.labels(channel, status).inc();
  }

  public recordNotificationDelivery(duration: number, channel: string): void {
    this.notificationDeliveryDuration.labels(channel).observe(duration / 1000);
  }

  // Gauge update methods
  public updateActiveAlerts(count: number, severity: string): void {
    this.activeAlerts.labels(severity).set(count);
  }

  public updateStudentsAtRisk(count: number, riskLevel: string): void {
    this.studentsAtRisk.labels(riskLevel).set(count);
  }

  public updateAverageRiskScore(score: number): void {
    this.averageRiskScore.set(score);
  }

  public updateSystemHealthScore(score: number): void {
    this.systemHealthScore.set(score);
  }

  public updateActiveAlertRules(count: number, type: string): void {
    this.alertRulesActive.labels(type).set(count);
  }

  // Utility methods
  private getMetricsCountRange(count: number): string {
    if (count <= 3) return 'small';
    if (count <= 6) return 'medium';
    return 'large';
  }

  private getStudentCountRange(count: number): string {
    if (count <= 10) return 'small';
    if (count <= 50) return 'medium';
    if (count <= 200) return 'large';
    return 'xlarge';
  }

  public startTimer(metric: Histogram<string>, labels?: Record<string, string>): () => void {
    const end = metric.startTimer(labels);
    return end;
  }

  public async measureAsync<T>(
    metric: Histogram<string>,
    labels: Record<string, string>,
    operation: () => Promise<T>
  ): Promise<T> {
    const end = this.startTimer(metric, labels);
    try {
      const result = await operation();
      return result;
    } finally {
      end();
    }
  }

  // Health check metrics
  public getMetricsSummary(): {
    riskCalculations: number;
    performanceAnalyses: number;
    cohortAnalyses: number;
    alertsTriggered: number;
    notificationsSent: number;
    errors: number;
  } {
    return {
      riskCalculations: (this.riskCalculationsTotal as any)._values?.size || 0,
      performanceAnalyses: (this.performanceAnalysesTotal as any)._values?.size || 0,
      cohortAnalyses: (this.cohortAnalysesTotal as any)._values?.size || 0,
      alertsTriggered: (this.alertsTriggeredTotal as any)._values?.size || 0,
      notificationsSent: (this.notificationsSentTotal as any)._values?.size || 0,
      errors: (this.errorsTotal as any)._values?.size || 0
    };
  }

  // Cleanup
  public reset(): void {
    register.clear();
    logger.info('Analytics metrics registry cleared');
  }
}