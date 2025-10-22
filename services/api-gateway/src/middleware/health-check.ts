/**
 * Health Check Middleware for API Gateway
 * Provides comprehensive health monitoring for the gateway and downstream services
 */

import { Request, Response, NextFunction } from 'express';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: number;
  uptime: number;
  version: string;
  services: ServiceHealthStatus[];
  system: SystemHealthStatus;
  dependencies: DependencyHealthStatus[];
}

interface ServiceHealthStatus {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  lastCheck: number;
  error?: string;
}

interface SystemHealthStatus {
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu: {
    usage: number;
  };
  disk: {
    used: number;
    total: number;
    percentage: number;
  };
}

interface DependencyHealthStatus {
  name: string;
  type: 'database' | 'cache' | 'external_api' | 'message_queue';
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  lastCheck: number;
  error?: string;
}

export class HealthCheckMiddleware {
  private startTime: number;
  private version: string;
  private serviceUrls: Map<string, string>;
  private dependencyChecks: Map<string, () => Promise<boolean>>;

  constructor(version: string = '1.0.0') {
    this.startTime = Date.now();
    this.version = version;
    this.serviceUrls = new Map();
    this.dependencyChecks = new Map();
    
    this.initializeServiceUrls();
    this.initializeDependencyChecks();
  }

  private initializeServiceUrls(): void {
    // Initialize service URLs from environment variables
    const services = {
      'user-service': process.env.USER_SERVICE_URL || 'http://user-service:3001',
      'submission-service': process.env.SUBMISSION_SERVICE_URL || 'http://submission-service:3002',
      'secrets-manager': process.env.SECRETS_MANAGER_URL || 'http://secrets-manager:3003',
      'security-dashboard': process.env.SECURITY_DASHBOARD_URL || 'http://security-dashboard:3004',
      'gamification-service': process.env.GAMIFICATION_SERVICE_URL || 'http://gamification-service:3005',
      'analytics-service': process.env.ANALYTICS_SERVICE_URL || 'http://analytics-service:3006',
      'feedback-service': process.env.FEEDBACK_SERVICE_URL || 'http://feedback-service:3007',
      'ai-feedback-service': process.env.AI_FEEDBACK_SERVICE_URL || 'http://ai-feedback-service:8000'
    };

    Object.entries(services).forEach(([name, url]) => {
      this.serviceUrls.set(name, url);
    });
  }

  private initializeDependencyChecks(): void {
    // PostgreSQL health check
    this.dependencyChecks.set('postgresql', async () => {
      try {
        // In a real implementation, this would check the actual database connection
        return true;
      } catch (error) {
        return false;
      }
    });

    // Redis health check
    this.dependencyChecks.set('redis', async () => {
      try {
        // In a real implementation, this would check the actual Redis connection
        return true;
      } catch (error) {
        return false;
      }
    });

    // External API health checks
    this.dependencyChecks.set('github-api', async () => {
      try {
        const response = await fetch('https://api.github.com/zen', { timeout: 5000 });
        return response.ok;
      } catch (error) {
        return false;
      }
    });
  }

