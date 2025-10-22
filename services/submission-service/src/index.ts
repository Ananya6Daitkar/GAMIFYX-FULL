// Initialize telemetry first
import './telemetry';

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { errorHandler } from '@/middleware/errorHandler';
import { requestLogger } from '@/middleware/requestLogger';
import { correlationIdMiddleware } from '@/telemetry/logger';
import { healthRouter } from '@/routes/health';
import { submissionRouter } from '@/routes/submission';

const app = express();
const PORT = process.env.PORT || 3002;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use(morgan('combined'));
app.use(correlationIdMiddleware);
app.use(requestLogger);

// Routes
app.use('/health', healthRouter);
app.use('/submissions', submissionRouter);

// Error handling middleware (must be last)
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Submission Service running on port ${PORT}`);
});

export default app;