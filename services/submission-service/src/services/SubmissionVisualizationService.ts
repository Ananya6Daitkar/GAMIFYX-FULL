/**
 * Real-time Submission Visualization Service for GamifyX
 */

import { EventEmitter } from 'events';
import { ProcessingStage, VisualizationType } from './SubmissionProcessingPipeline';
import { GamifyXTelemetry } from '../../../shared/telemetry';
import { GamifyXMetrics } from '../../../shared/telemetry/metrics';

export interface VisualizationUpdate {
  submissionId: string;
  userId: string;
  stageId: string;
  stageName: string;
  visualizationType: VisualizationType;
  data: any;
  timestamp: Date;
}

export interface DashboardWidget {
  id: string;
  type: WidgetType;
  title: string;
  data: any;
  config: WidgetConfig;
  lastUpdated: Date;
}

export interface WidgetConfig {
  refreshInterval: number; // milliseconds
  theme: 'cyberpunk' | 'dark' | 'light';
  size: 'small' | 'medium' | 'large';
  position: { x: number; y: number };
  animations: boolean;
  showLegend: boolean;
  showTooltips: boolean;
}

export enum WidgetType {
  PROGRESS_TRACKER = 'progress_tracker',
  CODE_METRICS = 'code_metrics',
  SECURITY_STATUS = 'security_status',
  TEST_RESULTS = 'test_results',
  PERFORMANCE_CHART = 'performance_chart',
  AI_INSIGHTS = 'ai_insights',
  SUBMISSION_QUEUE = 'submission_queue',
  REAL_TIME_LOGS = 'real_time_logs'
}

export class SubmissionVisualizationService extends EventEmitter {
  private telemetry: GamifyXTelemetry;
  private metrics: GamifyXMetrics;
  private activeSubmissions: Map<string, any> = new Map();
  private dashboardWidgets: Map<string, DashboardWidget> = new Map();
  private updateIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor(telemetry: GamifyXTelemetry, metrics: GamifyXMetrics) {
    super();
    this.telemetry = telemetry;
    this.metrics = metrics;
    this.initializeDashboardWidgets();
  }

  // Start real-time visualization for a submission
  public startVisualization(submissionId: string, userId: string): void {
    this.telemetry.traceAsync(
      'visualization.start',
      async () => {
        this.activeSubmissions.set(submissionId, {
          userId,
          startTime: new Date(),
          stages: new Map(),
          widgets: this.createSubmissionWidgets(submissionId)
        });

        this.emit('visualization:started', {
          submissionId,
          userId,
          timestamp: new Date()
        });

        // Start periodic updates
        this.startPeriodicUpdates(submissionId);
      },
      { 'submission.id': submissionId, 'user.id': userId }
    );
  }

  // Update visualization with stage progress
  public updateStageVisualization(
    submissionId: string,
    stage: ProcessingStage
  ): void {
    const submission = this.activeSubmissions.get(submissionId);
    if (!submission) return;

    const update: VisualizationUpdate = {
      submissionId,
      userId: submission.userId,
      stageId: stage.id,
      stageName: stage.name,
      visualizationType: stage.visualization.type,
      data: stage.visualization.data,
      timestamp: new Date()
    };

    // Update stage data
    submission.stages.set(stage.id, stage);

    // Update relevant widgets
    this.updateWidgetsForStage(submissionId, stage);

    // Emit update event
    this.emit('visualization:updated', update);

    // Record metrics
    this.metrics.recordRealTimeUpdate('stage_progress', 1);
  }

  // Complete visualization for a submission
  public completeVisualization(submissionId: string): void {
    const submission = this.activeSubmissions.get(submissionId);
    if (!submission) return;

    // Stop periodic updates
    this.stopPeriodicUpdates(submissionId);

    // Generate final summary
    const summary = this.generateSubmissionSummary(submissionId);

    this.emit('visualization:completed', {
      submissionId,
      userId: submission.userId,
      summary,
      timestamp: new Date()
    });

    // Clean up after delay
    setTimeout(() => {
      this.activeSubmissions.delete(submissionId);
    }, 300000); // Keep for 5 minutes after completion
  }

  // Get current visualization state
  public getVisualizationState(submissionId: string): any {
    const submission = this.activeSubmissions.get(submissionId);
    if (!submission) return null;

    return {
      submissionId,
      userId: submission.userId,
      startTime: submission.startTime,
      stages: Array.from(submission.stages.values()),
      widgets: submission.widgets,
      overallProgress: this.calculateOverallProgress(submissionId)
    };
  }

  // Get dashboard widgets for user
  public getDashboardWidgets(userId: string): DashboardWidget[] {
    return Array.from(this.dashboardWidgets.values())
      .filter(widget => this.isWidgetRelevantForUser(widget, userId));
  }

