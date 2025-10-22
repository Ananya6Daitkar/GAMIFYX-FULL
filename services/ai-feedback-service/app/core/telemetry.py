"""
OpenTelemetry instrumentation and logging setup
"""

import logging
import structlog
from opentelemetry import trace, metrics
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.exporter.jaeger.thrift import JaegerExporter
from opentelemetry.exporter.prometheus import PrometheusMetricReader
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
from prometheus_client import start_http_server

from .config import settings


def setup_telemetry():
    """Setup OpenTelemetry instrumentation"""
    
    # Setup tracing
    trace.set_tracer_provider(TracerProvider())
    tracer_provider = trace.get_tracer_provider()
    
    # Jaeger exporter for traces
    jaeger_exporter = JaegerExporter(
        agent_host_name="localhost",
        agent_port=6831,
    )
    
    span_processor = BatchSpanProcessor(jaeger_exporter)
    tracer_provider.add_span_processor(span_processor)
    
    # Setup metrics
    prometheus_reader = PrometheusMetricReader()
    metrics.set_meter_provider(
        MeterProvider(metric_readers=[prometheus_reader])
    )
    
    # Start Prometheus metrics server
    start_http_server(settings.PROMETHEUS_PORT)
    
    # Auto-instrument FastAPI and HTTPX
    FastAPIInstrumentor.instrument()
    HTTPXClientInstrumentor.instrument()


def setup_logging():
    """Setup structured logging"""
    structlog.configure(
        processors=[
            structlog.stdlib.filter_by_level,
            structlog.stdlib.add_logger_name,
            structlog.stdlib.add_log_level,
            structlog.stdlib.PositionalArgumentsFormatter(),
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.UnicodeDecoder(),
            structlog.processors.JSONRenderer()
        ],
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )


# Setup logging
setup_logging()
logger = structlog.get_logger()