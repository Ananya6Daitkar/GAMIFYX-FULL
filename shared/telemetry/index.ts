/**
 * Shared OpenTelemetry instrumentation for GamifyX services
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-node';
import { metrics, trace } from '@opentelemetry/api';
import { MeterProvider } from '@opentelemetry/sdk-metrics';
import { TracerProvider } from '@opentelemetry/sdk-trace-node';

export interface TelemetryConfig {
  serviceName: string;
  serviceVersion?: string;
  environment?: string;
  otlpEndpoint?: string;
  prometheusPort?: number;
  enableConsoleExporter?: boolean;
}

export class GamifyXTelemetry {
  private sdk: NodeSDK;
  private meterProvider: MeterProvider;
  private tracerProvider: TracerProvider;
  private config: TelemetryConfig;

  constructor(config: TelemetryConfig) {
    this.config = {
      serviceVersion: '2.0.0',
      environment: process.env.NODE_ENV || 'development',
      otlpEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://otel-collector:4318',
      prometheusPort: config.prometheusPort || 9464,
      enableConsoleExporter: process.env.NODE_ENV === 'development',
      ...config
    };

    this.initializeSDK();
  }

  private initializeSDK(): void {
    // Create resource with service information
    const resource = new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: this.config.serviceName,
      [SemanticResourceAttributes.SERVICE_VERSION]: this.config.serviceVersion!,
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: this.config.environment!,
      [SemanticResourceAttributes.SERVICE_NAMESPACE]: 'gamifyx',
      'platform': 'aiops-learning',
    });

    // Configure trace exporters
    const traceExporters = [
      new OTLPTraceExporter({
        url: `${this.config.otlpEndpoint}/v1/traces`,
      })
    ];

    // Configure metric exporters
    const metricReaders = [
      new PrometheusExporter({
        port: this.config.prometheusPort,
        endpoint: '/metrics',
      }),
      new PeriodicExportingMetricReader({
        exporter: new OTLPMetricExporter({
          url: `${this.config.otlpEndpoint}/v1/metrics`,
        }),
        exportIntervalMillis: 15000,
      })
    ];

    // Initialize SDK
    this.sdk = new NodeSDK({
      resource,
      traceExporter: traceExporters[0],
      metricReader: metricReaders[0],
      instrumentations: [
        getNodeAutoInstrumentations({
          '@opentelemetry/instrumentation-fs': {
            enabled: false, // Disable file system instrumentation to reduce noise
          },
          '@opentelemetry/instrumentation-http': {
            enabled: true,
            requestHook: (span, request) => {
              // Add custom attributes to HTTP spans
              span.setAttributes({
                'gamifyx.service': this.config.serviceName,
                'gamifyx.environment': this.config.environment!,
              });
            },
          },
          '@opentelemetry/instrumentation-express': {
            enabled: true,
          },
          '@opentelemetry/instrumentation-pg': {
            enabled: true,
          },
          '@opentelemetry/instrumentation-redis': {
            enabled: true,
          },
        }),
      ],
    });
  }

  public start(): void {
    this.sdk.start();
    console.log(`🔍 OpenTelemetry started for ${this.config.serviceName}`);
  }

  public shutdown(): Promise<void> {
    return this.sdk.shutdown();
  }

  // Get meter for custom metrics
  public getMeter(name?: string): any {
    return metrics.getMeter(name || this.config.serviceName, this.config.serviceVersion);
  }

  // Get tracer for custom spans
  public getTracer(name?: string): any {
    return trace.getTracer(name || this.config.serviceName, this.config.serviceVersion);
  }

  // Create custom metrics helpers
  public createCounter(name: string, description: string, unit?: string) {
    const meter = this.getMeter();
    return meter.createCounter(name, {
      description,
      unit: unit || '1',
    });
  }

  public createHistogram(name: string, description: string, unit?: string) {
    const meter = this.getMeter();
    return meter.createHistogram(name, {
      description,
      unit: unit || 'ms',
    });
  }

  public createGauge(name: string, description: string, unit?: string) {
    const meter = this.getMeter();
    return meter.createObservableGauge(name, {
      description,
      unit: unit || '1',
    });
  }

  // Helper method to create a span
  public createSpan(name: string, attributes?: Record<string, any>) {
    const tracer = this.getTracer();
    const span = tracer.startSpan(name);
    
    if (attributes) {
      span.setAttributes(attributes);
    }
    
    return span;
  }

  // Helper method to wrap async functions with tracing
  public async traceAsync<T>(
    name: string,
    fn: () => Promise<T>,
    attributes?: Record<string, any>
  ): Promise<T> {
    const span = this.createSpan(name, attributes);
    
    try {
      const result = await fn();
      span.setStatus({ code: 1 }); // OK
      return result;
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: 2, message: (error as Error).message }); // ERROR
      throw error;
    } finally {
      span.end();
    }
  }
}

// Factory function to create telemetry instance
export function createTelemetry(config: TelemetryConfig): GamifyXTelemetry {
  return new GamifyXTelemetry(config);
}

// Default export for convenience
export default GamifyXTelemetry;