  // Create custom widget
  public createCustomWidget(
    userId: string,
    type: WidgetType,
    config: Partial<WidgetConfig>
  ): DashboardWidget {
    const widget: DashboardWidget = {
      id: `widget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      title: this.getWidgetTitle(type),
      data: {},
      config: {
        refreshInterval: 5000,
        theme: 'cyberpunk',
        size: 'medium',
        position: { x: 0, y: 0 },
        animations: true,
        showLegend: true,
        showTooltips: true,
        ...config
      },
      lastUpdated: new Date()
    };

    this.dashboardWidgets.set(widget.id, widget);
    this.startWidgetUpdates(widget);

    return widget;
  }

  // Private methods
  private initializeDashboardWidgets(): void {
    const defaultWidgets = [
      {
        type: WidgetType.SUBMISSION_QUEUE,
        title: 'Submission Queue',
        position: { x: 0, y: 0 }
      },
      {
        type: WidgetType.PROGRESS_TRACKER,
        title: 'Processing Progress',
        position: { x: 1, y: 0 }
      },
      {
        type: WidgetType.CODE_METRICS,
        title: 'Code Quality Metrics',
        position: { x: 0, y: 1 }
      },
      {
        type: WidgetType.SECURITY_STATUS,
        title: 'Security Status',
        position: { x: 1, y: 1 }
      }
    ];

    defaultWidgets.forEach(widgetDef => {
      const widget: DashboardWidget = {
        id: `default_${widgetDef.type}`,
        type: widgetDef.type,
        title: widgetDef.title,
        data: {},
        config: {
          refreshInterval: 10000,
          theme: 'cyberpunk',
          size: 'medium',
          position: widgetDef.position,
          animations: true,
          showLegend: true,
          showTooltips: true
        },
        lastUpdated: new Date()
      };

      this.dashboardWidgets.set(widget.id, widget);
      this.startWidgetUpdates(widget);
    });
  }

  private createSubmissionWidgets(submissionId: string): DashboardWidget[] {
    return [
      {
        id: `${submissionId}_progress`,
        type: WidgetType.PROGRESS_TRACKER,
        title: 'Processing Progress',
        data: { progress: 0, currentStage: 'Initializing' },
        config: {
          refreshInterval: 1000,
          theme: 'cyberpunk',
          size: 'large',
          position: { x: 0, y: 0 },
          animations: true,
          showLegend: false,
          showTooltips: true
        },
        lastUpdated: new Date()
      },
      {
        id: `${submissionId}_metrics`,
        type: WidgetType.CODE_METRICS,
        title: 'Code Analysis',
        data: {},
        config: {
          refreshInterval: 5000,
          theme: 'cyberpunk',
          size: 'medium',
          position: { x: 1, y: 0 },
          animations: true,
          showLegend: true,
          showTooltips: true
        },
        lastUpdated: new Date()
      }
    ];
  }

  private updateWidgetsForStage(submissionId: string, stage: ProcessingStage): void {
    const submission = this.activeSubmissions.get(submissionId);
    if (!submission) return;

    submission.widgets.forEach((widget: DashboardWidget) => {
      switch (widget.type) {
        case WidgetType.PROGRESS_TRACKER:
          widget.data = {
            progress: stage.progress,
            currentStage: stage.name,
            status: stage.status,
            eta: this.calculateETA(stage)
          };
          break;

        case WidgetType.CODE_METRICS:
          if (stage.name === 'Code Analysis') {
            widget.data = {
              ...widget.data,
              ...stage.visualization.data
            };
          }
          break;

        case WidgetType.SECURITY_STATUS:
          if (stage.name === 'Security Scan') {
            widget.data = {
              ...widget.data,
              ...stage.visualization.data
            };
          }
          break;

        case WidgetType.TEST_RESULTS:
          if (stage.name === 'Test Execution') {
            widget.data = {
              ...widget.data,
              ...stage.visualization.data
            };
          }
          break;
      }

      widget.lastUpdated = new Date();
    });
  }

  private startPeriodicUpdates(submissionId: string): void {
    const interval = setInterval(() => {
      const submission = this.activeSubmissions.get(submissionId);
      if (!submission) {
        clearInterval(interval);
        return;
      }

      // Update global widgets
      this.updateGlobalWidgets();

      // Emit periodic update
      this.emit('visualization:periodic_update', {
        submissionId,
        timestamp: new Date()
      });
    }, 5000);

    this.updateIntervals.set(submissionId, interval);
  }

  private stopPeriodicUpdates(submissionId: string): void {
    const interval = this.updateIntervals.get(submissionId);
    if (interval) {
      clearInterval(interval);
      this.updateIntervals.delete(submissionId);
    }
  }

  private startWidgetUpdates(widget: DashboardWidget): void {
    const updateWidget = () => {
      switch (widget.type) {
        case WidgetType.SUBMISSION_QUEUE:
          widget.data = this.getSubmissionQueueData();
          break;

        case WidgetType.REAL_TIME_LOGS:
          widget.data = this.getRecentLogs();
          break;

        default:
          // Other widgets are updated by specific events
          break;
      }

      widget.lastUpdated = new Date();
    };

    // Initial update
    updateWidget();

    // Periodic updates
    setInterval(updateWidget, widget.config.refreshInterval);
  }

  private updateGlobalWidgets(): void {
    this.dashboardWidgets.forEach(widget => {
      switch (widget.type) {
        case WidgetType.SUBMISSION_QUEUE:
          widget.data = this.getSubmissionQueueData();
          break;

        case WidgetType.REAL_TIME_LOGS:
          widget.data = this.getRecentLogs();
          break;
      }

      widget.lastUpdated = new Date();
    });
  }

  private calculateOverallProgress(submissionId: string): number {
    const submission = this.activeSubmissions.get(submissionId);
    if (!submission) return 0;

    const stages = Array.from(submission.stages.values());
    if (stages.length === 0) return 0;

    const totalProgress = stages.reduce((sum, stage) => sum + stage.progress, 0);
    return Math.round(totalProgress / stages.length);
  }

  private calculateETA(stage: ProcessingStage): number {
    if (!stage.startTime || stage.progress === 0) return 0;

    const elapsed = Date.now() - stage.startTime.getTime();
    const progressRate = stage.progress / elapsed; // progress per millisecond
    const remainingProgress = 100 - stage.progress;

    return remainingProgress / progressRate;
  }

  private generateSubmissionSummary(submissionId: string): any {
    const submission = this.activeSubmissions.get(submissionId);
    if (!submission) return null;

    const stages = Array.from(submission.stages.values());
    const totalDuration = stages.reduce((sum, stage) => sum + (stage.duration || 0), 0);

    return {
      submissionId,
      totalDuration,
      stagesCompleted: stages.filter(s => s.status === 'completed').length,
      totalStages: stages.length,
      overallProgress: this.calculateOverallProgress(submissionId),
      artifacts: stages.flatMap(s => s.artifacts),
      warnings: stages.flatMap(s => s.warnings)
    };
  }

  private getSubmissionQueueData(): any {
    return {
      totalSubmissions: this.activeSubmissions.size,
      processing: Array.from(this.activeSubmissions.values())
        .filter(s => s.stages.size > 0).length,
      queued: Array.from(this.activeSubmissions.values())
        .filter(s => s.stages.size === 0).length,
      recentSubmissions: Array.from(this.activeSubmissions.entries())
        .slice(-5)
        .map(([id, submission]) => ({
          id,
          userId: submission.userId,
          startTime: submission.startTime,
          progress: this.calculateOverallProgress(id)
        }))
    };
  }

  private getRecentLogs(): any {
    // Simulate recent log entries
    return {
      entries: [
        {
          timestamp: new Date(),
          level: 'info',
          message: 'Code analysis completed successfully',
          submissionId: 'sub_123'
        },
        {
          timestamp: new Date(Date.now() - 30000),
          level: 'warning',
          message: 'Security scan found 2 medium-severity issues',
          submissionId: 'sub_124'
        },
        {
          timestamp: new Date(Date.now() - 60000),
          level: 'info',
          message: 'Test execution completed with 95% coverage',
          submissionId: 'sub_125'
        }
      ]
    };
  }

  private isWidgetRelevantForUser(widget: DashboardWidget, userId: string): boolean {
    // For now, all widgets are relevant to all users
    // In a real implementation, this would check user permissions and preferences
    return true;
  }

  private getWidgetTitle(type: WidgetType): string {
    const titles = {
      [WidgetType.PROGRESS_TRACKER]: 'Processing Progress',
      [WidgetType.CODE_METRICS]: 'Code Quality Metrics',
      [WidgetType.SECURITY_STATUS]: 'Security Status',
      [WidgetType.TEST_RESULTS]: 'Test Results',
      [WidgetType.PERFORMANCE_CHART]: 'Performance Metrics',
      [WidgetType.AI_INSIGHTS]: 'AI Insights',
      [WidgetType.SUBMISSION_QUEUE]: 'Submission Queue',
      [WidgetType.REAL_TIME_LOGS]: 'Real-time Logs'
    };

    return titles[type] || 'Unknown Widget';
  }
}

export default SubmissionVisualizationService;