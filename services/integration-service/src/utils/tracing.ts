import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

export function initializeTracing() {
  const serviceName = process.env.SERVICE_NAME || 'integration-service';
  const serviceVersion = process.env.SERVICE_VERSION || '1.0.0';
  const jaegerEndpoint = process.env.JAEGER_ENDPOINT || 'http://jaeger:14268/api/traces';
  const prometheusPort = parseInt(process.env.PROMETHEUS_PORT || '9469');

  const sdk = new NodeSDK({
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
      [SemanticResourceAttributes.SERVICE_VERSION]: serviceVersion,
      [SemanticResourceAttributes.SERVICE_INSTANCE_ID]: `${serviceName}-${process.pid}`,
    }),
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-fs': {
          enabled: false, // Disable file system instrumentation to reduce noise
        },
      }),
    ],
    traceExporter: new JaegerExporter({
      endpoint: jaegerEndpoint,
    }),
    metricReader: new PrometheusExporter({
      port: prometheusPort,
    }),
  });

  sdk.start();

  // Graceful shutdown
  process.on('SIGTERM', () => {
    sdk.shutdown()
      .then(() => console.log('Tracing terminated'))
      .catch((error) => console.log('Error terminating tracing', error))
      .finally(() => process.exit(0));
  });

  console.log(`OpenTelemetry initialized for ${serviceName}`);
  console.log(`Jaeger endpoint: ${jaegerEndpoint}`);
  console.log(`Prometheus metrics port: ${prometheusPort}`);
}