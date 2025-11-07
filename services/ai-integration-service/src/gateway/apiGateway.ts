import express, { Request, Response, NextFunction } from 'express';
import { createProxyMiddleware, Options } from 'http-proxy-middleware';
import rateLimit from 'express-rate-limit';
import { ServiceRegistryManager } from './serviceRegistry';
import { CircuitBreakerManager } from './circuitBreaker';
import { 
  ProxyRequest, 
  ProxyResponse, 
  AIServiceRequest, 
  AIServiceResponse,
  RequestTransformation 
} from '@/types';
import { logger } from '@/telemetry/logger';
import axios from 'axios';

export class APIGateway {
  private app: express.Application;
  private serviceRegistry: ServiceRegistryManager;
  private circuitBreaker: CircuitBreakerManager;
  private transformations: Map<string, RequestTransformation> = new Map();
  private rateLimiters: Map<string, any> = new Map();

  constructor() {
    this.app = express();
    this.serviceRegistry = new ServiceRegistryManager();
    this.circuitBreaker = new CircuitBreakerManager();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    // Request logging
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      logger.info('Gateway request', {
        method: req.method,
        url: req.url,
        userAgent: req.get('User-Agent'),
        ip: req.ip
      });
      next();
    });

    // Request transformation middleware
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      const serviceName = this.extractServiceName(req.path);
      if (serviceName) {
        const transformation = this.transformations.get(serviceName);
        if (transformation && transformation.transformRequest) {
          req.body = transformation.transformRequest(req.body);
        }
      }
      next();
    });
  }

  private setupRoutes(): void {
    // AI Registry Service routes
    this.setupServiceProxy('ai-registry', '/api/ai-registry');
    
    // Model Performance Service routes
    this.setupServiceProxy('model-performance', '/api/model-performance');
    
    // Guardrail Service routes
    this.setupServiceProxy('guardrail', '/api/guardrail');

    // Health check for all services
    this.app.get('/api/health/all', this.getAllServicesHealth.bind(this));
    
    // Service-specific health checks
    this.app.get('/api/health/:serviceName', this.getServiceHealth.bind(this));
    
    // Gateway metrics
    this.app.get('/api/gateway/metrics', this.getGatewayMetrics.bind(this));
    
    // Service registry information
    this.app.get('/api/gateway/services', this.getServiceRegistry.bind(this));

    // Circuit breaker status
    this.app.get('/api/gateway/circuit-breakers', this.getCircuitBreakerStatus.bind(this));
  }

  private setupServiceProxy(serviceName: string, routePrefix: string): void {
    const service = this.serviceRegistry.getService(serviceName);
    if (!service) {
      logger.error('Service not found for proxy setup', { serviceName });
      return;
    }

    // Setup rate limiting for this service
    const rateLimiter = rateLimit({
      windowMs: service.rateLimit.windowMs,
      max: service.rateLimit.maxRequests,
      message: {
        error: 'Too many requests',
        service: serviceName,
        retryAfter: service.rateLimit.windowMs / 1000
      },
      standardHeaders: true,
      legacyHeaders: false,
    });

    this.rateLimiters.set(serviceName, rateLimiter);

    // Proxy configuration
    const proxyOptions: Options = {
      target: service.baseUrl,
      changeOrigin: true,
      pathRewrite: {
        [`^${routePrefix}`]: ''
      },
      timeout: service.timeout,
      onProxyReq: (proxyReq, req, res) => {
        logger.debug('Proxying request', {
          service: serviceName,
          method: req.method,
          path: req.url,
          target: service.baseUrl
        });
      },
      onProxyRes: (proxyRes, req, res) => {
        logger.debug('Proxy response', {
          service: serviceName,
          statusCode: proxyRes.statusCode,
          path: req.url
        });
      },
      onError: (err, req, res) => {
        logger.error('Proxy error', {
          service: serviceName,
          error: err.message,
          path: req.url
        });
        
        // Circuit breaker logic
        this.circuitBreaker.recordFailure(serviceName);
        
        res.status(503).json({
          error: 'Service temporarily unavailable',
          service: serviceName,
          message: 'The requested service is currently experiencing issues'
        });
      }
    };

    // Apply middleware chain: rate limiting -> circuit breaker -> proxy
    this.app.use(
      routePrefix,
      rateLimiter,
      this.circuitBreakerMiddleware(serviceName),
      createProxyMiddleware(proxyOptions)
    );

    logger.info('Service proxy configured', {
      serviceName,
      routePrefix,
      target: service.baseUrl
    });
  }

  private circuitBreakerMiddleware(serviceName: string) {
    return (req: Request, res: Response, next: NextFunction) => {
      if (this.circuitBreaker.isOpen(serviceName)) {
        logger.warn('Circuit breaker open', { serviceName, path: req.path });
        
        return res.status(503).json({
          error: 'Service circuit breaker open',
          service: serviceName,
          message: 'Service is temporarily unavailable due to repeated failures'
        });
      }
      
      // Record successful request
      this.circuitBreaker.recordSuccess(serviceName);
      next();
    };
  }

  private extractServiceName(path: string): string | null {
    const pathParts = path.split('/');
    if (pathParts.length >= 3 && pathParts[1] === 'api') {
      const servicePart = pathParts[2];
      
      // Map route prefixes to service names
      const serviceMap: { [key: string]: string } = {
        'ai-registry': 'ai-registry',
        'model-performance': 'model-performance',
        'guardrail': 'guardrail'
      };
      
      return serviceMap[servicePart] || null;
    }
    return null;
  }

  // Direct service call method (alternative to proxy)
  async callService(request: AIServiceRequest): Promise<AIServiceResponse> {
    const startTime = Date.now();
    const service = this.serviceRegistry.getService(request.service);
    
    if (!service) {
      return {
        success: false,
        error: `Service ${request.service} not found`,
        statusCode: 404,
        responseTime: Date.now() - startTime,
        service: request.service,
        endpoint: request.endpoint
      };
    }

    // Check circuit breaker
    if (this.circuitBreaker.isOpen(request.service)) {
      return {
        success: false,
        error: 'Service circuit breaker is open',
        statusCode: 503,
        responseTime: Date.now() - startTime,
        service: request.service,
        endpoint: request.endpoint
      };
    }

    try {
      const url = `${service.baseUrl}${request.endpoint}`;
      const config = {
        method: request.method.toLowerCase() as any,
        url,
        data: request.data,
        headers: request.headers || {},
        timeout: request.timeout || service.timeout
      };

      const response = await axios(config);
      const responseTime = Date.now() - startTime;

      // Record success
      this.circuitBreaker.recordSuccess(request.service);

      return {
        success: true,
        data: response.data,
        statusCode: response.status,
        responseTime,
        service: request.service,
        endpoint: request.endpoint,
        metadata: {
          requestId: response.headers['x-correlation-id'] || 'unknown',
          timestamp: new Date(),
          version: response.headers['x-service-version'] || 'unknown'
        }
      };

    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      
      // Record failure
      this.circuitBreaker.recordFailure(request.service);

      logger.error('Service call failed', {
        service: request.service,
        endpoint: request.endpoint,
        error: error.message,
        responseTime
      });

      return {
        success: false,
        error: error.response?.data?.message || error.message,
        statusCode: error.response?.status || 500,
        responseTime,
        service: request.service,
        endpoint: request.endpoint
      };
    }
  }

  // Health check endpoints
  private async getAllServicesHealth(req: Request, res: Response): Promise<void> {
    const services = this.serviceRegistry.getAllServices();
    const healthChecks = await Promise.all(
      services.map(async (serviceName) => {
        try {
          const health = await this.serviceRegistry.checkServiceHealth(serviceName);
          return { serviceName, health };
        } catch (error) {
          return {
            serviceName,
            health: {
              serviceName,
              status: 'unhealthy' as const,
              responseTime: 0,
              lastChecked: new Date(),
              consecutiveFailures: 999,
              uptime: 0
            }
          };
        }
      })
    );

    const overallStatus = healthChecks.every(check => 
      check.health.status === 'healthy'
    ) ? 'healthy' : 'degraded';

    res.json({
      status: overallStatus,
      services: healthChecks.reduce((acc, check) => {
        acc[check.serviceName] = check.health;
        return acc;
      }, {} as any),
      timestamp: new Date(),
      gateway: {
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0'
      }
    });
  }

  private async getServiceHealth(req: Request, res: Response): Promise<void> {
    const { serviceName } = req.params;
    
    try {
      const health = await this.serviceRegistry.checkServiceHealth(serviceName);
      res.json({
        service: serviceName,
        health,
        circuitBreaker: this.circuitBreaker.getState(serviceName)
      });
    } catch (error) {
      res.status(404).json({
        error: 'Service not found',
        service: serviceName
      });
    }
  }

  private getGatewayMetrics(req: Request, res: Response): void {
    const serviceStats = this.serviceRegistry.getServiceStats();
    const circuitBreakerStats = this.circuitBreaker.getAllStates();

    res.json({
      gateway: {
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        version: process.env.npm_package_version || '1.0.0'
      },
      services: serviceStats,
      circuitBreakers: circuitBreakerStats,
      timestamp: new Date()
    });
  }

  private getServiceRegistry(req: Request, res: Response): void {
    const registry = this.serviceRegistry.getRegistrySnapshot();
    res.json(registry);
  }

  private getCircuitBreakerStatus(req: Request, res: Response): void {
    const states = this.circuitBreaker.getAllStates();
    res.json({
      circuitBreakers: states,
      timestamp: new Date()
    });
  }

  // Request/Response transformation methods
  addTransformation(serviceName: string, transformation: RequestTransformation): void {
    this.transformations.set(serviceName, transformation);
    logger.info('Transformation added', { serviceName });
  }

  removeTransformation(serviceName: string): void {
    this.transformations.delete(serviceName);
    logger.info('Transformation removed', { serviceName });
  }

  getApp(): express.Application {
    return this.app;
  }

  // Graceful shutdown
  async shutdown(): Promise<void> {
    logger.info('Shutting down API Gateway');
    this.serviceRegistry.stopHealthChecking();
    // Additional cleanup if needed
  }
}