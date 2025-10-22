import { SubmissionProcessingService, SubmissionJobData } from '@/services/SubmissionProcessingService';
import { SubmissionRepository } from '@/database/repositories';
import { GitHubService } from '@/services/GitHubService';
import { CodeAnalysisService } from '@/services/CodeAnalysisService';
import { WebSocketService } from '@/services/WebSocketService';
import { SubmissionMetricsService } from '@/services/SubmissionMetricsService';
import { Submission } from '@/models';
import Bull from 'bull';

// Mock dependencies
jest.mock('@/database/repositories');
jest.mock('@/services/GitHubService');
jest.mock('@/services/CodeAnalysisService');
jest.mock('@/services/WebSocketService');
jest.mock('@/services/SubmissionMetricsService');
jest.mock('@/telemetry/logger');
jest.mock('bull');

const mockBull = Bull as jest.MockedClass<typeof Bull>;
const mockSubmissionRepository = SubmissionRepository as jest.MockedClass<typeof SubmissionRepository>;
const mockGitHubService = GitHubService as jest.MockedClass<typeof GitHubService>;
const mockCodeAnalysisService = CodeAnalysisService as jest.MockedClass<typeof CodeAnalysisService>;
const mockWebSocketService = WebSocketService as jest.MockedClass<typeof WebSocketService>;
const mockSubmissionMetricsService = SubmissionMetricsService as jest.MockedClass<typeof SubmissionMetricsService>;

