import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import * as crypto from 'crypto';
import { UserRepository } from '@/database/repositories';
import { MFASetupResponse, MFAVerifyRequest } from '@/models';
import { logger } from '@/telemetry/logger';
import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('user-service', '1.0.0');

// MFA metrics
const mfaSetupAttempts = meter.createCounter('mfa_setup_attempts_total', {
  description: 'Total MFA setup attempts'
});

const mfaVerificationAttempts = meter.createCounter('mfa_verification_attempts_total', {
  description: 'Total MFA verification attempts'
});

const mfaEnabledUsers = meter.createUpDownCounter('mfa_enabled_users_count', {
  description: 'Number of users with MFA enabled'
});

export class MFAService {
  private userRepository: UserRepository;
  private serviceName: string;

  constructor(userRepository?: UserRepository) {
    this.userRepository = userRepository || new UserRepository();
    this.serviceName = process.env.SERVICE_NAME || 'AIOps Learning Platform';
  }

  async setupMFA(userId: string): Promise<MFASetupResponse> {
    mfaSetupAttempts.add(1, { status: 'attempted' });

    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        mfaSetupAttempts.add(1, { status: 'failed', reason: 'user_not_found' });
        throw new Error('User not found');
      }

      // Generate secret for TOTP
      const secret = speakeasy.generateSecret({
        name: `${this.serviceName} (${user.email})`,
        issuer: this.serviceName,
        length: 32
      });

      // Generate backup codes
      const backupCodes = this.generateBackupCodes();

      // Generate QR code
      const qrCode = await QRCode.toDataURL(secret.otpauth_url!);

      // Store MFA secret and backup codes (encrypted)
      await this.userRepository.storeMFASecret(userId, secret.base32, backupCodes);

      mfaSetupAttempts.add(1, { status: 'success' });

      logger.info('MFA setup initiated', { userId });

      return {
        secret: secret.base32,
        qrCode,
        backupCodes
      };
    } catch (error) {
      mfaSetupAttempts.add(1, { status: 'failed', reason: 'unknown' });
      logger.error('MFA setup failed', { error, userId });
      throw error;
    }
  }

  async verifyMFASetup(userId: string, token: string): Promise<boolean> {
    mfaVerificationAttempts.add(1, { status: 'attempted', type: 'setup' });

    try {
      const user = await this.userRepository.findById(userId);
      if (!user || !user.mfaSecret) {
        mfaVerificationAttempts.add(1, { status: 'failed', reason: 'no_secret', type: 'setup' });
        throw new Error('MFA not set up for this user');
      }

      const verified = speakeasy.totp.verify({
        secret: user.mfaSecret,
        encoding: 'base32',
        token,
        window: 2 // Allow 2 time steps (60 seconds) of drift
      });

      if (verified) {
        // Enable MFA for the user
        await this.userRepository.enableMFA(userId);
        mfaEnabledUsers.add(1);
        mfaVerificationAttempts.add(1, { status: 'success', type: 'setup' });
        
        logger.info('MFA enabled successfully', { userId });
        return true;
      } else {
        mfaVerificationAttempts.add(1, { status: 'failed', reason: 'invalid_token', type: 'setup' });
        return false;
      }
    } catch (error) {
      mfaVerificationAttempts.add(1, { status: 'failed', reason: 'unknown', type: 'setup' });
      logger.error('MFA setup verification failed', { error, userId });
      throw error;
    }
  }

  async verifyMFA(userId: string, token: string): Promise<boolean> {
    mfaVerificationAttempts.add(1, { status: 'attempted', type: 'login' });

    try {
      const user = await this.userRepository.findById(userId);
      if (!user || !user.mfaEnabled || !user.mfaSecret) {
        mfaVerificationAttempts.add(1, { status: 'failed', reason: 'mfa_not_enabled', type: 'login' });
        throw new Error('MFA not enabled for this user');
      }

      // First try TOTP verification
      const totpVerified = speakeasy.totp.verify({
        secret: user.mfaSecret,
        encoding: 'base32',
        token,
        window: 2
      });

      if (totpVerified) {
        mfaVerificationAttempts.add(1, { status: 'success', type: 'login', method: 'totp' });
        logger.info('MFA verification successful (TOTP)', { userId });
        return true;
      }

      // If TOTP fails, try backup codes
      if (user.backupCodes && user.backupCodes.includes(token)) {
        // Remove used backup code
        await this.userRepository.removeBackupCode(userId, token);
        mfaVerificationAttempts.add(1, { status: 'success', type: 'login', method: 'backup_code' });
        
        logger.info('MFA verification successful (backup code)', { userId });
        return true;
      }

      mfaVerificationAttempts.add(1, { status: 'failed', reason: 'invalid_token', type: 'login' });
      return false;
    } catch (error) {
      mfaVerificationAttempts.add(1, { status: 'failed', reason: 'unknown', type: 'login' });
      logger.error('MFA verification failed', { error, userId });
      throw error;
    }
  }

  async disableMFA(userId: string, currentPassword: string): Promise<void> {
    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Verify current password before disabling MFA
      const bcrypt = require('bcrypt');
      const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isPasswordValid) {
        throw new Error('Invalid password');
      }

      await this.userRepository.disableMFA(userId);
      mfaEnabledUsers.add(-1);

      logger.info('MFA disabled', { userId });
    } catch (error) {
      logger.error('MFA disable failed', { error, userId });
      throw error;
    }
  }

  async regenerateBackupCodes(userId: string): Promise<string[]> {
    try {
      const user = await this.userRepository.findById(userId);
      if (!user || !user.mfaEnabled) {
        throw new Error('MFA not enabled for this user');
      }

      const backupCodes = this.generateBackupCodes();
      await this.userRepository.updateBackupCodes(userId, backupCodes);

      logger.info('Backup codes regenerated', { userId });
      return backupCodes;
    } catch (error) {
      logger.error('Backup code regeneration failed', { error, userId });
      throw error;
    }
  }

  private generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < 10; i++) {
      // Generate 8-character alphanumeric codes
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      codes.push(code);
    }
    return codes;
  }

  async getMFAStatus(userId: string): Promise<{ enabled: boolean; backupCodesRemaining: number }> {
    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      return {
        enabled: user.mfaEnabled,
        backupCodesRemaining: user.backupCodes ? user.backupCodes.length : 0
      };
    } catch (error) {
      logger.error('Failed to get MFA status', { error, userId });
      throw error;
    }
  }
}