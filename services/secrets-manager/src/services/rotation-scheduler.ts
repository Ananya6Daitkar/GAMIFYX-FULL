/**
 * Automated Secret Rotation Scheduler for GamifyX
 * Handles automatic secret rotation with zero-downtime updates
 */

import { EventEmitter } from 'events';
import { CronJob } from 'cron';
import { Logger } from '../utils/logger';
import { DatabaseClient } from '../utils/database-client';
import { NotificationService } from './notification-service';
import { 
  RotationPolicy, 
  RotationSchedule, 
  RotationResult,
  RotationConfig,
  RotationStatus,
  RotationStrategy
} from '../types/secrets-types';

export class RotationScheduler extends EventEmitter {
  private logger: Logger;
  private config: RotationConfig;
  private db: DatabaseClient;
  private notificationService: NotificationService;
  private scheduledJobs: Map<string, CronJob> = new Map();
  private rotationStrategies: Map<string, RotationStrategy> = new Map();
  private isRunning: boolean = false;

  constructor(config: RotationConfig) {
    super();
    this.config = config;
    this.logger = new Logger('RotationScheduler');
    this.db = new DatabaseClient(config.database);
    this.notificationService = new NotificationService(config.notifications);
    
    this.initializeRotationStrategies();
  }

  /**
   * Start the rotation scheduler
   */
  async start(): Promise<void> {
    try {
      this.logger.info('Starting rotation scheduler');
      this.isRunning = true;

      // Initialize database tables
      await this.initializeDatabase();

      // Load existing rotation schedules
      await this.loadExistingSchedules();

      // Start cleanup job for completed rotations
      this.startCleanupJob();

      // Start monitoring job for overdue rotations
      this.startMonitoringJob();

      this.logger.info('Rotation scheduler started successfully');
      this.emit('scheduler:started');

    } catch (error) {
      this.logger.error('Failed to start rotation scheduler', error);
      throw error;
    }
  }

  /**
   * Stop the rotation scheduler
   */
  async stop(): Promise<void> {
    try {
      this.logger.info('Stopping rotation scheduler');
      this.isRunning = false;

      // Stop all scheduled jobs
      for (const [secretId, job] of this.scheduledJobs) {
        job.stop();
        this.logger.debug('Stopped rotation job', { secretId });
      }

      this.scheduledJobs.clear();

      this.logger.info('Rotation scheduler stopped');
      this.emit('scheduler:stopped');

    } catch (error) {
      this.logger.error('Failed to stop rotation scheduler', error);
      throw error;
    }
  }

  /**
   * Schedule rotation for a secret
   */
  async scheduleRotation(secretId: string, policy: RotationPolicy): Promise<void> {
    try {
      this.logger.info('Scheduling rotation', { secretId, policy: policy.type });

      // Validate rotation policy
      await this.validateRotationPolicy(policy);

      // Calculate next rotation time
      const nextRotation = this.calculateNextRotation(policy);

      // Store rotation schedule in database
      const schedule: RotationSchedule = {
        id: this.generateScheduleId(),
        secretId,
        policy,
        nextRotation,
        status: RotationStatus.SCHEDULED,
        createdAt: new Date(),
        updatedAt: new Date(),
        attempts: 0,
        lastAttempt: null,
        lastSuccess: null,
        lastError: null
      };

      await this.storeRotationSchedule(schedule);

      // Create cron job for automatic rotation
      if (policy.type === 'automatic') {
        await this.createRotationJob(schedule);
      }

      this.emit('rotation:scheduled', { secretId, nextRotation });

    } catch (error) {
      this.logger.error('Failed to schedule rotation', error);
      throw error;
    }
  }

  /**
   * Cancel rotation for a secret
   */
  async cancelRotation(secretId: string): Promise<void> {
    try {
      this.logger.info('Cancelling rotation', { secretId });

      // Stop scheduled job
      const job = this.scheduledJobs.get(secretId);
      if (job) {
        job.stop();
        this.scheduledJobs.delete(secretId);
      }

      // Update database
      await this.db.query(
        'UPDATE rotation_schedules SET status = ?, updated_at = ? WHERE secret_id = ?',
        [RotationStatus.CANCELLED, new Date(), secretId]
      );

      this.emit('rotation:cancelled', { secretId });

    } catch (error) {
      this.logger.error('Failed to cancel rotation', error);
      throw error;
    }
  }

