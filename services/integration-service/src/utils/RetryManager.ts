import { logger } from './logger';
import { RetryConfig } from '../types/workflow';

export class RetryManager {
  private config: RetryConfig;

  constructor(config?: Partial<RetryConfig>) {
    this.config = {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2,
      ...config
    };
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= this.config.maxAttempts; attempt++) {
      try {
        const result = await operation();
        if (attempt > 1) {
          logger.info(`Operation succeeded on attempt ${attempt}`);
        }
        return result;
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === this.config.maxAttempts) {
          logger.error(`Operation failed after ${attempt} attempts:`, error);
          break;
        }

        if (!this.isRetryableError(error as Error)) {
          logger.warn(`Non-retryable error encountered on attempt ${attempt}:`, error);
          break;
        }

        const delay = this.calculateDelay(attempt);
        logger.warn(`Operation failed on attempt ${attempt}, retrying in ${delay}ms:`, error);
        
        await this.sleep(delay);
      }
    }

    throw lastError!;
  }

  private isRetryableError(error: Error): boolean {
    // Define which errors are retryable
    const retryablePatterns = [
      /timeout/i,
      /network/i,
      /connection/i,
      /ECONNRESET/i,
      /ENOTFOUND/i,
      /ETIMEDOUT/i,
      /503/i, // Service Unavailable
      /502/i, // Bad Gateway
      /504/i  // Gateway Timeout
    ];

    return retryablePatterns.some(pattern => 
      pattern.test(error.message) || 
      pattern.test(error.name) ||
      (error as any).code && pattern.test((error as any).code)
    );
  }

  private calculateDelay(attempt: number): number {
    const exponentialDelay = this.config.baseDelay * Math.pow(this.config.backoffMultiplier, attempt - 1);
    const jitteredDelay = exponentialDelay * (0.5 + Math.random() * 0.5); // Add jitter
    return Math.min(jitteredDelay, this.config.maxDelay);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}