describe('SubmissionProcessingService', () => {
  let processingService: SubmissionProcessingService;
  let mockQueue: jest.Mocked<Bull.Queue>;
  let mockSubmissionRepo: jest.Mocked<SubmissionRepository>;
  let mockGithubService: jest.Mocked<GitHubService>;
  let mockCodeAnalysis: jest.Mocked<CodeAnalysisService>;
  let mockWebSocket: jest.Mocked<WebSocketService>;
  let mockMetricsService: jest.Mocked<SubmissionMetricsService>;

  const mockSubmission: Submission = {
    id: 'submission-123',
    userId: 'user-123',
    title: 'Test Submission',
    submissionType: 'assignment',
    status: 'pending',
    metrics: {},
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockJobData: SubmissionJobData = {
    submissionId: 'submission-123',
    userId: 'user-123',
    submissionType: 'assignment',
    repositoryUrl: 'https://github.com/user/repo',
    commitHash: 'abc123'
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Bull queue
    mockQueue = {
      add: jest.fn(),
      process: jest.fn(),
      on: jest.fn(),
      getWaiting: jest.fn().mockResolvedValue([]),
      getActive: jest.fn().mockResolvedValue([]),
      getCompleted: jest.fn().mockResolvedValue([]),
      getFailed: jest.fn().mockResolvedValue([]),
      getDelayed: jest.fn().mockResolvedValue([]),
      pause: jest.fn(),
      resume: jest.fn(),
      close: jest.fn()
    } as any;

    mockBull.mockImplementation(() => mockQueue as any);

    // Mock services
    mockSubmissionRepo = new mockSubmissionRepository() as jest.Mocked<SubmissionRepository>;
    mockGithubService = new mockGitHubService() as jest.Mocked<GitHubService>;
    mockCodeAnalysis = new mockCodeAnalysisService() as jest.Mocked<CodeAnalysisService>;
    mockWebSocket = new mockWebSocketService() as jest.Mocked<WebSocketService>;
    mockMetricsService = new mockSubmissionMetricsService() as jest.Mocked<SubmissionMetricsService>;

    processingService = new SubmissionProcessingService();
  });

  describe('queueSubmissionProcessing', () => {
    it('should queue submission for processing', async () => {
      // Arrange
      mockQueue.add.mockResolvedValue({} as any);

      // Act
      await processingService.queueSubmissionProcessing(mockJobData);

      // Assert
      expect(mockQueue.add).toHaveBeenCalledWith('process-submission', mockJobData, {
        priority: 5, // assignment priority
        delay: 0
      });
      expect(mockQueue.add).toHaveBeenCalledWith('github-integration', mockJobData, {
        priority: 5,
        delay: 1000
      });
      expect(mockQueue.add).toHaveBeenCalledWith('analyze-code', mockJobData, {
        priority: 3,
        delay: 2000
      });
    });

    it('should not queue GitHub integration if no repository URL', async () => {
      // Arrange
      const jobDataWithoutRepo = { ...mockJobData, repositoryUrl: undefined };
      mockQueue.add.mockResolvedValue({} as any);

      // Act
      await processingService.queueSubmissionProcessing(jobDataWithoutRepo);

      // Assert
      expect(mockQueue.add).toHaveBeenCalledTimes(2); // Only main processing and code analysis
      expect(mockQueue.add).toHaveBeenCalledWith('process-submission', jobDataWithoutRepo, expect.any(Object));
      expect(mockQueue.add).toHaveBeenCalledWith('analyze-code', jobDataWithoutRepo, expect.any(Object));
    });

    it('should handle queue errors', async () => {
      // Arrange
      const queueError = new Error('Queue connection failed');
      mockQueue.add.mockRejectedValue(queueError);

      // Act & Assert
      await expect(processingService.queueSubmissionProcessing(mockJobData)).rejects.toThrow(queueError);
    });
  });

  describe('getJobPriority', () => {
    it('should return correct priority for different submission types', () => {
      // Test private method through reflection
      const getJobPriority = (processingService as any).getJobPriority.bind(processingService);

      expect(getJobPriority('challenge')).toBe(10);
      expect(getJobPriority('assignment')).toBe(5);
      expect(getJobPriority('project')).toBe(1);
      expect(getJobPriority('unknown')).toBe(3);
    });
  });

  describe('getQueueStats', () => {
    it('should return queue statistics', async () => {
      // Arrange
      const mockWaiting = [1, 2, 3];
      const mockActive = [1, 2];
      const mockCompleted = [1, 2, 3, 4, 5];
      const mockFailed = [1];
      const mockDelayed = [];

      mockQueue.getWaiting.mockResolvedValue(mockWaiting as any);
      mockQueue.getActive.mockResolvedValue(mockActive as any);
      mockQueue.getCompleted.mockResolvedValue(mockCompleted as any);
      mockQueue.getFailed.mockResolvedValue(mockFailed as any);
      mockQueue.getDelayed.mockResolvedValue(mockDelayed as any);

      // Act
      const stats = await processingService.getQueueStats();

      // Assert
      expect(stats).toEqual({
        waiting: 3,
        active: 2,
        completed: 5,
        failed: 1,
        delayed: 0
      });
    });
  });

  describe('pauseQueue', () => {
    it('should pause the queue', async () => {
      // Act
      await processingService.pauseQueue();

      // Assert
      expect(mockQueue.pause).toHaveBeenCalled();
    });
  });

  describe('resumeQueue', () => {
    it('should resume the queue', async () => {
      // Act
      await processingService.resumeQueue();

      // Assert
      expect(mockQueue.resume).toHaveBeenCalled();
    });
  });

  describe('shutdown', () => {
    it('should close the queue', async () => {
      // Act
      await processingService.shutdown();

      // Assert
      expect(mockQueue.close).toHaveBeenCalled();
    });
  });

  describe('processAssignment', () => {
    it('should process assignment submission', async () => {
      // Arrange
      const processAssignment = (processingService as any).processAssignment.bind(processingService);
      const mockJob = { data: mockJobData } as Bull.Job;

      // Mock WebSocket service
      mockWebSocket.sendStatusUpdate.mockResolvedValue();

      // Act
      const result = await processAssignment(mockSubmission, mockJob);

      // Assert
      expect(result).toHaveProperty('testCoverage');
      expect(result).toHaveProperty('codeQualityScore');
      expect(result).toHaveProperty('buildDuration');
      expect(typeof result.testCoverage).toBe('number');
      expect(typeof result.codeQualityScore).toBe('number');
      expect(typeof result.buildDuration).toBe('number');
    });
  });

  describe('processProject', () => {
    it('should process project submission', async () => {
      // Arrange
      const processProject = (processingService as any).processProject.bind(processingService);
      const mockJob = { data: mockJobData } as Bull.Job;

      // Mock WebSocket service
      mockWebSocket.sendStatusUpdate.mockResolvedValue();

      // Act
      const result = await processProject(mockSubmission, mockJob);

      // Assert
      expect(result).toHaveProperty('testCoverage');
      expect(result).toHaveProperty('codeQualityScore');
      expect(result).toHaveProperty('buildDuration');
      expect(result).toHaveProperty('complexity');
      expect(typeof result.testCoverage).toBe('number');
      expect(typeof result.codeQualityScore).toBe('number');
      expect(typeof result.buildDuration).toBe('number');
      expect(typeof result.complexity).toBe('number');
    });
  });

  describe('processChallenge', () => {
    it('should process challenge submission', async () => {
      // Arrange
      const processChallenge = (processingService as any).processChallenge.bind(processingService);
      const mockJob = { data: mockJobData } as Bull.Job;

      // Mock WebSocket service
      mockWebSocket.sendStatusUpdate.mockResolvedValue();

      // Act
      const result = await processChallenge(mockSubmission, mockJob);

      // Assert
      expect(result).toHaveProperty('testCoverage');
      expect(result).toHaveProperty('codeQualityScore');
      expect(result).toHaveProperty('buildDuration');
      expect(typeof result.testCoverage).toBe('number');
      expect(typeof result.codeQualityScore).toBe('number');
      expect(typeof result.buildDuration).toBe('number');
    });
  });

  describe('updateSubmissionStatus', () => {
    it('should update submission status via WebSocket', async () => {
      // Arrange
      const updateSubmissionStatus = (processingService as any).updateSubmissionStatus.bind(processingService);
      mockWebSocket.sendStatusUpdate.mockResolvedValue();

      // Act
      await updateSubmissionStatus('submission-123', 'processing', 'Processing started', 25);

      // Assert
      expect(mockWebSocket.sendStatusUpdate).toHaveBeenCalledWith({
        submissionId: 'submission-123',
        status: 'processing',
        message: 'Processing started',
        progress: 25,
        timestamp: expect.any(Date)
      });
    });
  });
});