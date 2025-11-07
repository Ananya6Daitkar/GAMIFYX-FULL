import { ServiceConfig, ServiceHealth, ServiceInstance, ServiceRegistry } from '@/types';
import { logger } from '@/telemetry/logger';
import axios from 'axios';

export class ServiceRegistryManager {
  private registry: ServiceRegistry;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private readonly HEALTH_CHECK_INTERVAL = 30000; // 30 seconds

  constructor() {
    this.registry = { services: {} };
    this.initializeDefaultServices();
    this.startHealthChecking();
  }

  private initializeDefaultServices() {
    // AI Registry Service
    this.registerService('ai-registry', {
      name: 'ai-registry',
      baseUrl: process.env.AI_REGISTRY_SERVICE_URL || 'http://localhost:3009',
      healthEndpoint: '/health',
      timeout: 5000,
      retries: 3,
      circuitBreaker: {
        enabled: true,
        threshold: 5,
        timeout: 60000,
        resetTimeout: 30000
      },
      rateLimit: {
        windowMs: 60000,
        maxRequests: 100
      },
      authentication: {
        required: false,
        type: 'none'
      }
    });

    // Model Performance Service
    this.registerService('model-performance', {
      name: 'model-performance',
      baseUrl: process.env.MODEL_PERFORMANCE_SERVICE_URL || 'http://localhost:3010',
      healthEndpoint: '/health',
      timeout: 5000,
      retries: 3,
      circuitBreaker: {
        enabled: true,
        threshold: 5,
        timeout: 60000,
        resetTimeout: 30000
      },
      rateLimit: {
        windowMs: 60000,
        maxRequests: 100
      },
      authentication: {
        required: false,
        type: 'none'
      }
    });

    // Guardrail Service
    this.registerService('guardrail', {
      name: 'guardrail',
      baseUrl: process.env.GUARDRAIL_SERVICE_URL || 'http://localhost:3011',
      healthEndpoint: '/health',
      timeout: 5000,
      retries: 3,
      circuitBreaker: {
        enabled: true,
        threshold: 5,
        timeout: 60000,
        resetTimeout: 30000
      },
      rateLimit: {
        windowMs: 60000,
        maxRequests: 50 // Lower limit for guardrail service
      },
      authentication: {
        required: false,
        type: 'none'
      }
    });

    logger.info('Default AI services registered', {
      services: Object.keys(this.registry.services)
    });
  }

  registerService(serviceName: string, config: ServiceConfig): void {
    const instance: ServiceInstance = {
      id: `${serviceName}-1`,
      url: config.baseUrl,
      weight: 1,
      health: {
        serviceName,
        status: 'unknown',
        responseTime: 0,
        lastChecked: new Date(),
        consecutiveFailures: 0,
        uptime: 0
      },
      connections: 0
    };

    this.registry.services[serviceName] = {
      instances: [instance],
      config,
      health: instance.health,
      lastUpdated: new Date()
    };

    logger.info('Service registered', { serviceName, baseUrl: config.baseUrl });
  }

  getService(serviceName: string): ServiceConfig | null {
    const service = this.registry.services[serviceName];
    return service ? service.config : null;
  }

  getServiceHealth(serviceName: string): ServiceHealth | null {
    const service = this.registry.services[serviceName];
    return service ? service.health : null;
  }

  getAllServices(): string[] {
    return Object.keys(this.registry.services);
  }

  getHealthyServices(): string[] {
    return Object.entries(this.registry.services)
      .filter(([_, service]) => service.health.status === 'healthy')
      .map(([name, _]) => name);
  }

  getServiceInstance(serviceName: string): ServiceInstance | null {
    const service = this.registry.services[serviceName];
    if (!service || service.instances.length === 0) {
      return null;
    }

    // Simple round-robin for now
    // In a more complex setup, this would implement load balancing strategies
    return service.instances.find(instance => 
      instance.health.status === 'healthy'
    ) || service.instances[0];
  }

