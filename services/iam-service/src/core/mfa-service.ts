/**
 * Multi-Factor Authentication Service for GamifyX IAM
 * Supports TOTP, SMS, Email, Hardware tokens, and Biometric authentication
 */

import { EventEmitter } from 'events';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import { Logger } from '../utils/logger';
import { RedisClient } from '../utils/redis-client';
import { SMSService } from '../services/sms-service';
import { EmailService } from '../services/email-service';
import { BiometricService } from '../services/biometric-service';
import { 
  User, 
  MFAMethod, 
  MFASetupResult, 
  MFAVerificationResult,
  MFAConfig,
  TOTPSecret,
  MFAChallenge,
  BackupCode
} from '../types/iam-types';

export class MFAService extends EventEmitter {
  private logger: Logger;
  private config: MFAConfig;
  private redis: RedisClient;
  private smsService: SMSService;
  private emailService: EmailService;
  private biometricService: BiometricService;

  constructor(config: MFAConfig) {
    super();
    this.config = config;
    this.logger = new Logger('MFAService');
    this.redis = new RedisClient(config.redis);
    this.smsService = new SMSService(config.sms);
    this.emailService = new EmailService(config.email);
    this.biometricService = new BiometricService(config.biometric);
  }

  /**
   * Setup MFA for a user with specified method
   */
  async setupMFA(user: User, method: MFAMethod): Promise<MFASetupResult> {
    try {
      this.logger.info('Setting up MFA', { userId: user.id, method });

      switch (method) {
        case MFAMethod.TOTP:
          return await this.setupTOTP(user);
        case MFAMethod.SMS:
          return await this.setupSMS(user);
        case MFAMethod.EMAIL:
          return await this.setupEmail(user);
        case MFAMethod.HARDWARE_TOKEN:
          return await this.setupHardwareToken(user);
        case MFAMethod.BIOMETRIC:
          return await this.setupBiometric(user);
        default:
          throw new Error(`Unsupported MFA method: ${method}`);
      }
    } catch (error) {
      this.logger.error('MFA setup error', error);
      throw error;
    }
  }

  /**
   * Verify MFA token/code
   */
  async verify(user: User, token: string, method?: MFAMethod): Promise<MFAVerificationResult> {
    try {
      this.logger.debug('Verifying MFA token', { userId: user.id, method });

      // Check rate limiting
      const rateLimitKey = `mfa_attempts:${user.id}`;
      const attempts = await this.redis.get(rateLimitKey);
      
      if (attempts && parseInt(attempts) >= this.config.maxAttempts) {
        return {
          success: false,
          reason: 'Too many failed attempts. Please try again later.',
          lockoutTime: this.config.lockoutDuration
        };
      }

      // Determine MFA method if not specified
      const mfaMethod = method || await this.getUserPrimaryMFAMethod(user.id);
      
      let verificationResult: MFAVerificationResult;

      switch (mfaMethod) {
        case MFAMethod.TOTP:
          verificationResult = await this.verifyTOTP(user, token);
          break;
        case MFAMethod.SMS:
          verificationResult = await this.verifySMS(user, token);
          break;
        case MFAMethod.EMAIL:
          verificationResult = await this.verifyEmail(user, token);
          break;
        case MFAMethod.HARDWARE_TOKEN:
          verificationResult = await this.verifyHardwareToken(user, token);
          break;
        case MFAMethod.BIOMETRIC:
          verificationResult = await this.verifyBiometric(user, token);
          break;
        case MFAMethod.BACKUP_CODE:
          verificationResult = await this.verifyBackupCode(user, token);
          break;
        default:
          throw new Error(`Unsupported MFA method: ${mfaMethod}`);
      }

      // Handle verification result
      if (verificationResult.success) {
        // Clear failed attempts
        await this.redis.del(rateLimitKey);
        
        // Log successful verification
        this.emit('mfa:verified', { user, method: mfaMethod });
        
        // Update last used timestamp
        await this.updateMFALastUsed(user.id, mfaMethod);
        
      } else {
        // Increment failed attempts
        await this.redis.incr(rateLimitKey);
        await this.redis.expire(rateLimitKey, this.config.lockoutDuration);
        
        // Log failed verification
        this.emit('mfa:failed', { user, method: mfaMethod, reason: verificationResult.reason });
      }

      return verificationResult;

    } catch (error) {
      this.logger.error('MFA verification error', error);
      return {
        success: false,
        reason: 'MFA verification system error'
      };
    }
  }

