/**
 * Express middleware for OpenTelemetry instrumentation
 */

import { Request, Response, NextFunction } from 'express';
import { GamifyXTelemetry } from './index';
import { GamifyXMetrics } from './metrics';
import { trace, context, SpanStatusCode } from '@opentelemetry/api';

export interface TelemetryMiddlewareOptions {
  telemetry: GamifyXTelemetry;
  metrics: GamifyXMetrics;
  ignorePaths?: string[];
  enableDetailedLogging?: boolean;
}

export function createTelemetryMiddleware(options: TelemetryMiddlewareOptions) {
  const { telemetry, metrics, ignorePaths = ['/health', '/metrics'], enableDetailedLogging = false } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    const path = req.path;

    // Skip instrumentation for ignored paths
    if (ignorePaths.some(ignorePath => path.startsWith(ignorePath))) {
      return next();
    }

    // Create a span for this request
    const tracer = telemetry.getTracer();
    const span = tracer.startSpan(`${req.method} ${req.route?.path || req.path}`, {
      kind: 1, // SERVER
      attributes: {
        'http.method': req.method,
        'http.url': req.url,
        'http.route': req.route?.path || req.path,
        'http.user_agent': req.get('User-Agent') || '',
        'gamifyx.service': telemetry['config'].serviceName,
        'gamifyx.request_id': req.headers['x-request-id'] || generateRequestId(),
      },
    });

    // Add user information if available
    if ((req as any).user) {
      span.setAttributes({
        'gamifyx.user_id': (req as any).user.userId,
        'gamifyx.user_role': (req as any).user.role,
      });
    }

    // Increment in-flight requests
    metrics.httpRequestsInFlight.record(1, { method: req.method, route: req.route?.path || req.path });

    // Set up response handling
    const originalSend = res.send;
    res.send = function(body) {
      const duration = Date.now() - startTime;
      const statusCode = res.statusCode;

      // Record metrics
      metrics.recordHttpRequest(req.method, req.route?.path || req.path, statusCode, duration);

      // Update span with response information
      span.setAttributes({
        'http.status_code': statusCode,
        'http.response_size': Buffer.byteLength(body || ''),
        'gamifyx.response_time_ms': duration,
      });

      // Set span status based on HTTP status code
      if (statusCode >= 400) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: `HTTP ${statusCode}`,
        });

        if (statusCode >= 500) {
          span.recordException(new Error(`HTTP ${statusCode}: ${body}`));
        }
      } else {
        span.setStatus({ code: SpanStatusCode.OK });
      }

      // Log detailed information if enabled
      if (enableDetailedLogging) {
        console.log(`[${telemetry['config'].serviceName}] ${req.method} ${req.path} - ${statusCode} - ${duration}ms`);
      }

      // Decrement in-flight requests
      metrics.httpRequestsInFlight.record(-1, { method: req.method, route: req.route?.path || req.path });

      // End the span
      span.end();

      return originalSend.call(this, body);
    };

    // Handle errors
    const originalNext = next;
    next = (error?: any) => {
      if (error) {
        const duration = Date.now() - startTime;
        
        // Record error metrics
        metrics.recordHttpRequest(req.method, req.route?.path || req.path, 500, duration);

        // Update span with error information
        span.recordException(error);
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error.message || 'Internal Server Error',
        });

        span.setAttributes({
          'http.status_code': 500,
          'gamifyx.error': true,
          'gamifyx.error_message': error.message,
          'gamifyx.response_time_ms': duration,
        });

        // Decrement in-flight requests
        metrics.httpRequestsInFlight.record(-1, { method: req.method, route: req.route?.path || req.path });

        span.end();
      }

      return originalNext(error);
    };

    // Continue with the request in the span context
    context.with(trace.setSpan(context.active(), span), () => {
      next();
    });
  };
}

