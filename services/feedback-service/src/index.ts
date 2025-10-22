// Initialize telemetry first
import './telemetry';

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { correlationIdMiddleware } from '@/telemetry/logger';

const app = express();
const PORT = process.env.PORT || 3004;

app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined'));
app.use(correlationIdMiddleware);

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'feedback-service',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

app.listen(PORT, () => {
  console.log(`Feedback Service running on port ${PORT}`);
});

export default app;