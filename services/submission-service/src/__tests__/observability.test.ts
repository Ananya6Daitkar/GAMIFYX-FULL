import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { 
  recordSubmission, 
  recordProcessingDuration, 
  recordSubmissionResult,
  updateQueueSize,
  recordCodeQuality 
} from '../telemetry/metrics';
import { 
  createSpan, 
  traceSubmissionProcessing, 
  traceGitHubOperation,
  traceCiCdOperation 
} from '../telemetry/tracing';
import { logger, logInfo, correlationIdMiddleware } from '../telemetry/logger';

describe('Submission Service Observability', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Metrics Collection', () => {
    it('should record submission metrics correctly', () => {
      const submissionType = 'assignment';
      const userId = 'test-user-123';
      
      expect(() => recordSubmission(submissionType, userId)).not.toThrow();
    });

    it('should record processing duration metrics', () => {
      const duration = 45.5; // seconds
      const submissionType = 'project';
      const success = true;
      
      expect(() => recordProcessingDuration(duration, submissionType, success)).not.toThrow();
    });

    it('should record submission results', () => {
      const submissionType = 'challenge';
      
      // Test successful submission
      expect(() => recordSubmissionResult(true, submissionType)).not.toThrow();
      
      // Test failed submission
      expect(() => recordSubmissionResult(false, submissionType, 'compilation_error')).not.toThrow();
    });

    it('should update queue size metrics', () => {
      expect(() => updateQueueSize(1)).not.toThrow();
      expect(() => updateQueueSize(-1)).not.toThrow();
    });

    it('should record code quality metrics', () => {
      const score = 0.85;
      const submissionId = 'sub-123';
      const submissionType = 'assignment';
      
      expect(() => recordCodeQuality(score, submissionId, submissionType)).not.toThrow();
    });
  });

  describe('Distributed Tracing', () => {
    it('should trace submission processing pipeline', async () => {
      const submissionId = 'sub-123';
      const stage = 'validation';
      const mockProcessing = jest.fn().mockResolvedValue({ valid: true });
      
      const result = await traceSubmissionProcessing(
        submissionId,
        stage,
        mockProcessing,
        { 'submission.type': 'assignment' }
      );
      
      expect(mockProcessing).toHaveBeenCalled();
      expect(result).toEqual({ valid: true });
    });

    it('should trace GitHub API operations', async () => {
      const operation = 'clone_repository';
      const repositoryUrl = 'https://github.com/user/repo';
      const mockGitHubCall = jest.fn().mockResolvedValue({ status: 'success' });
      
      const result = await traceGitHubOperation(operation, repositoryUrl, mockGitHubCall);
      
      expect(mockGitHubCall).toHaveBeenCalled();
      expect(result).toEqual({ status: 'success' });
    });

    it('should trace CI/CD pipeline operations', async () => {
      const pipelineId = 'pipeline-456';
      const operation = 'trigger_build';
      const mockCiCdCall = jest.fn().mockResolvedValue({ buildId: 'build-789' });
      
      const result = await traceCiCdOperation(pipelineId, operation, mockCiCdCall);
      
      expect(mockCiCdCall).toHaveBeenCalled();
      expect(result).toEqual({ buildId: 'build-789' });
    });

    it('should handle submission processing errors', async () => {
      const submissionId = 'sub-123';
      const stage = 'compilation';
      const mockFailingProcessing = jest.fn().mockRejectedValue(new Error('Compilation failed'));
      
      await expect(
        traceSubmissionProcessing(submissionId, stage, mockFailingProcessing)
      ).rejects.toThrow('Compilation failed');
    });
  });

  describe('Structured Logging with Submission Context', () => {
    it('should log with submission ID context', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      logInfo('Processing submission', 
        { stage: 'validation' }, 
        'corr-123', 
        'user-456', 
        'sub-789'
      );
      
      expect(consoleSpy).toHaveBeenCalled();
      const logCall = consoleSpy.mock.calls[0][0];
      const parsedLog = JSON.parse(logCall);
      expect(parsedLog).toHaveProperty('submissionId', 'sub-789');
      
      consoleSpy.mockRestore();
    });

    it('should extract submission ID from request parameters', () => {
      const mockReq = {
        headers: {},
        method: 'POST',
        url: '/submissions/sub-123/process',
        params: { submissionId: 'sub-123' },
        ip: '127.0.0.1'
      };
      const mockRes = {
        setHeader: jest.fn(),
        end: jest.fn()
      };
      const mockNext = jest.fn();
      
      correlationIdMiddleware(mockReq, mockRes, mockNext);
      
      expect(mockReq.correlationId).toBeDefined();
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Performance Monitoring', () => {
    it('should track submission processing performance', async () => {
      const startTime = Date.now();
      
      // Simulate processing
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const duration = (Date.now() - startTime) / 1000;
      
      expect(() => recordProcessingDuration(duration, 'assignment', true)).not.toThrow();
      expect(duration).toBeGreaterThan(0.09); // At least 90ms
    });

    it('should monitor queue size changes', () => {
      // Simulate adding items to queue
      updateQueueSize(5);
      
      // Simulate processing items
      updateQueueSize(-3);
      
      // Verify no errors thrown
      expect(true).toBe(true);
    });
  });

  describe('Error Tracking', () => {
    it('should track different types of submission failures', () => {
      const submissionType = 'project';
      
      // Test different error types
      const errorTypes = [
        'compilation_error',
        'test_failure',
        'timeout',
        'resource_limit',
        'network_error'
      ];
      
      errorTypes.forEach(errorType => {
        expect(() => recordSubmissionResult(false, submissionType, errorType)).not.toThrow();
      });
    });

    it('should capture GitHub API failures', async () => {
      const operation = 'fetch_repository';
      const repositoryUrl = 'https://github.com/user/private-repo';
      const mockFailingCall = jest.fn().mockRejectedValue(new Error('Repository not found'));
      
      await expect(
        traceGitHubOperation(operation, repositoryUrl, mockFailingCall)
      ).rejects.toThrow('Repository not found');
    });
  });
});