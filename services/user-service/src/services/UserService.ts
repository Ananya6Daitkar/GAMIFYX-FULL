/**
 * Enhanced User Service for GamifyX platform
 */

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import { 
  User, 
  UserProfile, 
  UserRole, 
  CyberpunkTheme,
  GamificationProfile,
  UserPreferences,
  DashboardLayout,
  ProfileVisibility 
} from '../models/User';
import { UserRepository } from '../repositories/UserRepository';
import { GamifyXTelemetry } from '../../../shared/telemetry';
import { GamifyXMetrics } from '../../../shared/telemetry/metrics';
import { DistributedTracing } from '../../../shared/telemetry/tracing';

export interface AuthResult {
  success: boolean;
  user?: User;
  token?: string;
  refreshToken?: string;
  mfaRequired?: boolean;
  mfaQRCode?: string;
  error?: string;
}

export interface ProfileUpdateResult {
  success: boolean;
  profile?: UserProfile;
  error?: string;
}

export interface PasswordResetResult {
  success: boolean;
  resetToken?: string;
  error?: string;
}

export class UserService {
  private userRepository: UserRepository;
  private telemetry: GamifyXTelemetry;
  private metrics: GamifyXMetrics;
  private tracing: DistributedTracing;
  private jwtSecret: string;
  private jwtRefreshSecret: string;
  private saltRounds: number = 12;
  private maxLoginAttempts: number = 5;
  private lockoutDuration: number = 15 * 60 * 1000; // 15 minutes

  constructor(
    userRepository: UserRepository,
    telemetry: GamifyXTelemetry,
    metrics: GamifyXMetrics,
    tracing: DistributedTracing
  ) {
    this.userRepository = userRepository;
    this.telemetry = telemetry;
    this.metrics = metrics;
    this.tracing = tracing;
    this.jwtSecret = process.env.JWT_SECRET || 'gamifyx-secret';
    this.jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || 'gamifyx-refresh-secret';
  }

