import { tracer } from './index';
import { trace, SpanStatusCode, SpanKind } from '@opentelemetry/api';

// Helper function to create and manage spans
export const createSpan = (name: string, attributes?: Record<string, string | number | boolean>) => {
  const span = tracer.startSpan(name, {
    kind: SpanKind.SERVER,
    attributes: attributes || {}
  });
  
  return {
    span,
    setSuccess: () => span.setStatus({ code: SpanStatusCode.OK }),
    setError: (error: Error) => {
      span.recordException(error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    },
    addAttribute: (key: string, value: string | number | boolean) => {
      span.setAttributes({ [key]: value });
    },
    end: () => span.end()
  };
};

// Helper for gamification operations tracing
export const traceGamificationOperation = async <T>(
  userId: string,
  operation: string,
  action: () => Promise<T>,
  attributes?: Record<string, string | number | boolean>
): Promise<T> => {
  const span = tracer.startSpan(`gamification.${operation}`, {
    kind: SpanKind.INTERNAL,
    attributes: {
      'user.id': userId,
      'gamification.operation': operation,
      ...attributes
    }
  });

  try {
    const result = await action();
    span.setStatus({ code: SpanStatusCode.OK });
    return result;
  } catch (error) {
    span.recordException(error as Error);
    span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
    throw error;
  } finally {
    span.end();
  }
};

// Helper for points calculation tracing
export const tracePointsCalculation = async <T>(
  userId: string,
  reason: string,
  calculation: () => Promise<T>
): Promise<T> => {
  const span = tracer.startSpan(`points.calculation`, {
    kind: SpanKind.INTERNAL,
    attributes: {
      'user.id': userId,
      'points.reason': reason,
      'points.calculation_type': 'automatic'
    }
  });

  try {
    const result = await calculation();
    span.setStatus({ code: SpanStatusCode.OK });
    return result;
  } catch (error) {
    span.recordException(error as Error);
    span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
    throw error;
  } finally {
    span.end();
  }
};

// Helper for badge evaluation tracing
export const traceBadgeEvaluation = async <T>(
  userId: string,
  badgeType: string,
  evaluation: () => Promise<T>
): Promise<T> => {
  const span = tracer.startSpan(`badge.evaluation`, {
    kind: SpanKind.INTERNAL,
    attributes: {
      'user.id': userId,
      'badge.type': badgeType,
      'badge.evaluation_trigger': 'achievement_check'
    }
  });

  try {
    const result = await evaluation();
    span.setStatus({ code: SpanStatusCode.OK });
    return result;
  } catch (error) {
    span.recordException(error as Error);
    span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
    throw error;
  } finally {
    span.end();
  }
};

// Helper for leaderboard update tracing
export const traceLeaderboardUpdate = async <T>(
  userId: string,
  updateType: string,
  update: () => Promise<T>
): Promise<T> => {
  const span = tracer.startSpan(`leaderboard.update`, {
    kind: SpanKind.INTERNAL,
    attributes: {
      'user.id': userId,
      'leaderboard.update_type': updateType,
      'leaderboard.scope': 'global'
    }
  });

  try {
    const result = await update();
    span.setStatus({ code: SpanStatusCode.OK });
    return result;
  } catch (error) {
    span.recordException(error as Error);
    span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
    throw error;
  } finally {
    span.end();
  }
};