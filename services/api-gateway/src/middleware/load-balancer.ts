/**
 * Intelligent Load Balancer Middleware for API Gateway
 * Implements multiple load balancing strategies with health-aware routing
 */

import { Request, Response, NextFunction } from 'express';

interface ServiceInstance {
  id: string;
  url: string;
  weight: number;
  healthy: boolean;
  responseTime: number;
  activeConnections: number;
  lastHealthCheck: number;
  metadata: {
    version: string;
    region: string;
    capabilities: string[];
  };
}

interface LoadBalancerConfig {
  strategy: 'round-robin' | 'weighted' | 'least-connections' | 'response-time' | 'adaptive';
  healthCheckInterval: number;
  healthCheckTimeout: number;
  maxRetries: number;
  retryDelay: number;
}

enum LoadBalancingStrategy {
  ROUND_ROBIN = 'round-robin',
  WEIGHTED = 'weighted',
  LEAST_CONNECTIONS = 'least-connections',
  RESPONSE_TIME = 'response-time',
  ADAPTIVE = 'adaptive'
}

class ServicePool {
  private instances: ServiceInstance[] = [];
  private currentIndex: number = 0;
  private serviceName: string;
  private config: LoadBalancerConfig;

  constructor(serviceName: string, config: Partial<LoadBalancerConfig> = {}) {
    this.serviceName = serviceName;
    this.config = {
      strategy: config.strategy || 'adaptive',
      healthCheckInterval: config.healthCheckInterval || 30000, // 30 seconds
      healthCheckTimeout: config.healthCheckTimeout || 5000, // 5 seconds
      maxRetries: config.maxRetries || 3,
      retryDelay: config.retryDelay || 1000 // 1 second
    };

    // Start health checking
    this.startHealthChecking();
  }

