// Initialize telemetry first
import './telemetry';

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { errorHandler } from '@/middleware/errorHandler';
import { correlationIdMiddleware } from '@/telemetry/logger';
import { healthRouter } from '@/routes/health';
import { modelsRouter } from '@/routes/models';
import { metricsRouter } from '@/routes/metrics';
import { logger } from '@/telemetry/logger';

const app = express();
const PORT = process.env.PORT || 3010;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use(morgan('combined'));
app.use(correlationIdMiddleware);

// Request logging middleware
app.use((req: any, res: any, next: any) => {
  req.logger?.info('Incoming request', {
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });
  next();
});

// Routes
app.use('/health', healthRouter);
app.use('/api/v1/models', modelsRouter);
app.use('/api/v1/metrics', metricsRouter);

// Root endpoint
app.get('/', (req: any, res: any) => {
  res.json({
    service: 'Model Performance Service',
    version: '1.0.0',
    description: 'AI model performance tracking and validation service',
    endpoints: {
      health: '/health',
      models: '/api/v1/models',
      metrics: '/api/v1/metrics'
    }
  });
});

// 404 handler
app.use('*', (req: any, res: any) => {
  res.status(404).json({
    success: false,
    error: {
      message: 'Endpoint not found'
    },
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Initialize database schema on startup
const initializeDatabase = async () => {
  try {
    const fs = require('fs');
    const path = require('path');
    const { pool } = require('@/database/connection');
    
    const schemaPath = path.join(__dirname, 'database', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    await pool.query(schema);
    logger.info('Database schema initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize database schema', { error });
    // Don't exit the process, let the service start anyway
  }
};

app.listen(PORT, async () => {
  logger.info(`Model Performance Service running on port ${PORT}`);
  await initializeDatabase();
});

export default app;