import { logger } from '../telemetry/logger';
import { db } from '../database/connection';
import { PRTrackingService } from './prTrackingService';
import { StudentMappingService } from './studentMappingService';
import { GitHubService } from './githubService';

export interface PRCountingJob {
  id: string;
  teacherId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt?: Date;
  completedAt?: Date;
  studentsProcessed: number;
  totalStudents: number;
  prsFound: number;
  errors: string[];
}

export interface PRCountingSchedule {
  teacherId: string;
  intervalMinutes: number;
  isActive: boolean;
  lastRun?: Date;
  nextRun?: Date;
}

/**
 * Automated PR Counting Service
 * Handles automatic counting, real-time detection, and duplicate prevention for student PRs
 */
export class AutomatedPRCountingService {
  private static instance: AutomatedPRCountingService;
  private prTrackingService: PRTrackingService;
  private mappingService: StudentMappingService;
  private githubService: GitHubService;
  private runningJobs: Map<string, PRCountingJob> = new Map();
  private schedules: Map<string, NodeJS.Timeout> = new Map();

  private constructor() {
    this.prTrackingService = PRTrackingService.getInstance();
    this.mappingService = StudentMappingService.getInstance();
    this.githubService = GitHubService.getInstance();
  }

  public static getInstance(): AutomatedPRCountingService {
    if (!AutomatedPRCountingService.instance) {
      AutomatedPRCountingService.instance = new AutomatedPRCountingService();
    }
    return AutomatedPRCountingService.instance;
  }

  /**
   * Start automated PR counting for a teacher
   */
  public async startAutomatedCounting(teacherId: string, intervalMinutes: number = 60): Promise<boolean> {
    try {
      // Stop existing schedule if any
      await this.stopAutomatedCounting(teacherId);

      // Create new schedule
      const intervalMs = intervalMinutes * 60 * 1000;
      const timeout = setInterval(async () => {
        await this.runCountingJob(teacherId);
      }, intervalMs);

      this.schedules.set(teacherId, timeout);

      // Store schedule in database
      await this.storeSchedule(teacherId, intervalMinutes, true);

      // Run initial count
      await this.runCountingJob(teacherId);

      logger.info(`Started automated PR counting for teacher ${teacherId} with ${intervalMinutes} minute interval`);
      return true;
    } catch (error) {
      logger.error(`Failed to start automated counting for teacher ${teacherId}:`, error);
      return false;
    }
  }

  /**
   * Stop automated PR counting for a teacher
   */
  public async stopAutomatedCounting(teacherId: string): Promise<boolean> {
    try {
      const timeout = this.schedules.get(teacherId);
      if (timeout) {
        clearInterval(timeout);
        this.schedules.delete(teacherId);
      }

      // Update schedule in database
      await this.updateScheduleStatus(teacherId, false);

      logger.info(`Stopped automated PR counting for teacher ${teacherId}`);
      return true;
    } catch (error) {
      logger.error(`Failed to stop automated counting for teacher ${teacherId}:`, error);
      return false;
    }
  }

