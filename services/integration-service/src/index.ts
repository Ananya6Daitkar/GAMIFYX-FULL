import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { logger } from './utils/logger';
import { initializeTracing } from './utils/tracing';
import { WorkflowOrchestrator } from './orchestrator/WorkflowOrchestrator';
import { WebSocketManager } from './websocket/WebSocketManager';
import { healthRouter } from './routes/health';
import { workflowRouter } from './routes/workflow';
import { metricsRouter } from './routes/metrics';

// Initialize tracing first
initializeTracing();

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3006;
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: ALLOWED_ORIGINS,
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Initialize services
const orchestrator = new WorkflowOrchestrator();
const wsManager = new WebSocketManager(wss);

// Make services available to routes
app.locals.orchestrator = orchestrator;
app.locals.wsManager = wsManager;

// Routes
app.use('/health', healthRouter);
app.use('/workflow', workflowRouter);
app.use('/metrics', metricsRouter);

// Error handling middleware
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', error);
  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
      timestamp: new Date().toISOString(),
      traceId: req.headers['x-trace-id'] || 'unknown'
    }
  });
});

// Start server
server.listen(PORT, () => {
  logger.info(`Integration service started on port ${PORT}`);
  logger.info(`WebSocket server initialized`);
  logger.info(`Allowed origins: ${ALLOWED_ORIGINS.join(', ')}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});