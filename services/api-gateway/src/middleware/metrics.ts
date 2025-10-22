/**
 * Metrics Middleware for API Gateway
 * Collects and exposes Prometheus metrics for monitoring
 */

import { Request, Response, NextFunction } from 'express';

interface MetricData {
  name: string;
  type: 'counter' | 'gauge' | 'histogram' | 'summary';
  help: string;
  labels: string[];
  value?: number;
  buckets?: number[];
}

class PrometheusMetrics {
  private metrics: Map<string, MetricData> = new Map();
  private values: Map<string, Map<string, number>> = new Map();
  private histogramBuckets: Map<string, number[]> = new Map();

  constructor() {
    this.initializeDefaultMetrics();
  }

  private initializeDefaultMetrics(): void {
    // HTTP request metrics
    this.registerMetric({
      name: 'http_requests_total',
      type: 'counter',
      help: 'Total number of HTTP requests',
      labels: ['method', 'route', 'status_code', 'service']
    });

    this.registerMetric({
      name: 'http_request_duration_seconds',
      type: 'histogram',
      help: 'HTTP request duration in seconds',
      labels: ['method', 'route', 'service'],
      buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]
    });

    // Gateway-specific metrics
    this.registerMetric({
      name: 'gateway_active_connections',
      type: 'gauge',
      help: 'Number of active connections to the gateway',
      labels: []
    });

    this.registerMetric({
      name: 'gateway_proxy_errors_total',
      type: 'counter',
      help: 'Total number of proxy errors',
      labels: ['service', 'error_type']
    });

    // Circuit breaker metrics
    this.registerMetric({
      name: 'circuit_breaker_state',
      type: 'gauge',
      help: 'Circuit breaker state (0=closed, 1=half-open, 2=open)',
      labels: ['service']
    });

    this.registerMetric({
      name: 'circuit_breaker_failures_total',
      type: 'counter',
      help: 'Total number of circuit breaker failures',
      labels: ['service']
    });

    // Load balancer metrics
    this.registerMetric({
      name: 'load_balancer_requests_total',
      type: 'counter',
      help: 'Total number of load balanced requests',
      labels: ['service', 'instance', 'strategy']
    });

    this.registerMetric({
      name: 'load_balancer_instance_health',
      type: 'gauge',
      help: 'Health status of load balancer instances (1=healthy, 0=unhealthy)',
      labels: ['service', 'instance']
    });

    // Service discovery metrics
    this.registerMetric({
      name: 'service_discovery_services_total',
      type: 'gauge',
      help: 'Total number of discovered services',
      labels: ['status']
    });

    this.registerMetric({
      name: 'service_discovery_heartbeats_total',
      type: 'counter',
      help: 'Total number of service heartbeats',
      labels: ['service']
    });

    // GamifyX-specific metrics
    this.registerMetric({
      name: 'gamifyx_active_users',
      type: 'gauge',
      help: 'Number of active users in the GamifyX platform',
      labels: []
    });

    this.registerMetric({
      name: 'gamifyx_websocket_connections',
      type: 'gauge',
      help: 'Number of active WebSocket connections',
      labels: []
    });

    this.registerMetric({
      name: 'gamifyx_api_requests_total',
      type: 'counter',
      help: 'Total number of GamifyX API requests',
      labels: ['endpoint', 'method', 'status']
    });
  }

  registerMetric(metric: MetricData): void {
    this.metrics.set(metric.name, metric);
    this.values.set(metric.name, new Map());
    
    if (metric.buckets) {
      this.histogramBuckets.set(metric.name, metric.buckets);
    }
  }

  incrementCounter(name: string, labels: { [key: string]: string } = {}, value: number = 1): void {
    const labelKey = this.createLabelKey(labels);
    const metricValues = this.values.get(name);
    
    if (metricValues) {
      const currentValue = metricValues.get(labelKey) || 0;
      metricValues.set(labelKey, currentValue + value);
    }
  }

  setGauge(name: string, labels: { [key: string]: string } = {}, value: number): void {
    const labelKey = this.createLabelKey(labels);
    const metricValues = this.values.get(name);
    
    if (metricValues) {
      metricValues.set(labelKey, value);
    }
  }

  observeHistogram(name: string, labels: { [key: string]: string } = {}, value: number): void {
    const buckets = this.histogramBuckets.get(name);
    if (!buckets) return;

    // Increment bucket counters
    buckets.forEach(bucket => {
      if (value <= bucket) {
        const bucketLabels = { ...labels, le: bucket.toString() };
        this.incrementCounter(`${name}_bucket`, bucketLabels);
      }
    });

    // Increment total count and sum
    this.incrementCounter(`${name}_count`, labels);
    this.incrementCounter(`${name}_sum`, labels, value);
  }

  private createLabelKey(labels: { [key: string]: string }): string {
    const sortedLabels = Object.keys(labels)
      .sort()
      .map(key => `${key}="${labels[key]}"`)
      .join(',');
    return sortedLabels;
  }

  generatePrometheusOutput(): string {
    let output = '';

    this.metrics.forEach((metric, name) => {
      output += `# HELP ${name} ${metric.help}\n`;
      output += `# TYPE ${name} ${metric.type}\n`;

      const metricValues = this.values.get(name);
      if (metricValues) {
        metricValues.forEach((value, labelKey) => {
          const labelString = labelKey ? `{${labelKey}}` : '';
          output += `${name}${labelString} ${value}\n`;
        });
      }

      // Handle histogram buckets
      if (metric.type === 'histogram') {
        const buckets = this.histogramBuckets.get(name);
        if (buckets) {
          // Add +Inf bucket
          const infBucketValues = this.values.get(`${name}_count`);
          if (infBucketValues) {
            infBucketValues.forEach((value, labelKey) => {
              const infLabels = labelKey ? `${labelKey},le="+Inf"` : 'le="+Inf"';
              output += `${name}_bucket{${infLabels}} ${value}\n`;
            });
          }
        }
      }

      output += '\n';
    });

    return output;
  }
}

