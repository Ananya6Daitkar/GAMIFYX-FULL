// Initialize telemetry first
import './telemetry';

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createServer } from 'http';
import { correlationIdMiddleware } from './telemetry/logger';
import { logger } from './telemetry/logger';
import { db } from './database/connection';
import { WebSocketManager } from './services/websocketManager';
import { EnhancedWebSocketService } from './services/enhancedWebSocketService';
import { RealTimeUpdateSystem } from './services/realTimeUpdateSystem';
import { WebSocketPerformanceMonitor } from './services/webSocketPerformanceMonitor';
import { LeaderboardService } from './services/leaderboardService';
import { EnhancedLeaderboardService } from './services/enhancedLeaderboardService';
import { EnhancedBadgeSystem } from './services/enhancedBadgeSystem';
import { AdvancedPointsSystem } from './services/advancedPointsSystem';
import { StreakTrackingSystem } from './services/streakTrackingSystem';
import { MetricsCollector } from './services/metricsCollector';
import routes from './routes';

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3003;

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

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const dbHealth = await db.healthCheck();
    const wsManager = WebSocketManager.getInstance();
    const wsStats = wsManager.getStats();
    
    res.status(200).json({
      status: dbHealth.postgres && dbHealth.redis ? 'healthy' : 'unhealthy',
      service: 'gamification-service',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      database: dbHealth,
      websockets: {
        totalConnections: wsStats.totalConnections,
        authenticatedUsers: wsStats.authenticatedUsers
      }
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      service: 'gamification-service',
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

    // Initialize WebSocket managers
    const wsManager = WebSocketManager.getInstance();
    wsManager.initialize(server);
    logger.info('Basic WebSocket server initialized');

    const enhancedWsService = EnhancedWebSocketService.getInstance();
    enhancedWsService.initialize(server);
    logger.info('Enhanced WebSocket server initialized');

    // Initialize real-time update system
    const realTimeUpdateSystem = RealTimeUpdateSystem.getInstance();
    realTimeUpdateSystem.start();
    logger.info('Real-time update system started');

    // Initialize WebSocket performance monitor
    const wsPerformanceMonitor = WebSocketPerformanceMonitor.getInstance();
    wsPerformanceMonitor.start();
    logger.info('WebSocket performance monitor started');

    // Start leaderboard rank update scheduler
    const leaderboardService = LeaderboardService.getInstance();
    leaderboardService.startRankUpdateScheduler();
    logger.info('Leaderboard scheduler started');

    // Initialize enhanced services
    const enhancedLeaderboard = EnhancedLeaderboardService.getInstance();
    enhancedLeaderboard.startRealTimeUpdates();
    logger.info('Enhanced leaderboard service started');

    const badgeSystem = new EnhancedBadgeSystem();
    logger.info('Enhanced badge system initialized');

    const pointsSystem = new AdvancedPointsSystem();
    logger.info('Advanced points system initialized');

    const streakSystem = StreakTrackingSystem.getInstance();
    logger.info('Streak tracking system initialized');

    // Start metrics collection
    const metricsCollector = MetricsCollector.getInstance();
    logger.info('Metrics collector initialized');

    // Start HTTP server
    server.listen(PORT, () => {
      logger.info(`Gamification Service running on port ${PORT}`);
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  
  try {
    const wsManager = WebSocketManager.getInstance();
    wsManager.shutdown();
    
    const enhancedWsService = EnhancedWebSocketService.getInstance();
    enhancedWsService.shutdown();
    
    const realTimeUpdateSystem = RealTimeUpdateSystem.getInstance();
    realTimeUpdateSystem.stop();
    
    const enhancedLeaderboard = EnhancedLeaderboardService.getInstance();
    enhancedLeaderboard.stopRealTimeUpdates();
    
    await db.disconnect();
    
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  
  try {
    const wsManager = WebSocketManager.getInstance();
    wsManager.shutdown();
    
    const enhancedWsService = EnhancedWebSocketService.getInstance();
    enhancedWsService.shutdown();
    
    const realTimeUpdateSystem = RealTimeUpdateSystem.getInstance();
    realTimeUpdateSystem.stop();
    
    const enhancedLeaderboard = EnhancedLeaderboardService.getInstance();
    enhancedLeaderboard.stopRealTimeUpdates();
    
    await db.disconnect();
    
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
});

// Start the server
startServer();

export default app;