// Middleware for WebSocket instrumentation
export function createWebSocketTelemetryMiddleware(options: TelemetryMiddlewareOptions) {
  const { telemetry, metrics } = options;

  return {
    onConnection: (socket: any, userId?: string) => {
      const span = telemetry.createSpan('websocket.connection', {
        'websocket.event': 'connect',
        'gamifyx.user_id': userId,
        'gamifyx.service': telemetry['config'].serviceName,
      });

      metrics.recordWebSocketConnection('connect', userId);
      span.end();
    },

    onDisconnection: (socket: any, userId?: string, reason?: string) => {
      const span = telemetry.createSpan('websocket.disconnection', {
        'websocket.event': 'disconnect',
        'websocket.disconnect_reason': reason,
        'gamifyx.user_id': userId,
        'gamifyx.service': telemetry['config'].serviceName,
      });

      metrics.recordWebSocketConnection('disconnect', userId);
      span.end();
    },

    onMessage: (messageType: string, userId?: string, data?: any) => {
      const span = telemetry.createSpan('websocket.message', {
        'websocket.message_type': messageType,
        'gamifyx.user_id': userId,
        'gamifyx.service': telemetry['config'].serviceName,
        'gamifyx.message_size': data ? JSON.stringify(data).length : 0,
      });

      metrics.recordWebSocketMessage(messageType, userId);
      span.end();
    },

    onError: (error: Error, userId?: string) => {
      const span = telemetry.createSpan('websocket.error', {
        'websocket.event': 'error',
        'gamifyx.user_id': userId,
        'gamifyx.service': telemetry['config'].serviceName,
      });

      span.recordException(error);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error.message,
      });

      metrics.websocketErrors.add(1, { user_id: userId || 'anonymous' });
      span.end();
    },
  };
}

// Database operation instrumentation
export function instrumentDatabaseOperation<T>(
  telemetry: GamifyXTelemetry,
  metrics: GamifyXMetrics,
  operation: string,
  table: string,
  fn: () => Promise<T>
): Promise<T> {
  return telemetry.traceAsync(
    `db.${operation}`,
    async () => {
      const startTime = Date.now();
      
      try {
        const result = await fn();
        const duration = Date.now() - startTime;
        
        metrics.processingTime.record(duration / 1000, {
          operation: 'database',
          table,
          query_type: operation,
        });

        return result;
      } catch (error) {
        metrics.processingTime.record((Date.now() - startTime) / 1000, {
          operation: 'database',
          table,
          query_type: operation,
          error: 'true',
        });
        throw error;
      }
    },
    {
      'db.operation': operation,
      'db.table': table,
      'gamifyx.operation_type': 'database',
    }
  );
}

// Cache operation instrumentation
export function instrumentCacheOperation<T>(
  telemetry: GamifyXTelemetry,
  metrics: GamifyXMetrics,
  operation: 'get' | 'set' | 'del',
  key: string,
  fn: () => Promise<T>
): Promise<T> {
  return telemetry.traceAsync(
    `cache.${operation}`,
    async () => {
      const startTime = Date.now();
      
      try {
        const result = await fn();
        const duration = Date.now() - startTime;
        
        // Record cache hit/miss for get operations
        if (operation === 'get') {
          metrics.recordCacheOperation(result ? 'hit' : 'miss', 'redis');
        }
        
        metrics.processingTime.record(duration / 1000, {
          operation: 'cache',
          cache_operation: operation,
        });

        return result;
      } catch (error) {
        metrics.processingTime.record((Date.now() - startTime) / 1000, {
          operation: 'cache',
          cache_operation: operation,
          error: 'true',
        });
        throw error;
      }
    },
    {
      'cache.operation': operation,
      'cache.key': key,
      'gamifyx.operation_type': 'cache',
    }
  );
}

// Helper function to generate request IDs
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export default {
  createTelemetryMiddleware,
  createWebSocketTelemetryMiddleware,
  instrumentDatabaseOperation,
  instrumentCacheOperation,
};