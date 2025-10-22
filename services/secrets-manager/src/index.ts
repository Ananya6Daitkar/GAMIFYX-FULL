// Initialize telemetry first
import './telemetry';

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { correlationIdMiddleware, requestLogger } from '@/telemetry/logger';
import { healthRouter } from '@/routes/health';
import secretsRouter from '@/routes/secrets';
import rotationRouter from '@/routes/rotation';
import cicdRouter from '@/routes/cicd';
import injectionRouter from '@/routes/injection';
import auditRouter from '@/routes/audit';
import { VaultService } from '@/services/VaultService';
import { SecretAccessService } from '@/services/SecretAccessService';
import { NotificationService } from '@/services/NotificationService';
import { RotationService } from '@/services/RotationService';
import { logger } from '@/telemetry/logger';

const app = express();
const PORT = process.env.PORT || 3003;

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

// Rate limiting - more restrictive for secrets service
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 requests per windowMs (more restrictive)
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
app.use(express.json({ limit: '1mb' })); // Smaller limit for security
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Logging middleware
app.use(morgan('combined'));
app.use(correlationIdMiddleware);
app.use(requestLogger);

// Routes
app.use('/health', healthRouter);
app.use('/secrets', secretsRouter);
app.use('/rotation', rotationRouter);
app.use('/cicd', cicdRouter);
app.use('/injection', injectionRouter);
app.use('/audit', auditRouter);

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

// Initialize services
async function initializeServices() {
  try {
    logger.info('Initializing secrets manager services...');

    // Initialize Vault
    const vaultService = new VaultService();
    await vaultService.initialize();

    // Initialize other services
    const accessService = new SecretAccessService();
    const notificationService = new NotificationService();
    const rotationService = new RotationService(vaultService, accessService, notificationService);
    
    await rotationService.initialize();

    logger.info('All services initialized successfully');
    return { vaultService, accessService, notificationService, rotationService };

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
  logger.info(`Secrets Manager Service running on port ${PORT}`);
  
  try {
    await initializeServices();
    logger.info('Secrets Manager Service fully initialized and ready');
  } catch (error) {
    logger.error('Failed to initialize services, shutting down', { error });
    process.exit(1);
  }
});

export default app;