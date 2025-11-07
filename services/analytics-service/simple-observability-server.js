const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3055;

app.use(cors());
app.use(express.json());

// Root route with observability dashboard
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>GamifyX Observability Dashboard</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
            .header { background: #1f77b4; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            .card { background: white; padding: 20px; margin: 10px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .metric { display: inline-block; margin: 10px 20px 10px 0; }
            .metric-value { font-size: 24px; font-weight: bold; color: #1f77b4; }
            .metric-label { font-size: 14px; color: #7f8c8d; }
            .status-good { color: #27ae60; }
            .status-warning { color: #f39c12; }
            .status-critical { color: #e74c3c; }
            .nav { margin: 20px 0; }
            .nav a { margin-right: 20px; color: #1f77b4; text-decoration: none; }
            .chart-placeholder { height: 200px; background: #ecf0f1; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: #7f8c8d; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>📊 GamifyX Observability Dashboard</h1>
            <p>Real-time monitoring, metrics, and analytics for educational platform</p>
        </div>
        
        <div class="nav">
            <a href="/metrics">📈 Prometheus Metrics</a>
            <a href="/analytics/metrics">🎯 Analytics Metrics</a>
            <a href="/health">❤️ Health Check</a>
            <a href="/traces">🔍 Distributed Traces</a>
        </div>
        
        <div class="card">
            <h2>System Overview</h2>
            <div class="metric">
                <div class="metric-value status-good">99.9%</div>
                <div class="metric-label">System Uptime</div>
            </div>
            <div class="metric">
                <div class="metric-value status-good">156ms</div>
                <div class="metric-label">Avg Response Time</div>
            </div>
            <div class="metric">
                <div class="metric-value status-good">1,247</div>
                <div class="metric-label">Active Users</div>
            </div>
            <div class="metric">
                <div class="metric-value status-warning">3</div>
                <div class="metric-label">Active Alerts</div>
            </div>
        </div>
        
        <div class="card">
            <h2>Educational Analytics</h2>
            <div class="metric">
                <div class="metric-value status-good">87%</div>
                <div class="metric-label">Course Completion Rate</div>
            </div>
            <div class="metric">
                <div class="metric-value status-good">4.2/5.0</div>
                <div class="metric-label">Average Assignment Score</div>
            </div>
            <div class="metric">
                <div class="metric-value status-good">23min</div>
                <div class="metric-label">Avg Session Duration</div>
            </div>
            <div class="metric">
                <div class="metric-value status-good">342</div>
                <div class="metric-label">Daily Submissions</div>
            </div>
        </div>
        
        <div class="card">
            <h2>Performance Metrics</h2>
            <div class="chart-placeholder">
                📈 Response Time Trends (Last 24 Hours)
            </div>
        </div>
        
        <div class="card">
            <h2>Learning Analytics</h2>
            <div class="chart-placeholder">
                🎓 Student Progress Distribution
            </div>
        </div>
        
        <div class="card">
            <h2>Service Health</h2>
            <p>✅ Analytics Service: <span class="status-good">Running</span></p>
            <p>✅ Database: <span class="status-good">Connected</span></p>
            <p>✅ Redis Cache: <span class="status-good">Connected</span></p>
            <p>✅ Metrics Collection: <span class="status-good">Active</span></p>
            <p>⚠️ Alert System: <span class="status-warning">3 Active Alerts</span></p>
        </div>
        
        <div class="card">
            <h2>Recent Activity</h2>
            <div style="font-family: monospace; font-size: 12px; background: #2c3e50; color: #ecf0f1; padding: 15px; border-radius: 4px;">
                [${new Date().toISOString()}] INFO: Analytics processing completed - 342 submissions analyzed<br>
                [${new Date(Date.now() - 60000).toISOString()}] INFO: Risk score calculated for 89 students<br>
                [${new Date(Date.now() - 120000).toISOString()}] WARN: High engagement detected in Course CS101<br>
                [${new Date(Date.now() - 180000).toISOString()}] INFO: Performance prediction accuracy: 94.2%<br>
                [${new Date(Date.now() - 240000).toISOString()}] INFO: Daily metrics aggregation completed
            </div>
        </div>
    </body>
    </html>
  `);
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'observability-dashboard',
    version: '1.0.0',
    uptime: process.uptime(),
    components: {
      analytics: 'healthy',
      database: 'healthy',
      redis: 'healthy',
      metrics: 'collecting'
    }
  });
});

// Mock Prometheus metrics endpoint
app.get('/metrics', (req, res) => {
  const metrics = `
# HELP gamifyx_http_requests_total Total number of HTTP requests
# TYPE gamifyx_http_requests_total counter
gamifyx_http_requests_total{method="GET",route="/api/analytics",status_code="200"} 1247
gamifyx_http_requests_total{method="POST",route="/api/submissions",status_code="200"} 342
gamifyx_http_requests_total{method="GET",route="/api/courses",status_code="200"} 856

# HELP gamifyx_response_time_seconds HTTP request response time
# TYPE gamifyx_response_time_seconds histogram
gamifyx_response_time_seconds_bucket{method="GET",route="/api/analytics",le="0.1"} 892
gamifyx_response_time_seconds_bucket{method="GET",route="/api/analytics",le="0.5"} 1205
gamifyx_response_time_seconds_bucket{method="GET",route="/api/analytics",le="1.0"} 1247
gamifyx_response_time_seconds_bucket{method="GET",route="/api/analytics",le="+Inf"} 1247

# HELP gamifyx_active_users Current number of active users
# TYPE gamifyx_active_users gauge
gamifyx_active_users 1247

# HELP gamifyx_course_completion_rate Course completion rate
# TYPE gamifyx_course_completion_rate gauge
gamifyx_course_completion_rate{course_id="CS101",difficulty="beginner"} 0.87
gamifyx_course_completion_rate{course_id="CS201",difficulty="intermediate"} 0.74
gamifyx_course_completion_rate{course_id="CS301",difficulty="advanced"} 0.62

# HELP gamifyx_assignment_scores Assignment score distribution
# TYPE gamifyx_assignment_scores histogram
gamifyx_assignment_scores_bucket{assignment_id="hw1",course_id="CS101",le="60"} 12
gamifyx_assignment_scores_bucket{assignment_id="hw1",course_id="CS101",le="70"} 34
gamifyx_assignment_scores_bucket{assignment_id="hw1",course_id="CS101",le="80"} 67
gamifyx_assignment_scores_bucket{assignment_id="hw1",course_id="CS101",le="90"} 89
gamifyx_assignment_scores_bucket{assignment_id="hw1",course_id="CS101",le="100"} 95
gamifyx_assignment_scores_bucket{assignment_id="hw1",course_id="CS101",le="+Inf"} 95

# HELP gamifyx_risk_score_distribution Risk score distribution
# TYPE gamifyx_risk_score_distribution histogram
gamifyx_risk_score_distribution_bucket{user_type="student",le="0.2"} 156
gamifyx_risk_score_distribution_bucket{user_type="student",le="0.4"} 298
gamifyx_risk_score_distribution_bucket{user_type="student",le="0.6"} 445
gamifyx_risk_score_distribution_bucket{user_type="student",le="0.8"} 523
gamifyx_risk_score_distribution_bucket{user_type="student",le="1.0"} 567
gamifyx_risk_score_distribution_bucket{user_type="student",le="+Inf"} 567

# HELP gamifyx_alerts_total Total number of alerts generated
# TYPE gamifyx_alerts_total counter
gamifyx_alerts_total{type="performance",severity="warning"} 3
gamifyx_alerts_total{type="engagement",severity="info"} 12
gamifyx_alerts_total{type="risk",severity="critical"} 1

# HELP gamifyx_session_duration_seconds User session duration
# TYPE gamifyx_session_duration_seconds histogram
gamifyx_session_duration_seconds_bucket{user_type="student",le="300"} 89
gamifyx_session_duration_seconds_bucket{user_type="student",le="900"} 234
gamifyx_session_duration_seconds_bucket{user_type="student",le="1800"} 456
gamifyx_session_duration_seconds_bucket{user_type="student",le="3600"} 567
gamifyx_session_duration_seconds_bucket{user_type="student",le="+Inf"} 589
`;

  res.set('Content-Type', 'text/plain');
  res.send(metrics);
});

// Analytics-specific metrics
app.get('/analytics/metrics', (req, res) => {
  res.json({
    timestamp: new Date().toISOString(),
    analytics: {
      riskScoreCalculations: {
        total: 567,
        lastHour: 89,
        averageScore: 0.34,
        distribution: {
          low: 298,
          medium: 147,
          high: 122
        }
      },
      performancePredictions: {
        total: 234,
        accuracy: 0.942,
        lastPrediction: new Date(Date.now() - 300000).toISOString()
      },
      alerts: {
        active: 3,
        resolved: 45,
        falsePositives: 2,
        types: {
          performance: 1,
          engagement: 1,
          risk: 1
        }
      },
      dataFreshness: {
        submissions: 2, // minutes
        userActivity: 1,
        courseProgress: 5
      },
      processingMetrics: {
        averageProcessingTime: 1.2, // seconds
        queueSize: 12,
        throughput: 156 // items per minute
      }
    },
    educational: {
      courseMetrics: {
        totalCourses: 24,
        activeCourses: 18,
        completionRates: {
          CS101: 0.87,
          CS201: 0.74,
          CS301: 0.62
        }
      },
      studentMetrics: {
        totalStudents: 1247,
        activeStudents: 892,
        averageProgress: 0.68,
        engagementScore: 0.84
      },
      submissionMetrics: {
        dailySubmissions: 342,
        averageScore: 84.2,
        gradingBacklog: 23
      }
    }
  });
});

// Mock distributed traces endpoint
app.get('/traces', (req, res) => {
  res.json({
    traces: [
      {
        traceId: 'trace-001',
        spanId: 'span-001',
        operation: 'submission.process',
        duration: 156,
        status: 'success',
        tags: {
          'user.id': 'user123',
          'submission.id': 'sub456',
          'course.id': 'CS101'
        },
        spans: [
          {
            spanId: 'span-002',
            operation: 'validation.check',
            duration: 45,
            status: 'success'
          },
          {
            spanId: 'span-003',
            operation: 'ai.feedback.generate',
            duration: 89,
            status: 'success'
          },
          {
            spanId: 'span-004',
            operation: 'database.save',
            duration: 22,
            status: 'success'
          }
        ]
      },
      {
        traceId: 'trace-002',
        spanId: 'span-005',
        operation: 'risk.score.calculate',
        duration: 234,
        status: 'success',
        tags: {
          'user.id': 'user456',
          'risk.level': 'medium'
        }
      }
    ]
  });
});

// Real-time metrics endpoint (simulates live data)
app.get('/api/realtime/metrics', (req, res) => {
  const now = Date.now();
  res.json({
    timestamp: new Date(now).toISOString(),
    metrics: {
      activeUsers: Math.floor(Math.random() * 100) + 1200,
      responseTime: Math.floor(Math.random() * 50) + 120,
      requestsPerSecond: Math.floor(Math.random() * 20) + 45,
      errorRate: Math.random() * 0.05,
      cpuUsage: Math.random() * 0.3 + 0.4,
      memoryUsage: Math.random() * 0.2 + 0.6,
      submissionsInQueue: Math.floor(Math.random() * 30) + 10
    },
    educational: {
      studentsOnline: Math.floor(Math.random() * 200) + 800,
      activeSubmissions: Math.floor(Math.random() * 10) + 5,
      coursesInProgress: Math.floor(Math.random() * 5) + 15,
      averageEngagement: Math.random() * 0.2 + 0.7
    }
  });
});

app.listen(PORT, () => {
  console.log(`📊 Observability Dashboard running on port ${PORT}`);
  console.log(`🔗 Dashboard: http://localhost:${PORT}`);
  console.log(`📈 Metrics: http://localhost:${PORT}/metrics`);
  console.log(`🎯 Analytics: http://localhost:${PORT}/analytics/metrics`);
  console.log(`❤️ Health: http://localhost:${PORT}/health`);
});