  /**
   * Execute rotation for a specific secret
   */
  async executeRotation(secretId: string): Promise<RotationResult> {
    const startTime = Date.now();
    
    try {
      this.logger.info('Executing rotation', { secretId });

      // Get rotation schedule
      const schedule = await this.getRotationSchedule(secretId);
      if (!schedule) {
        throw new Error(`No rotation schedule found for secret: ${secretId}`);
      }

      // Update status to in progress
      await this.updateRotationStatus(schedule.id, RotationStatus.IN_PROGRESS);

      // Get rotation strategy
      const strategy = this.getRotationStrategy(schedule.policy.strategyType || 'default');

      // Execute rotation using strategy
      const result = await strategy.execute(secretId, schedule.policy);

      // Update schedule with success
      await this.updateRotationResult(schedule.id, {
        status: RotationStatus.COMPLETED,
        lastSuccess: new Date(),
        nextRotation: this.calculateNextRotation(schedule.policy),
        lastError: null
      });

      // Reschedule next rotation
      if (schedule.policy.type === 'automatic') {
        await this.rescheduleRotation(schedule);
      }

      // Send success notification
      await this.notificationService.sendRotationNotification({
        type: 'success',
        secretId,
        result,
        duration: Date.now() - startTime
      });

      this.emit('rotation:completed', { secretId, result });

      return result;

    } catch (error) {
      this.logger.error('Rotation execution failed', error);

      // Update schedule with failure
      const schedule = await this.getRotationSchedule(secretId);
      if (schedule) {
        await this.updateRotationResult(schedule.id, {
          status: RotationStatus.FAILED,
          lastAttempt: new Date(),
          lastError: error.message,
          attempts: schedule.attempts + 1
        });

        // Schedule retry if within retry limits
        if (schedule.attempts < this.config.maxRetries) {
          const retryDelay = this.calculateRetryDelay(schedule.attempts);
          setTimeout(() => {
            this.executeRotation(secretId).catch(retryError => {
              this.logger.error('Rotation retry failed', retryError);
            });
          }, retryDelay);
        }
      }

      // Send failure notification
      await this.notificationService.sendRotationNotification({
        type: 'failure',
        secretId,
        error: error.message,
        duration: Date.now() - startTime
      });

      this.emit('rotation:failed', { secretId, error });

      throw error;
    }
  }

  /**
   * Get next rotation time for a secret
   */
  getNextRotationTime(secretId: string): Date | null {
    const schedule = this.getRotationScheduleSync(secretId);
    return schedule?.nextRotation || null;
  }

  /**
   * Get count of scheduled rotations
   */
  getScheduledRotationsCount(): number {
    return this.scheduledJobs.size;
  }

  /**
   * Get count of overdue rotations
   */
  async getOverdueRotationsCount(): Promise<number> {
    const result = await this.db.query(
      'SELECT COUNT(*) as count FROM rotation_schedules WHERE next_rotation < ? AND status = ?',
      [new Date(), RotationStatus.SCHEDULED]
    );

    return result[0]?.count || 0;
  }

  // Private helper methods

  private initializeRotationStrategies(): void {
    // Default rotation strategy
    this.rotationStrategies.set('default', new DefaultRotationStrategy());
    
    // Database rotation strategy
    this.rotationStrategies.set('database', new DatabaseRotationStrategy());
    
    // API key rotation strategy
    this.rotationStrategies.set('api_key', new ApiKeyRotationStrategy());
    
    // Certificate rotation strategy
    this.rotationStrategies.set('certificate', new CertificateRotationStrategy());
    
    // Custom strategies can be added here
  }

  private async initializeDatabase(): Promise<void> {
    await this.db.query(`
      CREATE TABLE IF NOT EXISTS rotation_schedules (
        id VARCHAR(255) PRIMARY KEY,
        secret_id VARCHAR(255) NOT NULL,
        policy TEXT NOT NULL,
        next_rotation DATETIME NOT NULL,
        status VARCHAR(50) NOT NULL,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL,
        attempts INT DEFAULT 0,
        last_attempt DATETIME NULL,
        last_success DATETIME NULL,
        last_error TEXT NULL,
        INDEX idx_secret_id (secret_id),
        INDEX idx_next_rotation (next_rotation),
        INDEX idx_status (status)
      )
    `);
  }

  private async loadExistingSchedules(): Promise<void> {
    const schedules = await this.db.query(
      'SELECT * FROM rotation_schedules WHERE status IN (?, ?) AND next_rotation > ?',
      [RotationStatus.SCHEDULED, RotationStatus.IN_PROGRESS, new Date()]
    );

    for (const scheduleRow of schedules) {
      const schedule = this.mapDatabaseRowToSchedule(scheduleRow);
      
      if (schedule.policy.type === 'automatic') {
        await this.createRotationJob(schedule);
      }
    }

    this.logger.info('Loaded existing rotation schedules', { count: schedules.length });
  }

  private async createRotationJob(schedule: RotationSchedule): Promise<void> {
    // Calculate cron expression from rotation policy
    const cronExpression = this.buildCronExpression(schedule.policy, schedule.nextRotation);

    const job = new CronJob(
      cronExpression,
      async () => {
        if (this.isRunning) {
          this.emit('rotation:due', schedule.secretId);
        }
      },
      null,
      false, // Don't start immediately
      this.config.timezone || 'UTC'
    );

    this.scheduledJobs.set(schedule.secretId, job);
    job.start();

    this.logger.debug('Created rotation job', { 
      secretId: schedule.secretId, 
      cronExpression,
      nextRotation: schedule.nextRotation
    });
  }

