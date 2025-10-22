import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { metrics, trace } from '@opentelemetry/api';

const serviceName = process.env.SERVICE_NAME || 'user-service';
const serviceVersion = process.env.SERVICE_VERSION || '1.0.0';

// Initialize OpenTelemetry SDK
const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
    [SemanticResourceAttributes.SERVICE_VERSION]: serviceVersion,
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
  }),
  instrumentations: [getNodeAutoInstrumentations()],
});

// Initialize Prometheus exporter for metrics
const prometheusExporter = new PrometheusExporter({
  port: parseInt(process.env.PROMETHEUS_PORT || '9464'),
  endpoint: '/metrics',
});

// Initialize Jaeger exporter for traces
const jaegerExporter = new JaegerExporter({
  endpoint: process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces',
});

// Start the SDK
sdk.start();

// Get meter and tracer instances
export const meter = metrics.getMeter(serviceName, serviceVersion);
export const tracer = trace.getTracer(serviceName, serviceVersion);

// Graceful shutdown
process.on('SIGTERM', () => {
  sdk.shutdown()
    .then(() => console.log('OpenTelemetry terminated'))
    .catch((error) => console.log('Error terminating OpenTelemetry', error))
    .finally(() => process.exit(0));
});

export default sdk;