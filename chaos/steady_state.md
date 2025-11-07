# Steady State Definition - AI Integration Service

## Service Overview
**Service Name:** AI Integration Service  
**Port:** 3011  
**Role:** API Gateway for AI Registry, Model Performance, and Guardrail services  
**Environment:** Development/Staging  

## Steady State Metrics

### 1. P95 Latency
- **Target:** < 300ms
- **Measurement:** Response time for API gateway requests
- **Endpoint:** `/api/health/all`

### 2. Error Rate
- **Target:** < 1%
- **Measurement:** HTTP 5xx responses / total requests
- **Timeframe:** 5-minute rolling window

### 3. CPU Utilization
- **Target:** < 70%
- **Measurement:** Container CPU usage percentage
- **Monitoring:** Docker stats / Prometheus metrics

### 4. Requests Per Second (RPS)
- **Baseline:** 50-100 RPS
- **Peak Capacity:** 500 RPS
- **Measurement:** Incoming HTTP requests to gateway

### 5. Business Metric - API Success Rate
- **Target:** > 97% success rate for 2xx responses
- **Measurement:** (2xx responses / total responses) * 100
- **Critical Endpoints:** 
  - `/api/ai-registry/technologies`
  - `/api/model-performance/metrics`
  - `/api/guardrail/bias-detection`

## Steady State Definition

**System is considered healthy when:**
- P95 latency < 300ms for gateway requests
- Error rate < 1% over 5-minute window  
- CPU utilization < 70% sustained
- RPS handling 50-500 requests efficiently
- API success rate > 97% for critical AI service endpoints

## Dependencies Health Indicators
- **AI Registry Service:** Responding within 200ms
- **Model Performance Service:** Responding within 250ms  
- **Guardrail Service:** Responding within 300ms (higher due to NLP processing)
- **PostgreSQL Database:** Connection pool < 80% utilization
- **Circuit Breakers:** All in CLOSED state

## Monitoring Setup
- **Prometheus:** Metrics collection on port 9467
- **Grafana:** Dashboard for visualization
- **Jaeger:** Distributed tracing
- **Docker Stats:** Container resource monitoring

## Baseline Measurements (Pre-Chaos)
- Average P95 Latency: ~150ms
- Typical Error Rate: 0.1%
- Normal CPU Usage: 25-40%
- Standard RPS: 75-125
- API Success Rate: 99.2%