import { logger } from '../telemetry/logger';
import { db } from '../database/connection';
import { ProgressAnalysisEngine, ProgressAnalysisResult } from './progressAnalysisEngine';
import { AutomatedPRCountingService } from './automatedPRCountingService';
import { StudentMappingService } from './studentMappingService';

export interface MonitoringJob {
  id: string;
  type: 'progress_analysis' | 'pr_sync' | 'alert_check' | 'health_check';
  teacherId?: string;
  studentId?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt?: Date;
  completedAt?: Date;
  duration?: number;
  result?: any;
  error?: string;
}

export interface MonitoringSchedule {
  id: string;
  name: string;
  type: 'progress_analysis' | 'pr_sync' | 'alert_check' | 'health_check';
  cronExpression: string;
  isActive: boolean;
  teacherId?: string;
  lastRun?: Date;
  nextRun?: Date;
  config?: Record<string, any>;
}

export interface MonitoringAlert {
  id: string;
  type: 'student_at_risk' | 'no_activity' | 'declining_performance' | 'system_issue';
  severity: 'low' | 'medium' | 'high' | 'critical';
  studentId?: string;
  teacherId?: string;
  message: string;
  data: Record<string, any>;
  isResolved: boolean;
  createdAt: Date;
  resolvedAt?: Date;
}

export interface SystemHealthStatus {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  components: {
    database: 'healthy' | 'degraded' | 'unhealthy';
    redis: 'healthy' | 'degraded' | 'unhealthy';
    github: 'healthy' | 'degraded' | 'unhealthy';
    analysis: 'healthy' | 'degraded' | 'unhealthy';
  };
  metrics: {
    activeJobs: number;
    queuedJobs: number;
    failedJobs: number;
    avgProcessingTime: number;
    lastHealthCheck: Date;
  };
}

/**
 * Automated Monitoring Service
 * Provides background monitoring, scheduled tasks, and real-time alerts
 */
export class AutomatedMonitoringService {
  private static instance: AutomatedMonitoringService;
  private progressEngine: ProgressAnalysisEngine;
  private prCountingService: AutomatedPRCountingService;
  private mappingService: StudentMappingService;
  
  private runningJobs: Map<string, MonitoringJob> = new Map();
  private schedules: Map<string, NodeJS.Timeout> = new Map();
  private isRunning = false;
  private healthCheckInterval?: NodeJS.Timeout;

  private constructor() {
    this.progressEngine = ProgressAnalysisEngine.getInstance();
    this.prCountingService = AutomatedPRCountingService.getInstance();
    this.mappingService = StudentMappingService.getInstance();
  }

  public static getInstance(): AutomatedMonitoringService {
    if (!AutomatedMonitoringService.instance) {
      AutomatedMonitoringService.instance = new AutomatedMonitoringService();
    }
    return AutomatedMonitoringService.instance;
  }

  /**
   * Start the monitoring service
   */
  public async start(): Promise<void> {
    try {
      if (this.isRunning) {
        logger.warn('Monitoring service is already running');
        return;
      }

      // Initialize database tables
      await this.initializeTables();

      // Load and start schedules
      await this.loadSchedules();

      // Start health check
      this.startHealthCheck();

      // Start webhook processing
      await this.startWebhookProcessing();

      this.isRunning = true;
      logger.info('Automated monitoring service started successfully');

    } catch (error) {
      logger.error('Failed to start monitoring service:', error);
      throw error;
    }
  }