  async checkServiceHealth(serviceName: string): Promise<ServiceHealth> {
    const service = this.registry.services[serviceName];
    if (!service) {
      throw new Error(`Service ${serviceName} not found`);
    }

    const startTime = Date.now();
    let health: ServiceHealth = {
      serviceName,
      status: 'unknown',
      responseTime: 0,
      lastChecked: new Date(),
      consecutiveFailures: service.health.consecutiveFailures,
      uptime: service.health.uptime
    };

    try {
      const response = await axios.get(
        `${service.config.baseUrl}${service.config.healthEndpoint}`,
        {
          timeout: service.config.timeout,
          validateStatus: (status) => status < 500 // Accept 4xx as healthy
        }
      );

      const responseTime = Date.now() - startTime;
      
      health = {
        ...health,
        status: response.status === 200 ? 'healthy' : 'degraded',
        responseTime,
        consecutiveFailures: response.status === 200 ? 0 : health.consecutiveFailures + 1,
        uptime: response.status === 200 ? health.uptime + 1 : health.uptime,
        version: response.data?.version,
        metadata: response.data
      };

      logger.debug('Health check successful', {
        serviceName,
        status: health.status,
        responseTime
      });

    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      health = {
        ...health,
        status: 'unhealthy',
        responseTime,
        consecutiveFailures: health.consecutiveFailures + 1
      };

      logger.warn('Health check failed', {
        serviceName,
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime
      });
    }

    // Update service health in registry
    this.registry.services[serviceName].health = health;
    this.registry.services[serviceName].instances[0].health = health;
    this.registry.services[serviceName].lastUpdated = new Date();

    return health;
  }

  private startHealthChecking(): void {
    this.healthCheckInterval = setInterval(async () => {
      const services = Object.keys(this.registry.services);
      
      logger.debug('Starting health check cycle', { serviceCount: services.length });

      const healthChecks = services.map(serviceName => 
        this.checkServiceHealth(serviceName).catch(error => {
          logger.error('Health check error', { serviceName, error });
          return null;
        })
      );

      await Promise.all(healthChecks);

      // Log overall health status
      const healthyCount = this.getHealthyServices().length;
      logger.info('Health check cycle completed', {
        totalServices: services.length,
        healthyServices: healthyCount,
        unhealthyServices: services.length - healthyCount
      });

    }, this.HEALTH_CHECK_INTERVAL);

    logger.info('Health checking started', { 
      interval: this.HEALTH_CHECK_INTERVAL 
    });
  }

  stopHealthChecking(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      logger.info('Health checking stopped');
    }
  }

  getRegistrySnapshot(): ServiceRegistry {
    return JSON.parse(JSON.stringify(this.registry));
  }

  updateServiceConfig(serviceName: string, config: Partial<ServiceConfig>): boolean {
    const service = this.registry.services[serviceName];
    if (!service) {
      return false;
    }

    this.registry.services[serviceName].config = {
      ...service.config,
      ...config
    };
    this.registry.services[serviceName].lastUpdated = new Date();

    logger.info('Service configuration updated', { serviceName, config });
    return true;
  }

  removeService(serviceName: string): boolean {
    if (this.registry.services[serviceName]) {
      delete this.registry.services[serviceName];
      logger.info('Service removed from registry', { serviceName });
      return true;
    }
    return false;
  }

  // Get service statistics
  getServiceStats(): any {
    const stats = {
      totalServices: Object.keys(this.registry.services).length,
      healthyServices: 0,
      unhealthyServices: 0,
      degradedServices: 0,
      averageResponseTime: 0,
      services: {} as any
    };

    let totalResponseTime = 0;
    let serviceCount = 0;

    Object.entries(this.registry.services).forEach(([name, service]) => {
      const health = service.health;
      
      switch (health.status) {
        case 'healthy':
          stats.healthyServices++;
          break;
        case 'unhealthy':
          stats.unhealthyServices++;
          break;
        case 'degraded':
          stats.degradedServices++;
          break;
      }

      totalResponseTime += health.responseTime;
      serviceCount++;

      stats.services[name] = {
        status: health.status,
        responseTime: health.responseTime,
        consecutiveFailures: health.consecutiveFailures,
        uptime: health.uptime,
        lastChecked: health.lastChecked
      };
    });

    stats.averageResponseTime = serviceCount > 0 ? totalResponseTime / serviceCount : 0;

    return stats;
  }
}