export interface ServiceConfig {
  name: string;
  baseUrl: string;
  healthEndpoint: string;
  timeout: number;
  retries: number;
  circuitBreaker: {
    enabled: boolean;
    threshold: number;
    timeout: number;
    resetTimeout: number;
  };
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
  authentication: {
    required: boolean;
    type: 'jwt' | 'api-key' | 'none';
  };
}

export interface ServiceHealth {
  serviceName: string;
  status: 'healthy' | 'unhealthy' | 'degraded' | 'unknown';
  responseTime: number;
  lastChecked: Date;
  consecutiveFailures: number;
  uptime: number;
  version?: string;
  metadata?: Record<string, any>;
}

export interface ProxyRequest {
  serviceName: string;
  path: string;
  method: string;
  headers: Record<string, string>;
  body?: any;
  query?: Record<string, string>;
  userId?: string;
}

export interface ProxyResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: any;
  responseTime: number;
  serviceName: string;
  cached: boolean;
}

export interface RequestTransformation {
  serviceName: string;
  path: string;
  transformRequest?: (req: any) => any;
  transformResponse?: (res: any) => any;
  validateRequest?: (req: any) => boolean;
  validateResponse?: (res: any) => boolean;
}

export interface CircuitBreakerState {
  serviceName: string;
  state: 'closed' | 'open' | 'half-open';
  failureCount: number;
  lastFailureTime?: Date;
  nextAttemptTime?: Date;
  successCount: number;
}

export interface LoadBalancerConfig {
  strategy: 'round-robin' | 'least-connections' | 'weighted' | 'health-based';
  services: {
    name: string;
    instances: ServiceInstance[];
  }[];
}

export interface ServiceInstance {
  id: string;
  url: string;
  weight: number;
  health: ServiceHealth;
  connections: number;
}

export interface APIGatewayMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  requestsPerSecond: number;
  serviceMetrics: {
    [serviceName: string]: {
      requests: number;
      failures: number;
      averageResponseTime: number;
      circuitBreakerState: string;
    };
  };
  timestamp: Date;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetTime: Date;
  windowMs: number;
}

export interface AuthenticationResult {
  authenticated: boolean;
  userId?: string;
  roles?: string[];
  permissions?: string[];
  error?: string;
}

// AI Service specific types
export interface AIServiceEndpoint {
  service: 'ai-registry' | 'model-performance' | 'guardrail';
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  description: string;
  requestSchema?: any;
  responseSchema?: any;
  requiresAuth: boolean;
  rateLimit?: {
    windowMs: number;
    maxRequests: number;
  };
}

export interface AIServiceRequest {
  service: 'ai-registry' | 'model-performance' | 'guardrail';
  endpoint: string;
  method: string;
  data?: any;
  headers?: Record<string, string>;
  timeout?: number;
}

export interface AIServiceResponse {
  success: boolean;
  data?: any;
  error?: string;
  statusCode: number;
  responseTime: number;
  service: string;
  endpoint: string;
  cached?: boolean;
  metadata?: {
    requestId: string;
    timestamp: Date;
    version: string;
  };
}

// Health monitoring types
export interface HealthCheckResult {
  service: string;
  endpoint: string;
  status: 'up' | 'down' | 'degraded';
  responseTime: number;
  timestamp: Date;
  details?: {
    database?: 'connected' | 'disconnected';
    dependencies?: Record<string, 'up' | 'down'>;
    version?: string;
    uptime?: number;
  };
}

export interface ServiceRegistry {
  services: {
    [serviceName: string]: {
      instances: ServiceInstance[];
      config: ServiceConfig;
      health: ServiceHealth;
      lastUpdated: Date;
    };
  };
}

// Integration patterns
export interface IntegrationPattern {
  name: string;
  type: 'request-response' | 'event-driven' | 'batch' | 'streaming';
  description: string;
  configuration: Record<string, any>;
  enabled: boolean;
}

// Rollback mechanism types
export interface RollbackConfig {
  enabled: boolean;
  triggers: {
    errorRate: number; // Percentage
    responseTime: number; // Milliseconds
    healthCheckFailures: number;
  };
  strategy: 'immediate' | 'gradual' | 'manual';
  fallbackService?: string;
  notificationChannels: string[];
}

export interface RollbackEvent {
  id: string;
  serviceName: string;
  trigger: string;
  timestamp: Date;
  status: 'initiated' | 'in-progress' | 'completed' | 'failed';
  rollbackStrategy: string;
  affectedRequests: number;
  duration?: number;
  details: Record<string, any>;
}

// Constants
export const AI_SERVICES = {
  AI_REGISTRY: 'ai-registry',
  MODEL_PERFORMANCE: 'model-performance',
  GUARDRAIL: 'guardrail'
} as const;

export const CIRCUIT_BREAKER_STATES = {
  CLOSED: 'closed',
  OPEN: 'open',
  HALF_OPEN: 'half-open'
} as const;

export const LOAD_BALANCER_STRATEGIES = {
  ROUND_ROBIN: 'round-robin',
  LEAST_CONNECTIONS: 'least-connections',
  WEIGHTED: 'weighted',
  HEALTH_BASED: 'health-based'
} as const;

export type AIServiceName = typeof AI_SERVICES[keyof typeof AI_SERVICES];
export type CircuitBreakerStateType = typeof CIRCUIT_BREAKER_STATES[keyof typeof CIRCUIT_BREAKER_STATES];
export type LoadBalancerStrategy = typeof LOAD_BALANCER_STRATEGIES[keyof typeof LOAD_BALANCER_STRATEGIES];