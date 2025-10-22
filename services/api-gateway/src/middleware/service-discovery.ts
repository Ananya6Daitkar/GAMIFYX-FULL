/**
 * Service Discovery Middleware for API Gateway
 * Automatically discovers and registers services in the ecosystem
 */

import { Request, Response, NextFunction } from 'express';
import { EventEmitter } from 'events';

interface ServiceRegistration {
  id: string;
  name: string;
  version: string;
  url: string;
  health_check_url: string;
  metadata: {
    tags: string[];
    region: string;
    environment: string;
    capabilities: string[];
    weight: number;
  };
  registered_at: number;
  last_heartbeat: number;
  status: 'healthy' | 'unhealthy' | 'unknown';
}

interface ServiceDiscoveryConfig {
  heartbeatInterval: number;
  heartbeatTimeout: number;
  registrationTTL: number;
  autoDeregisterAfter: number;
  enableAutoDiscovery: boolean;
  discoveryPorts: number[];
}

class ServiceRegistry extends EventEmitter {
  private services: Map<string, ServiceRegistration> = new Map();
  private config: ServiceDiscoveryConfig;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(config: Partial<ServiceDiscoveryConfig> = {}) {
    super();
    this.config = {
      heartbeatInterval: config.heartbeatInterval || 30000, // 30 seconds
      heartbeatTimeout: config.heartbeatTimeout || 5000, // 5 seconds
      registrationTTL: config.registrationTTL || 300000, // 5 minutes
      autoDeregisterAfter: config.autoDeregisterAfter || 180000, // 3 minutes
      enableAutoDiscovery: config.enableAutoDiscovery || true,
      discoveryPorts: config.discoveryPorts || [3001, 3002, 3003, 3004, 3005, 3006, 3007, 8000]
    };

    this.startHeartbeatMonitoring();
    
    if (this.config.enableAutoDiscovery) {
      this.startAutoDiscovery();
    }
  }

