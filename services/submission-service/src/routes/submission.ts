import { Router, Request, Response } from 'express';
import multer from 'multer';
import { SubmissionRepository } from '@/database/repositories';
import { SubmissionProcessingService } from '@/services/SubmissionProcessingService';
import { GitHubService } from '@/services/GitHubService';
import { SubmissionMetricsService } from '@/services/SubmissionMetricsService';
import { CreateSubmissionRequest, UpdateSubmissionRequest, GitHubWebhookPayload } from '@/models';
import { logger } from '@/telemetry/logger';
import { trace, metrics } from '@opentelemetry/api';
import Joi from 'joi';

const router = Router();
const tracer = trace.getTracer('submission-service');
const meter = metrics.getMeter('submission-service', '1.0.0');

// Services
const submissionRepository = new SubmissionRepository();
const processingService = new SubmissionProcessingService();
const githubService = new GitHubService();
const metricsService = new SubmissionMetricsService();

// Submission metrics
const submissionCounter = meter.createCounter('submissions_total', {
  description: 'Total number of submissions processed'
});

const processingDuration = meter.createHistogram('submission_processing_duration_seconds', {
  description: 'Time taken to process submissions'
});

// File upload configuration
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 20 // Maximum 20 files
  },
  fileFilter: (req, file, cb) => {
    // Allow code files only
    const allowedExtensions = ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.cpp', '.c', '.h', '.go', '.rs'];
    const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
    
    if (allowedExtensions.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${fileExtension} not allowed`));
    }
  }
});

// Validation schemas
const createSubmissionSchema = Joi.object({
  title: Joi.string().min(1).max(255).required(),
  description: Joi.string().max(1000).optional(),
  repositoryUrl: Joi.string().uri().optional(),
  commitHash: Joi.string().max(40).optional(),
  submissionType: Joi.string().valid('assignment', 'project', 'challenge').required()
});

const updateSubmissionSchema = Joi.object({
  title: Joi.string().min(1).max(255).optional(),
  description: Joi.string().max(1000).optional(),
  repositoryUrl: Joi.string().uri().optional(),
  commitHash: Joi.string().max(40).optional(),
  status: Joi.string().valid('pending', 'processing', 'completed', 'failed').optional()
});

// Middleware for request validation
const validateRequest = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: any): void => {
    const { error, value } = schema.validate(req.body);
    if (error) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message
          })),
          correlationId: req.correlationId
        }
      });
      return;
    }
    req.body = value;
    next();
  };
};

// Create new submission
router.post('/', upload.array('files'), validateRequest(createSubmissionSchema), async (req: Request, res: Response): Promise<void> => {
  const span = tracer.startSpan('create_submission');
  
  try {
    // For now, we'll use a mock user ID - in real implementation, this would come from authentication
    const userId = req.headers['x-user-id'] as string || 'mock-user-id';
    const submissionData: CreateSubmissionRequest = req.body;
    
    span.setAttributes({
      'submission.type': submissionData.submissionType,
      'submission.title': submissionData.title,
      'user.id': userId
    });

    // Handle uploaded files
    const files = req.files as Express.Multer.File[];
    if (files && files.length > 0) {
      submissionData.files = files.map(file => ({
        filename: file.originalname,
        content: file.buffer.toString('utf-8'),
        language: file.originalname.substring(file.originalname.lastIndexOf('.') + 1),
        size: file.size
      }));
    }

    // Create submission in database
    const submission = await submissionRepository.createSubmission(userId, submissionData);
    
    // Queue for processing
    await processingService.queueSubmissionProcessing({
      submissionId: submission.id,
      userId: submission.userId,
      repositoryUrl: submission.repositoryUrl || undefined,
      commitHash: submission.commitHash || undefined,
      submissionType: submission.submissionType
    });

    submissionCounter.add(1, { 
      type: 'create',
      submission_type: submissionData.submissionType
    });

    span.setAttributes({ 'operation.success': true });
    
    logger.info('Submission created successfully', {
      submissionId: submission.id,
      userId,
      type: submissionData.submissionType,
      correlationId: req.correlationId
    });

    res.status(201).json({
      success: true,
      data: submission,
      correlationId: req.correlationId
    });

  } catch (error) {
    span.recordException(error as Error);
    span.setAttributes({ 'operation.success': false });
    
    logger.error('Failed to create submission', {
      error,
      correlationId: req.correlationId
    });

    const message = error instanceof Error ? error.message : 'Failed to create submission';
    res.status(500).json({
      error: {
        code: 'SUBMISSION_CREATION_FAILED',
        message,
        correlationId: req.correlationId
      }
    });
  } finally {
    span.end();
  }
});

// Get submission status
router.get('/:id/status', async (req: Request, res: Response): Promise<void> => {
  const span = tracer.startSpan('get_submission_status');
  
  try {
    const submissionId = req.params.id;
    
    span.setAttributes({
      'submission.id': submissionId
    });

    const submission = await submissionRepository.findById(submissionId);
    
    if (!submission) {
      res.status(404).json({
        error: {
          code: 'SUBMISSION_NOT_FOUND',
          message: 'Submission not found',
          correlationId: req.correlationId
        }
      });
      return;
    }

    span.setAttributes({ 'operation.success': true });

    res.status(200).json({
      success: true,
      data: {
        id: submission.id,
        status: submission.status,
        metrics: submission.metrics,
        createdAt: submission.createdAt,
        updatedAt: submission.updatedAt,
        completedAt: submission.completedAt
      },
      correlationId: req.correlationId
    });

  } catch (error) {
    span.recordException(error as Error);
    span.setAttributes({ 'operation.success': false });
    
    logger.error('Failed to get submission status', {
      error,
      submissionId: req.params.id,
      correlationId: req.correlationId
    });

    res.status(500).json({
      error: {
        code: 'STATUS_FETCH_FAILED',
        message: 'Failed to retrieve submission status',
        correlationId: req.correlationId
      }
    });
  } finally {
    span.end();
  }
});

// Get user submissions
router.get('/user/:userId', async (req: Request, res: Response): Promise<void> => {
  const span = tracer.startSpan('get_user_submissions');
  
  try {
    const userId = req.params.userId;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    
    span.setAttributes({
      'user.id': userId,
      'query.limit': limit,
      'query.offset': offset
    });

    const submissions = await submissionRepository.findByUserId(userId, limit, offset);
    const stats = await submissionRepository.getSubmissionStats(userId);

    span.setAttributes({ 'operation.success': true });

    res.status(200).json({
      success: true,
      data: {
        submissions,
        stats,
        pagination: {
          limit,
          offset,
          total: stats.total
        }
      },
      correlationId: req.correlationId
    });

  } catch (error) {
    span.recordException(error as Error);
    span.setAttributes({ 'operation.success': false });
    
    logger.error('Failed to get user submissions', {
      error,
      userId: req.params.userId,
      correlationId: req.correlationId
    });

    res.status(500).json({
      error: {
        code: 'SUBMISSIONS_FETCH_FAILED',
        message: 'Failed to retrieve user submissions',
        correlationId: req.correlationId
      }
    });
  } finally {
    span.end();
  }
});

// Update submission
router.put('/:id', validateRequest(updateSubmissionSchema), async (req: Request, res: Response): Promise<void> => {
  const span = tracer.startSpan('update_submission');
  
  try {
    const submissionId = req.params.id;
    const updateData: UpdateSubmissionRequest = req.body;
    
    span.setAttributes({
      'submission.id': submissionId
    });

    const submission = await submissionRepository.updateSubmission(submissionId, updateData);
    
    if (!submission) {
      res.status(404).json({
        error: {
          code: 'SUBMISSION_NOT_FOUND',
          message: 'Submission not found',
          correlationId: req.correlationId
        }
      });
      return;
    }

    span.setAttributes({ 'operation.success': true });
    
    logger.info('Submission updated successfully', {
      submissionId,
      correlationId: req.correlationId
    });

    res.status(200).json({
      success: true,
      data: submission,
      correlationId: req.correlationId
    });

  } catch (error) {
    span.recordException(error as Error);
    span.setAttributes({ 'operation.success': false });
    
    logger.error('Failed to update submission', {
      error,
      submissionId: req.params.id,
      correlationId: req.correlationId
    });

    res.status(500).json({
      error: {
        code: 'SUBMISSION_UPDATE_FAILED',
        message: 'Failed to update submission',
        correlationId: req.correlationId
      }
    });
  } finally {
    span.end();
  }
});

// Delete submission
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  const span = tracer.startSpan('delete_submission');
  
  try {
    const submissionId = req.params.id;
    
    span.setAttributes({
      'submission.id': submissionId
    });

    // Check if submission exists
    const submission = await submissionRepository.findById(submissionId);
    if (!submission) {
      res.status(404).json({
        error: {
          code: 'SUBMISSION_NOT_FOUND',
          message: 'Submission not found',
          correlationId: req.correlationId
        }
      });
      return;
    }

    await submissionRepository.deleteSubmission(submissionId);

    span.setAttributes({ 'operation.success': true });
    
    logger.info('Submission deleted successfully', {
      submissionId,
      correlationId: req.correlationId
    });

    res.status(200).json({
      success: true,
      message: 'Submission deleted successfully',
      correlationId: req.correlationId
    });

  } catch (error) {
    span.recordException(error as Error);
    span.setAttributes({ 'operation.success': false });
    
    logger.error('Failed to delete submission', {
      error,
      submissionId: req.params.id,
      correlationId: req.correlationId
    });

    res.status(500).json({
      error: {
        code: 'SUBMISSION_DELETE_FAILED',
        message: 'Failed to delete submission',
        correlationId: req.correlationId
      }
    });
  } finally {
    span.end();
  }
});

// GitHub webhook endpoint
router.post('/webhook/github', async (req: Request, res: Response): Promise<void> => {
  const span = tracer.startSpan('github_webhook');
  
  try {
    const signature = req.headers['x-hub-signature-256'] as string;
    const payload = JSON.stringify(req.body);
    const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET || 'default-secret';
    
    // Validate webhook signature
    if (!await githubService.validateWebhookSignature(payload, signature, webhookSecret)) {
      res.status(401).json({
        error: {
          code: 'INVALID_SIGNATURE',
          message: 'Invalid webhook signature',
          correlationId: req.correlationId
        }
      });
      return;
    }

    const webhookData: GitHubWebhookPayload = req.body;
    
    span.setAttributes({
      'github.action': webhookData.action,
      'github.repository': webhookData.repository.full_name
    });

    // Handle different webhook events
    if (webhookData.action === 'opened' || webhookData.action === 'synchronize') {
      // Handle pull request events
      if (webhookData.pull_request) {
        logger.info('GitHub pull request webhook received', {
          action: webhookData.action,
          repository: webhookData.repository.full_name,
          prNumber: webhookData.pull_request.number,
          correlationId: req.correlationId
        });

        // Here you would typically:
        // 1. Find or create a submission for this PR
        // 2. Queue it for processing
        // 3. Update submission status
      }
    }

    span.setAttributes({ 'operation.success': true });

    res.status(200).json({
      success: true,
      message: 'Webhook processed successfully',
      correlationId: req.correlationId
    });

  } catch (error) {
    span.recordException(error as Error);
    span.setAttributes({ 'operation.success': false });
    
    logger.error('Failed to process GitHub webhook', {
      error,
      correlationId: req.correlationId
    });

    res.status(500).json({
      error: {
        code: 'WEBHOOK_PROCESSING_FAILED',
        message: 'Failed to process webhook',
        correlationId: req.correlationId
      }
    });
  } finally {
    span.end();
  }
});

// Get processing queue stats
router.get('/queue/stats', async (req: Request, res: Response): Promise<void> => {
  try {
    const stats = await processingService.getQueueStats();
    
    res.status(200).json({
      success: true,
      data: stats,
      correlationId: req.correlationId
    });
  } catch (error) {
    logger.error('Failed to get queue stats', {
      error,
      correlationId: req.correlationId
    });

    res.status(500).json({
      error: {
        code: 'QUEUE_STATS_FAILED',
        message: 'Failed to retrieve queue statistics',
        correlationId: req.correlationId
      }
    });
  }
});

// Get submission analytics
router.get('/analytics', async (req: Request, res: Response): Promise<void> => {
  const span = tracer.startSpan('get_submission_analytics');
  
  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();
    const submissionType = req.query.submissionType as string;

    const analytics = await metricsService.getSubmissionAnalytics(
      { startDate, endDate },
      submissionType
    );

    span.setAttributes({
      'analytics.total_submissions': analytics.totalSubmissions,
      'analytics.success_rate': analytics.successRate
    });

    res.status(200).json({
      success: true,
      data: analytics,
      correlationId: req.correlationId
    });

  } catch (error) {
    span.recordException(error as Error);
    span.setAttributes({ 'operation.success': false });
    
    logger.error('Failed to get submission analytics', {
      error,
      correlationId: req.correlationId
    });

    res.status(500).json({
      error: {
        code: 'ANALYTICS_FAILED',
        message: 'Failed to retrieve submission analytics',
        correlationId: req.correlationId
      }
    });
  } finally {
    span.end();
  }
});

// Get active submissions metrics
router.get('/metrics/active', async (req: Request, res: Response): Promise<void> => {
  try {
    const activeMetrics = await metricsService.getActiveSubmissionsMetrics();
    
    res.status(200).json({
      success: true,
      data: activeMetrics,
      correlationId: req.correlationId
    });
  } catch (error) {
    logger.error('Failed to get active submissions metrics', {
      error,
      correlationId: req.correlationId
    });

    res.status(500).json({
      error: {
        code: 'ACTIVE_METRICS_FAILED',
        message: 'Failed to retrieve active submissions metrics',
        correlationId: req.correlationId
      }
    });
  }
});

// Get submission performance metrics
router.get('/:id/metrics', async (req: Request, res: Response): Promise<void> => {
  try {
    const submissionId = req.params.id;
    const performanceMetrics = await metricsService.getSubmissionPerformanceMetrics(submissionId);
    
    if (!performanceMetrics) {
      res.status(404).json({
        error: {
          code: 'METRICS_NOT_FOUND',
          message: 'Performance metrics not found for submission',
          correlationId: req.correlationId
        }
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: performanceMetrics,
      correlationId: req.correlationId
    });
  } catch (error) {
    logger.error('Failed to get submission performance metrics', {
      error,
      submissionId: req.params.id,
      correlationId: req.correlationId
    });

    res.status(500).json({
      error: {
        code: 'PERFORMANCE_METRICS_FAILED',
        message: 'Failed to retrieve submission performance metrics',
        correlationId: req.correlationId
      }
    });
  }
});

export { router as submissionRouter };