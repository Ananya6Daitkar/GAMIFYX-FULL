// Initialize telemetry first
import './telemetry';

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { APIGateway } from '@/gateway/apiGateway';
import { correlationIdMiddleware, logger } from '@/telemetry/logger';

const app = express();
const PORT = process.env.PORT || 3011;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use(morgan('combined'));
app.use(correlationIdMiddleware);

// Initialize API Gateway
const apiGateway = new APIGateway();

// Mount the API Gateway
app.use('/', apiGateway.getApp());

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'AI Integration Service',
    version: '1.0.0',
    description: 'Standardized API gateway for AI services with health monitoring and rollback mechanisms',
    endpoints: {
      aiRegistry: '/api/ai-registry',
      modelPerformance: '/api/model-performance',
      guardrail: '/api/guardrail',
      health: '/api/health',
      metrics: '/api/gateway/metrics'
    }
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await apiGateway.shutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await apiGateway.shutdown();
  process.exit(0);
});

app.listen(PORT, () => {
  logger.info(`AI Integration Service running on port ${PORT}`);
});

export default app;