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

// Helper for analytics processing tracing
export const traceAnalyticsProcessing = async <T>(
  userId: string,
  processType: string,
  operation: () => Promise<T>,
  attributes?: Record<string, string | number | boolean>
): Promise<T> => {
  const span = tracer.startSpan(`analytics.${processType}`, {
    kind: SpanKind.INTERNAL,
    attributes: {
      'user.id': userId,
      'analytics.process_type': processType,
      ...attributes
    }
  });

  try {
    const startTime = Date.now();
    const result = await operation();
    const processingTime = Date.now() - startTime;
    
    span.setAttributes({
      'analytics.processing_time_ms': processingTime,
      'analytics.success': true
    });
    span.setStatus({ code: SpanStatusCode.OK });
    return result;
  } catch (error) {
    span.recordException(error as Error);
    span.setAttributes({
      'analytics.success': false,
      'analytics.error_type': (error as Error).name
    });
    span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
    throw error;
  } finally {
    span.end();
  }
};

// Helper for risk score calculation tracing
export const traceRiskScoreCalculation = async <T>(
  userId: string,
  factors: string[],
  calculation: () => Promise<T>
): Promise<T> => {
  const span = tracer.startSpan(`risk_score.calculation`, {
    kind: SpanKind.INTERNAL,
    attributes: {
      'user.id': userId,
      'risk_score.factors': factors.join(','),
      'risk_score.algorithm': 'weighted_average'
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

// Helper for alert generation tracing
export const traceAlertGeneration = async <T>(
  userId: string,
  alertType: string,
  generation: () => Promise<T>
): Promise<T> => {
  const span = tracer.startSpan(`alert.generation`, {
    kind: SpanKind.INTERNAL,
    attributes: {
      'user.id': userId,
      'alert.type': alertType,
      'alert.trigger': 'threshold_breach'
    }
  });

  try {
    const result = await generation();
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

// Helper for performance prediction tracing
export const tracePerformancePrediction = async <T>(
  userId: string,
  predictionModel: string,
  prediction: () => Promise<T>
): Promise<T> => {
  const span = tracer.startSpan(`prediction.performance`, {
    kind: SpanKind.CLIENT,
    attributes: {
      'user.id': userId,
      'prediction.model': predictionModel,
      'prediction.type': 'performance_forecast',
      'service.name': 'ml-prediction-api'
    }
  });

  try {
    const startTime = Date.now();
    const result = await prediction();
    const predictionTime = Date.now() - startTime;
    
    span.setAttributes({
      'prediction.time_ms': predictionTime,
      'prediction.success': true
    });
    span.setStatus({ code: SpanStatusCode.OK });
    return result;
  } catch (error) {
    span.recordException(error as Error);
    span.setAttributes({
      'prediction.success': false,
      'prediction.error_type': (error as Error).name
    });
    span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
    throw error;
  } finally {
    span.end();
  }
};