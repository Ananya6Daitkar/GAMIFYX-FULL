// Initialize telemetry first
import './telemetry';

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { correlationIdMiddleware, logger } from './telemetry/logger';
import { db } from './database/connection';
import { MigrationRunner } from './database/migrate';
import { AnalyticsEngine } from './services/analyticsEngine';
import { AlertingSystem } from './services/alertingSystem';
import { AdvancedAlertingSystem } from './services/advancedAlertingSystem';
import { AIInsightsEngine } from './services/aiInsightsEngine';
import { TrendAnalysisService } from './services/trendAnalysisService';
import { ComprehensiveMetricsCollector } from './services/comprehensiveMetricsCollector';
import { MetricsCollector } from './services/metricsCollector';
import { GitHubPRCacheService } from './services/githubPRCacheService';
import { EventDrivenService } from './services/eventDrivenService';
import routes from './routes';

const app = express();
const PORT = process.env.PORT || 3005;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined'));
app.use(correlationIdMiddleware);

// Routes
app.use('/api/v1', routes);

// Basic health check endpoint
app.get('/health', async (req, res) => {
  try {
    const dbHealth = await db.healthCheck();
    const isHealthy = dbHealth.postgres && dbHealth.redis;
    
    res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? 'healthy' : 'unhealthy',
      service: 'analytics-service',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      database: dbHealth
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      service: 'analytics-service',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Error handling middleware
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.originalUrl
  });
});

// Initialize services and start server
async function startServer() {
  try {
    // Connect to databases
    await db.connect();
    logger.info('Database connections established');

    // Initialize GitHub integration schema
    const githubSchemaInitialized = await MigrationRunner.initializeGitHubSchema();
    if (githubSchemaInitialized) {
      logger.info('GitHub integration schema initialized');
    } else {
      logger.warn('Failed to initialize GitHub integration schema');
    }

    // Initialize analytics engine
    const analyticsEngine = AnalyticsEngine.getInstance();
    logger.info('Analytics engine initialized');

    // Initialize and start alerting systems
    const alertingSystem = AlertingSystem.getInstance();
    await alertingSystem.start();
    logger.info('Basic alerting system started');

    const advancedAlertingSystem = AdvancedAlertingSystem.getInstance();
    await advancedAlertingSystem.start();
    logger.info('Advanced alerting system started');

    // Initialize AI insights engine
    const aiInsightsEngine = AIInsightsEngine.getInstance();
    logger.info('AI insights engine initialized');

    // Initialize trend analysis service
    const trendAnalysisService = TrendAnalysisService.getInstance();
    logger.info('Trend analysis service initialized');

    // Initialize comprehensive metrics collector
    const comprehensiveMetricsCollector = ComprehensiveMetricsCollector.getInstance();
    comprehensiveMetricsCollector.startCollection();
    logger.info('Comprehensive metrics collector started');

    // Initialize basic metrics collector
    const metricsCollector = MetricsCollector.getInstance();
    logger.info('Basic metrics collector initialized');

    // Initialize GitHub PR cache service
    const cacheService = GitHubPRCacheService.getInstance();
    logger.info('GitHub PR cache service initialized');

    // Initialize event-driven service
    const eventService = EventDrivenService.getInstance();
    logger.info('Event-driven service initialized');

    // Initialize database integration service
    const { DatabaseIntegrationService } = await import('./services/databaseIntegrationService');
    const dbIntegrationService = DatabaseIntegrationService.getInstance();
    await dbIntegrationService.initialize();
    logger.info('Database integration service initialized');

    // Initialize real-time service
    const { RealTimeService } = await import('./services/realTimeService');
    const realTimeService = RealTimeService.getInstance();
    
    // Start HTTP server
    const server = app.listen(PORT, () => {
      logger.info(`Analytics Service running on port ${PORT}`);
    });

    // Initialize WebSocket for real-time updates
    realTimeService.initialize(server);
    logger.info('Real-time WebSocket service initialized');

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  
  try {
    const alertingSystem = AlertingSystem.getInstance();
    await alertingSystem.stop();
    
    const advancedAlertingSystem = AdvancedAlertingSystem.getInstance();
    await advancedAlertingSystem.stop();
    
    const comprehensiveMetricsCollector = ComprehensiveMetricsCollector.getInstance();
    comprehensiveMetricsCollector.stopCollection();
    
    await db.disconnect();
    
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  
  try {
    const alertingSystem = AlertingSystem.getInstance();
    await alertingSystem.stop();
    
    const advancedAlertingSystem = AdvancedAlertingSystem.getInstance();
    await advancedAlertingSystem.stop();
    
    const comprehensiveMetricsCollector = ComprehensiveMetricsCollector.getInstance();
    comprehensiveMetricsCollector.stopCollection();
    
    await db.disconnect();
    
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
});

// Start the server
startServer();

export default app;