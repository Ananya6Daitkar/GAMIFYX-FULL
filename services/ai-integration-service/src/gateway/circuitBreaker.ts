import { CircuitBreakerState, CircuitBreakerStateType } from '@/types';
import { logger } from '@/telemetry/logger';

export class CircuitBreakerManager {
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map();
  private readonly DEFAULT_THRESHOLD = 5;
  private readonly DEFAULT_TIMEOUT = 60000; // 1 minute
  private readonly DEFAULT_RESET_TIMEOUT = 30000; // 30 seconds

  constructor() {
    this.initializeDefaultCircuitBreakers();
  }

  private initializeDefaultCircuitBreakers(): void {
    const services = ['ai-registry', 'model-performance', 'guardrail'];
    
    services.forEach(serviceName => {
      this.circuitBreakers.set(serviceName, {
        serviceName,
        state: 'closed',
        failureCount: 0,
        successCount: 0
      });
    });

    logger.info('Circuit breakers initialized', { services });
  }

  isOpen(serviceName: string): boolean {
    const circuitBreaker = this.circuitBreakers.get(serviceName);
    if (!circuitBreaker) {
      return false;
    }

    // Check if circuit breaker should transition from open to half-open
    if (circuitBreaker.state === 'open' && circuitBreaker.nextAttemptTime) {
      if (Date.now() >= circuitBreaker.nextAttemptTime.getTime()) {
        this.transitionToHalfOpen(serviceName);
        return false; // Allow one request in half-open state
      }
      return true;
    }

    return circuitBreaker.state === 'open';
  }

  recordSuccess(serviceName: string): void {
    const circuitBreaker = this.circuitBreakers.get(serviceName);
    if (!circuitBreaker) {
      return;
    }

    circuitBreaker.successCount++;
    circuitBreaker.failureCount = 0; // Reset failure count on success

    // If in half-open state and we get a success, close the circuit
    if (circuitBreaker.state === 'half-open') {
      this.transitionToClosed(serviceName);
    }

    logger.debug('Circuit breaker success recorded', {
      serviceName,
      state: circuitBreaker.state,
      successCount: circuitBreaker.successCount
    });
  }

  recordFailure(serviceName: string): void {
    const circuitBreaker = this.circuitBreakers.get(serviceName);
    if (!circuitBreaker) {
      return;
    }

    circuitBreaker.failureCount++;
    circuitBreaker.lastFailureTime = new Date();

    logger.debug('Circuit breaker failure recorded', {
      serviceName,
      state: circuitBreaker.state,
      failureCount: circuitBreaker.failureCount
    });

    // Check if we should open the circuit breaker
    if (circuitBreaker.state === 'closed' && 
        circuitBreaker.failureCount >= this.DEFAULT_THRESHOLD) {
      this.transitionToOpen(serviceName);
    } else if (circuitBreaker.state === 'half-open') {
      // If we fail in half-open state, go back to open
      this.transitionToOpen(serviceName);
    }
  }

  private transitionToOpen(serviceName: string): void {
    const circuitBreaker = this.circuitBreakers.get(serviceName);
    if (!circuitBreaker) {
      return;
    }

    circuitBreaker.state = 'open';
    circuitBreaker.nextAttemptTime = new Date(Date.now() + this.DEFAULT_TIMEOUT);

    logger.warn('Circuit breaker opened', {
      serviceName,
      failureCount: circuitBreaker.failureCount,
      nextAttemptTime: circuitBreaker.nextAttemptTime
    });

    // Emit event for monitoring/alerting
    this.emitCircuitBreakerEvent(serviceName, 'opened');
  }

  private transitionToHalfOpen(serviceName: string): void {
    const circuitBreaker = this.circuitBreakers.get(serviceName);
    if (!circuitBreaker) {
      return;
    }

    circuitBreaker.state = 'half-open';
    circuitBreaker.nextAttemptTime = undefined;

    logger.info('Circuit breaker transitioned to half-open', { serviceName });
    this.emitCircuitBreakerEvent(serviceName, 'half-opened');
  }