  /**
   * Generate backup codes for user
   */
  async generateBackupCodes(user: User): Promise<BackupCode[]> {
    try {
      this.logger.info('Generating backup codes', { userId: user.id });

      const backupCodes: BackupCode[] = [];
      
      for (let i = 0; i < this.config.backupCodesCount; i++) {
        const code = this.generateSecureCode(8);
        const hashedCode = await this.hashBackupCode(code);
        
        backupCodes.push({
          id: `backup_${user.id}_${i}`,
          code,
          hashedCode,
          used: false,
          createdAt: new Date(),
          usedAt: null
        });
      }

      // Store backup codes
      await this.storeBackupCodes(user.id, backupCodes);
      
      this.emit('backup_codes:generated', { user, count: backupCodes.length });
      
      return backupCodes;

    } catch (error) {
      this.logger.error('Backup code generation error', error);
      throw error;
    }
  }

  /**
   * Send MFA challenge (for SMS/Email methods)
   */
  async sendChallenge(user: User, method: MFAMethod): Promise<MFAChallenge> {
    try {
      this.logger.info('Sending MFA challenge', { userId: user.id, method });

      const challenge: MFAChallenge = {
        id: `challenge_${user.id}_${Date.now()}`,
        userId: user.id,
        method,
        code: this.generateSecureCode(6),
        expiresAt: new Date(Date.now() + this.config.challengeExpiry),
        attempts: 0,
        verified: false
      };

      // Store challenge
      await this.storeChallenge(challenge);

      // Send challenge based on method
      switch (method) {
        case MFAMethod.SMS:
          await this.smsService.sendMFACode(user.phone, challenge.code);
          break;
        case MFAMethod.EMAIL:
          await this.emailService.sendMFACode(user.email, challenge.code);
          break;
        default:
          throw new Error(`Challenge not supported for method: ${method}`);
      }

      this.emit('mfa:challenge_sent', { user, method, challengeId: challenge.id });

      return {
        ...challenge,
        code: undefined // Don't return the actual code
      };

    } catch (error) {
      this.logger.error('MFA challenge error', error);
      throw error;
    }
  }

  // Private methods for specific MFA implementations

  private async setupTOTP(user: User): Promise<MFASetupResult> {
    const secret = speakeasy.generateSecret({
      name: `GamifyX (${user.email})`,
      issuer: 'GamifyX',
      length: 32
    });

    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);

    // Store secret temporarily for verification
    await this.storeTempTOTPSecret(user.id, secret.base32);

