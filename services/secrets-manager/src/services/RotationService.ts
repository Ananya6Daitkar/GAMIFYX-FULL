import { CronJob } from 'cron';
import { VaultService } from './VaultService';
import { SecretAccessService } from './SecretAccessService';
import { NotificationService } from './NotificationService';
import { RotationJob, RotationStatus, Secret, RotationNotification } from '@/models/Secret';
import { logger } from '@/telemetry/logger';
import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('secrets-manager', '1.0.0');

// Rotation metrics
const rotationJobs = meter.createCounter('rotation_jobs_total', {
  description: 'Total rotation jobs executed'
});

const rotationFailures = meter.createCounter('rotation_failures_total', {
  description: 'Total rotation job failures'
});

const rotationDuration = meter.createHistogram('rotation_duration_seconds', {
  description: 'Time taken to complete rotation jobs'
});

export class RotationService {
  private vaultService: VaultService;
  private accessService: SecretAccessService;
  private notificationService: NotificationService;
  private rotationJobs: Map<string, CronJob> = new Map();
  private activeRotations: Map<string, RotationJob> = new Map();

  constructor(
    vaultService: VaultService,
    accessService: SecretAccessService,
    notificationService: NotificationService
  ) {
    this.vaultService = vaultService;
    this.accessService = accessService;
    this.notificationService = notificationService;
  }

  async initialize(): Promise<void> {
    try {
      // Schedule rotation check job to run every hour
      const rotationCheckJob = new CronJob('0 * * * *', async () => {
        await this.checkAndScheduleRotations();
      });

      rotationCheckJob.start();
      logger.info('Rotation service initialized with hourly checks');

      // Schedule immediate check for existing secrets
      await this.checkAndScheduleRotations();

    } catch (error) {
      logger.error('Failed to initialize rotation service', { error });
      throw error;
    }
  }

  async checkAndScheduleRotations(): Promise<void> {
    try {
      logger.info('Checking for secrets requiring rotation');

      // Get all secrets
      const secretPaths = await this.vaultService.listSecrets();
      
      for (const path of secretPaths) {
        try {
          const secret = await this.vaultService.getSecret(path, false);
          
          if (!secret || !secret.rotationConfig?.enabled) {
            continue;
          }

          const shouldRotate = await this.shouldRotateSecret(secret);
          
          if (shouldRotate.rotate) {
            await this.scheduleRotation(secret, shouldRotate.reason);
          } else if (shouldRotate.notify) {
            await this.sendRotationWarning(secret, shouldRotate.daysUntilRotation!);
          }

        } catch (error) {
          logger.error('Failed to check rotation for secret', { error, path });
        }
      }

    } catch (error) {
      logger.error('Failed to check and schedule rotations', { error });
    }
  }

