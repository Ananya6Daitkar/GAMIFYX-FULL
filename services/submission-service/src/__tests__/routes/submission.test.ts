import request from 'supertest';
import express from 'express';
import { submissionRouter } from '@/routes/submission';
import { SubmissionRepository } from '@/database/repositories';
import { SubmissionProcessingService } from '@/services/SubmissionProcessingService';
import { GitHubService } from '@/services/GitHubService';
import { SubmissionMetricsService } from '@/services/SubmissionMetricsService';

// Mock dependencies
jest.mock('@/database/repositories');
jest.mock('@/services/SubmissionProcessingService');
jest.mock('@/services/GitHubService');
jest.mock('@/services/SubmissionMetricsService');
jest.mock('@/telemetry/logger');

const mockSubmissionRepository = SubmissionRepository as jest.MockedClass<typeof SubmissionRepository>;
const mockProcessingService = SubmissionProcessingService as jest.MockedClass<typeof SubmissionProcessingService>;
const mockGitHubService = GitHubService as jest.MockedClass<typeof GitHubService>;
const mockMetricsService = SubmissionMetricsService as jest.MockedClass<typeof SubmissionMetricsService>;

describe('Submission Routes', () => {
  let app: express.Application;
  let mockSubmissionRepo: jest.Mocked<SubmissionRepository>;
  let mockProcessing: jest.Mocked<SubmissionProcessingService>;
  let mockGithub: jest.Mocked<GitHubService>;
  let mockMetrics: jest.Mocked<SubmissionMetricsService>;

  const mockSubmission = {
    id: 'submission-123',
    userId: 'user-123',
    title: 'Docker Containerization Assignment',
    description: 'Containerize a Node.js application with proper multi-stage builds',
    repositoryUrl: 'https://github.com/Ananya6Daitkar/docker-assignment',
    submissionType: 'assignment',
    status: 'pending',
    metrics: {},
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mocks
    mockSubmissionRepo = new mockSubmissionRepository() as jest.Mocked<SubmissionRepository>;
    mockProcessing = new mockProcessingService() as jest.Mocked<SubmissionProcessingService>;
    mockGithub = new mockGitHubService() as jest.Mocked<GitHubService>;
    mockMetrics = new mockMetricsService() as jest.Mocked<SubmissionMetricsService>;

    // Setup Express app
    app = express();
    app.use(express.json());
    app.use((req: any, res, next) => {
      req.correlationId = 'test-correlation-id';
      next();
    });
    app.use('/submissions', submissionRouter);
  });

  describe('POST /submissions', () => {
    const validSubmissionData = {
      title: 'Docker Containerization Assignment',
      description: 'Containerize a Node.js application with proper multi-stage builds',
      submissionType: 'assignment',
      repositoryUrl: 'https://github.com/Ananya6Daitkar/docker-assignment'
    };

    it('should create a submission successfully', async () => {
      // Arrange
      mockSubmissionRepo.prototype.createSubmission.mockResolvedValue(mockSubmission as any);
      mockProcessing.prototype.queueSubmissionProcessing.mockResolvedValue();

      // Act
      const response = await request(app)
        .post('/submissions')
        .set('x-user-id', 'user-123')
        .send(validSubmissionData);

      // Assert
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockSubmission);
      expect(mockSubmissionRepo.prototype.createSubmission).toHaveBeenCalledWith(
        'user-123',
        validSubmissionData
      );
      expect(mockProcessing.prototype.queueSubmissionProcessing).toHaveBeenCalled();
    });

    it('should validate required fields', async () => {
      // Act
      const response = await request(app)
        .post('/submissions')
        .set('x-user-id', 'user-123')
        .send({
          description: 'Missing title and type'
        });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'title',
            message: expect.stringContaining('required')
          }),
          expect.objectContaining({
            field: 'submissionType',
            message: expect.stringContaining('required')
          })
        ])
      );
    });

    it('should validate submission type', async () => {
      // Act
      const response = await request(app)
        .post('/submissions')
        .set('x-user-id', 'user-123')
        .send({
          ...validSubmissionData,
          submissionType: 'invalid-type'
        });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'submissionType',
            message: expect.stringContaining('assignment')
          })
        ])
      );
    });

    it('should handle database errors', async () => {
      // Arrange
      const dbError = new Error('Database connection failed');
      mockSubmissionRepo.prototype.createSubmission.mockRejectedValue(dbError);

      // Act
      const response = await request(app)
        .post('/submissions')
        .set('x-user-id', 'user-123')
        .send(validSubmissionData);

      // Assert
      expect(response.status).toBe(500);
      expect(response.body.error.code).toBe('SUBMISSION_CREATION_FAILED');
    });

    it('should handle file uploads', async () => {
      // Arrange
      mockSubmissionRepo.prototype.createSubmission.mockResolvedValue(mockSubmission as any);
      mockProcessing.prototype.queueSubmissionProcessing.mockResolvedValue();

      // Act
      const response = await request(app)
        .post('/submissions')
        .set('x-user-id', 'user-123')
        .field('title', 'Test Submission')
        .field('submissionType', 'assignment')
        .attach('files', Buffer.from('console.log("test");'), 'test.js');

      // Assert
      expect(response.status).toBe(201);
      expect(mockSubmissionRepo.prototype.createSubmission).toHaveBeenCalled();
    });
  });

  describe('GET /submissions/:id/status', () => {
    it('should get submission status successfully', async () => {
      // Arrange
      mockSubmissionRepo.prototype.findById.mockResolvedValue(mockSubmission as any);

      // Act
      const response = await request(app)
        .get('/submissions/submission-123/status');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual({
        id: mockSubmission.id,
        status: mockSubmission.status,
        metrics: mockSubmission.metrics,
        createdAt: mockSubmission.createdAt.toISOString(),
        updatedAt: mockSubmission.updatedAt.toISOString(),
        completedAt: mockSubmission.completedAt
      });
    });

    it('should return 404 for non-existent submission', async () => {
      // Arrange
      mockSubmissionRepo.prototype.findById.mockResolvedValue(null);

      // Act
      const response = await request(app)
        .get('/submissions/non-existent/status');

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('SUBMISSION_NOT_FOUND');
    });

    it('should handle database errors', async () => {
      // Arrange
      const dbError = new Error('Database error');
      mockSubmissionRepo.prototype.findById.mockRejectedValue(dbError);

      // Act
      const response = await request(app)
        .get('/submissions/submission-123/status');

      // Assert
      expect(response.status).toBe(500);
      expect(response.body.error.code).toBe('STATUS_FETCH_FAILED');
    });
  });

  describe('GET /submissions/user/:userId', () => {
    it('should get user submissions successfully', async () => {
      // Arrange
      const mockSubmissions = [mockSubmission];
      const mockStats = {
        total: 1,
        pending: 1,
        processing: 0,
        completed: 0,
        failed: 0
      };

      mockSubmissionRepo.prototype.findByUserId.mockResolvedValue(mockSubmissions as any);
      mockSubmissionRepo.prototype.getSubmissionStats.mockResolvedValue(mockStats);

      // Act
      const response = await request(app)
        .get('/submissions/user/user-123');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.submissions).toEqual(mockSubmissions);
      expect(response.body.data.stats).toEqual(mockStats);
      expect(response.body.data.pagination).toEqual({
        limit: 50,
        offset: 0,
        total: 1
      });
    });

    it('should handle pagination parameters', async () => {
      // Arrange
      mockSubmissionRepo.prototype.findByUserId.mockResolvedValue([]);
      mockSubmissionRepo.prototype.getSubmissionStats.mockResolvedValue({
        total: 0, pending: 0, processing: 0, completed: 0, failed: 0
      });

      // Act
      const response = await request(app)
        .get('/submissions/user/user-123?limit=10&offset=20');

      // Assert
      expect(response.status).toBe(200);
      expect(mockSubmissionRepo.prototype.findByUserId).toHaveBeenCalledWith('user-123', 10, 20);
      expect(response.body.data.pagination).toEqual({
        limit: 10,
        offset: 20,
        total: 0
      });
    });
  });

  describe('PUT /submissions/:id', () => {
    const updateData = {
      title: 'Updated Title',
      status: 'completed'
    };

    it('should update submission successfully', async () => {
      // Arrange
      const updatedSubmission = { ...mockSubmission, ...updateData };
      mockSubmissionRepo.prototype.updateSubmission.mockResolvedValue(updatedSubmission as any);

      // Act
      const response = await request(app)
        .put('/submissions/submission-123')
        .send(updateData);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(updatedSubmission);
      expect(mockSubmissionRepo.prototype.updateSubmission).toHaveBeenCalledWith(
        'submission-123',
        updateData
      );
    });

    it('should return 404 for non-existent submission', async () => {
      // Arrange
      mockSubmissionRepo.prototype.updateSubmission.mockResolvedValue(null);

      // Act
      const response = await request(app)
        .put('/submissions/non-existent')
        .send(updateData);

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('SUBMISSION_NOT_FOUND');
    });

    it('should validate update data', async () => {
      // Act
      const response = await request(app)
        .put('/submissions/submission-123')
        .send({
          status: 'invalid-status'
        });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('DELETE /submissions/:id', () => {
    it('should delete submission successfully', async () => {
      // Arrange
      mockSubmissionRepo.prototype.findById.mockResolvedValue(mockSubmission as any);
      mockSubmissionRepo.prototype.deleteSubmission.mockResolvedValue();

      // Act
      const response = await request(app)
        .delete('/submissions/submission-123');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockSubmissionRepo.prototype.deleteSubmission).toHaveBeenCalledWith('submission-123');
    });

    it('should return 404 for non-existent submission', async () => {
      // Arrange
      mockSubmissionRepo.prototype.findById.mockResolvedValue(null);

      // Act
      const response = await request(app)
        .delete('/submissions/non-existent');

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('SUBMISSION_NOT_FOUND');
    });
  });

  describe('POST /submissions/webhook/github', () => {
    const mockWebhookPayload = {
      action: 'opened',
      pull_request: {
        id: 123,
        number: 1,
        title: 'Add Docker containerization',
        head: { sha: 'abc123' }
      },
      repository: {
        full_name: 'Ananya6Daitkar/docker-assignment'
      }
    };

    it('should process GitHub webhook successfully', async () => {
      // Arrange
      mockGithub.prototype.validateWebhookSignature.mockResolvedValue(true);

      // Act
      const response = await request(app)
        .post('/submissions/webhook/github')
        .set('x-hub-signature-256', 'sha256=valid-signature')
        .send(mockWebhookPayload);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockGithub.prototype.validateWebhookSignature).toHaveBeenCalled();
    });

    it('should reject invalid webhook signature', async () => {
      // Arrange
      mockGithub.prototype.validateWebhookSignature.mockResolvedValue(false);

      // Act
      const response = await request(app)
        .post('/submissions/webhook/github')
        .set('x-hub-signature-256', 'sha256=invalid-signature')
        .send(mockWebhookPayload);

      // Assert
      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('INVALID_SIGNATURE');
    });
  });

  describe('GET /submissions/analytics', () => {
    it('should get submission analytics successfully', async () => {
      // Arrange
      const mockAnalytics = {
        totalSubmissions: 100,
        successRate: 85.5,
        averageProcessingTime: 45.2,
        medianProcessingTime: 38.5,
        p95ProcessingTime: 120.3,
        p99ProcessingTime: 180.7,
        errorDistribution: { timeout: 5, validation_error: 3 },
        typeDistribution: { assignment: 60, project: 30, challenge: 10 },
        complexityDistribution: { low: 40, medium: 40, high: 20 },
        throughputByHour: { '0': 10, '1': 5 },
        qualityTrends: { averageQualityScore: 78.5, qualityTrend: 'improving' as const }
      };

      mockMetrics.prototype.getSubmissionAnalytics.mockResolvedValue(mockAnalytics);

      // Act
      const response = await request(app)
        .get('/submissions/analytics');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockAnalytics);
    });

    it('should handle date range parameters', async () => {
      // Arrange
      const mockAnalytics = {
        totalSubmissions: 50,
        successRate: 90,
        averageProcessingTime: 40,
        medianProcessingTime: 35,
        p95ProcessingTime: 100,
        p99ProcessingTime: 150,
        errorDistribution: {},
        typeDistribution: {},
        complexityDistribution: { low: 0, medium: 0, high: 0 },
        throughputByHour: {},
        qualityTrends: { averageQualityScore: 80, qualityTrend: 'stable' as const }
      };

      mockMetrics.prototype.getSubmissionAnalytics.mockResolvedValue(mockAnalytics);

      // Act
      const response = await request(app)
        .get('/submissions/analytics?startDate=2023-01-01&endDate=2023-01-31&submissionType=assignment');

      // Assert
      expect(response.status).toBe(200);
      expect(mockMetrics.prototype.getSubmissionAnalytics).toHaveBeenCalledWith(
        {
          startDate: new Date('2023-01-01'),
          endDate: new Date('2023-01-31')
        },
        'assignment'
      );
    });
  });

  describe('GET /submissions/queue/stats', () => {
    it('should get queue statistics successfully', async () => {
      // Arrange
      const mockQueueStats = {
        waiting: 5,
        active: 2,
        completed: 100,
        failed: 3,
        delayed: 1
      };

      mockProcessing.prototype.getQueueStats.mockResolvedValue(mockQueueStats);

      // Act
      const response = await request(app)
        .get('/submissions/queue/stats');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockQueueStats);
    });
  });
});