  // User Registration
  public async registerUser(
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    role: UserRole = UserRole.STUDENT
  ): Promise<AuthResult> {
    return this.tracing.traceAsync(
      'user.register',
      async () => {
        try {
          // Check if user already exists
          const existingUser = await this.userRepository.findByEmail(email);
          if (existingUser) {
            this.metrics.recordAuthenticationAttempt(false, 'registration', email);
            return { success: false, error: 'User already exists' };
          }

          // Validate password strength
          if (!this.isPasswordStrong(password)) {
            return { 
              success: false, 
              error: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character' 
            };
          }

          // Hash password
          const passwordHash = await bcrypt.hash(password, this.saltRounds);

          // Create user
          const user: Partial<User> = {
            id: uuidv4(),
            email,
            passwordHash,
            firstName,
            lastName,
            role,
            isActive: true,
            emailVerified: false,
            mfaEnabled: false,
            loginAttempts: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          const createdUser = await this.userRepository.create(user as User);

          // Create default profile
          await this.createDefaultProfile(createdUser.id, role);

          // Generate tokens
          const token = this.generateAccessToken(createdUser);
          const refreshToken = this.generateRefreshToken(createdUser);

          this.metrics.recordAuthenticationAttempt(true, 'registration', createdUser.id);

          return {
            success: true,
            user: createdUser,
            token,
            refreshToken,
          };
        } catch (error) {
          this.metrics.recordAuthenticationAttempt(false, 'registration');
          throw error;
        }
      },
      { 'user.email': email, 'user.role': role }
    );
  }

  // User Login
  public async loginUser(email: string, password: string, mfaCode?: string): Promise<AuthResult> {
    return this.tracing.traceAuthenticationFlow(
      email,
      'password',
      async () => {
        try {
          const user = await this.userRepository.findByEmail(email);
          if (!user) {
            this.metrics.recordAuthenticationAttempt(false, 'login', email);
            return { success: false, error: 'Invalid credentials' };
          }

          // Check if account is locked
          if (user.lockedUntil && user.lockedUntil > new Date()) {
            this.metrics.recordAuthenticationAttempt(false, 'login', user.id);
            return { 
              success: false, 
              error: `Account locked until ${user.lockedUntil.toISOString()}` 
            };
          }

          // Verify password
          const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
          if (!isPasswordValid) {
            await this.handleFailedLogin(user);
            this.metrics.recordAuthenticationAttempt(false, 'login', user.id);
            return { success: false, error: 'Invalid credentials' };
          }

          // Check MFA if enabled
          if (user.mfaEnabled) {
            if (!mfaCode) {
              return { success: false, mfaRequired: true };
            }

            const isMfaValid = speakeasy.totp.verify({
              secret: user.mfaSecret!,
              encoding: 'base32',
              token: mfaCode,
              window: 2,
            });

            if (!isMfaValid) {
              this.metrics.recordAuthenticationAttempt(false, 'mfa', user.id);
              return { success: false, error: 'Invalid MFA code' };
            }
          }

          // Reset login attempts and update last login
          await this.userRepository.update(user.id, {
            loginAttempts: 0,
            lockedUntil: undefined,
            lastLogin: new Date(),
          });

          // Generate tokens
          const token = this.generateAccessToken(user);
          const refreshToken = this.generateRefreshToken(user);

          this.metrics.recordAuthenticationAttempt(true, 'login', user.id);

          return {
            success: true,
            user,
            token,
            refreshToken,
          };
        } catch (error) {
          this.metrics.recordAuthenticationAttempt(false, 'login');
          throw error;
        }
      }
    );
  }

  // Setup MFA
  public async setupMFA(userId: string): Promise<{ secret: string; qrCode: string }> {
    return this.telemetry.traceAsync(
      'user.setup_mfa',
      async () => {
        const user = await this.userRepository.findById(userId);
        if (!user) {
          throw new Error('User not found');
        }

        const secret = speakeasy.generateSecret({
          name: `GamifyX (${user.email})`,
          issuer: 'GamifyX AIOps Platform',
        });

        // Generate QR code
        const qrCode = await QRCode.toDataURL(secret.otpauth_url!);

        // Save secret (not enabled until verified)
        await this.userRepository.update(userId, {
          mfaSecret: secret.base32,
        });

        return {
          secret: secret.base32!,
          qrCode,
        };
      },
      { 'user.id': userId }
    );
  }

  // Verify and enable MFA
  public async verifyAndEnableMFA(userId: string, token: string): Promise<boolean> {
    return this.telemetry.traceAsync(
      'user.verify_mfa',
      async () => {
        const user = await this.userRepository.findById(userId);
        if (!user || !user.mfaSecret) {
          return false;
        }

        const isValid = speakeasy.totp.verify({
          secret: user.mfaSecret,
          encoding: 'base32',
          token,
          window: 2,
        });

        if (isValid) {
          await this.userRepository.update(userId, {
            mfaEnabled: true,
          });
          return true;
        }

        return false;
      },
      { 'user.id': userId }
    );
  }

  // Get User Profile
  public async getUserProfile(userId: string): Promise<UserProfile | null> {
    return this.telemetry.traceAsync(
      'user.get_profile',
      async () => {
        return await this.userRepository.findProfileByUserId(userId);
      },
      { 'user.id': userId }
    );
  }

  // Update User Profile
  public async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<ProfileUpdateResult> {
    return this.telemetry.traceAsync(
      'user.update_profile',
      async () => {
        try {
          const existingProfile = await this.userRepository.findProfileByUserId(userId);
          if (!existingProfile) {
            return { success: false, error: 'Profile not found' };
          }

          const updatedProfile = await this.userRepository.updateProfile(userId, {
            ...updates,
            updatedAt: new Date(),
          });

          return {
            success: true,
            profile: updatedProfile,
          };
        } catch (error) {
          return {
            success: false,
            error: (error as Error).message,
          };
        }
      },
      { 'user.id': userId }
    );
  }

  // Update Cyberpunk Avatar
  public async updateCyberpunkAvatar(userId: string, avatarData: any): Promise<ProfileUpdateResult> {
    return this.telemetry.traceAsync(
      'user.update_avatar',
      async () => {
        try {
          const profile = await this.userRepository.findProfileByUserId(userId);
          if (!profile) {
            return { success: false, error: 'Profile not found' };
          }

          const updatedProfile = await this.userRepository.updateProfile(userId, {
            gamification: {
              ...profile.gamification,
              customization: {
                ...profile.gamification.customization,
                cyberpunkAvatar: avatarData,
              },
            },
            updatedAt: new Date(),
          });

          return {
            success: true,
            profile: updatedProfile,
          };
        } catch (error) {
          return {
            success: false,
            error: (error as Error).message,
          };
        }
      },
      { 'user.id': userId }
    );
  }

  // Update Dashboard Preferences
  public async updateDashboardPreferences(userId: string, preferences: Partial<UserPreferences>): Promise<ProfileUpdateResult> {
    return this.telemetry.traceAsync(
      'user.update_dashboard_preferences',
      async () => {
        try {
          const profile = await this.userRepository.findProfileByUserId(userId);
          if (!profile) {
            return { success: false, error: 'Profile not found' };
          }

          const updatedProfile = await this.userRepository.updateProfile(userId, {
            preferences: {
              ...profile.preferences,
              ...preferences,
            },
            updatedAt: new Date(),
          });

          return {
            success: true,
            profile: updatedProfile,
          };
        } catch (error) {
          return {
            success: false,
            error: (error as Error).message,
          };
        }
      },
      { 'user.id': userId }
    );
  }

  // Password Reset
  public async requestPasswordReset(email: string): Promise<PasswordResetResult> {
    return this.telemetry.traceAsync(
      'user.request_password_reset',
      async () => {
        try {
          const user = await this.userRepository.findByEmail(email);
          if (!user) {
            // Don't reveal if user exists
            return { success: true };
          }

          const resetToken = this.generatePasswordResetToken(user);
          
          // In a real implementation, you would send an email here
          // For now, we'll just return the token
          
          return {
            success: true,
            resetToken,
          };
        } catch (error) {
          return {
            success: false,
            error: (error as Error).message,
          };
        }
      },
      { 'user.email': email }
    );
  }

  // Reset Password
  public async resetPassword(token: string, newPassword: string): Promise<AuthResult> {
    return this.telemetry.traceAsync(
      'user.reset_password',
      async () => {
        try {
          const decoded = jwt.verify(token, this.jwtSecret) as any;
          const user = await this.userRepository.findById(decoded.userId);
          
          if (!user) {
            return { success: false, error: 'Invalid reset token' };
          }

          if (!this.isPasswordStrong(newPassword)) {
            return { 
              success: false, 
              error: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character' 
            };
          }

          const passwordHash = await bcrypt.hash(newPassword, this.saltRounds);
          
          await this.userRepository.update(user.id, {
            passwordHash,
            loginAttempts: 0,
            lockedUntil: undefined,
          });

          return { success: true };
        } catch (error) {
          return {
            success: false,
            error: 'Invalid or expired reset token',
          };
        }
      }
    );
  }

  // Refresh Token
  public async refreshToken(refreshToken: string): Promise<AuthResult> {
    return this.telemetry.traceAsync(
      'user.refresh_token',
      async () => {
        try {
          const decoded = jwt.verify(refreshToken, this.jwtRefreshSecret) as any;
          const user = await this.userRepository.findById(decoded.userId);
          
          if (!user) {
            return { success: false, error: 'Invalid refresh token' };
          }

          const newToken = this.generateAccessToken(user);
          const newRefreshToken = this.generateRefreshToken(user);

          return {
            success: true,
            user,
            token: newToken,
            refreshToken: newRefreshToken,
          };
        } catch (error) {
          return {
            success: false,
            error: 'Invalid or expired refresh token',
          };
        }
      }
    );
  }

  // Private helper methods
  private async createDefaultProfile(userId: string, role: UserRole): Promise<void> {
    const defaultProfile: Partial<UserProfile> = {
      id: uuidv4(),
      userId,
      timezone: 'UTC',
      preferences: this.getDefaultPreferences(role),
      gamification: this.getDefaultGamificationProfile(),
      socialLinks: {},
      skills: [],
      interests: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.userRepository.createProfile(defaultProfile as UserProfile);
  }

  private getDefaultPreferences(role: UserRole): UserPreferences {
    return {
      theme: CyberpunkTheme.NEON_BLUE,
      language: 'en',
      notifications: {
        email: true,
        push: true,
        inApp: true,
        achievements: true,
        badges: true,
        leaderboard: true,
        teamUpdates: true,
        systemAlerts: role === UserRole.ADMIN || role === UserRole.TEACHER,
        weeklyDigest: true,
        marketingEmails: false,
      },
      dashboard: {
        layout: DashboardLayout.DEFAULT,
        widgets: [],
        autoRefresh: true,
        refreshInterval: 30000,
        animations: true,
        particles: true,
        soundEffects: false,
        compactMode: false,
        showTutorials: true,
      },
      privacy: {
        profileVisibility: ProfileVisibility.PUBLIC,
        showRealName: true,
        showEmail: false,
        showLocation: false,
        showGithub: true,
        allowTeamInvites: true,
        allowDirectMessages: true,
        shareAnalytics: true,
      },
      accessibility: {
        highContrast: false,
        largeText: false,
        reducedMotion: false,
        screenReader: false,
        keyboardNavigation: false,
        colorBlindSupport: false,
      },
    };
  }

  private getDefaultGamificationProfile(): GamificationProfile {
    return {
      totalXP: 0,
      currentLevel: 1,
      levelProgress: 0,
      rank: 0,
      totalPoints: 0,
      badges: [],
      achievements: [],
      streaks: {
        dailyLogin: { current: 0, longest: 0, lastActivity: new Date(), multiplier: 1 },
        submission: { current: 0, longest: 0, lastActivity: new Date(), multiplier: 1 },
        achievement: { current: 0, longest: 0, lastActivity: new Date(), multiplier: 1 },
        teamParticipation: { current: 0, longest: 0, lastActivity: new Date(), multiplier: 1 },
      },
      statistics: {
        totalSubmissions: 0,
        successfulSubmissions: 0,
        averageScore: 0,
        totalFeedbackReceived: 0,
        helpfulFeedbackGiven: 0,
        teamCollaborations: 0,
        mentoringSessions: 0,
        challengesCompleted: 0,
        incidentsResolved: 0,
        uptime: 0,
      },
      customization: {
        cyberpunkAvatar: {
          baseModel: 'human_male' as any,
          skinTone: '#F4C2A1',
          hairStyle: 'short',
          hairColor: '#2C1810',
          eyeColor: '#4A90E2',
          accessories: [],
          clothing: {
            top: { model: 'basic_shirt', color: '#333333', material: 'fabric' as any, rarity: 'common' as any },
            bottom: { model: 'basic_pants', color: '#1A1A1A', material: 'fabric' as any, rarity: 'common' as any },
            shoes: { model: 'basic_shoes', color: '#000000', material: 'synthetic' as any, rarity: 'common' as any },
          },
          cybernetics: [],
        },
        accentColor: '#00FFFF',
        profileBadges: [],
        showcaseAchievements: [],
        profileEffects: [],
      },
    };
  }

  private async handleFailedLogin(user: User): Promise<void> {
    const loginAttempts = user.loginAttempts + 1;
    const updates: Partial<User> = { loginAttempts };

    if (loginAttempts >= this.maxLoginAttempts) {
      updates.lockedUntil = new Date(Date.now() + this.lockoutDuration);
    }

    await this.userRepository.update(user.id, updates);
  }

  private isPasswordStrong(password: string): boolean {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    return password.length >= minLength && hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar;
  }

  private generateAccessToken(user: User): string {
    return jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        type: 'access',
      },
      this.jwtSecret,
      { expiresIn: '15m' }
    );
  }

  private generateRefreshToken(user: User): string {
    return jwt.sign(
      {
        userId: user.id,
        type: 'refresh',
      },
      this.jwtRefreshSecret,
      { expiresIn: '7d' }
    );
  }

  private generatePasswordResetToken(user: User): string {
    return jwt.sign(
      {
        userId: user.id,
        type: 'password_reset',
      },
      this.jwtSecret,
      { expiresIn: '1h' }
    );
  }
}

export default UserService;