  /**
   * Stop the monitoring service
   */
  public async stop(): Promise<void> {
    try {
      this.isRunning = false;

      // Stop all schedules
      for (const [scheduleId, timeout] of this.schedules) {
        clearInterval(timeout);
        logger.debug(`Stopped schedule: ${scheduleId}`);
      }
      this.schedules.clear();

      // Stop health check
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
        this.healthCheckInterval = undefined;
      }

      // Wait for running jobs to complete (with timeout)
      await this.waitForJobsToComplete(30000); // 30 second timeout

      logger.info('Automated monitoring service stopped');

    } catch (error) {
      logger.error('Error stopping monitoring service:', error);
      throw error;
    }
  }

  /**
   * Schedule progress analysis for a teacher's class
   */
  public async scheduleProgressAnalysis(
    teacherId: string, 
    intervalMinutes: number = 60
  ): Promise<string> {
    try {
      const scheduleId = `progress_analysis_${teacherId}`;
      
      // Stop existing schedule if any
      await this.stopSchedule(scheduleId);

      // Create new schedule
      const intervalMs = intervalMinutes * 60 * 1000;
      const timeout = setInterval(async () => {
        await this.runProgressAnalysisJob(teacherId);
      }, intervalMs);

      this.schedules.set(scheduleId, timeout);

      // Store in database
      await this.storeSchedule({
        id: scheduleId,
        name: `Progress Analysis - Teacher ${teacherId}`,
        type: 'progress_analysis',
        cronExpression: `*/${intervalMinutes} * * * *`,
        isActive: true,
        teacherId,
        config: { intervalMinutes }
      });

      // Run initial analysis
      await this.runProgressAnalysisJob(teacherId);

      logger.info(`Scheduled progress analysis for teacher ${teacherId} every ${intervalMinutes} minutes`);
      return scheduleId;

    } catch (error) {
      logger.error(`Failed to schedule progress analysis for teacher ${teacherId}:`, error);
      throw error;
    }
  }

  /**
   * Run progress analysis job for a teacher's class
   */
  private async runProgressAnalysisJob(teacherId: string): Promise<MonitoringJob> {
    const jobId = `progress_analysis_${teacherId}_${Date.now()}`;
    
    const job: MonitoringJob = {
      id: jobId,
      type: 'progress_analysis',
      teacherId,
      status: 'pending'
    };

    try {
      job.status = 'running';
      job.startedAt = new Date();
      this.runningJobs.set(jobId, job);

      logger.info(`Starting progress analysis job ${jobId} for teacher ${teacherId}`);

      // Get all students for the teacher
      const mappings = await this.mappingService.getTeacherMappings(teacherId);
      const studentIds = mappings.map(m => m.studentId);

      if (studentIds.length === 0) {
        job.status = 'completed';
        job.result = { message: 'No students found', studentsAnalyzed: 0 };
        job.completedAt = new Date();
        job.duration = job.completedAt.getTime() - job.startedAt!.getTime();
        return job;
      }

      // Analyze progress for each student
      const analyses: ProgressAnalysisResult[] = [];
      const alerts: MonitoringAlert[] = [];

      for (const studentId of studentIds) {
        try {
          const analysis = await this.progressEngine.analyzeStudentProgress(studentId, teacherId);
          if (analysis) {
            analyses.push(analysis);

            // Check for alerts
            const studentAlerts = await this.checkForAlerts(analysis, teacherId);
            alerts.push(...studentAlerts);
          }
        } catch (error) {
          logger.error(`Failed to analyze student ${studentId}:`, error);
        }
      }

      // Store alerts
      for (const alert of alerts) {
        await this.storeAlert(alert);
      }

      job.status = 'completed';
      job.result = {
        studentsAnalyzed: analyses.length,
        alertsGenerated: alerts.length,
        analyses: analyses.map(a => ({
          studentId: a.studentId,
          progressScore: a.progressScore.overall,
          riskLevel: a.riskLevel,
          trend: a.trend.direction
        }))
      };

      logger.info(`Completed progress analysis job ${jobId}: analyzed ${analyses.length} students, generated ${alerts.length} alerts`);

    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Progress analysis job ${jobId} failed:`, error);
    } finally {
      job.completedAt = new Date();
      if (job.startedAt) {
        job.duration = job.completedAt.getTime() - job.startedAt.getTime();
      }
      this.runningJobs.delete(jobId);
    }

    return job;
  }

  /**
   * Check for alerts based on progress analysis
   */
  private async checkForAlerts(
    analysis: ProgressAnalysisResult, 
    teacherId: string
  ): Promise<MonitoringAlert[]> {
    const alerts: MonitoringAlert[] = [];

    try {
      // Critical risk alert
      if (analysis.riskLevel === 'critical') {
        alerts.push({
          id: `critical_risk_${analysis.studentId}_${Date.now()}`,
          type: 'student_at_risk',
          severity: 'critical',
          studentId: analysis.studentId,
          teacherId,
          message: `Student ${analysis.githubUsername} is at critical risk - immediate intervention needed`,
          data: {
            progressScore: analysis.progressScore.overall,
            riskLevel: analysis.riskLevel,
            daysSinceLastPR: analysis.prActivity.daysSinceLastPR,
            totalPRs: analysis.prActivity.totalPRs
          },
          isResolved: false,
          createdAt: new Date()
        });
      }

      // No activity alert
      if (analysis.prActivity.totalPRs === 0 || 
          (analysis.prActivity.daysSinceLastPR && analysis.prActivity.daysSinceLastPR > 14)) {
        alerts.push({
          id: `no_activity_${analysis.studentId}_${Date.now()}`,
          type: 'no_activity',
          severity: analysis.prActivity.totalPRs === 0 ? 'high' : 'medium',
          studentId: analysis.studentId,
          teacherId,
          message: analysis.prActivity.totalPRs === 0 
            ? `Student ${analysis.githubUsername} has no GitHub activity`
            : `Student ${analysis.githubUsername} has been inactive for ${analysis.prActivity.daysSinceLastPR} days`,
          data: {
            totalPRs: analysis.prActivity.totalPRs,
            daysSinceLastPR: analysis.prActivity.daysSinceLastPR,
            lastPRDate: analysis.prActivity.lastPRDate
          },
          isResolved: false,
          createdAt: new Date()
        });
      }

      // Declining performance alert
      if (analysis.trend.direction === 'declining' && analysis.trend.percentage > 50) {
        alerts.push({
          id: `declining_${analysis.studentId}_${Date.now()}`,
          type: 'declining_performance',
          severity: analysis.trend.percentage > 75 ? 'high' : 'medium',
          studentId: analysis.studentId,
          teacherId,
          message: `Student ${analysis.githubUsername} shows declining performance (${analysis.trend.percentage}% decrease)`,
          data: {
            trendDirection: analysis.trend.direction,
            trendPercentage: analysis.trend.percentage,
            progressScore: analysis.progressScore.overall
          },
          isResolved: false,
          createdAt: new Date()
        });
      }

    } catch (error) {
      logger.error(`Failed to check alerts for student ${analysis.studentId}:`, error);
    }

    return alerts;
  }

  /**
   * Schedule periodic GitHub PR synchronization
   */
  public async schedulePRSync(teacherId: string, intervalMinutes: number = 30): Promise<string> {
    try {
      const scheduleId = `pr_sync_${teacherId}`;
      
      // Stop existing schedule if any
      await this.stopSchedule(scheduleId);

      // Create new schedule
      const intervalMs = intervalMinutes * 60 * 1000;
      const timeout = setInterval(async () => {
        await this.runPRSyncJob(teacherId);
      }, intervalMs);

      this.schedules.set(scheduleId, timeout);

      // Store in database
      await this.storeSchedule({
        id: scheduleId,
        name: `PR Sync - Teacher ${teacherId}`,
        type: 'pr_sync',
        cronExpression: `*/${intervalMinutes} * * * *`,
        isActive: true,
        teacherId,
        config: { intervalMinutes }
      });

      logger.info(`Scheduled PR sync for teacher ${teacherId} every ${intervalMinutes} minutes`);
      return scheduleId;

    } catch (error) {
      logger.error(`Failed to schedule PR sync for teacher ${teacherId}:`, error);
      throw error;
    }
  }

  /**
   * Run PR synchronization job
   */
  private async runPRSyncJob(teacherId: string): Promise<MonitoringJob> {
    const jobId = `pr_sync_${teacherId}_${Date.now()}`;
    
    const job: MonitoringJob = {
      id: jobId,
      type: 'pr_sync',
      teacherId,
      status: 'pending'
    };

    try {
      job.status = 'running';
      job.startedAt = new Date();
      this.runningJobs.set(jobId, job);

      logger.debug(`Starting PR sync job ${jobId} for teacher ${teacherId}`);

      // Run PR counting job
      const countingJob = await this.prCountingService.runCountingJob(teacherId);
      
      job.status = countingJob.status === 'completed' ? 'completed' : 'failed';
      job.result = {
        studentsProcessed: countingJob.studentsProcessed,
        prsFound: countingJob.prsFound,
        errors: countingJob.errors
      };

      if (countingJob.status === 'failed') {
        job.error = countingJob.errors.join('; ');
      }

    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`PR sync job ${jobId} failed:`, error);
    } finally {
      job.completedAt = new Date();
      if (job.startedAt) {
        job.duration = job.completedAt.getTime() - job.startedAt.getTime();
      }
      this.runningJobs.delete(jobId);
    }

    return job;
  }

  /**
   * Start health check monitoring
   */
  private startHealthCheck(): void {
    this.healthCheckInterval = setInterval(async () => {
      await this.runHealthCheck();
    }, 60000); // Every minute

    logger.info('Started health check monitoring');
  }

  /**
   * Run system health check
   */
  private async runHealthCheck(): Promise<SystemHealthStatus> {
    try {
      const healthStatus: SystemHealthStatus = {
        overall: 'healthy',
        components: {
          database: 'healthy',
          redis: 'healthy',
          github: 'healthy',
          analysis: 'healthy'
        },
        metrics: {
          activeJobs: this.runningJobs.size,
          queuedJobs: 0, // Would need job queue implementation
          failedJobs: 0, // Would need to track failed jobs
          avgProcessingTime: 0, // Would need to calculate from job history
          lastHealthCheck: new Date()
        }
      };

      // Check database health
      try {
        const dbHealth = await db.healthCheck();
        healthStatus.components.database = dbHealth.postgres ? 'healthy' : 'unhealthy';
        healthStatus.components.redis = dbHealth.redis ? 'healthy' : 'unhealthy';
      } catch (error) {
        healthStatus.components.database = 'unhealthy';
        healthStatus.components.redis = 'unhealthy';
      }

      // Check GitHub API health (sample check)
      try {
        // This would need a test GitHub token or public API call
        healthStatus.components.github = 'healthy';
      } catch (error) {
        healthStatus.components.github = 'degraded';
      }

      // Check analysis engine health
      healthStatus.components.analysis = this.runningJobs.size < 10 ? 'healthy' : 'degraded';

      // Determine overall health
      const componentStatuses = Object.values(healthStatus.components);
      if (componentStatuses.includes('unhealthy')) {
        healthStatus.overall = 'unhealthy';
      } else if (componentStatuses.includes('degraded')) {
        healthStatus.overall = 'degraded';
      }

      // Store health status
      await this.storeHealthStatus(healthStatus);

      return healthStatus;

    } catch (error) {
      logger.error('Health check failed:', error);
      return {
        overall: 'unhealthy',
        components: {
          database: 'unhealthy',
          redis: 'unhealthy',
          github: 'unhealthy',
          analysis: 'unhealthy'
        },
        metrics: {
          activeJobs: 0,
          queuedJobs: 0,
          failedJobs: 0,
          avgProcessingTime: 0,
          lastHealthCheck: new Date()
        }
      };
    }
  }

  /**
   * Start webhook processing
   */
  private async startWebhookProcessing(): Promise<void> {
    try {
      // Subscribe to GitHub webhook events
      await db.subscribeToEvents('github_webhooks', async (event) => {
        await this.processWebhookEvent(event);
      });

      logger.info('Started webhook processing');
    } catch (error) {
      logger.error('Failed to start webhook processing:', error);
    }
  }

  /**
   * Process GitHub webhook event
   */
  private async processWebhookEvent(event: any): Promise<void> {
    try {
      // Handle the webhook through the PR counting service
      const success = await this.prCountingService.handleWebhookEvent(event);
      
      if (success) {
        logger.debug('Processed webhook event successfully');
        
        // Trigger immediate progress analysis if needed
        if (event.teacherId) {
          await this.runProgressAnalysisJob(event.teacherId);
        }
      }
    } catch (error) {
      logger.error('Failed to process webhook event:', error);
    }
  }

  /**
   * Get current system status
   */
  public async getSystemStatus(): Promise<SystemHealthStatus> {
    try {
      // Try to get cached status first
      const cached = await db.cacheGet<SystemHealthStatus>('system_health_status');
      if (cached) {
        return cached;
      }

      // Run fresh health check
      return await this.runHealthCheck();
    } catch (error) {
      logger.error('Failed to get system status:', error);
      throw error;
    }
  }

  /**
   * Get active monitoring jobs
   */
  public getActiveJobs(): MonitoringJob[] {
    return Array.from(this.runningJobs.values());
  }

  /**
   * Get alerts for a teacher
   */
  public async getAlerts(teacherId: string, limit: number = 50): Promise<MonitoringAlert[]> {
    try {
      const query = `
        SELECT id, type, severity, student_id, teacher_id, message, data, 
               is_resolved, created_at, resolved_at
        FROM monitoring_alerts 
        WHERE teacher_id = $1 
        ORDER BY created_at DESC 
        LIMIT $2
      `;

      const result = await db.query(query, [teacherId, limit]);

      return result.rows.map(row => ({
        id: row.id,
        type: row.type,
        severity: row.severity,
        studentId: row.student_id,
        teacherId: row.teacher_id,
        message: row.message,
        data: row.data,
        isResolved: row.is_resolved,
        createdAt: new Date(row.created_at),
        resolvedAt: row.resolved_at ? new Date(row.resolved_at) : undefined
      }));

    } catch (error) {
      logger.error(`Failed to get alerts for teacher ${teacherId}:`, error);
      return [];
    }
  }

  /**
   * Resolve an alert
   */
  public async resolveAlert(alertId: string): Promise<boolean> {
    try {
      const query = `
        UPDATE monitoring_alerts 
        SET is_resolved = true, resolved_at = NOW()
        WHERE id = $1
      `;

      const result = await db.query(query, [alertId]);
      return (result.rowCount || 0) > 0;

    } catch (error) {
      logger.error(`Failed to resolve alert ${alertId}:`, error);
      return false;
    }
  }

  /**
   * Stop a schedule
   */
  private async stopSchedule(scheduleId: string): Promise<void> {
    const timeout = this.schedules.get(scheduleId);
    if (timeout) {
      clearInterval(timeout);
      this.schedules.delete(scheduleId);
    }

    // Update database
    await this.updateScheduleStatus(scheduleId, false);
  }

  /**
   * Wait for running jobs to complete
   */
  private async waitForJobsToComplete(timeoutMs: number): Promise<void> {
    const startTime = Date.now();
    
    while (this.runningJobs.size > 0 && (Date.now() - startTime) < timeoutMs) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    if (this.runningJobs.size > 0) {
      logger.warn(`${this.runningJobs.size} jobs still running after timeout`);
    }
  }

  /**
   * Initialize database tables
   */
  private async initializeTables(): Promise<void> {
    try {
      // Monitoring schedules table
      await db.query(`
        CREATE TABLE IF NOT EXISTS monitoring_schedules (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          type VARCHAR(50) NOT NULL,
          cron_expression VARCHAR(100),
          is_active BOOLEAN DEFAULT true,
          teacher_id VARCHAR(255),
          config JSONB DEFAULT '{}',
          last_run TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);

      // Monitoring alerts table
      await db.query(`
        CREATE TABLE IF NOT EXISTS monitoring_alerts (
          id VARCHAR(255) PRIMARY KEY,
          type VARCHAR(50) NOT NULL,
          severity VARCHAR(20) NOT NULL,
          student_id VARCHAR(255),
          teacher_id VARCHAR(255),
          message TEXT NOT NULL,
          data JSONB DEFAULT '{}',
          is_resolved BOOLEAN DEFAULT false,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          resolved_at TIMESTAMP WITH TIME ZONE
        )
      `);

      // System health status table
      await db.query(`
        CREATE TABLE IF NOT EXISTS system_health_status (
          id SERIAL PRIMARY KEY,
          overall_status VARCHAR(20) NOT NULL,
          components JSONB NOT NULL,
          metrics JSONB NOT NULL,
          recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);

    } catch (error) {
      logger.error('Failed to initialize monitoring tables:', error);
      throw error;
    }
  }

  /**
   * Store schedule in database
   */
  private async storeSchedule(schedule: MonitoringSchedule): Promise<void> {
    try {
      const query = `
        INSERT INTO monitoring_schedules (id, name, type, cron_expression, is_active, teacher_id, config, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        ON CONFLICT (id)
        DO UPDATE SET 
          name = $2, type = $3, cron_expression = $4, is_active = $5, 
          teacher_id = $6, config = $7, updated_at = NOW()
      `;

      await db.query(query, [
        schedule.id,
        schedule.name,
        schedule.type,
        schedule.cronExpression,
        schedule.isActive,
        schedule.teacherId,
        JSON.stringify(schedule.config || {})
      ]);

    } catch (error) {
      logger.error('Failed to store schedule:', error);
    }
  }

  /**
   * Update schedule status
   */
  private async updateScheduleStatus(scheduleId: string, isActive: boolean): Promise<void> {
    try {
      const query = `
        UPDATE monitoring_schedules 
        SET is_active = $2, updated_at = NOW()
        WHERE id = $1
      `;

      await db.query(query, [scheduleId, isActive]);
    } catch (error) {
      logger.error('Failed to update schedule status:', error);
    }
  }

  /**
   * Store alert in database
   */
  private async storeAlert(alert: MonitoringAlert): Promise<void> {
    try {
      const query = `
        INSERT INTO monitoring_alerts (id, type, severity, student_id, teacher_id, message, data, is_resolved, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `;

      await db.query(query, [
        alert.id,
        alert.type,
        alert.severity,
        alert.studentId,
        alert.teacherId,
        alert.message,
        JSON.stringify(alert.data),
        alert.isResolved,
        alert.createdAt
      ]);

    } catch (error) {
      logger.error('Failed to store alert:', error);
    }
  }

  /**
   * Store health status
   */
  private async storeHealthStatus(status: SystemHealthStatus): Promise<void> {
    try {
      const query = `
        INSERT INTO system_health_status (overall_status, components, metrics, recorded_at)
        VALUES ($1, $2, $3, $4)
      `;

      await db.query(query, [
        status.overall,
        JSON.stringify(status.components),
        JSON.stringify(status.metrics),
        status.metrics.lastHealthCheck
      ]);

      // Also cache it
      await db.cacheSet('system_health_status', status, 300); // 5 minutes

    } catch (error) {
      logger.error('Failed to store health status:', error);
    }
  }

  /**
   * Load schedules from database
   */
  private async loadSchedules(): Promise<void> {
    try {
      const query = `
        SELECT id, name, type, teacher_id, config
        FROM monitoring_schedules 
        WHERE is_active = true
      `;

      const result = await db.query(query);

      for (const row of result.rows) {
        const config = row.config || {};
        const intervalMinutes = config.intervalMinutes || 60;

        if (row.type === 'progress_analysis' && row.teacher_id) {
          await this.scheduleProgressAnalysis(row.teacher_id, intervalMinutes);
        } else if (row.type === 'pr_sync' && row.teacher_id) {
          await this.schedulePRSync(row.teacher_id, intervalMinutes);
        }
      }

      logger.info(`Loaded ${result.rows.length} active schedules`);

    } catch (error) {
      logger.error('Failed to load schedules:', error);
    }
  }
}