  registerService(registration: Omit<ServiceRegistration, 'id' | 'registered_at' | 'last_heartbeat' | 'status'>): string {
    const serviceId = `${registration.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const service: ServiceRegistration = {
      ...registration,
      id: serviceId,
      registered_at: Date.now(),
      last_heartbeat: Date.now(),
      status: 'unknown'
    };

    this.services.set(serviceId, service);
    
    console.log(`Registered service: ${registration.name} (${serviceId}) at ${registration.url}`);
    this.emit('service_registered', service);

    // Perform initial health check
    this.performHealthCheck(service);

    return serviceId;
  }

  deregisterService(serviceId: string): boolean {
    const service = this.services.get(serviceId);
    if (service) {
      this.services.delete(serviceId);
      console.log(`Deregistered service: ${service.name} (${serviceId})`);
      this.emit('service_deregistered', service);
      return true;
    }
    return false;
  }

  updateHeartbeat(serviceId: string): boolean {
    const service = this.services.get(serviceId);
    if (service) {
      service.last_heartbeat = Date.now();
      return true;
    }
    return false;
  }

  getService(serviceId: string): ServiceRegistration | undefined {
    return this.services.get(serviceId);
  }

  getServicesByName(serviceName: string): ServiceRegistration[] {
    return Array.from(this.services.values()).filter(service => service.name === serviceName);
  }

  getHealthyServices(serviceName?: string): ServiceRegistration[] {
    let services = Array.from(this.services.values()).filter(service => service.status === 'healthy');
    
    if (serviceName) {
      services = services.filter(service => service.name === serviceName);
    }
    
    return services;
  }

  getAllServices(): ServiceRegistration[] {
    return Array.from(this.services.values());
  }

  private async startHeartbeatMonitoring(): Promise<void> {
    this.heartbeatInterval = setInterval(async () => {
      await this.performHealthChecks();
      this.cleanupStaleServices();
    }, this.config.heartbeatInterval);
  }

  private async performHealthChecks(): Promise<void> {
    const services = Array.from(this.services.values());
    const healthCheckPromises = services.map(service => this.performHealthCheck(service));
    
    await Promise.allSettled(healthCheckPromises);
  }

  private async performHealthCheck(service: ServiceRegistration): Promise<void> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.heartbeatTimeout);

      const response = await fetch(service.health_check_url, {
        method: 'GET',
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const previousStatus = service.status;
      service.status = response.ok ? 'healthy' : 'unhealthy';
      service.last_heartbeat = Date.now();

      if (previousStatus !== service.status) {
        console.log(`Service ${service.name} (${service.id}) status changed: ${previousStatus} -> ${service.status}`);
        this.emit('service_status_changed', service, previousStatus);
      }

    } catch (error) {
      const previousStatus = service.status;
      service.status = 'unhealthy';
      
      if (previousStatus !== 'unhealthy') {
        console.warn(`Service ${service.name} (${service.id}) health check failed:`, error);
        this.emit('service_status_changed', service, previousStatus);
      }
    }
  }

  private cleanupStaleServices(): void {
    const now = Date.now();
    const staleServices: string[] = [];

    this.services.forEach((service, serviceId) => {
      const timeSinceLastHeartbeat = now - service.last_heartbeat;
      
      if (timeSinceLastHeartbeat > this.config.autoDeregisterAfter) {
        staleServices.push(serviceId);
      }
    });

    staleServices.forEach(serviceId => {
      const service = this.services.get(serviceId);
      if (service) {
        console.log(`Auto-deregistering stale service: ${service.name} (${serviceId})`);
        this.deregisterService(serviceId);
      }
    });
  }

  private async startAutoDiscovery(): Promise<void> {
    console.log('Starting auto-discovery of services...');
    
    // Discover services on known ports
    const discoveryPromises = this.config.discoveryPorts.map(port => 
      this.discoverServiceOnPort(port)
    );

    await Promise.allSettled(discoveryPromises);

    // Periodic auto-discovery
    setInterval(async () => {
      const discoveryPromises = this.config.discoveryPorts.map(port => 
        this.discoverServiceOnPort(port)
      );
      await Promise.allSettled(discoveryPromises);
    }, 60000); // Every minute
  }

  private async discoverServiceOnPort(port: number): Promise<void> {
    try {
      const baseUrl = `http://localhost:${port}`;
      const healthUrl = `${baseUrl}/health`;

      const response = await fetch(healthUrl, {
        method: 'GET',
        timeout: 3000
      });

      if (response.ok) {
        const healthData = await response.json();
        
        // Check if service is already registered
        const existingServices = this.getServicesByName(healthData.service || `service-${port}`);
        const alreadyRegistered = existingServices.some(service => service.url === baseUrl);

        if (!alreadyRegistered) {
          this.registerService({
            name: healthData.service || `service-${port}`,
            version: healthData.version || '1.0.0',
            url: baseUrl,
            health_check_url: healthUrl,
            metadata: {
              tags: healthData.tags || [],
              region: healthData.region || 'default',
              environment: healthData.environment || 'development',
              capabilities: healthData.capabilities || [],
              weight: healthData.weight || 1
            }
          });
        }
      }
    } catch (error) {
      // Service not available on this port, which is expected
    }
  }

  getMetrics() {
    const services = Array.from(this.services.values());
    const servicesByStatus = services.reduce((acc, service) => {
      acc[service.status] = (acc[service.status] || 0) + 1;
      return acc;
    }, {} as { [status: string]: number });

    const servicesByName = services.reduce((acc, service) => {
      acc[service.name] = (acc[service.name] || 0) + 1;
      return acc;
    }, {} as { [name: string]: number });

    return {
      total_services: services.length,
      services_by_status: servicesByStatus,
      services_by_name: servicesByName,
      last_discovery_run: Date.now(),
      config: this.config
    };
  }

  destroy(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    this.removeAllListeners();
  }
}

export class ServiceDiscovery {
  private static instance: ServiceDiscovery;
  private registry: ServiceRegistry;

  constructor(config?: Partial<ServiceDiscoveryConfig>) {
    this.registry = new ServiceRegistry(config);
    this.setupEventHandlers();
  }

