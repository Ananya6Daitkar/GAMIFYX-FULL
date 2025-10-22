# Grafana Dashboards for AIOps Learning Platform

This directory contains the Grafana configuration and dashboards for monitoring the AIOps Learning Platform.

## 📊 Available Dashboards

### 1. Executive Overview
- **Purpose**: High-level system health and KPIs for executives and stakeholders
- **Key Metrics**: 
  - System health status
  - Active student count
  - Daily submissions
  - Response times
  - Student engagement scores
  - At-risk student alerts

### 2. Service Monitoring - Golden Signals
- **Purpose**: Detailed monitoring of microservices using the four golden signals
- **Key Metrics**:
  - **Latency**: Response time percentiles (50th, 95th)
  - **Traffic**: Request rate per service
  - **Errors**: Error rate percentage by service
  - **Saturation**: CPU and memory usage, database connections

### 3. Student Performance Analytics
- **Purpose**: Comprehensive view of student learning progress and performance
- **Key Metrics**:
  - Risk score distribution and heatmaps
  - Submission activity patterns
  - Top performers and at-risk students
  - Badge distribution and achievements
  - Code quality trends
  - Engagement scores over time

### 4. AI Model Performance & Insights
- **Purpose**: Monitor AI/ML model performance and feedback quality
- **Key Metrics**:
  - Feedback generation performance
  - Model prediction accuracy
  - Feedback implementation rates
  - Risk score distribution
  - Alert generation rates
  - Code analysis metrics (complexity, security, test coverage)

### 5. Gamification & Engagement Metrics
- **Purpose**: Track student engagement through gamification elements
- **Key Metrics**:
  - Real-time leaderboard
  - Badge earning timeline
  - Points distribution
  - Engagement score heatmaps
  - Streak statistics
  - Daily active users

## 🚀 Getting Started

### Prerequisites
- Docker and Docker Compose
- AIOps Learning Platform services running
- Prometheus, Loki, and Jaeger configured

### Starting Grafana
```bash
# Start the entire stack
docker-compose up -d

# Or start just Grafana and dependencies
docker-compose up -d grafana prometheus loki jaeger
```

### Accessing Grafana
- **URL**: http://localhost:3001
- **Username**: admin
- **Password**: admin

### Validating Setup
```bash
# Run the validation script
./scripts/validate-dashboards.sh

# Or run the Jest tests
cd tests
npm test -- grafana-dashboard.test.js
```

## 📁 Directory Structure

```
infrastructure/grafana/
├── README.md                          # This file
└── provisioning/
    ├── datasources/
    │   └── datasources.yml            # Prometheus, Loki, Jaeger configuration
    ├── dashboards/
    │   ├── dashboards.yml             # Dashboard provider configuration
    │   ├── executive-overview.json    # Executive dashboard
    │   ├── gamification-metrics.json  # Gamification dashboard
    │   ├── system-health/
    │   │   └── service-monitoring.json # Golden signals dashboard
    │   ├── student-analytics/
    │   │   └── performance-overview.json # Student performance dashboard
    │   └── ai-insights/
    │       └── model-performance.json  # AI model dashboard
    ├── alerting/
    │   ├── rules.yml                  # Alert rule definitions
    │   ├── contactpoints.yml          # Notification channels
    │   └── policies.yml               # Alert routing policies
    └── notifiers/
        └── notification-channels.yml   # Legacy notification setup
```

## 🔔 Alerting Configuration

### Alert Rules
The platform includes pre-configured alert rules for:

#### System Health Alerts
- **Service Down**: Triggers when any service becomes unavailable
- **High Error Rate**: Alerts when error rate exceeds 5%
- **High Response Time**: Triggers when 95th percentile exceeds 2 seconds

#### Student Performance Alerts
- **High Risk Student**: Alerts when student risk score > 0.7
- **Low Engagement**: Triggers when class engagement drops below 30%

#### AI Performance Alerts
- **AI Service Down**: Alerts when AI feedback service is unavailable
- **Low Feedback Accuracy**: Triggers when AI accuracy drops below 70%

### Notification Channels
Configure the following environment variables for notifications:

```bash
# Slack notifications
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK

# Email notifications
ADMIN_EMAIL=admin@your-domain.com
TEACHER_EMAIL=teacher@your-domain.com

# Webhook notifications
WEBHOOK_URL=http://your-webhook-endpoint.com/alerts
```

## 🎯 Key Performance Indicators (KPIs)

### System Health KPIs
- **Service Availability**: Target 99.9% uptime
- **Response Time**: 95th percentile < 1 second
- **Error Rate**: < 1% for all services
- **Resource Utilization**: CPU < 80%, Memory < 85%

### Educational KPIs
- **Student Engagement**: Average score > 70%
- **At-Risk Students**: < 10% of total students
- **Submission Success Rate**: > 90%
- **AI Feedback Accuracy**: > 85%

### Gamification KPIs
- **Daily Active Users**: Track engagement trends
- **Badge Distribution**: Ensure balanced achievement unlocking
- **Leaderboard Volatility**: Healthy competition indicators

## 🛠 Customization

### Adding New Dashboards
1. Create a new JSON file in the appropriate subfolder
2. Follow the existing dashboard structure
3. Add the dashboard to the provisioning configuration
4. Restart Grafana or wait for auto-reload

### Modifying Alert Rules
1. Edit `alerting/rules.yml`
2. Update thresholds and conditions as needed
3. Test alerts using Grafana's alert testing feature
4. Deploy changes via provisioning

### Custom Metrics
To add new metrics to dashboards:
1. Ensure metrics are exposed by your services
2. Verify metrics are scraped by Prometheus
3. Add new panels to relevant dashboards
4. Test queries in Grafana's Explore view

## 🔍 Troubleshooting

### Common Issues

#### Dashboards Not Loading
- Check Grafana logs: `docker logs aiops-grafana`
- Verify provisioning directory is mounted correctly
- Ensure JSON files are valid

#### No Data in Panels
- Verify Prometheus is scraping metrics
- Check datasource configuration
- Test queries in Grafana Explore

#### Alerts Not Firing
- Check alert rule configuration
- Verify notification channels are configured
- Test alert rules manually

#### Performance Issues
- Check Grafana resource usage
- Optimize dashboard queries
- Consider query result caching

### Useful Commands
```bash
# Check Grafana health
curl -u admin:admin http://localhost:3001/api/health

# List all dashboards
curl -u admin:admin http://localhost:3001/api/search?type=dash-db

# Check datasources
curl -u admin:admin http://localhost:3001/api/datasources

# View Grafana logs
docker logs aiops-grafana -f

# Restart Grafana
docker-compose restart grafana
```

## 📚 Additional Resources

- [Grafana Documentation](https://grafana.com/docs/)
- [Prometheus Query Language](https://prometheus.io/docs/prometheus/latest/querying/)
- [OpenTelemetry Metrics](https://opentelemetry.io/docs/concepts/signals/metrics/)
- [Dashboard Best Practices](https://grafana.com/docs/grafana/latest/best-practices/)

## 🤝 Contributing

When adding new dashboards or modifying existing ones:
1. Follow the established naming conventions
2. Include appropriate documentation
3. Test thoroughly with sample data
4. Update this README if needed
5. Add validation tests for new dashboards