    return {
      success: true,
      method: MFAMethod.TOTP,
      secret: secret.base32,
      qrCode: qrCodeUrl,
      backupCodes: await this.generateBackupCodes(user),
      instructions: 'Scan the QR code with your authenticator app and enter the 6-digit code to complete setup.'
    };
  }

  private async setupSMS(user: User): Promise<MFASetupResult> {
    if (!user.phone) {
      throw new Error('Phone number required for SMS MFA');
    }

    // Send verification SMS
    const challenge = await this.sendChallenge(user, MFAMethod.SMS);

    return {
      success: true,
      method: MFAMethod.SMS,
      challengeId: challenge.id,
      maskedPhone: this.maskPhoneNumber(user.phone),
      instructions: 'Enter the 6-digit code sent to your phone to complete SMS MFA setup.'
    };
  }

  private async setupEmail(user: User): Promise<MFASetupResult> {
    // Send verification email
    const challenge = await this.sendChallenge(user, MFAMethod.EMAIL);

    return {
      success: true,
      method: MFAMethod.EMAIL,
      challengeId: challenge.id,
      maskedEmail: this.maskEmail(user.email),
      instructions: 'Enter the 6-digit code sent to your email to complete email MFA setup.'
    };
  }

  private async setupHardwareToken(user: User): Promise<MFASetupResult> {
    // Hardware token setup would integrate with specific token providers
    // This is a placeholder implementation
    
    return {
      success: true,
      method: MFAMethod.HARDWARE_TOKEN,
      instructions: 'Please contact your administrator to configure your hardware token.'
    };
  }

  private async setupBiometric(user: User): Promise<MFASetupResult> {
    const biometricSetup = await this.biometricService.initializeSetup(user.id);

    return {
      success: true,
      method: MFAMethod.BIOMETRIC,
      biometricId: biometricSetup.id,
      supportedTypes: biometricSetup.supportedTypes,
      instructions: 'Follow the prompts to register your biometric data.'
    };
  }

  private async verifyTOTP(user: User, token: string): Promise<MFAVerificationResult> {
    const secret = await this.getUserTOTPSecret(user.id);
    if (!secret) {
      return { success: false, reason: 'TOTP not configured for user' };
    }

    const verified = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: this.config.totpWindow
    });

    return {
      success: verified,
      reason: verified ? undefined : 'Invalid TOTP code'
    };
  }

  private async verifySMS(user: User, token: string): Promise<MFAVerificationResult> {
    const challenge = await this.getActiveChallenge(user.id, MFAMethod.SMS);
    if (!challenge) {
      return { success: false, reason: 'No active SMS challenge found' };
    }

    if (challenge.expiresAt < new Date()) {
      return { success: false, reason: 'SMS code has expired' };
    }

    const verified = challenge.code === token;
    
    if (verified) {
      await this.markChallengeVerified(challenge.id);
    } else {
      await this.incrementChallengeAttempts(challenge.id);
    }

    return {
      success: verified,
      reason: verified ? undefined : 'Invalid SMS code'
    };
  }

  private async verifyEmail(user: User, token: string): Promise<MFAVerificationResult> {
    const challenge = await this.getActiveChallenge(user.id, MFAMethod.EMAIL);
    if (!challenge) {
      return { success: false, reason: 'No active email challenge found' };
    }

    if (challenge.expiresAt < new Date()) {
      return { success: false, reason: 'Email code has expired' };
    }

    const verified = challenge.code === token;
    
    if (verified) {
      await this.markChallengeVerified(challenge.id);
    } else {
      await this.incrementChallengeAttempts(challenge.id);
    }

    return {
      success: verified,
      reason: verified ? undefined : 'Invalid email code'
    };
  }

  private async verifyHardwareToken(user: User, token: string): Promise<MFAVerificationResult> {
    // Hardware token verification would integrate with specific token providers
    // This is a placeholder implementation
    
    return {
      success: false,
      reason: 'Hardware token verification not implemented'
    };
  }

  private async verifyBiometric(user: User, biometricData: string): Promise<MFAVerificationResult> {
    const verified = await this.biometricService.verify(user.id, biometricData);
    
    return {
      success: verified,
      reason: verified ? undefined : 'Biometric verification failed'
    };
  }

  private async verifyBackupCode(user: User, code: string): Promise<MFAVerificationResult> {
    const backupCodes = await this.getUserBackupCodes(user.id);
    
    for (const backupCode of backupCodes) {
      if (!backupCode.used && await this.verifyBackupCodeHash(code, backupCode.hashedCode)) {
        // Mark backup code as used
        await this.markBackupCodeUsed(backupCode.id);
        
        this.emit('backup_code:used', { user, backupCodeId: backupCode.id });
        
        return { success: true };
      }
    }

    return { success: false, reason: 'Invalid or already used backup code' };
  }

  // Helper methods
  private generateSecureCode(length: number): string {
    const chars = '0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private maskPhoneNumber(phone: string): string {
    return phone.replace(/(\d{3})\d{3}(\d{4})/, '$1***$2');
  }

  private maskEmail(email: string): string {
    const [username, domain] = email.split('@');
    const maskedUsername = username.charAt(0) + '*'.repeat(username.length - 2) + username.charAt(username.length - 1);
    return `${maskedUsername}@${domain}`;
  }

  // Database operations (placeholder implementations)
  private async getUserPrimaryMFAMethod(userId: string): Promise<MFAMethod> {
    // Implementation would query database for user's primary MFA method
    return MFAMethod.TOTP;
  }

  private async storeTempTOTPSecret(userId: string, secret: string): Promise<void> {
    await this.redis.setex(`totp_setup:${userId}`, 300, secret); // 5 minutes
  }

  private async getUserTOTPSecret(userId: string): Promise<string | null> {
    // Implementation would query database for user's TOTP secret
    return null;
  }

  private async storeChallenge(challenge: MFAChallenge): Promise<void> {
    await this.redis.setex(
      `mfa_challenge:${challenge.id}`, 
      this.config.challengeExpiry / 1000, 
      JSON.stringify(challenge)
    );
  }

  private async getActiveChallenge(userId: string, method: MFAMethod): Promise<MFAChallenge | null> {
    // Implementation would query for active challenge
    return null;
  }

  private async markChallengeVerified(challengeId: string): Promise<void> {
    // Implementation would mark challenge as verified
  }

  private async incrementChallengeAttempts(challengeId: string): Promise<void> {
    // Implementation would increment challenge attempts
  }

  private async storeBackupCodes(userId: string, codes: BackupCode[]): Promise<void> {
    // Implementation would store backup codes in database
  }

  private async getUserBackupCodes(userId: string): Promise<BackupCode[]> {
    // Implementation would retrieve user's backup codes
    return [];
  }

  private async hashBackupCode(code: string): Promise<string> {
    // Implementation would hash backup code
    return code;
  }

  private async verifyBackupCodeHash(code: string, hash: string): Promise<boolean> {
    // Implementation would verify backup code against hash
    return false;
  }

  private async markBackupCodeUsed(backupCodeId: string): Promise<void> {
    // Implementation would mark backup code as used
  }

  private async updateMFALastUsed(userId: string, method: MFAMethod): Promise<void> {
    // Implementation would update last used timestamp
  }
}