export class MetricsMiddleware {
  private metrics: PrometheusMetrics;
  private activeConnections: number = 0;

  constructor() {
    this.metrics = new PrometheusMetrics();
  }

  // Middleware to collect HTTP metrics
  collectHttpMetrics() {
    return (req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      this.activeConnections++;

      // Update active connections gauge
      this.metrics.setGauge('gateway_active_connections', {}, this.activeConnections);

      // Track the response
      res.on('finish', () => {
        const duration = (Date.now() - startTime) / 1000;
        const route = this.getRoutePattern(req.path);
        const service = this.extractServiceFromPath(req.path);

        // Increment request counter
        this.metrics.incrementCounter('http_requests_total', {
          method: req.method,
          route,
          status_code: res.statusCode.toString(),
          service
        });

        // Observe request duration
        this.metrics.observeHistogram('http_request_duration_seconds', {
          method: req.method,
          route,
          service
        }, duration);

        // Track GamifyX-specific metrics
        if (req.path.startsWith('/api/gamifyx') || req.path.startsWith('/api/gamification')) {
          this.metrics.incrementCounter('gamifyx_api_requests_total', {
            endpoint: route,
            method: req.method,
            status: res.statusCode.toString()
          });
        }

        this.activeConnections--;
        this.metrics.setGauge('gateway_active_connections', {}, this.activeConnections);
      });

      next();
    };
  }

  // Middleware to track proxy errors
  trackProxyError(service: string, errorType: string) {
    this.metrics.incrementCounter('gateway_proxy_errors_total', {
      service,
      error_type: errorType
    });
  }

  // Track circuit breaker metrics
  trackCircuitBreakerState(service: string, state: string) {
    const stateValue = state === 'closed' ? 0 : state === 'half-open' ? 1 : 2;
    this.metrics.setGauge('circuit_breaker_state', { service }, stateValue);
  }

  trackCircuitBreakerFailure(service: string) {
    this.metrics.incrementCounter('circuit_breaker_failures_total', { service });
  }

  // Track load balancer metrics
  trackLoadBalancerRequest(service: string, instance: string, strategy: string) {
    this.metrics.incrementCounter('load_balancer_requests_total', {
      service,
      instance,
      strategy
    });
  }

  trackInstanceHealth(service: string, instance: string, healthy: boolean) {
    this.metrics.setGauge('load_balancer_instance_health', {
      service,
      instance
    }, healthy ? 1 : 0);
  }

  // Track service discovery metrics
  trackServiceDiscovery(totalServices: number, healthyServices: number) {
    this.metrics.setGauge('service_discovery_services_total', { status: 'total' }, totalServices);
    this.metrics.setGauge('service_discovery_services_total', { status: 'healthy' }, healthyServices);
    this.metrics.setGauge('service_discovery_services_total', { status: 'unhealthy' }, totalServices - healthyServices);
  }

  trackServiceHeartbeat(service: string) {
    this.metrics.incrementCounter('service_discovery_heartbeats_total', { service });
  }

  // Track GamifyX-specific metrics
  trackActiveUsers(count: number) {
    this.metrics.setGauge('gamifyx_active_users', {}, count);
  }

  trackWebSocketConnections(count: number) {
    this.metrics.setGauge('gamifyx_websocket_connections', {}, count);
  }

  // Metrics endpoint
  metricsEndpoint() {
    return (req: Request, res: Response) => {
      res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
      res.send(this.metrics.generatePrometheusOutput());
    };
  }

  // Custom metrics endpoint with JSON format
  jsonMetricsEndpoint() {
    return (req: Request, res: Response) => {
      const metricsData: any = {};
      
      this.metrics.values.forEach((values, metricName) => {
        metricsData[metricName] = {};
        values.forEach((value, labelKey) => {
          metricsData[metricName][labelKey || 'default'] = value;
        });
      });

      res.json({
        metrics: metricsData,
        timestamp: new Date().toISOString(),
        active_connections: this.activeConnections
      });
    };
  }

  private getRoutePattern(path: string): string {
    // Convert specific paths to patterns for better grouping
    return path
      .replace(/\/\d+/g, '/:id')
      .replace(/\/[a-f0-9-]{36}/g, '/:uuid')
      .replace(/\/[a-f0-9]{24}/g, '/:objectid');
  }

  private extractServiceFromPath(path: string): string {
    const pathParts = path.split('/');
    if (pathParts.length >= 3 && pathParts[1] === 'api') {
      return pathParts[2];
    }
    return 'unknown';
  }

  // Get metrics instance for external use
  getMetrics(): PrometheusMetrics {
    return this.metrics;
  }
}