  /**
   * Run a single PR counting job for a teacher
   */
  public async runCountingJob(teacherId: string): Promise<PRCountingJob> {
    const jobId = `${teacherId}-${Date.now()}`;
    
    const job: PRCountingJob = {
      id: jobId,
      teacherId,
      status: 'pending',
      studentsProcessed: 0,
      totalStudents: 0,
      prsFound: 0,
      errors: []
    };

    try {
      // Check if already running
      if (this.runningJobs.has(teacherId)) {
        const existingJob = this.runningJobs.get(teacherId)!;
        logger.warn(`PR counting job already running for teacher ${teacherId}, job: ${existingJob.id}`);
        return existingJob;
      }

      job.status = 'running';
      job.startedAt = new Date();
      this.runningJobs.set(teacherId, job);

      logger.info(`Starting PR counting job ${jobId} for teacher ${teacherId}`);

      // Get all student mappings
      const mappings = await this.mappingService.getTeacherMappings(teacherId);
      job.totalStudents = mappings.length;

      if (mappings.length === 0) {
        job.status = 'completed';
        job.completedAt = new Date();
        job.errors.push('No student mappings found');
        this.runningJobs.delete(teacherId);
        return job;
      }

      // Process each student
      for (const mapping of mappings) {
        try {
          const prs = await this.prTrackingService.fetchStudentPRs(teacherId, mapping.studentId);
          job.prsFound += prs.length;
          job.studentsProcessed++;

          logger.debug(`Processed student ${mapping.studentId}: found ${prs.length} PRs`);
        } catch (error) {
          const errorMsg = `Failed to process student ${mapping.studentId}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          job.errors.push(errorMsg);
          logger.error(errorMsg);
        }
      }

      job.status = 'completed';
      job.completedAt = new Date();

      // Update last run time
      await this.updateLastRunTime(teacherId);

      // Publish real-time sync completion event
      await this.publishSyncCompletionEvent(job);

      logger.info(`Completed PR counting job ${jobId}: processed ${job.studentsProcessed}/${job.totalStudents} students, found ${job.prsFound} PRs`);

    } catch (error) {
      job.status = 'failed';
      job.completedAt = new Date();
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      job.errors.push(errorMsg);
      logger.error(`PR counting job ${jobId} failed:`, error);
    } finally {
      this.runningJobs.delete(teacherId);
    }

    return job;
  }

  /**
   * Publish sync completion event for real-time updates
   */
  private async publishSyncCompletionEvent(job: PRCountingJob): Promise<void> {
    try {
      const duration = job.completedAt && job.startedAt 
        ? job.completedAt.getTime() - job.startedAt.getTime()
        : 0;

      await db.publishEvent('sync_completion', {
        type: 'sync_completed',
        teacherId: job.teacherId,
        studentsProcessed: job.studentsProcessed,
        prsFound: job.prsFound,
        duration,
        status: job.status,
        errors: job.errors,
        timestamp: new Date().toISOString()
      });

      logger.debug(`Published sync completion event for teacher ${job.teacherId}`);

    } catch (error) {
      logger.error('Error publishing sync completion event:', error);
    }
  }

  /**
   * Get current job status for a teacher
   */
  public getJobStatus(teacherId: string): PRCountingJob | null {
    return this.runningJobs.get(teacherId) || null;
  }

  /**
   * Check for duplicate PRs and remove them
   */
  public async removeDuplicatePRs(teacherId?: string): Promise<{ removed: number; errors: string[] }> {
    try {
      let query = `
        DELETE FROM student_pr_submissions 
        WHERE id IN (
          SELECT id FROM (
            SELECT id, ROW_NUMBER() OVER (
              PARTITION BY pr_id, repository_url 
              ORDER BY synced_at DESC
            ) as rn
            FROM student_pr_submissions
            ${teacherId ? 'WHERE student_id IN (SELECT student_id FROM student_github_profiles WHERE teacher_id = $1)' : ''}
          ) t WHERE rn > 1
        )
      `;

      const params = teacherId ? [teacherId] : [];
      const result = await db.query(query, params);
      
      const removed = result.rowCount || 0;
      logger.info(`Removed ${removed} duplicate PRs${teacherId ? ` for teacher ${teacherId}` : ''}`);

      return {
        removed,
        errors: []
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to remove duplicate PRs:', error);
      return {
        removed: 0,
        errors: [errorMsg]
      };
    }
  }

  /**
   * Real-time PR detection using webhooks
   */
  public async handleWebhookEvent(payload: any): Promise<boolean> {
    try {
      if (!payload.pull_request || !payload.repository) {
        return false;
      }

      const pr = payload.pull_request;
      const repo = payload.repository;
      const action = payload.action;

      // Only handle relevant actions
      if (!['opened', 'closed', 'reopened', 'synchronize'].includes(action)) {
        return false;
      }

      // Find if this repository is monitored
      const repositoryName = repo.name;
      const repositoryOwner = repo.owner.login;
      const repositoryFullName = `${repositoryOwner}/${repositoryName}`;

      const monitoredRepo = await this.getMonitoredRepository(repositoryFullName);
      if (!monitoredRepo) {
        logger.debug(`Repository ${repositoryFullName} is not monitored`);
        return false;
      }

      // Find student mapping
      const githubUsername = pr.user.login;
      const studentId = await this.mappingService.getStudentId(githubUsername, monitoredRepo.teacherId);
      
      if (!studentId) {
        logger.debug(`No student mapping found for GitHub user ${githubUsername}`);
        return false;
      }

      // Create PR object
      const pullRequest = {
        id: pr.id.toString(),
        studentUsername: githubUsername,
        repository: repositoryFullName,
        repositoryUrl: repo.html_url,
        prNumber: pr.number,
        title: pr.title,
        url: pr.html_url,
        createdAt: new Date(pr.created_at),
        updatedAt: pr.updated_at ? new Date(pr.updated_at) : undefined,
        closedAt: pr.closed_at ? new Date(pr.closed_at) : undefined,
        mergedAt: pr.merged_at ? new Date(pr.merged_at) : undefined,
        status: pr.merged_at ? 'merged' : pr.state as 'open' | 'closed',
        commitCount: pr.commits || 0,
        linesAdded: pr.additions || 0,
        linesDeleted: pr.deletions || 0,
        linesChanged: (pr.additions || 0) + (pr.deletions || 0),
        filesChanged: pr.changed_files || 0,
        reviewComments: pr.review_comments || 0,
        isDraft: pr.draft || false,
        metadata: {
          webhookAction: action,
          processedAt: new Date().toISOString()
        }
      };

      // Store the PR
      await this.storePRFromWebhook(pullRequest, studentId);

      logger.info(`Processed webhook event: ${action} for PR ${pr.number} by ${githubUsername} in ${repositoryFullName}`);
      return true;

    } catch (error) {
      logger.error('Failed to handle webhook event:', error);
      return false;
    }
  }

  /**
   * Get monitored repository info
   */
  private async getMonitoredRepository(repositoryFullName: string): Promise<{ teacherId: string } | null> {
    try {
      const [owner, name] = repositoryFullName.split('/');
      const query = `
        SELECT teacher_id 
        FROM monitored_repositories 
        WHERE repository_owner = $1 AND repository_name = $2 AND is_active = true
      `;
      
      const result = await db.query(query, [owner, name]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return { teacherId: result.rows[0].teacher_id };
    } catch (error) {
      logger.error(`Failed to get monitored repository ${repositoryFullName}:`, error);
      return null;
    }
  }

  /**
   * Store PR from webhook event
   */
  private async storePRFromWebhook(pr: any, studentId: string): Promise<void> {
    try {
      const query = `
        INSERT INTO student_pr_submissions (
          student_id, github_username, repository_name, repository_url, pr_number, pr_id, pr_title, pr_url,
          created_at, updated_at, closed_at, merged_at, status, commit_count, lines_added, lines_deleted,
          files_changed, review_comments, is_draft, metadata, synced_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, NOW())
        ON CONFLICT (pr_id, repository_url) 
        DO UPDATE SET 
          updated_at = $10,
          closed_at = $11,
          merged_at = $12,
          status = $13,
          commit_count = $14,
          lines_added = $15,
          lines_deleted = $16,
          files_changed = $17,
          review_comments = $18,
          is_draft = $19,
          metadata = $20,
          synced_at = NOW()
      `;

      const values = [
        studentId,
        pr.studentUsername,
        pr.repository.split('/')[1],
        pr.repositoryUrl,
        pr.prNumber,
        pr.id,
        pr.title,
        pr.url,
        pr.createdAt,
        pr.updatedAt,
        pr.closedAt,
        pr.mergedAt,
        pr.status,
        pr.commitCount,
        pr.linesAdded,
        pr.linesDeleted,
        pr.filesChanged,
        pr.reviewComments,
        pr.isDraft,
        JSON.stringify(pr.metadata)
      ];

      await db.query(query, values);
    } catch (error) {
      logger.error(`Failed to store PR from webhook:`, error);
      throw error;
    }
  }

  /**
   * Store schedule in database
   */
  private async storeSchedule(teacherId: string, intervalMinutes: number, isActive: boolean): Promise<void> {
    try {
      const query = `
        INSERT INTO pr_counting_schedules (teacher_id, interval_minutes, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, NOW(), NOW())
        ON CONFLICT (teacher_id)
        DO UPDATE SET 
          interval_minutes = $2,
          is_active = $3,
          updated_at = NOW()
      `;

      await db.query(query, [teacherId, intervalMinutes, isActive]);
    } catch (error) {
      logger.error(`Failed to store schedule for teacher ${teacherId}:`, error);
    }
  }

  /**
   * Update schedule status
   */
  private async updateScheduleStatus(teacherId: string, isActive: boolean): Promise<void> {
    try {
      const query = `
        UPDATE pr_counting_schedules 
        SET is_active = $2, updated_at = NOW()
        WHERE teacher_id = $1
      `;

      await db.query(query, [teacherId, isActive]);
    } catch (error) {
      logger.error(`Failed to update schedule status for teacher ${teacherId}:`, error);
    }
  }

  /**
   * Update last run time
   */
  private async updateLastRunTime(teacherId: string): Promise<void> {
    try {
      const query = `
        UPDATE pr_counting_schedules 
        SET last_run = NOW(), updated_at = NOW()
        WHERE teacher_id = $1
      `;

      await db.query(query, [teacherId]);
    } catch (error) {
      logger.error(`Failed to update last run time for teacher ${teacherId}:`, error);
    }
  }

  /**
   * Get schedule for a teacher
   */
  public async getSchedule(teacherId: string): Promise<PRCountingSchedule | null> {
    try {
      const query = `
        SELECT teacher_id, interval_minutes, is_active, last_run, 
               (last_run + INTERVAL '1 minute' * interval_minutes) as next_run
        FROM pr_counting_schedules 
        WHERE teacher_id = $1
      `;

      const result = await db.query(query, [teacherId]);

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        teacherId: row.teacher_id,
        intervalMinutes: row.interval_minutes,
        isActive: row.is_active,
        lastRun: row.last_run ? new Date(row.last_run) : undefined,
        nextRun: row.next_run ? new Date(row.next_run) : undefined
      };
    } catch (error) {
      logger.error(`Failed to get schedule for teacher ${teacherId}:`, error);
      return null;
    }
  }

  /**
   * Get PR counting statistics
   */
  public async getCountingStats(teacherId: string): Promise<{
    totalPRs: number;
    prsToday: number;
    prsThisWeek: number;
    lastSync: Date | null;
    duplicatesRemoved: number;
  }> {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_prs,
          COUNT(CASE WHEN DATE(synced_at) = CURRENT_DATE THEN 1 END) as prs_today,
          COUNT(CASE WHEN synced_at >= NOW() - INTERVAL '7 days' THEN 1 END) as prs_this_week,
          MAX(synced_at) as last_sync
        FROM student_pr_submissions sps
        JOIN student_github_profiles sgp ON sps.student_id = sgp.student_id
        WHERE sgp.teacher_id = $1
      `;

      const result = await db.query(query, [teacherId]);
      const row = result.rows[0];

      // Get duplicates removed (this would need to be tracked separately)
      const duplicatesRemoved = 0; // Placeholder

      return {
        totalPRs: parseInt(row.total_prs),
        prsToday: parseInt(row.prs_today),
        prsThisWeek: parseInt(row.prs_this_week),
        lastSync: row.last_sync ? new Date(row.last_sync) : null,
        duplicatesRemoved
      };
    } catch (error) {
      logger.error(`Failed to get counting stats for teacher ${teacherId}:`, error);
      return {
        totalPRs: 0,
        prsToday: 0,
        prsThisWeek: 0,
        lastSync: null,
        duplicatesRemoved: 0
      };
    }
  }

  /**
   * Initialize service and restore schedules
   */
  public async initialize(): Promise<void> {
    try {
      // Create schedules table if it doesn't exist
      await this.createSchedulesTable();

      // Restore active schedules
      const activeSchedules = await this.getActiveSchedules();
      
      for (const schedule of activeSchedules) {
        const intervalMs = schedule.intervalMinutes * 60 * 1000;
        const timeout = setInterval(async () => {
          await this.runCountingJob(schedule.teacherId);
        }, intervalMs);

        this.schedules.set(schedule.teacherId, timeout);
        logger.info(`Restored automated counting schedule for teacher ${schedule.teacherId}`);
      }

      logger.info(`Initialized automated PR counting service with ${activeSchedules.length} active schedules`);
    } catch (error) {
      logger.error('Failed to initialize automated PR counting service:', error);
    }
  }

  /**
   * Create schedules table
   */
  private async createSchedulesTable(): Promise<void> {
    try {
      const query = `
        CREATE TABLE IF NOT EXISTS pr_counting_schedules (
          id SERIAL PRIMARY KEY,
          teacher_id VARCHAR(255) NOT NULL UNIQUE,
          interval_minutes INTEGER NOT NULL DEFAULT 60,
          is_active BOOLEAN DEFAULT true,
          last_run TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `;

      await db.query(query);
    } catch (error) {
      logger.error('Failed to create schedules table:', error);
    }
  }

  /**
   * Get active schedules
   */
  private async getActiveSchedules(): Promise<PRCountingSchedule[]> {
    try {
      const query = `
        SELECT teacher_id, interval_minutes, is_active, last_run
        FROM pr_counting_schedules 
        WHERE is_active = true
      `;

      const result = await db.query(query);

      return result.rows.map(row => ({
        teacherId: row.teacher_id,
        intervalMinutes: row.interval_minutes,
        isActive: row.is_active,
        lastRun: row.last_run ? new Date(row.last_run) : undefined
      }));
    } catch (error) {
      logger.error('Failed to get active schedules:', error);
      return [];
    }
  }

  /**
   * Shutdown service and clear schedules
   */
  public async shutdown(): Promise<void> {
    try {
      // Clear all intervals
      for (const [teacherId, timeout] of this.schedules) {
        clearInterval(timeout);
        logger.debug(`Cleared schedule for teacher ${teacherId}`);
      }
      
      this.schedules.clear();
      this.runningJobs.clear();
      
      logger.info('Automated PR counting service shutdown complete');
    } catch (error) {
      logger.error('Error during automated PR counting service shutdown:', error);
    }
  }
}