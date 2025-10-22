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

// Middleware to add tracing to Express routes
export const tracingMiddleware = (operationName: string) => {
  return (req: any, res: any, next: any) => {
    const span = tracer.startSpan(`${operationName}`, {
      kind: SpanKind.SERVER,
      attributes: {
        'http.method': req.method,
        'http.url': req.url,
        'http.route': req.route?.path || req.path,
        'user.id': req.user?.id || 'anonymous',
        'submission.id': req.params?.submissionId || req.body?.submissionId
      }
    });

    // Add span to request context
    req.span = span;
    
    // Override res.end to capture response status
    const originalEnd = res.end;
    res.end = function(...args: any[]) {
      span.setAttributes({
        'http.status_code': res.statusCode,
        'http.response_size': res.get('content-length') || 0
      });
      
      if (res.statusCode >= 400) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: `HTTP ${res.statusCode}` });
      } else {
        span.setStatus({ code: SpanStatusCode.OK });
      }
      
      span.end();
      originalEnd.apply(this, args);
    };

    next();
  };
};

// Helper for submission processing pipeline tracing
export const traceSubmissionProcessing = async <T>(
  submissionId: string,
  stage: string,
  operation: () => Promise<T>,
  attributes?: Record<string, string | number | boolean>
): Promise<T> => {
  const span = tracer.startSpan(`submission.${stage}`, {
    kind: SpanKind.INTERNAL,
    attributes: {
      'submission.id': submissionId,
      'submission.stage': stage,
      ...attributes
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

// Helper for GitHub API operations tracing
export const traceGitHubOperation = async <T>(
  operation: string,
  repositoryUrl: string,
  apiCall: () => Promise<T>
): Promise<T> => {
  const span = tracer.startSpan(`github.${operation}`, {
    kind: SpanKind.CLIENT,
    attributes: {
      'github.operation': operation,
      'github.repository': repositoryUrl,
      'service.name': 'github-api'
    }
  });

  try {
    const result = await apiCall();
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

// Helper for CI/CD pipeline tracing
export const traceCiCdOperation = async <T>(
  pipelineId: string,
  operation: string,
  apiCall: () => Promise<T>
): Promise<T> => {
  const span = tracer.startSpan(`cicd.${operation}`, {
    kind: SpanKind.CLIENT,
    attributes: {
      'cicd.pipeline_id': pipelineId,
      'cicd.operation': operation,
      'service.name': 'cicd-pipeline'
    }
  });

  try {
    const result = await apiCall();
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