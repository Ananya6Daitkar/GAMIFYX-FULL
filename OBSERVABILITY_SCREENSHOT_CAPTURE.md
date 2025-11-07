# 📊 Observability Screenshots Capture Guide

## ✅ Services Running Successfully!

Your observability services are now running on:
- **Observability Dashboard**: http://localhost:3055
- **Analytics Service**: http://localhost:3005 (with telemetry)

## 📸 Screenshot Capture Instructions

### 1. Observability Dashboard Main Interface

**URL**: http://localhost:3055
**Save as**: `demo/screenshots/observability/observability-dashboard-main.png`

**What to capture**:
- Open the URL in your browser
- Take a full-page screenshot showing:
  - System overview metrics (uptime, response time, active users)
  - Educational analytics (completion rates, scores, session duration)
  - Performance metrics charts
  - Service health status
  - Recent activity logs

### 2. Prometheus Metrics Endpoint

**Command**: 
```bash
curl -s http://localhost:3055/metrics
```

**Save as**: `demo/screenshots/observability/prometheus-metrics.png`

**What to capture**:
- Open terminal with good contrast
- Run the command above
- Take screenshot showing formatted metrics with:
  - HTTP request metrics
  - Response time histograms
  - Course completion rates
  - Assignment score distributions
  - Risk score metrics
  - Alert counters

### 3. Analytics Metrics JSON Response

**Command**:
```bash
curl -s http://localhost:3055/analytics/metrics | jq .
```

**Save as**: `demo/screenshots/observability/analytics-metrics-json.png`

**What to capture**:
- Terminal screenshot showing formatted JSON with:
  - Risk score calculations (567 total, 89 last hour)
  - Performance predictions (94.2% accuracy)
  - Alert statistics (3 active, 45 resolved)
  - Educational metrics (1247 students, 87% completion rate)
  - Processing metrics (1.2s avg processing time)

### 4. Real-time Metrics Dashboard

**URL**: http://localhost:3055/api/realtime/metrics
**Save as**: `demo/screenshots/observability/realtime-metrics.png`

**What to capture**:
- Open the URL in browser or use curl
- Show live metrics updating:
  - Active users count
  - Response times
  - CPU/Memory usage
  - Students online
  - Submissions in queue

### 5. Distributed Traces View

**URL**: http://localhost:3055/traces
**Save as**: `demo/screenshots/observability/distributed-traces.png`

**What to capture**:
- Browser screenshot showing trace data
- Display trace spans for:
  - Submission processing
  - Risk score calculation
  - AI feedback generation
  - Database operations

### 6. Health Check Status

**Command**:
```bash
curl -s http://localhost:3055/health | jq .
```

**Save as**: `demo/screenshots/observability/health-check.png`

**What to capture**:
- Terminal showing health status
- Service uptime and component status
- Database and Redis connectivity
- Metrics collection status

## 🎯 Quick Commands for Screenshots

### All-in-One Data Capture:
```bash
echo "=== Observability Dashboard Health ==="
curl -s http://localhost:3055/health | jq .

echo -e "\n=== Analytics Metrics ==="
curl -s http://localhost:3055/analytics/metrics | jq .

echo -e "\n=== Prometheus Metrics Sample ==="
curl -s http://localhost:3055/metrics | head -20

echo -e "\n=== Real-time Metrics ==="
curl -s http://localhost:3055/api/realtime/metrics | jq .

echo -e "\n=== Distributed Traces ==="
curl -s http://localhost:3055/traces | jq .
```

### Performance Monitoring Commands:
```bash
echo "=== System Performance ==="
curl -s http://localhost:3055/api/realtime/metrics | jq '.metrics'

echo -e "\n=== Educational Analytics ==="
curl -s http://localhost:3055/analytics/metrics | jq '.educational'

echo -e "\n=== Risk Analytics ==="
curl -s http://localhost:3055/analytics/metrics | jq '.analytics.riskScoreCalculations'
```

## 📱 Screenshot Best Practices

### For Browser Screenshots:
- Use 90-100% zoom level for optimal display
- Ensure all metrics and charts are visible
- Close unnecessary browser tabs
- Use consistent browser (Chrome/Firefox)
- Capture full dashboard in one screenshot

### For Terminal Screenshots:
- Use light theme for better contrast
- Increase font size for readability (14px+)
- Ensure terminal window is wide enough for JSON
- Use `jq` for pretty JSON formatting
- Show command prompt for context

### For Metrics Screenshots:
- Capture both raw metrics and formatted JSON
- Show timestamp information
- Include metric labels and values
- Highlight key performance indicators

## 📊 Key Metrics to Highlight

### System Metrics:
- **Uptime**: 99.9%
- **Response Time**: 156ms average
- **Active Users**: 1,247
- **Requests/Second**: 45-65

### Educational Analytics:
- **Course Completion**: 87% (CS101), 74% (CS201), 62% (CS301)
- **Average Score**: 84.2
- **Daily Submissions**: 342
- **Student Engagement**: 84%

### Risk Analytics:
- **Total Risk Calculations**: 567
- **Average Risk Score**: 0.34
- **Risk Distribution**: 298 low, 147 medium, 122 high
- **Prediction Accuracy**: 94.2%

### Performance Metrics:
- **Processing Time**: 1.2s average
- **Queue Size**: 12 items
- **Throughput**: 156 items/minute
- **Data Freshness**: 1-5 minutes

## 🛑 When Done - Stop Services

To stop the services when you're finished:
```bash
# Stop the observability dashboard
pkill -f "node.*3055"

# Or use process IDs:
# Observability Dashboard: Process ID 9
# Analytics Service: Process ID 10 (if running)
```

## 🎉 You're Ready!

Your observability services are running and ready for screenshot capture. The dashboard provides:

- **Real-time Monitoring**: Live system and educational metrics
- **Analytics Insights**: Risk scoring and performance predictions  
- **Distributed Tracing**: Request flow visualization
- **Health Monitoring**: Service status and component health
- **Educational Analytics**: Student progress and engagement metrics

**Service URLs**:
- Main Dashboard: http://localhost:3055
- Metrics Endpoint: http://localhost:3055/metrics
- Analytics API: http://localhost:3055/analytics/metrics
- Health Check: http://localhost:3055/health

**Screenshot Directory**: `demo/screenshots/observability/`

Follow the instructions above to capture professional screenshots showcasing your comprehensive observability implementation!