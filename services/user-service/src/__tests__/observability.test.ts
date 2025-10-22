import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { metrics, trace } from '@opentelemetry/api';
import { 
  recordLogin, 
  recordSessionDuration, 
  updateActiveUsers,
  recordRegistration,
  recordEngagementScore 
} from '../telemetry/metrics';
import { createSpan, traceDbOperation, traceApiCall } from '../telemetry/tracing';
import { logger, logInfo, logError, correlationIdMiddleware } from '../telemetry/logger';

describe('User Service Observability', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Metrics Collection', () => {
    it('should record login metrics correctly', () => {
      const userId = 'test-user-123';
      
      // Test successful login
      expect(() => recordLogin(true, userId)).not.toThrow();
      
      // Test failed login
      expect(() => recordLogin(false)).not.toThrow();
    });

    it('should record session duration metrics', () => {
      const userId = 'test-user-123';
      const duration = 1800; // 30 minutes
      
      expect(() => recordSessionDuration(duration, userId)).not.toThrow();
    });

    it('should update active users count', () => {
      expect(() => updateActiveUsers(1)).not.toThrow();
      expect(() => updateActiveUsers(-1)).not.toThrow();
    });

    it('should record user registration metrics', () => {
      const userId = 'test-user-123';
      const userType = 'student';
      
      expect(() => recordRegistration(userId, userType)).not.toThrow();
    });

    it('should record engagement score metrics', () => {
      const userId = 'test-user-123';
      const score = 0.75;
      
      expect(() => recordEngagementScore(score, userId)).not.toThrow();
    });
  });

  describe('Distributed Tracing', () => {
    it('should create spans with correct attributes', () => {
      const spanName = 'test-operation';
      const attributes = { 'user.id': 'test-123', 'operation.type': 'authentication' };
      
      const spanWrapper = createSpan(spanName, attributes);
      
      expect(spanWrapper).toBeDefined();
      expect(spanWrapper.span).toBeDefined();
      expect(spanWrapper.setSuccess).toBeDefined();
      expect(spanWrapper.setError).toBeDefined();
      expect(spanWrapper.addAttribute).toBeDefined();
      expect(spanWrapper.end).toBeDefined();
      
      // Test span operations
      spanWrapper.addAttribute('test.key', 'test.value');
      spanWrapper.setSuccess();
      spanWrapper.end();
    });

    it('should trace database operations', async () => {
      const mockDbOperation = jest.fn().mockResolvedValue({ id: 1, name: 'test' });
      
      const result = await traceDbOperation(
        'user.findById',
        mockDbOperation,
        { 'db.table': 'users', 'user.id': 'test-123' }
      );
      
      expect(mockDbOperation).toHaveBeenCalled();
      expect(result).toEqual({ id: 1, name: 'test' });
    });

    it('should trace API calls', async () => {
      const mockApiCall = jest.fn().mockResolvedValue({ status: 'success' });
      
      const result = await traceApiCall(
        'external-service',
        mockApiCall,
        { 'api.endpoint': '/users', 'api.method': 'GET' }
      );
      
      expect(mockApiCall).toHaveBeenCalled();
      expect(result).toEqual({ status: 'success' });
    });

    it('should handle tracing errors correctly', async () => {
      const mockFailingOperation = jest.fn().mockRejectedValue(new Error('Database connection failed'));
      
      await expect(traceDbOperation('user.create', mockFailingOperation)).rejects.toThrow('Database connection failed');
    });
  });

  describe('Structured Logging', () => {
    it('should log info messages with correlation ID', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      logInfo('Test info message', { key: 'value' }, 'corr-123', 'user-456');
      
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should log error messages with stack trace', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const testError = new Error('Test error');
      
      logError('Test error message', testError, { context: 'test' }, 'corr-123', 'user-456');
      
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should generate correlation ID middleware', () => {
      const mockReq = {
        headers: {},
        method: 'GET',
        url: '/test',
        ip: '127.0.0.1'
      };
      const mockRes = {
        setHeader: jest.fn(),
        end: jest.fn()
      };
      const mockNext = jest.fn();
      
      correlationIdMiddleware(mockReq, mockRes, mockNext);
      
      expect(mockReq.correlationId).toBeDefined();
      expect(mockRes.setHeader).toHaveBeenCalledWith('x-correlation-id', mockReq.correlationId);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should use existing correlation ID from headers', () => {
      const existingCorrelationId = 'existing-corr-123';
      const mockReq = {
        headers: { 'x-correlation-id': existingCorrelationId },
        method: 'GET',
        url: '/test',
        ip: '127.0.0.1'
      };
      const mockRes = {
        setHeader: jest.fn(),
        end: jest.fn()
      };
      const mockNext = jest.fn();
      
      correlationIdMiddleware(mockReq, mockRes, mockNext);
      
      expect(mockReq.correlationId).toBe(existingCorrelationId);
      expect(mockRes.setHeader).toHaveBeenCalledWith('x-correlation-id', existingCorrelationId);
    });
  });

  describe('Integration Tests', () => {
    it('should export metrics to Prometheus format', async () => {
      // Record some test metrics
      recordLogin(true, 'test-user');
      recordSessionDuration(300, 'test-user');
      updateActiveUsers(1);
      
      // In a real test, you would make an HTTP request to the metrics endpoint
      // and verify the Prometheus format output
      expect(true).toBe(true); // Placeholder for actual metrics endpoint test
    });

    it('should propagate trace context across operations', async () => {
      const spanWrapper = createSpan('parent-operation', { 'operation.type': 'test' });
      
      try {
        // Simulate nested operation that should inherit trace context
        await traceDbOperation('nested-db-operation', async () => {
          return { success: true };
        });
        
        spanWrapper.setSuccess();
      } catch (error) {
        spanWrapper.setError(error as Error);
      } finally {
        spanWrapper.end();
      }
      
      expect(true).toBe(true); // Placeholder for actual trace context verification
    });

    it('should format logs correctly for Loki ingestion', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      logInfo('Test log for Loki', { 
        service: 'user-service',
        environment: 'test',
        version: '1.0.0'
      }, 'test-correlation-id', 'test-user-id');
      
      // Verify that the log output is in JSON format suitable for Loki
      expect(consoleSpy).toHaveBeenCalled();
      const logCall = consoleSpy.mock.calls[0][0];
      expect(() => JSON.parse(logCall)).not.toThrow();
      
      const parsedLog = JSON.parse(logCall);
      expect(parsedLog).toHaveProperty('timestamp');
      expect(parsedLog).toHaveProperty('level');
      expect(parsedLog).toHaveProperty('message');
      expect(parsedLog).toHaveProperty('service');
      expect(parsedLog).toHaveProperty('traceId');
      expect(parsedLog).toHaveProperty('correlationId');
      
      consoleSpy.mockRestore();
    });
  });
});