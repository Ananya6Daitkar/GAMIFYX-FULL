import Bull, { Queue, Job } from 'bull';
import { SubmissionRepository } from '@/database/repositories';
import { GitHubService } from './GitHubService';
import { CodeAnalysisService } from './CodeAnalysisService';
import { WebSocketService } from './WebSocketService';
import { SubmissionMetricsService } from './SubmissionMetricsService';
import { Submission, SubmissionStatusUpdate, SubmissionMetrics } from '@/models';
import { logger } from '@/telemetry/logger';
import { metrics, trace } from '@opentelemetry/api';

const meter = metrics.getMeter('submission-service', '1.0.0');
const tracer = trace.getTracer('submission-service');

// Metrics
const processingDuration = meter.createHistogram('submission_processing_duration_seconds', {
  description: 'Time taken to process submissions'
});

const processingCounter = meter.createCounter('submission_processing_total', {
  description: 'Total number of submissions processed'
});

const processingErrors = meter.createCounter('submission_processing_errors_total', {
  description: 'Total number of submission processing errors'
});

export interface SubmissionJobData {
  submissionId: string;
  userId: string;
  repositoryUrl?: string;
  commitHash?: string;
  submissionType: string;
}

export class SubmissionProcessingService {
  private queue: Queue;
  private submissionRepository: SubmissionRepository;
  private githubService: GitHubService;
  private codeAnalysisService: CodeAnalysisService;
  private webSocketService: WebSocketService;
  private metricsService: SubmissionMetricsService;

  constructor() {
    this.submissionRepository = new SubmissionRepository();
    this.githubService = new GitHubService();
    this.codeAnalysisService = new CodeAnalysisService();
    this.webSocketService = new WebSocketService();
    this.metricsService = new SubmissionMetricsService();

    // Initialize Bull queue with Redis connection
    this.queue = new Bull('submission processing', {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        ...(process.env.REDIS_PASSWORD && { password: process.env.REDIS_PASSWORD }),
      },
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    });

