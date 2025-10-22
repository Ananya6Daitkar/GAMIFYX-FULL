/**
 * OpenTelemetry instrumentation setup for analytics service
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { logger } from './logger';

// Initialize OpenTelemetry
const sdk = new NodeSDK({
  serviceName: process.env.OTEL_SERVICE_NAME || 'analytics-service',
  serviceVersion: '1.0.0',
  instrumentations: [getNodeAutoInstrumentations()],
  traceExporter: new JaegerExporter({
    endpoint: process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces',
  }),
  metricReader: new PrometheusExporter({
    port: parseInt(process.env.PROMETHEUS_PORT || '9468'),
  }),
});

try {
  sdk.start();
  logger.info('OpenTelemetry instrumentation started');
} catch (error) {
  logger.error('Failed to start OpenTelemetry instrumentation:', error);
}