  private transitionToClosed(serviceName: string): void {
    const circuitBreaker = this.circuitBreakers.get(serviceName);
    if (!circuitBreaker) {
      return;
    }

    circuitBreaker.state = 'closed';
    circuitBreaker.failureCount = 0;
    circuitBreaker.nextAttemptTime = undefined;

    logger.info('Circuit breaker closed', { serviceName });
    this.emitCircuitBreakerEvent(serviceName, 'closed');
  }

  getState(serviceName: string): CircuitBreakerState | null {
    return this.circuitBreakers.get(serviceName) || null;
  }

  getAllStates(): { [serviceName: string]: CircuitBreakerState } {
    const states: { [serviceName: string]: CircuitBreakerState } = {};
    
    this.circuitBreakers.forEach((state, serviceName) => {
      states[serviceName] = { ...state };
    });

    return states;
  }

  // Manual circuit breaker control
  forceOpen(serviceName: string): boolean {
    const circuitBreaker = this.circuitBreakers.get(serviceName);
    if (!circuitBreaker) {
      return false;
    }

    this.transitionToOpen(serviceName);
    logger.warn('Circuit breaker manually opened', { serviceName });
    return true;
  }

  forceClose(serviceName: string): boolean {
    const circuitBreaker = this.circuitBreakers.get(serviceName);
    if (!circuitBreaker) {
      return false;
    }

    this.transitionToClosed(serviceName);
    logger.info('Circuit breaker manually closed', { serviceName });
    return true;
  }

  reset(serviceName: string): boolean {
    const circuitBreaker = this.circuitBreakers.get(serviceName);
    if (!circuitBreaker) {
      return false;
    }

    circuitBreaker.state = 'closed';
    circuitBreaker.failureCount = 0;
    circuitBreaker.successCount = 0;
    circuitBreaker.lastFailureTime = undefined;
    circuitBreaker.nextAttemptTime = undefined;

    logger.info('Circuit breaker reset', { serviceName });
    return true;
  }

  // Get circuit breaker statistics
  getStats(): any {
    const stats = {
      totalCircuitBreakers: this.circuitBreakers.size,
      openCircuitBreakers: 0,
      halfOpenCircuitBreakers: 0,
      closedCircuitBreakers: 0,
      circuitBreakers: {} as any
    };

    this.circuitBreakers.forEach((state, serviceName) => {
      switch (state.state) {
        case 'open':
          stats.openCircuitBreakers++;
          break;
        case 'half-open':
          stats.halfOpenCircuitBreakers++;
          break;
        case 'closed':
          stats.closedCircuitBreakers++;
          break;
      }

      stats.circuitBreakers[serviceName] = {
        state: state.state,
        failureCount: state.failureCount,
        successCount: state.successCount,
        lastFailureTime: state.lastFailureTime,
        nextAttemptTime: state.nextAttemptTime
      };
    });

    return stats;
  }

  private emitCircuitBreakerEvent(serviceName: string, event: string): void {
    // In a real implementation, this would emit events to a message queue
    // or notification system for monitoring and alerting
    logger.info('Circuit breaker event', { serviceName, event });
    
    // Could integrate with monitoring systems here
    // Example: send to Prometheus, Grafana alerts, Slack notifications, etc.
  }

  // Health check for circuit breakers
  healthCheck(): { healthy: boolean; details: any } {
    const stats = this.getStats();
    const healthy = stats.openCircuitBreakers === 0;

    return {
      healthy,
      details: {
        ...stats,
        message: healthy ? 
          'All circuit breakers are closed' : 
          `${stats.openCircuitBreakers} circuit breaker(s) are open`
      }
    };
  }

  // Configuration methods
  updateThreshold(serviceName: string, threshold: number): boolean {
    // In a more advanced implementation, this would allow per-service configuration
    logger.info('Circuit breaker threshold update requested', { serviceName, threshold });
    return true;
  }

  updateTimeout(serviceName: string, timeout: number): boolean {
    // In a more advanced implementation, this would allow per-service configuration
    logger.info('Circuit breaker timeout update requested', { serviceName, timeout });
    return true;
  }
}