  addInstance(instance: Omit<ServiceInstance, 'id' | 'healthy' | 'responseTime' | 'activeConnections' | 'lastHealthCheck'>): void {
    const serviceInstance: ServiceInstance = {
      ...instance,
      id: `${this.serviceName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      healthy: true,
      responseTime: 0,
      activeConnections: 0,
      lastHealthCheck: Date.now()
    };

    this.instances.push(serviceInstance);
    console.log(`Added instance ${serviceInstance.id} to ${this.serviceName} pool`);
  }

  removeInstance(instanceId: string): void {
    this.instances = this.instances.filter(instance => instance.id !== instanceId);
    console.log(`Removed instance ${instanceId} from ${this.serviceName} pool`);
  }

  getNextInstance(): ServiceInstance | null {
    const healthyInstances = this.instances.filter(instance => instance.healthy);
    
    if (healthyInstances.length === 0) {
      console.warn(`No healthy instances available for service ${this.serviceName}`);
      return null;
    }

    switch (this.config.strategy) {
      case LoadBalancingStrategy.ROUND_ROBIN:
        return this.roundRobinSelection(healthyInstances);
      case LoadBalancingStrategy.WEIGHTED:
        return this.weightedSelection(healthyInstances);
      case LoadBalancingStrategy.LEAST_CONNECTIONS:
        return this.leastConnectionsSelection(healthyInstances);
      case LoadBalancingStrategy.RESPONSE_TIME:
        return this.responseTimeSelection(healthyInstances);
      case LoadBalancingStrategy.ADAPTIVE:
        return this.adaptiveSelection(healthyInstances);
      default:
        return this.roundRobinSelection(healthyInstances);
    }
  }

  private roundRobinSelection(instances: ServiceInstance[]): ServiceInstance {
    const instance = instances[this.currentIndex % instances.length];
    this.currentIndex = (this.currentIndex + 1) % instances.length;
    return instance;
  }

  private weightedSelection(instances: ServiceInstance[]): ServiceInstance {
    const totalWeight = instances.reduce((sum, instance) => sum + instance.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const instance of instances) {
      random -= instance.weight;
      if (random <= 0) {
        return instance;
      }
    }
    
    return instances[0]; // Fallback
  }

  private leastConnectionsSelection(instances: ServiceInstance[]): ServiceInstance {
    return instances.reduce((min, instance) => 
      instance.activeConnections < min.activeConnections ? instance : min
    );
  }

  private responseTimeSelection(instances: ServiceInstance[]): ServiceInstance {
    return instances.reduce((fastest, instance) => 
      instance.responseTime < fastest.responseTime ? instance : fastest
    );
  }

  private adaptiveSelection(instances: ServiceInstance[]): ServiceInstance {
    // Adaptive strategy combines multiple factors
    const scoredInstances = instances.map(instance => ({
      instance,
      score: this.calculateAdaptiveScore(instance)
    }));

    scoredInstances.sort((a, b) => b.score - a.score);
    return scoredInstances[0].instance;
  }

  private calculateAdaptiveScore(instance: ServiceInstance): number {
    // Higher score is better
    const connectionScore = Math.max(0, 100 - instance.activeConnections * 10);
    const responseTimeScore = Math.max(0, 100 - instance.responseTime / 10);
    const weightScore = instance.weight;
    
    return (connectionScore * 0.4) + (responseTimeScore * 0.4) + (weightScore * 0.2);
  }

  private async startHealthChecking(): Promise<void> {
    setInterval(async () => {
      await this.performHealthChecks();
    }, this.config.healthCheckInterval);
  }

  private async performHealthChecks(): Promise<void> {
    const healthCheckPromises = this.instances.map(instance => 
      this.checkInstanceHealth(instance)
    );

    await Promise.allSettled(healthCheckPromises);
  }

  private async checkInstanceHealth(instance: ServiceInstance): Promise<void> {
    const startTime = Date.now();
    
    try {
      const response = await fetch(`${instance.url}/health`, {
        method: 'GET',
        timeout: this.config.healthCheckTimeout
      });

      const responseTime = Date.now() - startTime;
      const wasHealthy = instance.healthy;
      
      instance.healthy = response.ok;
      instance.responseTime = responseTime;
      instance.lastHealthCheck = Date.now();

      if (!wasHealthy && instance.healthy) {
        console.log(`Instance ${instance.id} is now healthy (response time: ${responseTime}ms)`);
      } else if (wasHealthy && !instance.healthy) {
        console.warn(`Instance ${instance.id} is now unhealthy (status: ${response.status})`);
      }

    } catch (error) {
      const wasHealthy = instance.healthy;
      instance.healthy = false;
      instance.lastHealthCheck = Date.now();
      
      if (wasHealthy) {
        console.warn(`Instance ${instance.id} health check failed:`, error);
      }
    }
  }

  incrementConnections(instanceId: string): void {
    const instance = this.instances.find(i => i.id === instanceId);
    if (instance) {
      instance.activeConnections++;
    }
  }

  decrementConnections(instanceId: string): void {
    const instance = this.instances.find(i => i.id === instanceId);
    if (instance) {
      instance.activeConnections = Math.max(0, instance.activeConnections - 1);
    }
  }

  getInstances(): ServiceInstance[] {
    return [...this.instances];
  }

  getHealthyInstanceCount(): number {
    return this.instances.filter(instance => instance.healthy).length;
  }

  getMetrics() {
    return {
      service: this.serviceName,
      strategy: this.config.strategy,
      totalInstances: this.instances.length,
      healthyInstances: this.getHealthyInstanceCount(),
      instances: this.instances.map(instance => ({
        id: instance.id,
        url: instance.url,
        healthy: instance.healthy,
        responseTime: instance.responseTime,
        activeConnections: instance.activeConnections,
        weight: instance.weight,
        lastHealthCheck: instance.lastHealthCheck
      }))
    };
  }
}

class LoadBalancerRegistry {
  private static instance: LoadBalancerRegistry;
  private servicePools: Map<string, ServicePool> = new Map();

  static getInstance(): LoadBalancerRegistry {
    if (!LoadBalancerRegistry.instance) {
      LoadBalancerRegistry.instance = new LoadBalancerRegistry();
    }
    return LoadBalancerRegistry.instance;
  }

  getServicePool(serviceName: string, config?: Partial<LoadBalancerConfig>): ServicePool {
    if (!this.servicePools.has(serviceName)) {
      this.servicePools.set(serviceName, new ServicePool(serviceName, config));
    }
    return this.servicePools.get(serviceName)!;
  }

  getAllMetrics() {
    const metrics: any[] = [];
    this.servicePools.forEach((pool, serviceName) => {
      metrics.push(pool.getMetrics());
    });
    return metrics;
  }
}

export class LoadBalancerMiddleware {
  private registry: LoadBalancerRegistry;

  constructor() {
    this.registry = LoadBalancerRegistry.getInstance();
  }

  create(serviceName: string, config?: Partial<LoadBalancerConfig>) {
    return (req: Request, res: Response, next: NextFunction) => {
      const servicePool = this.registry.getServicePool(serviceName, config);
      const selectedInstance = servicePool.getNextInstance();

      if (!selectedInstance) {
        return res.status(503).json({
          error: 'Service Unavailable',
          message: `No healthy instances available for service ${serviceName}`,
          service: serviceName,
          timestamp: new Date().toISOString()
        });
      }

      // Track connection
      servicePool.incrementConnections(selectedInstance.id);

      // Add selected instance to request context
      (req as any).selectedInstance = selectedInstance;
      (req as any).servicePool = servicePool;

      // Add load balancer headers
      res.setHeader('X-Load-Balancer-Instance', selectedInstance.id);
      res.setHeader('X-Load-Balancer-Strategy', config?.strategy || 'adaptive');
      res.setHeader('X-Service-Pool-Health', `${servicePool.getHealthyInstanceCount()}/${servicePool.getInstances().length}`);

      // Clean up connection tracking on response end
      res.on('finish', () => {
        servicePool.decrementConnections(selectedInstance.id);
      });

      next();
    };
  }

  // Initialize service instances from environment or configuration
  initializeServices(serviceConfigs: { [serviceName: string]: string[] }) {
    Object.entries(serviceConfigs).forEach(([serviceName, urls]) => {
      const servicePool = this.registry.getServicePool(serviceName);
      
      urls.forEach((url, index) => {
        servicePool.addInstance({
          url,
          weight: 1, // Default weight
          metadata: {
            version: '1.0.0',
            region: 'default',
            capabilities: []
          }
        });
      });
    });
  }

  // Middleware to expose load balancer metrics
  metricsEndpoint() {
    return (req: Request, res: Response) => {
      const metrics = this.registry.getAllMetrics();
      res.json({
        load_balancer_metrics: metrics,
        timestamp: new Date().toISOString()
      });
    };
  }

  // Middleware to manage service instances
  managementEndpoint() {
    return (req: Request, res: Response) => {
      const { action, service, url, weight, metadata } = req.body;

      if (!action || !service) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Action and service are required'
        });
      }

      const servicePool = this.registry.getServicePool(service);

      switch (action) {
        case 'add':
          if (!url) {
            return res.status(400).json({
              error: 'Bad Request',
              message: 'URL is required for add action'
            });
          }
          servicePool.addInstance({
            url,
            weight: weight || 1,
            metadata: metadata || {
              version: '1.0.0',
              region: 'default',
              capabilities: []
            }
          });
          break;

        case 'remove':
          if (!url) {
            return res.status(400).json({
              error: 'Bad Request',
              message: 'URL is required for remove action'
            });
          }
          const instances = servicePool.getInstances();
          const instanceToRemove = instances.find(i => i.url === url);
          if (instanceToRemove) {
            servicePool.removeInstance(instanceToRemove.id);
          }
          break;

        default:
          return res.status(400).json({
            error: 'Invalid Action',
            message: 'Valid actions are: add, remove'
          });
      }

      res.json({
        message: `Successfully performed ${action} action for service ${service}`,
        service,
        action,
        timestamp: new Date().toISOString(),
        current_instances: servicePool.getInstances().length
      });
    };
  }
}

export { ServicePool, ServiceInstance, LoadBalancingStrategy };