import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

import { User, CreateUserRequest, LoginRequest, LoginResponse, MFALoginRequest } from '@/models';
import { UserRepository } from '@/database/repositories';
import { UserMetricsService } from './UserMetricsService';
import { logger } from '@/telemetry/logger';
import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('user-service', '1.0.0');

// Authentication metrics
const loginAttempts = meter.createCounter('user_login_attempts_total', {
  description: 'Total number of login attempts'
});

const registrationAttempts = meter.createCounter('user_registration_attempts_total', {
  description: 'Total number of registration attempts'
});

const activeUsers = meter.createUpDownCounter('user_active_count', {
  description: 'Number of currently active users'
});

export class AuthService {
  private userRepository: UserRepository;
  private metricsService: UserMetricsService;
  private jwtSecret: string;
  private jwtRefreshSecret: string;
  private saltRounds: number;

  constructor(userRepository?: UserRepository) {
    this.userRepository = userRepository || new UserRepository();
    this.metricsService = new UserMetricsService(this.userRepository);
    this.jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
    this.jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key';
    this.saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12');
  }

  async register(userData: CreateUserRequest): Promise<LoginResponse> {
    registrationAttempts.add(1, { status: 'attempted' });
    
    try {
      // Check if user already exists
      const existingUser = await this.userRepository.findByEmail(userData.email);
      if (existingUser) {
        registrationAttempts.add(1, { status: 'failed', reason: 'email_exists' });
        throw new Error('User with this email already exists');
      }

      // Hash password
      const passwordHash = await bcrypt.hash(userData.password, this.saltRounds);

      // Create user
      const user = await this.userRepository.createUser({
        ...userData,
        passwordHash
      });

      // Create default profile
      await this.userRepository.createProfile(user.id);

      registrationAttempts.add(1, { status: 'success' });
      activeUsers.add(1);

      // Generate tokens
      const tokens = this.generateTokens(user);

      logger.info('User registered successfully', { 
        userId: user.id, 
        email: user.email,
        role: user.role 
      });

      return {
        user: this.sanitizeUser(user),
        ...tokens
      };
    } catch (error) {
      registrationAttempts.add(1, { status: 'failed', reason: 'unknown' });
      logger.error('Registration failed', { error, email: userData.email });
      throw error;
    }
  }

  async login(credentials: LoginRequest | MFALoginRequest): Promise<LoginResponse | { requiresMFA: boolean; tempToken: string }> {
    loginAttempts.add(1, { status: 'attempted' });
    
    try {
      // Find user by email
      const user = await this.userRepository.findByEmail(credentials.email);
      if (!user) {
        loginAttempts.add(1, { status: 'failed', reason: 'user_not_found' });
        throw new Error('Invalid credentials');
      }

      // Check if user is locked
      if (user.lockedUntil && user.lockedUntil > new Date()) {
        loginAttempts.add(1, { status: 'failed', reason: 'user_locked' });
        throw new Error('Account is temporarily locked due to too many failed attempts');
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(credentials.password, user.passwordHash);
      if (!isPasswordValid) {
        await this.userRepository.incrementFailedLoginAttempts(user.id);
        
        // Lock user after 5 failed attempts for 30 minutes
        if (user.failedLoginAttempts >= 4) {
          await this.userRepository.lockUser(user.id, 30);
        }
        
        loginAttempts.add(1, { status: 'failed', reason: 'invalid_password' });
        throw new Error('Invalid credentials');
      }

      // If MFA is enabled, check for MFA token
      if (user.mfaEnabled) {
        const mfaCredentials = credentials as MFALoginRequest;
        
        if (!mfaCredentials.mfaToken) {
          // Return temporary token for MFA verification
          const tempToken = jwt.sign(
            { userId: user.id, step: 'mfa_required' },
            this.jwtSecret,
            { expiresIn: '5m' }
          );
          
          return {
            requiresMFA: true,
            tempToken
          };
        }

        // Verify MFA token
        const { MFAService } = await import('./MFAService');
        const mfaService = new MFAService(this.userRepository);
        const mfaValid = await mfaService.verifyMFA(user.id, mfaCredentials.mfaToken);
        
        if (!mfaValid) {
          await this.userRepository.incrementFailedLoginAttempts(user.id);
          loginAttempts.add(1, { status: 'failed', reason: 'invalid_mfa' });
          throw new Error('Invalid MFA token');
        }
      }

      // Reset failed login attempts on successful login
      await this.userRepository.resetFailedLoginAttempts(user.id);
      
      // Update last login
      await this.userRepository.updateLastLogin(user.id);

      loginAttempts.add(1, { status: 'success' });

      // Track login success
      await this.metricsService.trackLoginAttempt(true, user.id);

      // Generate tokens
      const tokens = this.generateTokens(user);

      logger.info('User logged in successfully', { 
        userId: user.id, 
        email: user.email,
        mfaUsed: user.mfaEnabled
      });

      return {
        user: this.sanitizeUser(user),
        ...tokens
      };
    } catch (error) {
      if (error instanceof Error && error.message !== 'Invalid credentials') {
        loginAttempts.add(1, { status: 'failed', reason: 'unknown' });
      }
      logger.error('Login failed', { error, email: credentials.email });
      throw error;
    }
  }

  async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const decoded = jwt.verify(refreshToken, this.jwtRefreshSecret) as any;
      
      const user = await this.userRepository.findById(decoded.userId);
      if (!user) {
        throw new Error('User not found');
      }

      return this.generateTokens(user);
    } catch (error) {
      logger.error('Token refresh failed', { error });
      throw new Error('Invalid refresh token');
    }
  }

  async verifyToken(token: string): Promise<User> {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as any;
      
      const user = await this.userRepository.findById(decoded.userId);
      if (!user) {
        throw new Error('User not found');
      }

      return user;
    } catch (error) {
      logger.error('Token verification failed', { error });
      throw new Error('Invalid token');
    }
  }

  private generateTokens(user: User): { accessToken: string; refreshToken: string } {
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role
    };

    const accessToken = jwt.sign(payload, this.jwtSecret, {
      expiresIn: process.env.JWT_EXPIRES_IN || '15m',
      issuer: 'aiops-learning-platform',
      subject: user.id
    } as jwt.SignOptions);

    const refreshToken = jwt.sign(
      { userId: user.id },
      this.jwtRefreshSecret,
      {
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
        issuer: 'aiops-learning-platform',
        subject: user.id
      } as jwt.SignOptions
    );

    return { accessToken, refreshToken };
  }

  private sanitizeUser(user: User): Omit<User, 'passwordHash'> {
    const { passwordHash, ...sanitizedUser } = user;
    return sanitizedUser;
  }

  async logout(userId: string): Promise<void> {
    try {
      // Record session end and update active users count
      activeUsers.add(-1);
      
      logger.info('User logged out', { userId });
    } catch (error) {
      logger.error('Logout failed', { error, userId });
      throw error;
    }
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isCurrentPasswordValid) {
        throw new Error('Current password is incorrect');
      }

      // Hash new password
      const newPasswordHash = await bcrypt.hash(newPassword, this.saltRounds);

      // Update password in database
      await this.userRepository.updatePassword(userId, newPasswordHash);
      
      logger.info('Password changed successfully', { userId });
    } catch (error) {
      logger.error('Password change failed', { error, userId });
      throw error;
    }
  }
}