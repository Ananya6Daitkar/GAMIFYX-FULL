import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { createServer } from 'http';
import WebSocketService from './websocket';
import gamifyxRoutes from './routes/gamifyx';
import aiFeedbackRoutes from './routes/ai-feedback';
import { CircuitBreakerMiddleware } from './middleware/circuit-breaker';
import { LoadBalancerMiddleware } from './middleware/load-balancer';
import { ServiceDiscovery } from './middleware/service-discovery';
import { HealthCheckMiddleware } from './middleware/health-check';
import { MetricsMiddleware } from './middleware/metrics';
import { AuthenticationMiddleware } from './middleware/auth';
import { RequestTracingMiddleware } from './middleware/tracing';

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:8080', 'http://localhost:3000'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Logging
app.use(morgan('combined'));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'api-gateway',
    version: '1.0.0'
  });
});

// Service routes for GamifyX Full-Stack Platform
const services = {
  userService: process.env.USER_SERVICE_URL || 'http://user-service:3001',
  submissionService: process.env.SUBMISSION_SERVICE_URL || 'http://submission-service:3002',
  secretsManager: process.env.SECRETS_MANAGER_URL || 'http://secrets-manager:3003',
  securityDashboard: process.env.SECURITY_DASHBOARD_URL || 'http://security-dashboard:3004',
  gamificationService: process.env.GAMIFICATION_SERVICE_URL || 'http://gamification-service:3005',
  analyticsService: process.env.ANALYTICS_SERVICE_URL || 'http://analytics-service:3006',
  aiFeedbackService: process.env.AI_FEEDBACK_SERVICE_URL || 'http://ai-feedback-service:8000',
  feedbackService: process.env.FEEDBACK_SERVICE_URL || 'http://feedback-service:3007'
};

// Proxy configurations
const proxyOptions = {
  changeOrigin: true,
  logLevel: 'info' as const,
  onError: (err: any, req: any, res: any) => {
    console.error('Proxy error:', err);
    res.status(500).json({
      error: 'Service temporarily unavailable',
      timestamp: new Date().toISOString()
    });
  }
};

// Route to User Service
app.use('/api/users', createProxyMiddleware({
  target: services.userService,
  pathRewrite: { '^/api/users': '' },
  ...proxyOptions
}));

app.use('/api/auth', createProxyMiddleware({
  target: services.userService,
  pathRewrite: { '^/api/auth': '/auth' },
  ...proxyOptions
}));

app.use('/api/mfa', createProxyMiddleware({
  target: services.userService,
  pathRewrite: { '^/api/mfa': '/mfa' },
  ...proxyOptions
}));

app.use('/api/permissions', createProxyMiddleware({
  target: services.userService,
  pathRewrite: { '^/api/permissions': '/permissions' },
  ...proxyOptions
}));

// Route to Secrets Manager
app.use('/api/secrets', createProxyMiddleware({
  target: services.secretsManager,
  pathRewrite: { '^/api/secrets': '/secrets' },
  ...proxyOptions
}));

app.use('/api/rotation', createProxyMiddleware({
  target: services.secretsManager,
  pathRewrite: { '^/api/rotation': '/rotation' },
  ...proxyOptions
}));

app.use('/api/cicd', createProxyMiddleware({
  target: services.secretsManager,
  pathRewrite: { '^/api/cicd': '/cicd' },
  ...proxyOptions
}));

// Route to Security Dashboard
app.use('/api/security', createProxyMiddleware({
  target: services.securityDashboard,
  pathRewrite: { '^/api/security': '/dashboard' },
  ...proxyOptions
}));

// GamifyX Dashboard API Routes

// Route to Submission Service
app.use('/api/submissions', createProxyMiddleware({
  target: services.submissionService,
  pathRewrite: { '^/api/submissions': '' },
  ...proxyOptions
}));

// Route to Gamification Service
app.use('/api/gamification', createProxyMiddleware({
  target: services.gamificationService,
  pathRewrite: { '^/api/gamification': '' },
  ...proxyOptions
}));

app.use('/api/leaderboard', createProxyMiddleware({
  target: services.gamificationService,
  pathRewrite: { '^/api/leaderboard': '/leaderboard' },
  ...proxyOptions
}));

app.use('/api/achievements', createProxyMiddleware({
  target: services.gamificationService,
  pathRewrite: { '^/api/achievements': '/achievements' },
  ...proxyOptions
}));

