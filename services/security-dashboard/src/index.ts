// Initialize telemetry first
import './telemetry';

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { CronJob } from 'cron';
import { correlationIdMiddleware, requestLogger } from '@/telemetry/logger';
import { healthRouter } from '@/routes/health';
import dashboardRouter from '@/routes/dashboard';
import { SecurityMetricsService } from '@/services/SecurityMetricsService';
import { VulnerabilityService } from '@/services/VulnerabilityService';
import { ThreatIntelligenceService } from '@/services/ThreatIntelligenceService';
import { logger } from '@/telemetry/logger';

const app = express();
const PORT = process.env.PORT || 3004;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
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
app.use('/dashboard', dashboardRouter);

// Error handling middleware
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error', {
    error: error.message,
    stack: error.stack,
    correlationId: req.correlationId,
    url: req.url,
    method: req.method
  });

  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An internal server error occurred',
      correlationId: req.correlationId
    }
  });
});

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

// Initialize services and scheduled jobs
async function initializeServices() {
  try {
    logger.info('Initializing security dashboard services...');

    const metricsService = new SecurityMetricsService();
    const vulnerabilityService = new VulnerabilityService();
    const threatService = new ThreatIntelligenceService();

    // Schedule metrics collection every 15 minutes
    const metricsJob = new CronJob('*/15 * * * *', async () => {
      try {
        logger.info('Collecting security metrics...');
        const metrics = await metricsService.getCurrentMetrics();
        await metricsService.saveMetricsSnapshot(metrics);
        logger.info('Security metrics collected and saved');
      } catch (error) {
        logger.error('Failed to collect security metrics', { error });
      }
    });

    // Schedule vulnerability scans every 6 hours
    const vulnScanJob = new CronJob('0 */6 * * *', async () => {
      try {
        logger.info('Starting scheduled vulnerability scans...');
        await vulnerabilityService.scheduleRegularScans();
        logger.info('Scheduled vulnerability scans completed');
      } catch (error) {
        logger.error('Failed to complete scheduled vulnerability scans', { error });
      }
    });

    // Schedule threat intelligence updates every 2 hours
    const threatIntelJob = new CronJob('0 */2 * * *', async () => {
      try {
        logger.info('Updating threat intelligence...');
        await threatService.updateThreatIntelligence();
        logger.info('Threat intelligence updated');
      } catch (error) {
        logger.error('Failed to update threat intelligence', { error });
      }
    });

    // Start scheduled jobs
    metricsJob.start();
    vulnScanJob.start();
    threatIntelJob.start();

    // Run initial data collection
    logger.info('Running initial data collection...');
    const initialMetrics = await metricsService.getCurrentMetrics();
    await metricsService.saveMetricsSnapshot(initialMetrics);
    
    // Run initial threat intelligence update
    await threatService.updateThreatIntelligence();

    logger.info('All services initialized successfully');
    return { metricsService, vulnerabilityService, threatService };

  } catch (error) {
    logger.error('Failed to initialize services', { error });
    throw error;
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start server
app.listen(PORT, async () => {
  logger.info(`Security Dashboard Service running on port ${PORT}`);
  
  try {
    await initializeServices();
    logger.info('Security Dashboard Service fully initialized and ready');
  } catch (error) {
    logger.error('Failed to initialize services, shutting down', { error });
    process.exit(1);
  }
});

export default app;