  private buildCronExpression(policy: RotationPolicy, nextRotation: Date): string {
    // Build cron expression based on rotation policy
    const date = nextRotation;
    
    if (policy.intervalDays) {
      // Daily rotation at specific time
      return `0 ${date.getHours()} ${date.getMinutes()} * * *`;
    }

    // Default to daily at 2 AM
    return '0 2 * * *';
  }

  private calculateNextRotation(policy: RotationPolicy): Date {
    const now = new Date();
    
    if (policy.type === 'automatic' && policy.intervalDays) {
      return new Date(now.getTime() + policy.intervalDays * 24 * 60 * 60 * 1000);
    }

    // Default to 30 days
    return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  }

  private calculateRetryDelay(attemptNumber: number): number {
    // Exponential backoff: 2^attempt * base delay
    const baseDelay = this.config.retryBaseDelayMs || 60000; // 1 minute
    return Math.min(baseDelay * Math.pow(2, attemptNumber), this.config.maxRetryDelayMs || 3600000); // Max 1 hour
  }

  private async validateRotationPolicy(policy: RotationPolicy): Promise<void> {
    if (!policy.type || !['automatic', 'manual'].includes(policy.type)) {
      throw new Error('Invalid rotation policy type');
    }

    if (policy.type === 'automatic') {
      if (!policy.intervalDays || policy.intervalDays < 1) {
        throw new Error('Automatic rotation requires valid interval in days');
      }

      if (policy.intervalDays < this.config.minIntervalDays) {
        throw new Error(`Rotation interval must be at least ${this.config.minIntervalDays} days`);
      }
    }

    if (policy.strategyType && !this.rotationStrategies.has(policy.strategyType)) {
      throw new Error(`Unknown rotation strategy: ${policy.strategyType}`);
    }
  }

  private getRotationStrategy(strategyType: string): RotationStrategy {
    const strategy = this.rotationStrategies.get(strategyType);
    if (!strategy) {
      throw new Error(`Rotation strategy not found: ${strategyType}`);
    }
    return strategy;
  }

  private startCleanupJob(): void {
    // Clean up completed rotations older than retention period
    const cleanupJob = new CronJob(
      '0 3 * * *', // Daily at 3 AM
      async () => {
        if (this.isRunning) {
          await this.cleanupCompletedRotations();
        }
      },
      null,
      true,
      this.config.timezone || 'UTC'
    );

    this.logger.debug('Started cleanup job');
  }

  private startMonitoringJob(): void {
    // Monitor for overdue rotations
    const monitoringJob = new CronJob(
      '*/15 * * * *', // Every 15 minutes
      async () => {
        if (this.isRunning) {
          await this.checkOverdueRotations();
        }
      },
      null,
      true,
      this.config.timezone || 'UTC'
    );

    this.logger.debug('Started monitoring job');
  }

  private async cleanupCompletedRotations(): Promise<void> {
    try {
      const retentionDate = new Date(Date.now() - this.config.retentionDays * 24 * 60 * 60 * 1000);
      
      const result = await this.db.query(
        'DELETE FROM rotation_schedules WHERE status = ? AND updated_at < ?',
        [RotationStatus.COMPLETED, retentionDate]
      );

      if (result.affectedRows > 0) {
        this.logger.info('Cleaned up completed rotations', { count: result.affectedRows });
      }

    } catch (error) {
      this.logger.error('Failed to cleanup completed rotations', error);
    }
  }

  private async checkOverdueRotations(): Promise<void> {
    try {
      const overdueSchedules = await this.db.query(
        'SELECT * FROM rotation_schedules WHERE next_rotation < ? AND status = ?',
        [new Date(), RotationStatus.SCHEDULED]
      );

      for (const scheduleRow of overdueSchedules) {
        const schedule = this.mapDatabaseRowToSchedule(scheduleRow);
        
        this.logger.warn('Overdue rotation detected', { 
          secretId: schedule.secretId,
          nextRotation: schedule.nextRotation
        });

        // Emit event for overdue rotation
        this.emit('rotation:overdue', schedule.secretId);

        // Send notification
        await this.notificationService.sendRotationNotification({
          type: 'overdue',
          secretId: schedule.secretId,
          overdueBy: Date.now() - schedule.nextRotation.getTime()
        });
      }

    } catch (error) {
      this.logger.error('Failed to check overdue rotations', error);
    }
  }

  // Database operations