app.use('/api/badges', createProxyMiddleware({
  target: services.gamificationService,
  pathRewrite: { '^/api/badges': '/badges' },
  ...proxyOptions
}));

// Route to Analytics Service
app.use('/api/analytics', createProxyMiddleware({
  target: services.analyticsService,
  pathRewrite: { '^/api/analytics': '' },
  ...proxyOptions
}));

app.use('/api/metrics', createProxyMiddleware({
  target: services.analyticsService,
  pathRewrite: { '^/api/metrics': '/metrics' },
  ...proxyOptions
}));

app.use('/api/health-score', createProxyMiddleware({
  target: services.analyticsService,
  pathRewrite: { '^/api/health-score': '/health-score' },
  ...proxyOptions
}));

app.use('/api/incidents', createProxyMiddleware({
  target: services.analyticsService,
  pathRewrite: { '^/api/incidents': '/incidents' },
  ...proxyOptions
}));

// Route to Real-time Analytics
app.use('/api/realtime', createProxyMiddleware({
  target: services.analyticsService,
  pathRewrite: { '^/api/realtime': '/realtime' },
  ...proxyOptions
}));

// Route to GitHub Analytics Integration
app.use('/api/github-analytics', createProxyMiddleware({
  target: services.analyticsService,
  pathRewrite: { '^/api/github-analytics': '/github-analytics' },
  ...proxyOptions
}));

// Route to Database Integration
app.use('/api/database-integration', createProxyMiddleware({
  target: services.analyticsService,
  pathRewrite: { '^/api/database-integration': '/database-integration' },
  ...proxyOptions
}));

// Route to AI Feedback Service
app.use('/api/ai-feedback', createProxyMiddleware({
  target: services.aiFeedbackService,
  pathRewrite: { '^/api/ai-feedback': '' },
  ...proxyOptions
}));

app.use('/api/ai-insights', createProxyMiddleware({
  target: services.aiFeedbackService,
  pathRewrite: { '^/api/ai-insights': '/insights' },
  ...proxyOptions
}));

app.use('/api/predictions', createProxyMiddleware({
  target: services.aiFeedbackService,
  pathRewrite: { '^/api/predictions': '/predictions' },
  ...proxyOptions
}));

// Route to Feedback Service
app.use('/api/feedback', createProxyMiddleware({
  target: services.feedbackService,
  pathRewrite: { '^/api/feedback': '' },
  ...proxyOptions
}));

// GamifyX Dashboard Routes (Direct API endpoints)
app.use('/api/gamifyx', gamifyxRoutes);

// AI Feedback Routes (Performance Predictions)
app.use('/api/ai-feedback', aiFeedbackRoutes);

