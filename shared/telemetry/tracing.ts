/**
 * Distributed tracing for complete user journeys in GamifyX
 */

import { trace, context, SpanStatusCode, SpanKind } from '@opentelemetry/api';
import { GamifyXTelemetry } from './index';

export interface UserJourneyContext {
  userId: string;
  sessionId: string;
  userRole: string;
  journeyType: string;
  startTime: number;
  metadata?: Record<string, any>;
}

export interface SpanContext {
  operationName: string;
  serviceName: string;
  attributes?: Record<string, any>;
  kind?: SpanKind;
}

export class DistributedTracing {
  private telemetry: GamifyXTelemetry;
  private activeJourneys: Map<string, UserJourneyContext> = new Map();

  constructor(telemetry: GamifyXTelemetry) {
    this.telemetry = telemetry;
  }

  // Start a new user journey trace
  public startUserJourney(context: UserJourneyContext): string {
    const journeyId = this.generateJourneyId(context.userId, context.journeyType);
    const tracer = this.telemetry.getTracer();

    const span = tracer.startSpan(`user_journey.${context.journeyType}`, {
      kind: SpanKind.SERVER,
      attributes: {
        'gamifyx.journey.id': journeyId,
        'gamifyx.journey.type': context.journeyType,
        'gamifyx.user.id': context.userId,
        'gamifyx.user.role': context.userRole,
        'gamifyx.session.id': context.sessionId,
        'gamifyx.journey.start_time': context.startTime,
        ...context.metadata,
      },
    });

    // Store the journey context
    this.activeJourneys.set(journeyId, {
      ...context,
      metadata: {
        ...context.metadata,
        spanId: span.spanContext().spanId,
        traceId: span.spanContext().traceId,
      },
    });

    console.log(`🔍 Started user journey: ${journeyId} (${context.journeyType}) for user ${context.userId}`);
    return journeyId;
  }

  // End a user journey trace
  public endUserJourney(journeyId: string, success: boolean = true, errorMessage?: string): void {
    const journeyContext = this.activeJourneys.get(journeyId);
    if (!journeyContext) {
      console.warn(`Journey ${journeyId} not found in active journeys`);
      return;
    }

    const tracer = this.telemetry.getTracer();
    const span = trace.getActiveSpan();

    if (span) {
      const duration = Date.now() - journeyContext.startTime;
      
      span.setAttributes({
        'gamifyx.journey.duration_ms': duration,
        'gamifyx.journey.success': success,
        'gamifyx.journey.end_time': Date.now(),
      });

      if (success) {
        span.setStatus({ code: SpanStatusCode.OK });
      } else {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: errorMessage || 'User journey failed',
        });
        
        if (errorMessage) {
          span.recordException(new Error(errorMessage));
        }
      }

