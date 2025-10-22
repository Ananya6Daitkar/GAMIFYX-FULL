import { trace, SpanStatusCode } from '@opentelemetry/api';
import axios, { AxiosError } from 'axios';
import { logger } from '../utils/logger';
import { CircuitBreaker } from '../utils/CircuitBreaker';
import { RetryManager } from '../utils/RetryManager';
import { 
  SubmissionWorkflowData, 
  WorkflowResult, 
  ServiceEndpoints,
  FeedbackResult,
  GamificationUpdate,
  AnalyticsData
} from '../types/workflow';

const tracer = trace.getTracer('integration-service');

export class WorkflowOrchestrator {
  private circuitBreakers: Map<string, CircuitBreaker>;
  private retryManager: RetryManager;
  private serviceEndpoints: ServiceEndpoints;

  constructor() {
    this.circuitBreakers = new Map();
    this.retryManager = new RetryManager();
    this.serviceEndpoints = {
      userService: process.env.USER_SERVICE_URL || 'http://user-service:3001',
      submissionService: process.env.SUBMISSION_SERVICE_URL || 'http://submission-service:3002',
      gamificationService: process.env.GAMIFICATION_SERVICE_URL || 'http://gamification-service:3003',
      feedbackService: process.env.FEEDBACK_SERVICE_URL || 'http://feedback-service:3004',
      analyticsService: process.env.ANALYTICS_SERVICE_URL || 'http://analytics-service:3005',
      aiFeedbackService: process.env.AI_FEEDBACK_SERVICE_URL || 'http://ai-feedback-service:8000'
    };

    // Initialize circuit breakers for each service
    Object.keys(this.serviceEndpoints).forEach(service => {
      this.circuitBreakers.set(service, new CircuitBreaker({
        failureThreshold: 5,
        recoveryTimeout: 30000,
        monitoringPeriod: 60000
      }));
    });
  }

  /**
   * Execute complete submission-to-feedback workflow
   */
  async executeSubmissionWorkflow(data: SubmissionWorkflowData): Promise<WorkflowResult> {
    const span = tracer.startSpan('submission_workflow');
    span.setAttributes({
      'workflow.type': 'submission',
      'submission.id': data.submissionId,
      'user.id': data.userId,
      'submission.type': data.submissionType
    });

    try {
      logger.info(`Starting submission workflow for submission ${data.submissionId}`);

      // Step 1: Validate user and submission
      const validationResult = await this.validateSubmission(data);
      if (!validationResult.success) {
        throw new Error(`Validation failed: ${validationResult.error}`);
      }

      // Step 2: Process submission
      const submissionResult = await this.processSubmission(data);
      
      // Step 3: Generate AI feedback (parallel with gamification)
      const [feedbackResult, gamificationResult] = await Promise.allSettled([
        this.generateFeedback(data, submissionResult),
        this.updateGamification(data, submissionResult)
      ]);

      // Step 4: Update analytics
      const analyticsResult = await this.updateAnalytics(data, submissionResult, {
        feedback: feedbackResult.status === 'fulfilled' ? feedbackResult.value : null,
        gamification: gamificationResult.status === 'fulfilled' ? gamificationResult.value : null
      });

      // Step 5: Notify completion
      await this.notifyWorkflowCompletion(data, {
        submission: submissionResult,
        feedback: feedbackResult.status === 'fulfilled' ? feedbackResult.value : null,
        gamification: gamificationResult.status === 'fulfilled' ? gamificationResult.value : null,
        analytics: analyticsResult
      });

      const result: WorkflowResult = {
        success: true,
        submissionId: data.submissionId,
        steps: {
          validation: { success: true, timestamp: new Date() },
          submission: { success: true, data: submissionResult, timestamp: new Date() },
          feedback: { 
            success: feedbackResult.status === 'fulfilled', 
            data: feedbackResult.status === 'fulfilled' ? feedbackResult.value : null,
            error: feedbackResult.status === 'rejected' ? feedbackResult.reason.message : undefined,
            timestamp: new Date() 
          },
          gamification: { 
            success: gamificationResult.status === 'fulfilled', 
            data: gamificationResult.status === 'fulfilled' ? gamificationResult.value : null,
            error: gamificationResult.status === 'rejected' ? gamificationResult.reason.message : undefined,
            timestamp: new Date() 
          },
          analytics: { success: true, data: analyticsResult, timestamp: new Date() }
        },
        completedAt: new Date()
      };

      span.setStatus({ code: SpanStatusCode.OK });
      logger.info(`Submission workflow completed successfully for ${data.submissionId}`);
      return result;

    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
      logger.error(`Submission workflow failed for ${data.submissionId}:`, error);
      
      return {
        success: false,
        submissionId: data.submissionId,
        error: (error as Error).message,
        completedAt: new Date()
      };
    } finally {
      span.end();
    }
  }

  private async validateSubmission(data: SubmissionWorkflowData): Promise<{ success: boolean; error?: string }> {
    const span = tracer.startSpan('validate_submission');
    
    try {
      // Validate user exists and has permissions
      const userResponse = await this.callService('userService', 'GET', `/users/${data.userId}`);
      if (!userResponse.data) {
        return { success: false, error: 'User not found' };
      }

      // Validate submission data
      if (!data.repositoryUrl && !data.codeContent) {
        return { success: false, error: 'Either repository URL or code content is required' };
      }

      span.setStatus({ code: SpanStatusCode.OK });
      return { success: true };
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
      return { success: false, error: (error as Error).message };
    } finally {
      span.end();
    }
  }