// API documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'GamifyX AIOps Learning Platform API',
    version: '2.0.0',
    description: 'Complete Full-Stack API for the GamifyX AIOps Learning Platform',
    services: {
      'User Management': {
        baseUrl: '/api/users',
        endpoints: [
          'GET /api/users/profile',
          'POST /api/auth/login',
          'POST /api/auth/register',
          'POST /api/mfa/setup/:userId',
          'GET /api/permissions/user/:userId'
        ]
      },
      'Gamification System': {
        baseUrl: '/api/gamification',
        endpoints: [
          'GET /api/leaderboard',
          'GET /api/achievements',
          'POST /api/achievements/unlock',
          'GET /api/badges',
          'POST /api/badges/award',
          'GET /api/gamification/user/:userId/stats'
        ]
      },
      'Analytics & Metrics': {
        baseUrl: '/api/analytics',
        endpoints: [
          'GET /api/metrics/system',
          'GET /api/health-score',
          'GET /api/incidents',
          'POST /api/incidents/predict',
          'GET /api/analytics/performance'
        ]
      },
      'Real-time Analytics': {
        baseUrl: '/api/realtime',
        endpoints: [
          'GET /api/realtime/status',
          'POST /api/realtime/broadcast/pr-update',
          'POST /api/realtime/broadcast/sync-status',
          'GET /api/realtime/cache/student/:studentId/teacher/:teacherId',
          'GET /api/realtime/cache/class/:teacherId',
          'DELETE /api/realtime/cache/student/:studentId/teacher/:teacherId',
          'POST /api/realtime/cache/preload/:teacherId'
        ]
      },
      'GitHub Analytics Integration': {
        baseUrl: '/api/github-analytics',
        endpoints: [
          'GET /api/github-analytics/student/:studentId/teacher/:teacherId',
          'GET /api/github-analytics/class/:teacherId',
          'POST /api/github-analytics/report/generate',
          'GET /api/github-analytics/risk-score/:studentId',
          'GET /api/github-analytics/performance/:studentId',
          'GET /api/github-analytics/insights/:teacherId',
          'GET /api/github-analytics/trends/:studentId'
        ]
      },
      'Database Integration': {
        baseUrl: '/api/database-integration',
        endpoints: [
          'GET /api/database-integration/status',
          'POST /api/database-integration/validate',
          'POST /api/database-integration/sync',
          'POST /api/database-integration/cleanup',
          'GET /api/database-integration/student/:studentId',
          'GET /api/database-integration/teacher/:teacherId/summary',
          'POST /api/database-integration/student/ensure',
          'GET /api/database-integration/health'
        ]
      },
      'AI Services': {
        baseUrl: '/api/ai-feedback',
        endpoints: [
          'POST /api/ai-feedback/analyze',
          'GET /api/ai-insights',
          'GET /api/predictions',
          'POST /api/predictions/generate'
        ]
      },
      'Submissions': {
        baseUrl: '/api/submissions',
        endpoints: [
          'POST /api/submissions',
          'GET /api/submissions/:id',
          'GET /api/submissions/user/:userId',
          'PUT /api/submissions/:id/status'
        ]
      },
      'Feedback System': {
        baseUrl: '/api/feedback',
        endpoints: [
          'GET /api/feedback/:submissionId',
          'POST /api/feedback',
          'PUT /api/feedback/:id/rating'
        ]
      },
      'Secrets Management': {
        baseUrl: '/api/secrets',
        endpoints: [
          'POST /api/secrets',
          'GET /api/secrets/*',
          'PUT /api/secrets/*',
          'DELETE /api/secrets/*',
          'GET /api/rotation/schedule',
          'POST /api/cicd/secrets'
        ]
      },
      'Security Dashboard': {
        baseUrl: '/api/security',
        endpoints: [
          'GET /api/security/metrics',
          'GET /api/security/kpis',
          'GET /api/security/vulnerabilities',
          'GET /api/security/threats',
          'POST /api/security/vulnerabilities/scan'
        ]
      }
    },
    documentation: 'Visit individual service endpoints for detailed API documentation',
    monitoring: {
      health: '/health',
      metrics: '/metrics'
    },
    websocket: {
      endpoint: 'ws://localhost:3000/ws',
      description: 'Real-time updates for dashboard components'
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    message: `The endpoint ${req.method} ${req.path} was not found`,
    availableEndpoints: '/api',
    timestamp: new Date().toISOString()
  });
});

// Error handler
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('API Gateway error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: 'An unexpected error occurred',
    timestamp: new Date().toISOString()
  });
});

// Create HTTP server and initialize WebSocket
const httpServer = createServer(app);
const wsService = new WebSocketService(httpServer);

// Start periodic updates for real-time dashboard
wsService.startPeriodicUpdates();

httpServer.listen(PORT, () => {
  console.log(`🚀 GamifyX AIOps Learning Platform API Gateway running on port ${PORT}`);
  console.log(`📖 API Documentation: http://localhost:${PORT}/api`);
  console.log(`❤️  Health Check: http://localhost:${PORT}/health`);
  console.log(`🔌 WebSocket Endpoint: ws://localhost:${PORT}/ws`);
  console.log('');
  console.log('🔗 Service Routes:');
  console.log(`   • User Management:     http://localhost:${PORT}/api/users`);
  console.log(`   • Authentication:      http://localhost:${PORT}/api/auth`);
  console.log(`   • Gamification:        http://localhost:${PORT}/api/gamification`);
  console.log(`   • Analytics & Metrics: http://localhost:${PORT}/api/analytics`);
  console.log(`   • AI Services:         http://localhost:${PORT}/api/ai-feedback`);
  console.log(`   • Submissions:         http://localhost:${PORT}/api/submissions`);
  console.log(`   • Secrets Management:  http://localhost:${PORT}/api/secrets`);
  console.log(`   • Security Dashboard:  http://localhost:${PORT}/api/security`);
  console.log('');
  console.log('🎮 GamifyX Dashboard Features:');
  console.log(`   • Real-time System Health Monitoring`);
  console.log(`   • Live Leaderboard Updates`);
  console.log(`   • AI-Powered Incident Predictions`);
  console.log(`   • Achievement Notifications`);
  console.log(`   • Interactive Metrics Dashboard`);
});

export default app;
export { wsService };