import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { logger } from './logger';

// Initialize OpenTelemetry
const sdk = new NodeSDK({
  serviceName: 'secrets-manager',
  serviceVersion: '1.0.0',
  instrumentations: [getNodeAutoInstrumentations({
    '@opentelemetry/instrumentation-fs': {
      enabled: false, // Disable file system instrumentation for security
    },
  })],
  metricReader: new PrometheusExporter({
    port: parseInt(process.env.METRICS_PORT || '9090'),
    endpoint: '/metrics',
  }),
  traceExporter: new JaegerExporter({
    endpoint: process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces',
  }),
});

try {
  sdk.start();
  logger.info('OpenTelemetry initialized successfully');
} catch (error) {
  logger.error('Failed to initialize OpenTelemetry', { error });
}