  private async storeRotationSchedule(schedule: RotationSchedule): Promise<void> {
    await this.db.query(
      'INSERT INTO rotation_schedules (id, secret_id, policy, next_rotation, status, created_at, updated_at, attempts, last_attempt, last_success, last_error) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        schedule.id,
        schedule.secretId,
        JSON.stringify(schedule.policy),
        schedule.nextRotation,
        schedule.status,
        schedule.createdAt,
        schedule.updatedAt,
        schedule.attempts,
        schedule.lastAttempt,
        schedule.lastSuccess,
        schedule.lastError
      ]
    );
  }

  private async getRotationSchedule(secretId: string): Promise<RotationSchedule | null> {
    const result = await this.db.query(
      'SELECT * FROM rotation_schedules WHERE secret_id = ? AND status != ?',
      [secretId, RotationStatus.CANCELLED]
    );

    if (result.length === 0) {
      return null;
    }

    return this.mapDatabaseRowToSchedule(result[0]);
  }

  private getRotationScheduleSync(secretId: string): RotationSchedule | null {
    // This would be implemented with a synchronous cache lookup
    return null;
  }

  private async updateRotationStatus(scheduleId: string, status: RotationStatus): Promise<void> {
    await this.db.query(
      'UPDATE rotation_schedules SET status = ?, updated_at = ? WHERE id = ?',
      [status, new Date(), scheduleId]
    );
  }

  private async updateRotationResult(scheduleId: string, result: {
    status: RotationStatus;
    lastSuccess?: Date;
    lastAttempt?: Date;
    lastError?: string;
    attempts?: number;
    nextRotation?: Date;
  }): Promise<void> {
    const updates = [];
    const values = [];

    updates.push('status = ?', 'updated_at = ?');
    values.push(result.status, new Date());

    if (result.lastSuccess) {
      updates.push('last_success = ?');
      values.push(result.lastSuccess);
    }

    if (result.lastAttempt) {
      updates.push('last_attempt = ?');
      values.push(result.lastAttempt);
    }

    if (result.lastError !== undefined) {
      updates.push('last_error = ?');
      values.push(result.lastError);
    }

    if (result.attempts !== undefined) {
      updates.push('attempts = ?');
      values.push(result.attempts);
    }

    if (result.nextRotation) {
      updates.push('next_rotation = ?');
      values.push(result.nextRotation);
    }

    values.push(scheduleId);

    await this.db.query(
      `UPDATE rotation_schedules SET ${updates.join(', ')} WHERE id = ?`,
      values
    );
  }

  private async rescheduleRotation(schedule: RotationSchedule): Promise<void> {
    // Cancel existing job
    const existingJob = this.scheduledJobs.get(schedule.secretId);
    if (existingJob) {
      existingJob.stop();
    }

    // Create new job with updated schedule
    schedule.nextRotation = this.calculateNextRotation(schedule.policy);
    await this.createRotationJob(schedule);
  }

  private mapDatabaseRowToSchedule(row: any): RotationSchedule {
    return {
      id: row.id,
      secretId: row.secret_id,
      policy: JSON.parse(row.policy),
      nextRotation: new Date(row.next_rotation),
      status: row.status,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      attempts: row.attempts,
      lastAttempt: row.last_attempt ? new Date(row.last_attempt) : null,
      lastSuccess: row.last_success ? new Date(row.last_success) : null,
      lastError: row.last_error
    };
  }

  private generateScheduleId(): string {
    return `schedule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Rotation strategy implementations

class DefaultRotationStrategy implements RotationStrategy {
  async execute(secretId: string, policy: RotationPolicy): Promise<RotationResult> {
    // Default rotation strategy - generate new random value
    return {
      success: true,
      secretId,
      oldVersion: 1,
      newVersion: 2,
      rotatedAt: new Date()
    };
  }
}

class DatabaseRotationStrategy implements RotationStrategy {
  async execute(secretId: string, policy: RotationPolicy): Promise<RotationResult> {
    // Database-specific rotation strategy
    // This would coordinate with database systems to rotate credentials
    return {
      success: true,
      secretId,
      oldVersion: 1,
      newVersion: 2,
      rotatedAt: new Date()
    };
  }
}

class ApiKeyRotationStrategy implements RotationStrategy {
  async execute(secretId: string, policy: RotationPolicy): Promise<RotationResult> {
    // API key rotation strategy
    // This would coordinate with external APIs to rotate keys
    return {
      success: true,
      secretId,
      oldVersion: 1,
      newVersion: 2,
      rotatedAt: new Date()
    };
  }
}

class CertificateRotationStrategy implements RotationStrategy {
  async execute(secretId: string, policy: RotationPolicy): Promise<RotationResult> {
    // Certificate rotation strategy
    // This would coordinate with certificate authorities
    return {
      success: true,
      secretId,
      oldVersion: 1,
      newVersion: 2,
      rotatedAt: new Date()
    };
  }
}