    this.setupJobProcessors();
    this.setupEventHandlers();
  }

  private setupJobProcessors(): void {
    // Main submission processing job
    this.queue.process('process-submission', 5, this.processSubmission.bind(this));
    
    // Code analysis job
    this.queue.process('analyze-code', 3, this.analyzeCode.bind(this));
    
    // GitHub integration job
    this.queue.process('github-integration', 2, this.processGitHubIntegration.bind(this));
  }

  private setupEventHandlers(): void {
    this.queue.on('completed', (job: Job) => {
      logger.info('Job completed', { 
        jobId: job.id, 
        jobType: job.name,
        submissionId: job.data.submissionId 
      });
    });

    this.queue.on('failed', (job: Job, err: Error) => {
      logger.error('Job failed', { 
        jobId: job.id, 
        jobType: job.name,
        submissionId: job.data.submissionId,
        error: err.message 
      });
      
      processingErrors.add(1, { 
        job_type: job.name,
        error_type: err.name 
      });
    });

    this.queue.on('stalled', (job: Job) => {
      logger.warn('Job stalled', { 
        jobId: job.id, 
        jobType: job.name,
        submissionId: job.data.submissionId 
      });
    });
  }

  async queueSubmissionProcessing(submissionData: SubmissionJobData): Promise<void> {
    const span = tracer.startSpan('queue_submission_processing');
    
    try {
      // Add main processing job
      await this.queue.add('process-submission', submissionData, {
        priority: this.getJobPriority(submissionData.submissionType),
        delay: 0,
      });

      // Add parallel jobs for different aspects
      if (submissionData.repositoryUrl) {
        await this.queue.add('github-integration', submissionData, {
          priority: 5,
          delay: 1000, // Small delay to let main job start
        });
      }

      await this.queue.add('analyze-code', submissionData, {
        priority: 3,
        delay: 2000, // Delay to allow code to be fetched first
      });

      span.setAttributes({
        'submission.id': submissionData.submissionId,
        'submission.type': submissionData.submissionType,
        'operation.success': true
      });

      logger.info('Submission queued for processing', {
        submissionId: submissionData.submissionId,
        userId: submissionData.userId,
        type: submissionData.submissionType
      });
    } catch (error) {
      span.recordException(error as Error);
      span.setAttributes({ 'operation.success': false });
      
      logger.error('Failed to queue submission processing', {
        error,
        submissionId: submissionData.submissionId
      });
      throw error;
    } finally {
      span.end();
    }
  }

  private async processSubmission(job: Job<SubmissionJobData>): Promise<void> {
    const span = tracer.startSpan('process_submission_job');
    const startTime = Date.now();
    
    try {
      const { submissionId, userId } = job.data;
      
      span.setAttributes({
        'submission.id': submissionId,
        'user.id': userId,
        'job.id': job.id?.toString() || 'unknown'
      });

      // Record submission start metrics
      await this.metricsService.recordSubmissionStart(submissionId, job.data.submissionType, 0);

      // Update submission status to processing
      await this.updateSubmissionStatus(submissionId, 'processing', 'Starting submission processing', 10);

      // Get submission details
      const submission = await this.submissionRepository.findById(submissionId);
      if (!submission) {
        throw new Error('Submission not found');
      }

      // Update progress
      await this.updateSubmissionStatus(submissionId, 'processing', 'Submission retrieved', 20);

      // Process based on submission type
      let metrics: Partial<SubmissionMetrics> = {};
      
      switch (submission.submissionType) {
        case 'assignment':
          metrics = await this.processAssignment(submission, job);
          break;
        case 'project':
          metrics = await this.processProject(submission, job);
          break;
        case 'challenge':
          metrics = await this.processChallenge(submission, job);
          break;
        default:
          throw new Error(`Unknown submission type: ${submission.submissionType}`);
      }

      // Update submission with final metrics and status
      await this.submissionRepository.updateSubmission(submissionId, {
        status: 'completed',
        metrics
      });

      await this.updateSubmissionStatus(submissionId, 'completed', 'Processing completed successfully', 100);

      // Record completion metrics
      await this.metricsService.recordSubmissionCompletion(submissionId, true, metrics);

      // Record metrics
      const duration = (Date.now() - startTime) / 1000;
      processingDuration.record(duration, { 
        submission_type: submission.submissionType,
        status: 'completed'
      });
      
      processingCounter.add(1, { 
        submission_type: submission.submissionType,
        status: 'completed'
      });

      span.setAttributes({ 'operation.success': true });
      
      logger.info('Submission processing completed', {
        submissionId,
        userId,
        duration,
        type: submission.submissionType
      });

    } catch (error) {
      const duration = (Date.now() - startTime) / 1000;
      
      span.recordException(error as Error);
      span.setAttributes({ 'operation.success': false });
      
      // Update submission status to failed
      await this.updateSubmissionStatus(
        job.data.submissionId, 
        'failed', 
        `Processing failed: ${(error as Error).message}`, 
        0
      );

      await this.submissionRepository.updateSubmission(job.data.submissionId, {
        status: 'failed'
      });

      // Record failure metrics
      await this.metricsService.recordSubmissionCompletion(
        job.data.submissionId, 
        false, 
        {}, 
        (error as Error).name
      );

      // Record error metrics
      processingDuration.record(duration, { 
        submission_type: job.data.submissionType,
        status: 'failed'
      });
      
      processingCounter.add(1, { 
        submission_type: job.data.submissionType,
        status: 'failed'
      });

      logger.error('Submission processing failed', {
        error,
        submissionId: job.data.submissionId,
        userId: job.data.userId,
        duration
      });

      throw error;
    } finally {
      span.end();
    }
  }

  private async analyzeCode(job: Job<SubmissionJobData>): Promise<void> {
    const span = tracer.startSpan('analyze_code_job');
    
    try {
      const { submissionId } = job.data;
      
      span.setAttributes({
        'submission.id': submissionId,
        'job.id': job.id?.toString() || 'unknown'
      });

      const submission = await this.submissionRepository.findById(submissionId);
      if (!submission) {
        throw new Error('Submission not found');
      }

      // Perform code analysis
      const analysisResults = await this.codeAnalysisService.analyzeSubmission(submission);
      
      // Update submission metrics with analysis results
      await this.submissionRepository.updateMetrics(submissionId, analysisResults);

      span.setAttributes({ 'operation.success': true });
      
      logger.info('Code analysis completed', {
        submissionId,
        analysisResults
      });

    } catch (error) {
      span.recordException(error as Error);
      span.setAttributes({ 'operation.success': false });
      
      logger.error('Code analysis failed', {
        error,
        submissionId: job.data.submissionId
      });

      // Don't throw error to prevent job retry for analysis failures
    } finally {
      span.end();
    }
  }

  private async processGitHubIntegration(job: Job<SubmissionJobData>): Promise<void> {
    const span = tracer.startSpan('github_integration_job');
    
    try {
      const { submissionId, repositoryUrl, commitHash } = job.data;
      
      if (!repositoryUrl) {
        logger.info('No repository URL provided, skipping GitHub integration', { submissionId });
        return;
      }

      span.setAttributes({
        'submission.id': submissionId,
        'github.repository': repositoryUrl,
        'github.commit': commitHash || 'latest'
      });

      // Process GitHub integration
      const githubData = await this.githubService.processRepository(repositoryUrl, commitHash);
      
      // Update submission with GitHub data
      await this.submissionRepository.updateMetrics(submissionId, {
        linesOfCode: githubData.linesOfCode,
        complexity: githubData.complexity
      });

      span.setAttributes({ 'operation.success': true });
      
      logger.info('GitHub integration completed', {
        submissionId,
        repositoryUrl,
        githubData
      });

    } catch (error) {
      span.recordException(error as Error);
      span.setAttributes({ 'operation.success': false });
      
      logger.error('GitHub integration failed', {
        error,
        submissionId: job.data.submissionId,
        repositoryUrl: job.data.repositoryUrl
      });

      // Don't throw error to prevent job retry for GitHub failures
    } finally {
      span.end();
    }
  }

  private async processAssignment(submission: Submission, job: Job): Promise<Partial<SubmissionMetrics>> {
    // Assignment-specific processing logic
    await this.updateSubmissionStatus(submission.id, 'processing', 'Processing assignment', 40);
    
    // Simulate assignment processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await this.updateSubmissionStatus(submission.id, 'processing', 'Running tests', 70);
    
    // Simulate test execution
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      testCoverage: Math.random() * 100,
      codeQualityScore: Math.random() * 100,
      buildDuration: Math.random() * 30
    };
  }

  private async processProject(submission: Submission, job: Job): Promise<Partial<SubmissionMetrics>> {
    // Project-specific processing logic
    await this.updateSubmissionStatus(submission.id, 'processing', 'Processing project', 30);
    
    // Simulate more complex project processing
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    await this.updateSubmissionStatus(submission.id, 'processing', 'Building project', 60);
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    await this.updateSubmissionStatus(submission.id, 'processing', 'Running comprehensive tests', 80);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return {
      testCoverage: Math.random() * 100,
      codeQualityScore: Math.random() * 100,
      buildDuration: Math.random() * 120,
      complexity: Math.random() * 50
    };
  }

  private async processChallenge(submission: Submission, job: Job): Promise<Partial<SubmissionMetrics>> {
    // Challenge-specific processing logic
    await this.updateSubmissionStatus(submission.id, 'processing', 'Processing challenge', 50);
    
    // Simulate challenge processing
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    await this.updateSubmissionStatus(submission.id, 'processing', 'Evaluating solution', 80);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      testCoverage: Math.random() * 100,
      codeQualityScore: Math.random() * 100,
      buildDuration: Math.random() * 15
    };
  }

  private async updateSubmissionStatus(
    submissionId: string, 
    status: 'pending' | 'processing' | 'completed' | 'failed',
    message: string,
    progress: number
  ): Promise<void> {
    const statusUpdate: SubmissionStatusUpdate = {
      submissionId,
      status,
      message,
      progress,
      timestamp: new Date()
    };

    // Send real-time update via WebSocket
    await this.webSocketService.sendStatusUpdate(statusUpdate);
    
    logger.debug('Submission status updated', statusUpdate);
  }

  private getJobPriority(submissionType: string): number {
    switch (submissionType) {
      case 'challenge':
        return 10; // Highest priority
      case 'assignment':
        return 5;  // Medium priority
      case 'project':
        return 1;  // Lower priority (takes longer)
      default:
        return 3;
    }
  }

  async getQueueStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    const waiting = await this.queue.getWaiting();
    const active = await this.queue.getActive();
    const completed = await this.queue.getCompleted();
    const failed = await this.queue.getFailed();
    const delayed = await this.queue.getDelayed();

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      delayed: delayed.length
    };
  }

  async pauseQueue(): Promise<void> {
    await this.queue.pause();
    logger.info('Submission processing queue paused');
  }

  async resumeQueue(): Promise<void> {
    await this.queue.resume();
    logger.info('Submission processing queue resumed');
  }

  async shutdown(): Promise<void> {
    await this.queue.close();
    logger.info('Submission processing service shut down');
  }
}