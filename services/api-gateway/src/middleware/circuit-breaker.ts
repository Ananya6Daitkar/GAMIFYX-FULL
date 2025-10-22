/**
 * Circuit Breaker Middleware for API Gateway
 * Implements circuit breaker pattern to handle service failures gracefully
 */

import { Request, Response, NextFunction } from 'express';

interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeout: number;
  monitoringPeriod: number;
  expectedErrors: string[];
}

enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private lastFailureTime: number = 0;
  private successCount: number = 0;
  private requestCount: number = 0;
  private config: CircuitBreakerConfig;
  private serviceName: string;

  constructor(serviceName: string, config: Partial<CircuitBreakerConfig> = {}) {
    this.serviceName = serviceName;
    this.config = {
      failureThreshold: config.failureThreshold || 5,
      resetTimeout: config.resetTimeout || 60000, // 1 minute
      monitoringPeriod: config.monitoringPeriod || 300000, // 5 minutes
      expectedErrors: config.expectedErrors || ['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND']
    };
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.state = CircuitState.HALF_OPEN;
        console.log(`Circuit breaker for ${this.serviceName} moved to HALF_OPEN state`);
      } else {
        throw new Error(`Circuit breaker is OPEN for service ${this.serviceName}`);
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error);
      throw error;
    }
  }

  private shouldAttemptReset(): boolean {
    return Date.now() - this.lastFailureTime >= this.config.resetTimeout;
  }

  private onSuccess(): void {
    this.failureCount = 0;
    this.successCount++;
    this.requestCount++;

    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.CLOSED;
      console.log(`Circuit breaker for ${this.serviceName} moved to CLOSED state`);
    }

    // Emit metrics
    this.emitMetrics();
  }

  private onFailure(error: any): void {
    this.failureCount++;
    this.requestCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.config.failureThreshold) {
      this.state = CircuitState.OPEN;
      console.log(`Circuit breaker for ${this.serviceName} moved to OPEN state after ${this.failureCount} failures`);
    }

    // Emit metrics
    this.emitMetrics();
  }

  private emitMetrics(): void {
    // Emit Prometheus metrics
    const metrics = {
      service: this.serviceName,
      state: this.state,
      failure_count: this.failureCount,
      success_count: this.successCount,
      request_count: this.requestCount,
      failure_rate: this.requestCount > 0 ? this.failureCount / this.requestCount : 0
    };

    // In a real implementation, this would emit to Prometheus
    console.log(`Circuit breaker metrics for ${this.serviceName}:`, metrics);
  }

  getState(): CircuitState {
    return this.state;
  }

  getMetrics() {
    return {
      service: this.serviceName,
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      requestCount: this.requestCount,
      failureRate: this.requestCount > 0 ? this.failureCount / this.requestCount : 0,
      lastFailureTime: this.lastFailureTime
    };
  }
}

class CircuitBreakerRegistry {
  private static instance: CircuitBreakerRegistry;
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();

  static getInstance(): CircuitBreakerRegistry {
    if (!CircuitBreakerRegistry.instance) {
      CircuitBreakerRegistry.instance = new CircuitBreakerRegistry();
    }
    return CircuitBreakerRegistry.instance;
  }

  getCircuitBreaker(serviceName: string, config?: Partial<CircuitBreakerConfig>): CircuitBreaker {
    if (!this.circuitBreakers.has(serviceName)) {
      this.circuitBreakers.set(serviceName, new CircuitBreaker(serviceName, config));
    }
    return this.circuitBreakers.get(serviceName)!;
  }

  getAllMetrics() {
    const metrics: any[] = [];
    this.circuitBreakers.forEach((breaker, serviceName) => {
      metrics.push(breaker.getMetrics());
    });
    return metrics;
  }
}

export class CircuitBreakerMiddleware {
  private registry: CircuitBreakerRegistry;

  constructor() {
    this.registry = CircuitBreakerRegistry.getInstance();
  }

  create(serviceName: string, config?: Partial<CircuitBreakerConfig>) {
    return (req: Request, res: Response, next: NextFunction) => {
      const circuitBreaker = this.registry.getCircuitBreaker(serviceName, config);
      
      // Add circuit breaker to request context
      (req as any).circuitBreaker = circuitBreaker;
      
      // Add circuit breaker state to response headers
      res.setHeader('X-Circuit-Breaker-State', circuitBreaker.getState());
      res.setHeader('X-Service-Name', serviceName);

      // Check if circuit is open
      if (circuitBreaker.getState() === CircuitState.OPEN) {
        return res.status(503).json({
          error: 'Service Unavailable',
          message: `Circuit breaker is open for service ${serviceName}`,
          service: serviceName,
          state: circuitBreaker.getState(),
          timestamp: new Date().toISOString(),
          fallback: this.getFallbackResponse(serviceName)
        });
      }

      next();
    };
  }

  private getFallbackResponse(serviceName: string) {
    // Provide fallback responses based on service type
    const fallbacks: { [key: string]: any } = {
      'gamification-service': {
        message: 'Gamification features temporarily unavailable',
        fallback_data: {
          points: 0,
          level: 1,
          badges: [],
          leaderboard: []
        }
      },
      'ai-feedback-service': {
        message: 'AI feedback temporarily unavailable',
        fallback_data: {
          feedback: 'Automated feedback is currently unavailable. Please check back later.',
          confidence: 0
        }
      },
      'analytics-service': {
        message: 'Analytics temporarily unavailable',
        fallback_data: {
          metrics: {},
          health_score: 'unknown'
        }
      }
    };

    return fallbacks[serviceName] || {
      message: 'Service temporarily unavailable',
      fallback_data: null
    };
  }

  // Middleware to expose circuit breaker metrics
  metricsEndpoint() {
    return (req: Request, res: Response) => {
      const metrics = this.registry.getAllMetrics();
      res.json({
        circuit_breakers: metrics,
        timestamp: new Date().toISOString()
      });
    };
  }

  // Middleware to manually control circuit breakers
  controlEndpoint() {
    return (req: Request, res: Response) => {
      const { service, action } = req.body;
      
      if (!service || !action) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Service name and action are required'
        });
      }

      const circuitBreaker = this.registry.getCircuitBreaker(service);
      
      switch (action) {
        case 'open':
          // Force circuit to open state
          (circuitBreaker as any).state = CircuitState.OPEN;
          (circuitBreaker as any).lastFailureTime = Date.now();
          break;
        case 'close':
          // Force circuit to closed state
          (circuitBreaker as any).state = CircuitState.CLOSED;
          (circuitBreaker as any).failureCount = 0;
          break;
        case 'half-open':
          // Force circuit to half-open state
          (circuitBreaker as any).state = CircuitState.HALF_OPEN;
          break;
        default:
          return res.status(400).json({
            error: 'Invalid Action',
            message: 'Valid actions are: open, close, half-open'
          });
      }

      res.json({
        message: `Circuit breaker for ${service} set to ${action.toUpperCase()}`,
        service,
        new_state: circuitBreaker.getState(),
        timestamp: new Date().toISOString()
      });
    };
  }
}

export { CircuitBreaker, CircuitState, CircuitBreakerRegistry };