  // Basic health check endpoint
  basicHealthCheck() {
    return (req: Request, res: Response) => {
      const uptime = Date.now() - this.startTime;
      
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(uptime / 1000),
        service: 'api-gateway',
        version: this.version
      });
    };
  }

  // Comprehensive health check endpoint
  comprehensiveHealthCheck() {
    return async (req: Request, res: Response) => {
      const startTime = Date.now();
      
      try {
        const [serviceHealth, systemHealth, dependencyHealth] = await Promise.all([
          this.checkServiceHealth(),
          this.checkSystemHealth(),
          this.checkDependencyHealth()
        ]);

        const overallStatus = this.determineOverallStatus(serviceHealth, dependencyHealth);
        const uptime = Date.now() - this.startTime;

        const healthStatus: HealthStatus = {
          status: overallStatus,
          timestamp: Date.now(),
          uptime: Math.floor(uptime / 1000),
          version: this.version,
          services: serviceHealth,
          system: systemHealth,
          dependencies: dependencyHealth
        };

        const statusCode = overallStatus === 'healthy' ? 200 : 
                          overallStatus === 'degraded' ? 200 : 503;

        res.status(statusCode).json(healthStatus);
      } catch (error) {
        res.status(503).json({
          status: 'unhealthy',
          timestamp: Date.now(),
          uptime: Math.floor((Date.now() - this.startTime) / 1000),
          version: this.version,
          error: 'Health check failed',
          responseTime: Date.now() - startTime
        });
      }
    };
  }

  // Readiness probe endpoint
  readinessProbe() {
    return async (req: Request, res: Response) => {
      try {
        // Check critical services only
        const criticalServices = ['user-service', 'gamification-service', 'analytics-service'];
        const serviceChecks = await Promise.all(
          criticalServices.map(service => this.checkSingleService(service))
        );

        const allCriticalServicesHealthy = serviceChecks.every(check => check.status === 'healthy');

        if (allCriticalServicesHealthy) {
          res.json({
            status: 'ready',
            timestamp: new Date().toISOString(),
            critical_services: serviceChecks
          });
        } else {
          res.status(503).json({
            status: 'not_ready',
            timestamp: new Date().toISOString(),
            critical_services: serviceChecks
          });
        }
      } catch (error) {
        res.status(503).json({
          status: 'not_ready',
          timestamp: new Date().toISOString(),
          error: 'Readiness check failed'
        });
      }
    };
  }

  // Liveness probe endpoint
  livenessProbe() {
    return (req: Request, res: Response) => {
      // Simple liveness check - just verify the process is running
      const uptime = Date.now() - this.startTime;
      
      res.json({
        status: 'alive',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(uptime / 1000),
        pid: process.pid
      });
    };
  }

  private async checkServiceHealth(): Promise<ServiceHealthStatus[]> {
    const serviceChecks = Array.from(this.serviceUrls.entries()).map(([name, url]) =>
      this.checkSingleService(name, url)
    );

    return Promise.all(serviceChecks);
  }

  private async checkSingleService(serviceName: string, serviceUrl?: string): Promise<ServiceHealthStatus> {
    const url = serviceUrl || this.serviceUrls.get(serviceName);
    if (!url) {
      return {
        name: serviceName,
        status: 'unhealthy',
        responseTime: 0,
        lastCheck: Date.now(),
        error: 'Service URL not configured'
      };
    }

    const startTime = Date.now();
    
    try {
      const response = await fetch(`${url}/health`, {
        method: 'GET',
        timeout: 5000
      });

      const responseTime = Date.now() - startTime;

      return {
        name: serviceName,
        status: response.ok ? 'healthy' : 'unhealthy',
        responseTime,
        lastCheck: Date.now(),
        error: response.ok ? undefined : `HTTP ${response.status}`
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      return {
        name: serviceName,
        status: 'unhealthy',
        responseTime,
        lastCheck: Date.now(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async checkSystemHealth(): Promise<SystemHealthStatus> {
    const memoryUsage = process.memoryUsage();
    
    return {
      memory: {
        used: memoryUsage.heapUsed,
        total: memoryUsage.heapTotal,
        percentage: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100)
      },
      cpu: {
        usage: process.cpuUsage().user / 1000000 // Convert to seconds
      },
      disk: {
        used: 0, // Would need additional library to get disk usage
        total: 0,
        percentage: 0
      }
    };
  }

  private async checkDependencyHealth(): Promise<DependencyHealthStatus[]> {
    const dependencyChecks = Array.from(this.dependencyChecks.entries()).map(([name, checkFn]) =>
      this.checkSingleDependency(name, checkFn)
    );

    return Promise.all(dependencyChecks);
  }

  private async checkSingleDependency(
    dependencyName: string, 
    checkFn: () => Promise<boolean>
  ): Promise<DependencyHealthStatus> {
    const startTime = Date.now();
    
    try {
      const isHealthy = await checkFn();
      const responseTime = Date.now() - startTime;

      return {
        name: dependencyName,
        type: this.getDependencyType(dependencyName),
        status: isHealthy ? 'healthy' : 'unhealthy',
        responseTime,
        lastCheck: Date.now()
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      return {
        name: dependencyName,
        type: this.getDependencyType(dependencyName),
        status: 'unhealthy',
        responseTime,
        lastCheck: Date.now(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private getDependencyType(dependencyName: string): DependencyHealthStatus['type'] {
    if (dependencyName.includes('database') || dependencyName.includes('postgresql')) {
      return 'database';
    }
    if (dependencyName.includes('redis') || dependencyName.includes('cache')) {
      return 'cache';
    }
    if (dependencyName.includes('api')) {
      return 'external_api';
    }
    if (dependencyName.includes('queue') || dependencyName.includes('kafka')) {
      return 'message_queue';
    }
    return 'external_api';
  }

  private determineOverallStatus(
    services: ServiceHealthStatus[], 
    dependencies: DependencyHealthStatus[]
  ): HealthStatus['status'] {
    const criticalServices = ['user-service', 'gamification-service', 'analytics-service'];
    const criticalServiceStatuses = services
      .filter(service => criticalServices.includes(service.name))
      .map(service => service.status);

    const criticalDependencies = ['postgresql', 'redis'];
    const criticalDependencyStatuses = dependencies
      .filter(dep => criticalDependencies.includes(dep.name))
      .map(dep => dep.status);

    // If any critical service or dependency is unhealthy, overall status is unhealthy
    if (criticalServiceStatuses.includes('unhealthy') || criticalDependencyStatuses.includes('unhealthy')) {
      return 'unhealthy';
    }

    // If any service or dependency is degraded, overall status is degraded
    const allStatuses = [...services.map(s => s.status), ...dependencies.map(d => d.status)];
    if (allStatuses.includes('degraded')) {
      return 'degraded';
    }

    return 'healthy';
  }

  // Middleware to add health check routes
  addHealthRoutes(app: any): void {
    app.get('/health', this.basicHealthCheck());
    app.get('/health/comprehensive', this.comprehensiveHealthCheck());
    app.get('/health/ready', this.readinessProbe());
    app.get('/health/live', this.livenessProbe());
  }
}