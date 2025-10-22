// Initialize telemetry first
import './telemetry';

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { Server } from 'socket.io';
import { createServer } from 'http';

// Middleware
import { correlationIdMiddleware, requestLogger } from '@/telemetry/logger';
import { authenticateToken } from '@/middleware/auth';
import { errorHandler } from '@/middleware/errorHandler';

// Routes
import { healthRouter } from '@/routes/health';
import competitionRouter from '@/routes/competitions';
import participationRouter from '@/routes/participations';
import campaignRouter from '@/routes/campaigns';
import analyticsRouter from '@/routes/analytics';
import webhookRouter from '@/routes/webhooks';

// Services
import { CompetitionManager } from '@/services/CompetitionManager';
import { ExternalAPIManager } from '@/services/ExternalAPIManager';
import { ProgressMonitor } from '@/services/ProgressMonitor';
import { NotificationService } from '@/services/NotificationService';
import { logger } from '@/telemetry/logger';

// Database
import { testConnection, closeConnection } from '@/database/connection';
import { repository } from '@/database/repositories';
import { migrator } from '@/database/migrator';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:8080'],
    credentials: true
  }
});

const PORT = process.env.PORT || 3009;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "wss:", "ws:"],
    },
  },
}));

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:8080'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP, please try again later.'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use(morgan('combined'));
app.use(correlationIdMiddleware);
app.use(requestLogger);

// Routes
app.use('/health', healthRouter);
app.use('/competitions', competitionRouter);
app.use('/participations', participationRouter);
app.use('/campaigns', campaignRouter);
app.use('/analytics', analyticsRouter);
app.use('/webhooks', webhookRouter);

// WebSocket connection handling
io.on('connection', (socket) => {
  logger.info('WebSocket client connected', { socketId: socket.id });

  socket.on('join-competition', (competitionId: string) => {
    socket.join(`competition-${competitionId}`);
    logger.debug('Client joined competition room', { socketId: socket.id, competitionId });
  });

  socket.on('join-campaign', (campaignId: string) => {
    socket.join(`campaign-${campaignId}`);
    logger.debug('Client joined campaign room', { socketId: socket.id, campaignId });
  });

  socket.on('disconnect', () => {
    logger.info('WebSocket client disconnected', { socketId: socket.id });
  });
});

// Make io available to services
app.set('io', io);

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use((req: express.Request, res: express.Response) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint not found',
      correlationId: req.correlationId
    }
  });
});

// Initialize database and services
async function initializeServices() {
  try {
    logger.info('Initializing competition service...');

    // Test database connection
    const dbConnected = await testConnection();
    if (!dbConnected) {
      throw new Error('Database connection failed');
    }

    // Run database migrations
    logger.info('Running database migrations...');
    await migrator.migrate();

    // Initialize core services
    const competitionManager = new CompetitionManager();
    const externalAPIManager = new ExternalAPIManager();
    const progressMonitor = new ProgressMonitor(io);
    const notificationService = new NotificationService(io);

    // Initialize services
    await competitionManager.initialize();
    await externalAPIManager.initialize();
    await progressMonitor.initialize();
    await notificationService.initialize();

    // Make services available globally
    app.set('competitionManager', competitionManager);
    app.set('externalAPIManager', externalAPIManager);
    app.set('progressMonitor', progressMonitor);
    app.set('notificationService', notificationService);
    app.set('repository', repository);

    logger.info('All services initialized successfully');
    return { competitionManager, externalAPIManager, progressMonitor, notificationService };

  } catch (error) {
    logger.error('Failed to initialize services', { error });
    throw error;
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  
  // Close WebSocket server
  io.close();
  
  // Close database connections
  await closeConnection();
  
  // Close HTTP server
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  
  // Close WebSocket server
  io.close();
  
  // Close database connections
  await closeConnection();
  
  // Close HTTP server
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

// Start server
server.listen(PORT, async () => {
  logger.info(`Competition Service running on port ${PORT}`);
  
  try {
    await initializeServices();
    logger.info('Competition Service fully initialized and ready');
  } catch (error) {
    logger.error('Failed to initialize services, shutting down', { error });
    process.exit(1);
  }
});

export default app;
export { io };