  private async processSubmission(data: SubmissionWorkflowData): Promise<any> {
    const span = tracer.startSpan('process_submission');
    
    try {
      const submissionData = {
        id: data.submissionId,
        userId: data.userId,
        repositoryUrl: data.repositoryUrl,
        codeContent: data.codeContent,
        submissionType: data.submissionType,
        metadata: data.metadata
      };

      const response = await this.callService('submissionService', 'POST', '/submissions', submissionData);
      
      span.setStatus({ code: SpanStatusCode.OK });
      return response.data;
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
      throw error;
    } finally {
      span.end();
    }
  }

  private async generateFeedback(data: SubmissionWorkflowData, submissionResult: any): Promise<FeedbackResult> {
    const span = tracer.startSpan('generate_feedback');
    
    try {
      const feedbackRequest = {
        submissionId: data.submissionId,
        userId: data.userId,
        codeContent: data.codeContent || submissionResult.codeContent,
        language: data.metadata?.language || 'javascript',
        submissionType: data.submissionType
      };

      const response = await this.callService('aiFeedbackService', 'POST', '/analyze', feedbackRequest);
      
      span.setStatus({ code: SpanStatusCode.OK });
      return response.data;
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
      throw error;
    } finally {
      span.end();
    }
  }

  private async updateGamification(data: SubmissionWorkflowData, submissionResult: any): Promise<GamificationUpdate> {
    const span = tracer.startSpan('update_gamification');
    
    try {
      const gamificationData = {
        userId: data.userId,
        submissionId: data.submissionId,
        submissionType: data.submissionType,
        codeQuality: submissionResult.metrics?.codeQuality || 0.7,
        completionTime: submissionResult.metrics?.completionTime || 0,
        testCoverage: submissionResult.metrics?.testCoverage || 0
      };

      const response = await this.callService('gamificationService', 'POST', '/gamification/award-points', gamificationData);
      
      span.setStatus({ code: SpanStatusCode.OK });
      return response.data;
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
      throw error;
    } finally {
      span.end();
    }
  }

  private async updateAnalytics(data: SubmissionWorkflowData, submissionResult: any, additionalData: any): Promise<AnalyticsData> {
    const span = tracer.startSpan('update_analytics');
    
    try {
      const analyticsData = {
        userId: data.userId,
        submissionId: data.submissionId,
        submissionType: data.submissionType,
        timestamp: new Date(),
        metrics: {
          codeQualityScore: submissionResult.metrics?.codeQuality || 0.7,
          completionTime: submissionResult.metrics?.completionTime || 0,
          testCoverage: submissionResult.metrics?.testCoverage || 0,
          securityScore: additionalData.feedback?.securityScore || 0.8,
          feedbackScore: additionalData.feedback?.overallScore || 0.7
        },
        gamificationData: additionalData.gamification
      };

      const response = await this.callService('analyticsService', 'POST', '/analytics/record', analyticsData);
      
      span.setStatus({ code: SpanStatusCode.OK });
      return response.data;
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
      throw error;
    } finally {
      span.end();
    }
  }

  private async notifyWorkflowCompletion(data: SubmissionWorkflowData, results: any): Promise<void> {
    const span = tracer.startSpan('notify_workflow_completion');
    
    try {
      // This would typically send WebSocket notifications to connected clients
      // For now, we'll just log the completion
      logger.info(`Workflow completed for submission ${data.submissionId}`, {
        userId: data.userId,
        submissionType: data.submissionType,
        success: true,
        results: {
          hasSubmission: !!results.submission,
          hasFeedback: !!results.feedback,
          hasGamification: !!results.gamification,
          hasAnalytics: !!results.analytics
        }
      });
      
      span.setStatus({ code: SpanStatusCode.OK });
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
      // Don't throw here as this is not critical to the workflow
      logger.error('Failed to notify workflow completion:', error);
    } finally {
      span.end();
    }
  }

  private async callService(serviceName: string, method: string, path: string, data?: any): Promise<any> {
    const circuitBreaker = this.circuitBreakers.get(serviceName);
    if (!circuitBreaker) {
      throw new Error(`Circuit breaker not found for service: ${serviceName}`);
    }

    return circuitBreaker.execute(async () => {
      return this.retryManager.execute(async () => {
        const baseUrl = this.serviceEndpoints[serviceName as keyof ServiceEndpoints];
        const url = `${baseUrl}${path}`;
        
        const config = {
          method: method.toLowerCase(),
          url,
          data,
          timeout: 30000,
          headers: {
            'Content-Type': 'application/json',
            'X-Service-Name': 'integration-service'
          }
        };

        try {
          const response = await axios(config);
          return response;
        } catch (error) {
          if (axios.isAxiosError(error)) {
            const axiosError = error as AxiosError;
            logger.error(`Service call failed: ${serviceName} ${method} ${path}`, {
              status: axiosError.response?.status,
              statusText: axiosError.response?.statusText,
              data: axiosError.response?.data
            });
          }
          throw error;
        }
      });
    });
  }
}