  static getInstance(config?: Partial<ServiceDiscoveryConfig>): ServiceDiscovery {
    if (!ServiceDiscovery.instance) {
      ServiceDiscovery.instance = new ServiceDiscovery(config);
    }
    return ServiceDiscovery.instance;
  }

  private setupEventHandlers(): void {
    this.registry.on('service_registered', (service: ServiceRegistration) => {
      console.log(`🔍 Service Discovery: ${service.name} registered`);
    });

    this.registry.on('service_deregistered', (service: ServiceRegistration) => {
      console.log(`🔍 Service Discovery: ${service.name} deregistered`);
    });

    this.registry.on('service_status_changed', (service: ServiceRegistration, previousStatus: string) => {
      console.log(`🔍 Service Discovery: ${service.name} status changed from ${previousStatus} to ${service.status}`);
    });
  }

  // Middleware for service registration endpoint
  registrationEndpoint() {
    return (req: Request, res: Response) => {
      const { name, version, url, health_check_url, metadata } = req.body;

      if (!name || !url || !health_check_url) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'name, url, and health_check_url are required'
        });
      }

      try {
        const serviceId = this.registry.registerService({
          name,
          version: version || '1.0.0',
          url,
          health_check_url,
          metadata: metadata || {
            tags: [],
            region: 'default',
            environment: 'development',
            capabilities: [],
            weight: 1
          }
        });

        res.status(201).json({
          message: 'Service registered successfully',
          service_id: serviceId,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.status(500).json({
          error: 'Registration Failed',
          message: 'Failed to register service',
          timestamp: new Date().toISOString()
        });
      }
    };
  }

  // Middleware for service deregistration endpoint
  deregistrationEndpoint() {
    return (req: Request, res: Response) => {
      const { service_id } = req.params;

      if (!service_id) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'service_id is required'
        });
      }

      const success = this.registry.deregisterService(service_id);

      if (success) {
        res.json({
          message: 'Service deregistered successfully',
          service_id,
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(404).json({
          error: 'Service Not Found',
          message: `Service with ID ${service_id} not found`,
          timestamp: new Date().toISOString()
        });
      }
    };
  }

  // Middleware for heartbeat endpoint
  heartbeatEndpoint() {
    return (req: Request, res: Response) => {
      const { service_id } = req.params;

      if (!service_id) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'service_id is required'
        });
      }

      const success = this.registry.updateHeartbeat(service_id);

      if (success) {
        res.json({
          message: 'Heartbeat updated',
          service_id,
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(404).json({
          error: 'Service Not Found',
          message: `Service with ID ${service_id} not found`,
          timestamp: new Date().toISOString()
        });
      }
    };
  }

  // Middleware for service discovery endpoint
  discoveryEndpoint() {
    return (req: Request, res: Response) => {
      const { service_name, status } = req.query;

      let services = this.registry.getAllServices();

      if (service_name) {
        services = services.filter(service => service.name === service_name);
      }

      if (status) {
        services = services.filter(service => service.status === status);
      }

      res.json({
        services: services.map(service => ({
          id: service.id,
          name: service.name,
          version: service.version,
          url: service.url,
          status: service.status,
          metadata: service.metadata,
          registered_at: service.registered_at,
          last_heartbeat: service.last_heartbeat
        })),
        total: services.length,
        timestamp: new Date().toISOString()
      });
    };
  }

  // Middleware for service discovery metrics
  metricsEndpoint() {
    return (req: Request, res: Response) => {
      const metrics = this.registry.getMetrics();
      res.json({
        service_discovery_metrics: metrics,
        timestamp: new Date().toISOString()
      });
    };
  }

  // Get healthy services for load balancing
  getHealthyServices(serviceName?: string): ServiceRegistration[] {
    return this.registry.getHealthyServices(serviceName);
  }

  // Get service registry instance
  getRegistry(): ServiceRegistry {
    return this.registry;
  }
}

export { ServiceRegistry, ServiceRegistration };