  private async shouldRotateSecret(secret: Secret): Promise<{
    rotate: boolean;
    notify: boolean;
    reason?: string;
    daysUntilRotation?: number;
  }> {
    const now = new Date();
    const rotationConfig = secret.rotationConfig!;
    
    // Calculate next rotation date
    const lastRotation = secret.updatedAt;
    const nextRotation = new Date(lastRotation);
    nextRotation.setDate(nextRotation.getDate() + rotationConfig.intervalDays);
    
    const daysUntilRotation = Math.ceil((nextRotation.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    // Check if secret has expired
    if (secret.expiresAt && secret.expiresAt <= now) {
      return {
        rotate: true,
        notify: false,
        reason: 'Secret has expired'
      };
    }

    // Check if rotation is due
    if (daysUntilRotation <= 0) {
      return {
        rotate: true,
        notify: false,
        reason: 'Scheduled rotation interval reached'
      };
    }

    // Check if notification should be sent
    if (daysUntilRotation <= rotationConfig.notifyBefore) {
      return {
        rotate: false,
        notify: true,
        daysUntilRotation
      };
    }

    return {
      rotate: false,
      notify: false
    };
  }

  async scheduleRotation(secret: Secret, reason: string): Promise<RotationJob> {
    const jobId = `rotation-${secret.id}-${Date.now()}`;
    
    const rotationJob: RotationJob = {
      id: jobId,
      secretId: secret.id,
      secretPath: secret.path,
      status: RotationStatus.SCHEDULED,
      scheduledAt: new Date(),
      retryCount: 0
    };

    this.activeRotations.set(jobId, rotationJob);

    logger.info('Rotation job scheduled', {
      jobId,
      secretPath: secret.path,
      reason
    });

    // Execute rotation immediately (in production, you might want to queue this)
    setImmediate(() => this.executeRotation(jobId));

    return rotationJob;
  }

  async executeRotation(jobId: string): Promise<void> {
    const job = this.activeRotations.get(jobId);
    if (!job) {
      logger.error('Rotation job not found', { jobId });
      return;
    }

    const startTime = Date.now();
    rotationJobs.add(1, { status: 'started' });

    try {
      // Update job status
      job.status = RotationStatus.RUNNING;
      job.startedAt = new Date();
      this.activeRotations.set(jobId, job);

      logger.info('Starting secret rotation', {
        jobId,
        secretPath: job.secretPath
      });

      // Get the secret to rotate
      const secret = await this.vaultService.getSecret(job.secretPath, true);
      if (!secret) {
        throw new Error(`Secret not found: ${job.secretPath}`);
      }

      // Check if secret is currently in use
      const usage = await this.accessService.getSecretUsage(job.secretPath);
      if (usage.activeConnections > 0) {
        logger.warn('Secret has active connections, proceeding with caution', {
          secretPath: job.secretPath,
          activeConnections: usage.activeConnections
        });
      }

      // Perform the rotation
      const rotatedSecret = await this.vaultService.rotateSecret(job.secretPath);

      // Log the rotation
      await this.accessService.logSecretAccess({
        secretId: rotatedSecret.id,
        secretPath: rotatedSecret.path,
        userId: 'system',
        action: 'rotate',
        result: 'success',
        ipAddress: 'localhost',
        userAgent: 'rotation-service',
        timestamp: new Date()
      });

      // Update job status
      job.status = RotationStatus.COMPLETED;
      job.completedAt = new Date();
      this.activeRotations.set(jobId, job);

      // Send success notification
      await this.sendRotationNotification({
        secretId: rotatedSecret.id,
        secretPath: rotatedSecret.path,
        type: 'success',
        message: `Secret rotated successfully`,
        recipients: [rotatedSecret.metadata.owner]
      });

      const duration = (Date.now() - startTime) / 1000;
      rotationDuration.record(duration);
      rotationJobs.add(1, { status: 'completed' });

      logger.info('Secret rotation completed successfully', {
        jobId,
        secretPath: job.secretPath,
        duration
      });

    } catch (error) {
      await this.handleRotationFailure(jobId, error as Error);
    }
  }

  private async handleRotationFailure(jobId: string, error: Error): Promise<void> {
    const job = this.activeRotations.get(jobId);
    if (!job) return;

    job.retryCount++;
    job.error = error.message;
    rotationFailures.add(1, { reason: 'execution_failed' });

    const maxRetries = 3; // Default max retries
    
    if (job.retryCount < maxRetries) {
      // Schedule retry with exponential backoff
      const backoffMinutes = Math.pow(2, job.retryCount) * 5; // 5, 10, 20 minutes
      job.nextRetryAt = new Date(Date.now() + backoffMinutes * 60 * 1000);
      job.status = RotationStatus.SCHEDULED;
      
      logger.warn('Rotation failed, scheduling retry', {
        jobId,
        secretPath: job.secretPath,
        retryCount: job.retryCount,
        nextRetryAt: job.nextRetryAt,
        error: error.message
      });

      // Schedule retry
      setTimeout(() => this.executeRotation(jobId), backoffMinutes * 60 * 1000);

    } else {
      // Max retries reached, mark as failed
      job.status = RotationStatus.FAILED;
      job.completedAt = new Date();

      logger.error('Rotation failed after max retries', {
        jobId,
        secretPath: job.secretPath,
        retryCount: job.retryCount,
        error: error.message
      });

      // Send failure notification
      try {
        const secret = await this.vaultService.getSecret(job.secretPath, false);
        if (secret) {
          await this.sendRotationNotification({
            secretId: secret.id,
            secretPath: secret.path,
            type: 'failure',
            message: `Secret rotation failed after ${job.retryCount} attempts: ${error.message}`,
            recipients: [secret.metadata.owner, 'security-team@company.com']
          });
        }
      } catch (notificationError) {
        logger.error('Failed to send rotation failure notification', { 
          error: notificationError,
          jobId 
        });
      }
    }

    this.activeRotations.set(jobId, job);
  }

  private async sendRotationWarning(secret: Secret, daysUntilRotation: number): Promise<void> {
    try {
      await this.sendRotationNotification({
        secretId: secret.id,
        secretPath: secret.path,
        type: 'warning',
        message: `Secret will be rotated in ${daysUntilRotation} day(s)`,
        scheduledRotation: new Date(Date.now() + daysUntilRotation * 24 * 60 * 60 * 1000),
        recipients: [secret.metadata.owner]
      });

      logger.info('Rotation warning sent', {
        secretPath: secret.path,
        daysUntilRotation
      });

    } catch (error) {
      logger.error('Failed to send rotation warning', {
        error,
        secretPath: secret.path
      });
    }
  }

  private async sendRotationNotification(notification: RotationNotification): Promise<void> {
    try {
      await this.notificationService.sendRotationNotification(notification);
    } catch (error) {
      logger.error('Failed to send rotation notification', { error, notification });
    }
  }

  async getRotationJobs(secretPath?: string): Promise<RotationJob[]> {
    const jobs = Array.from(this.activeRotations.values());
    
    if (secretPath) {
      return jobs.filter(job => job.secretPath === secretPath);
    }
    
    return jobs;
  }

  async cancelRotation(jobId: string): Promise<void> {
    const job = this.activeRotations.get(jobId);
    if (!job) {
      throw new Error(`Rotation job not found: ${jobId}`);
    }

    if (job.status === RotationStatus.RUNNING) {
      throw new Error('Cannot cancel running rotation job');
    }

    job.status = RotationStatus.CANCELLED;
    job.completedAt = new Date();
    this.activeRotations.set(jobId, job);

    logger.info('Rotation job cancelled', { jobId, secretPath: job.secretPath });
  }

  async forceRotation(secretPath: string, reason: string): Promise<RotationJob> {
    try {
      const secret = await this.vaultService.getSecret(secretPath, false);
      if (!secret) {
        throw new Error(`Secret not found: ${secretPath}`);
      }

      logger.info('Force rotation requested', { secretPath, reason });
      
      return await this.scheduleRotation(secret, `Force rotation: ${reason}`);

    } catch (error) {
      logger.error('Failed to force rotation', { error, secretPath });
      throw error;
    }
  }

  async getRotationSchedule(): Promise<Array<{ secretPath: string; nextRotation: Date; daysUntil: number }>> {
    try {
      const secretPaths = await this.vaultService.listSecrets();
      const schedule: Array<{ secretPath: string; nextRotation: Date; daysUntil: number }> = [];

      for (const path of secretPaths) {
        try {
          const secret = await this.vaultService.getSecret(path, false);
          
          if (!secret || !secret.rotationConfig?.enabled) {
            continue;
          }

          const nextRotation = new Date(secret.updatedAt);
          nextRotation.setDate(nextRotation.getDate() + secret.rotationConfig.intervalDays);
          
          const daysUntil = Math.ceil((nextRotation.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

          schedule.push({
            secretPath: path,
            nextRotation,
            daysUntil
          });

        } catch (error) {
          logger.error('Failed to get rotation schedule for secret', { error, path });
        }
      }

      return schedule.sort((a, b) => a.daysUntil - b.daysUntil);

    } catch (error) {
      logger.error('Failed to get rotation schedule', { error });
      throw error;
    }
  }

  shutdown(): void {
    // Stop all cron jobs
    for (const [jobId, cronJob] of this.rotationJobs) {
      cronJob.stop();
      logger.info('Stopped rotation cron job', { jobId });
    }

    // Cancel pending rotations
    for (const [jobId, job] of this.activeRotations) {
      if (job.status === RotationStatus.SCHEDULED) {
        job.status = RotationStatus.CANCELLED;
        job.completedAt = new Date();
      }
    }

    logger.info('Rotation service shutdown complete');
  }
}