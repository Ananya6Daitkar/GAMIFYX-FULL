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

// Helper for AI feedback generation tracing
export const traceAiFeedbackGeneration = async <T>(
  submissionId: string,
  modelType: string,
  operation: () => Promise<T>,
  attributes?: Record<string, string | number | boolean>
): Promise<T> => {
  const span = tracer.startSpan(`ai.feedback_generation`, {
    kind: SpanKind.INTERNAL,
    attributes: {
      'submission.id': submissionId,
      'ai.model_type': modelType,
      'ai.operation': 'feedback_generation',
      ...attributes
    }
  });

  try {
    const startTime = Date.now();
    const result = await operation();
    const duration = Date.now() - startTime;
    
    span.setAttributes({
      'ai.processing_duration_ms': duration,
      'ai.success': true
    });
    span.setStatus({ code: SpanStatusCode.OK });
    return result;
  } catch (error) {
    span.recordException(error as Error);
    span.setAttributes({
      'ai.success': false,
      'ai.error_type': (error as Error).name
    });
    span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
    throw error;
  } finally {
    span.end();
  }
};

// Helper for code analysis tracing
export const traceCodeAnalysis = async <T>(
  submissionId: string,
  analysisType: string,
  operation: () => Promise<T>
): Promise<T> => {
  const span = tracer.startSpan(`code_analysis.${analysisType}`, {
    kind: SpanKind.INTERNAL,
    attributes: {
      'submission.id': submissionId,
      'analysis.type': analysisType,
      'analysis.tool': 'static_analyzer'
    }
  });

  try {
    const result = await operation();
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

// Helper for ML model inference tracing
export const traceMlModelInference = async <T>(
  modelName: string,
  inputSize: number,
  operation: () => Promise<T>
): Promise<T> => {
  const span = tracer.startSpan(`ml.inference`, {
    kind: SpanKind.CLIENT,
    attributes: {
      'ml.model_name': modelName,
      'ml.input_size': inputSize,
      'service.name': 'ml-model-api'
    }
  });

  try {
    const startTime = Date.now();
    const result = await operation();
    const inferenceTime = Date.now() - startTime;
    
    span.setAttributes({
      'ml.inference_time_ms': inferenceTime,
      'ml.success': true
    });
    span.setStatus({ code: SpanStatusCode.OK });
    return result;
  } catch (error) {
    span.recordException(error as Error);
    span.setAttributes({
      'ml.success': false,
      'ml.error_type': (error as Error).name
    });
    span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
    throw error;
  } finally {
    span.end();
  }
};