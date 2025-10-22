// Initialize telemetry first
import './telemetry';

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { errorHandler } from '@/middleware/errorHandler';
import { requestLogger } from '@/middleware/requestLogger';
import { sessionTrackingMiddleware } from '@/middleware/sessionTracking';
import { correlationIdMiddleware } from '@/telemetry/logger';
import { healthRouter } from '@/routes/health';
import { authRouter } from '@/routes/auth';
import { userRouter } from '@/routes/user';
import mfaRouter from '@/routes/mfa';
import permissionsRouter from '@/routes/permissions';
import { PermissionService } from '@/services/PermissionService';

const app = express();
const PORT = process.env.PORT || 3001;

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
app.use(requestLogger);
app.use(sessionTrackingMiddleware);

// Initialize permission system
const initializePermissions = async () => {
  try {
    const permissionService = new PermissionService();
    await permissionService.initializeDefaultRoles();
    console.log('Permission system initialized successfully');
  } catch (error) {
    console.error('Failed to initialize permission system:', error);
  }
};

// Routes
app.use('/health', healthRouter);
app.use('/auth', authRouter);
app.use('/users', userRouter);
app.use('/mfa', mfaRouter);
app.use('/permissions', permissionsRouter);

// Error handling middleware (must be last)
app.use(errorHandler);

app.listen(PORT, async () => {
  console.log(`User Service running on port ${PORT}`);
  await initializePermissions();
});

export default app;