      span.end();
    }

    this.activeJourneys.delete(journeyId);
    console.log(`🔍 Ended user journey: ${journeyId} (success: ${success}, duration: ${Date.now() - journeyContext.startTime}ms)`);
  }

  // Create a child span within a user journey
  public createJourneySpan(journeyId: string, spanContext: SpanContext): any {
    const journeyContext = this.activeJourneys.get(journeyId);
    if (!journeyContext) {
      console.warn(`Journey ${journeyId} not found, creating standalone span`);
    }

    const tracer = this.telemetry.getTracer();
    const span = tracer.startSpan(spanContext.operationName, {
      kind: spanContext.kind || SpanKind.INTERNAL,
      attributes: {
        'gamifyx.service.name': spanContext.serviceName,
        'gamifyx.journey.id': journeyId,
        'gamifyx.user.id': journeyContext?.userId,
        'gamifyx.operation.type': spanContext.operationName,
        ...spanContext.attributes,
      },
    });

    return span;
  }

  // Trace a complete user authentication flow
  public async traceAuthenticationFlow(
    userId: string,
    authMethod: string,
    fn: () => Promise<any>
  ): Promise<any> {
    const journeyId = this.startUserJourney({
      userId,
      sessionId: this.generateSessionId(),
      userRole: 'unknown',
      journeyType: 'authentication',
      startTime: Date.now(),
      metadata: { authMethod },
    });

    const span = this.createJourneySpan(journeyId, {
      operationName: 'auth.authenticate',
      serviceName: 'user-service',
      attributes: {
        'auth.method': authMethod,
        'auth.user_id': userId,
      },
    });

    try {
      const result = await fn();
      
      span.setAttributes({
        'auth.success': true,
        'auth.user_role': result.role || 'unknown',
      });
      
      span.setStatus({ code: SpanStatusCode.OK });
      this.endUserJourney(journeyId, true);
      
      return result;
    } catch (error) {
      span.recordException(error as Error);
      span.setAttributes({
        'auth.success': false,
        'auth.error': (error as Error).message,
      });
      
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: (error as Error).message,
      });
      
      this.endUserJourney(journeyId, false, (error as Error).message);
      throw error;
    } finally {
      span.end();
    }
  }

  // Trace a complete submission processing flow
  public async traceSubmissionFlow(
    userId: string,
    submissionId: string,
    submissionType: string,
    fn: () => Promise<any>
  ): Promise<any> {
    const journeyId = this.startUserJourney({
      userId,
      sessionId: this.generateSessionId(),
      userRole: 'student',
      journeyType: 'submission_processing',
      startTime: Date.now(),
      metadata: { submissionId, submissionType },
    });

    const spans = {
      validation: this.createJourneySpan(journeyId, {
        operationName: 'submission.validate',
        serviceName: 'submission-service',
        attributes: { 'submission.id': submissionId, 'submission.type': submissionType },
      }),
      processing: this.createJourneySpan(journeyId, {
        operationName: 'submission.process',
        serviceName: 'submission-service',
        attributes: { 'submission.id': submissionId },
      }),
      feedback: this.createJourneySpan(journeyId, {
        operationName: 'feedback.generate',
        serviceName: 'ai-feedback-service',
        attributes: { 'submission.id': submissionId },
      }),
      gamification: this.createJourneySpan(journeyId, {
        operationName: 'gamification.update',
        serviceName: 'gamification-service',
        attributes: { 'user.id': userId, 'submission.id': submissionId },
      }),
    };

    try {
      // Simulate the submission processing pipeline
      const result = await this.executeSubmissionPipeline(spans, fn);
      
      this.endUserJourney(journeyId, true);
      return result;
    } catch (error) {
      // End all active spans with error
      Object.values(spans).forEach(span => {
        if (span) {
          span.recordException(error as Error);
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: (error as Error).message,
          });
          span.end();
        }
      });
      
      this.endUserJourney(journeyId, false, (error as Error).message);
      throw error;
    }
  }

  // Trace dashboard loading and interaction flow
  public async traceDashboardFlow(
    userId: string,
    dashboardType: string,
    fn: () => Promise<any>
  ): Promise<any> {
    const journeyId = this.startUserJourney({
      userId,
      sessionId: this.generateSessionId(),
      userRole: 'student',
      journeyType: 'dashboard_interaction',
      startTime: Date.now(),
      metadata: { dashboardType },
    });

    const spans = {
      dataFetch: this.createJourneySpan(journeyId, {
        operationName: 'dashboard.fetch_data',
        serviceName: 'api-gateway',
        attributes: { 'dashboard.type': dashboardType },
      }),
      leaderboard: this.createJourneySpan(journeyId, {
        operationName: 'leaderboard.get',
        serviceName: 'gamification-service',
        attributes: { 'user.id': userId },
      }),
      achievements: this.createJourneySpan(journeyId, {
        operationName: 'achievements.get',
        serviceName: 'gamification-service',
        attributes: { 'user.id': userId },
      }),
      metrics: this.createJourneySpan(journeyId, {
        operationName: 'metrics.get',
        serviceName: 'analytics-service',
        attributes: { 'user.id': userId },
      }),
    };

    try {
      const result = await this.executeDashboardPipeline(spans, fn);
      
      this.endUserJourney(journeyId, true);
      return result;
    } catch (error) {
      Object.values(spans).forEach(span => {
        if (span) {
          span.recordException(error as Error);
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: (error as Error).message,
          });
          span.end();
        }
      });
      
      this.endUserJourney(journeyId, false, (error as Error).message);
      throw error;
    }
  }

  // Trace achievement unlock flow
  public async traceAchievementFlow(
    userId: string,
    achievementId: string,
    fn: () => Promise<any>
  ): Promise<any> {
    const journeyId = this.startUserJourney({
      userId,
      sessionId: this.generateSessionId(),
      userRole: 'student',
      journeyType: 'achievement_unlock',
      startTime: Date.now(),
      metadata: { achievementId },
    });

    const spans = {
      check: this.createJourneySpan(journeyId, {
        operationName: 'achievement.check_criteria',
        serviceName: 'gamification-service',
        attributes: { 'achievement.id': achievementId, 'user.id': userId },
      }),
      unlock: this.createJourneySpan(journeyId, {
        operationName: 'achievement.unlock',
        serviceName: 'gamification-service',
        attributes: { 'achievement.id': achievementId, 'user.id': userId },
      }),
      notification: this.createJourneySpan(journeyId, {
        operationName: 'notification.send',
        serviceName: 'api-gateway',
        attributes: { 'user.id': userId, 'type': 'achievement' },
      }),
    };

    try {
      const result = await this.executeAchievementPipeline(spans, fn);
      
      this.endUserJourney(journeyId, true);
      return result;
    } catch (error) {
      Object.values(spans).forEach(span => {
        if (span) {
          span.recordException(error as Error);
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: (error as Error).message,
          });
          span.end();
        }
      });
      
      this.endUserJourney(journeyId, false, (error as Error).message);
      throw error;
    }
  }

  // Helper method to execute submission pipeline with tracing
  private async executeSubmissionPipeline(spans: any, fn: () => Promise<any>): Promise<any> {
    // Validation phase
    spans.validation.setStatus({ code: SpanStatusCode.OK });
    spans.validation.end();

    // Processing phase
    const result = await fn();
    spans.processing.setAttributes({
      'submission.status': result.status || 'completed',
      'submission.score': result.score || 0,
    });
    spans.processing.setStatus({ code: SpanStatusCode.OK });
    spans.processing.end();

    // Feedback generation phase
    spans.feedback.setAttributes({
      'feedback.generated': true,
      'feedback.count': result.feedbackCount || 0,
    });
    spans.feedback.setStatus({ code: SpanStatusCode.OK });
    spans.feedback.end();

    // Gamification update phase
    spans.gamification.setAttributes({
      'points.awarded': result.pointsAwarded || 0,
      'badges.earned': result.badgesEarned || 0,
    });
    spans.gamification.setStatus({ code: SpanStatusCode.OK });
    spans.gamification.end();

    return result;
  }

  // Helper method to execute dashboard pipeline with tracing
  private async executeDashboardPipeline(spans: any, fn: () => Promise<any>): Promise<any> {
    const result = await fn();

    // Data fetch phase
    spans.dataFetch.setAttributes({
      'data.size': JSON.stringify(result).length,
      'data.components': Object.keys(result).length,
    });
    spans.dataFetch.setStatus({ code: SpanStatusCode.OK });
    spans.dataFetch.end();

    // Individual component phases
    spans.leaderboard.setAttributes({
      'leaderboard.entries': result.teamMembers?.length || 0,
    });
    spans.leaderboard.setStatus({ code: SpanStatusCode.OK });
    spans.leaderboard.end();

    spans.achievements.setAttributes({
      'achievements.total': result.achievements?.length || 0,
      'achievements.unlocked': result.achievements?.filter((a: any) => a.unlocked).length || 0,
    });
    spans.achievements.setStatus({ code: SpanStatusCode.OK });
    spans.achievements.end();

    spans.metrics.setAttributes({
      'metrics.count': result.metrics?.length || 0,
      'system.health': result.systemHealth?.score || 0,
    });
    spans.metrics.setStatus({ code: SpanStatusCode.OK });
    spans.metrics.end();

    return result;
  }

  // Helper method to execute achievement pipeline with tracing
  private async executeAchievementPipeline(spans: any, fn: () => Promise<any>): Promise<any> {
    const result = await fn();

    // Check criteria phase
    spans.check.setAttributes({
      'criteria.met': result.criteriaMet || false,
      'progress.current': result.progress || 0,
      'progress.required': result.maxProgress || 100,
    });
    spans.check.setStatus({ code: SpanStatusCode.OK });
    spans.check.end();

    // Unlock phase
    if (result.unlocked) {
      spans.unlock.setAttributes({
        'achievement.unlocked': true,
        'achievement.rarity': result.rarity || 'common',
        'points.awarded': result.pointsAwarded || 0,
      });
      spans.unlock.setStatus({ code: SpanStatusCode.OK });
    }
    spans.unlock.end();

    // Notification phase
    spans.notification.setAttributes({
      'notification.sent': result.notificationSent || false,
      'notification.channels': result.notificationChannels || ['websocket'],
    });
    spans.notification.setStatus({ code: SpanStatusCode.OK });
    spans.notification.end();

    return result;
  }

  // Helper methods
  private generateJourneyId(userId: string, journeyType: string): string {
    return `journey_${userId}_${journeyType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Get active journeys for monitoring
  public getActiveJourneys(): UserJourneyContext[] {
    return Array.from(this.activeJourneys.values());
  }

  // Clean up old journeys (should be called periodically)
  public cleanupOldJourneys(maxAgeMs: number = 3600000): void { // 1 hour default
    const now = Date.now();
    const toDelete: string[] = [];

    this.activeJourneys.forEach((journey, journeyId) => {
      if (now - journey.startTime > maxAgeMs) {
        toDelete.push(journeyId);
      }
    });

    toDelete.forEach(journeyId => {
      this.activeJourneys.delete(journeyId);
      console.log(`🧹 Cleaned up old journey: ${journeyId}`);
    });
  }
}

export default DistributedTracing;