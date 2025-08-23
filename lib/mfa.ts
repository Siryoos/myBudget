import crypto from 'crypto';

import { authenticator } from 'otplib';

import { query } from './database';
import { getRedisClient } from './redis';

// MFA configuration
export interface MFAConfig {
  issuer: string;
  algorithm: 'SHA1' | 'SHA256' | 'SHA512';
  digits: 6 | 8;
  period: number; // seconds
  window: number; // tolerance window for TOTP validation
}

// MFA constants
const DEFAULT_MFA_DIGITS = 6;
const DEFAULT_MFA_PERIOD = 30;
const DEFAULT_MFA_WINDOW = 1;

// Default MFA configuration
const DEFAULT_MFA_CONFIG: MFAConfig = {
  issuer: 'MyBudget',
  algorithm: 'SHA1',
  digits: DEFAULT_MFA_DIGITS,
  period: DEFAULT_MFA_PERIOD,
  window: DEFAULT_MFA_WINDOW,
};

// MFA status
export enum MFAStatus {
  DISABLED = 'disabled',
  ENABLED = 'enabled',
  PENDING_VERIFICATION = 'pending_verification'
}

// MFA methods
export enum MFAMethod {
  TOTP = 'totp',
  SMS = 'sms',
  EMAIL = 'email'
}

// MFA setup response
export interface MFASetupResponse {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
  status: MFAStatus;
}

// MFA verification response
export interface MFAVerificationResponse {
  success: boolean;
  status: MFAStatus;
  backupCodesRemaining?: number;
}

// Type for Redis client
type RedisClient = ReturnType<typeof getRedisClient>;

// Database result interfaces
interface UserMFAResult {
  mfa_enabled: boolean;
  mfa_verified: boolean;
}

interface UserSecretResult {
  mfa_secret: string;
}

interface BackupCodeResult {
  code_hash: string;
}

// MFA service class
export class MFAService {
  private config: MFAConfig;
  private redis: RedisClient;

  constructor() {
    this.config = DEFAULT_MFA_CONFIG;
    this.redis = getRedisClient();
  }

  // Generate MFA secret for a user
  async generateSecret(userId: string, userEmail: string): Promise<MFASetupResponse> {
    try {
      // Generate secret
      const secret = authenticator.generateSecret();

      // Generate backup codes
      const backupCodes = this.generateBackupCodes();

      // Store secret and backup codes in database
      await this.storeMFASecret(userId, secret, backupCodes);

      // Generate QR code URL
      const qrCodeUrl = authenticator.keyuri(
        userEmail,
        this.config.issuer,
        secret,
      );

      return {
        secret,
        qrCodeUrl,
        backupCodes,
        status: MFAStatus.PENDING_VERIFICATION,
      };
    } catch (error) {
      throw new Error('Failed to generate MFA secret');
    }
  }

  // Verify TOTP code
  async verifyTOTP(userId: string, token: string): Promise<MFAVerificationResponse> {
    try {
      // Get user's MFA secret
      const userSecret = await this.getMFASecret(userId);
      if (!userSecret) {
        throw new Error('MFA not enabled for this user');
      }

      // Verify TOTP token
      const isValid = authenticator.verify({
        token,
        secret: userSecret,
      });

      if (isValid) {
        // Mark MFA as verified
        await this.markMFAVerified(userId);

        // Clear any pending verification attempts
        await this.clearVerificationAttempts(userId);

        return {
          success: true,
          status: MFAStatus.ENABLED,
        };
      }

      // Record failed attempt
      await this.recordFailedAttempt(userId);

      return {
        success: false,
        status: MFAStatus.PENDING_VERIFICATION,
      };
    } catch (error) {
      throw new Error('Failed to verify TOTP');
    }
  }

  // Verify backup code
  async verifyBackupCode(userId: string, backupCode: string): Promise<MFAVerificationResponse> {
    try {
      // Get user's backup codes
      const backupCodes = await this.getBackupCodes(userId);
      if (!backupCodes || backupCodes.length === 0) {
        throw new Error('No backup codes available');
      }

      // Check if backup code is valid
      const isValidCode = backupCodes.some(code =>
        crypto.timingSafeEqual(
          Buffer.from(code, 'hex'),
          Buffer.from(backupCode, 'hex'),
        ),
      );

      if (isValidCode) {
        // Remove used backup code
        await this.removeBackupCode(userId, backupCode);

        // Mark MFA as verified
        await this.markMFAVerified(userId);

        // Clear verification attempts
        await this.clearVerificationAttempts(userId);

        const remainingCodes = await this.getBackupCodes(userId);

        return {
          success: true,
          status: MFAStatus.ENABLED,
          backupCodesRemaining: remainingCodes.length,
        };
      }

      // Record failed attempt
      await this.recordFailedAttempt(userId);

      return {
        success: false,
        status: MFAStatus.PENDING_VERIFICATION,
      };
    } catch (error) {
      throw new Error('Failed to verify backup code');
    }
  }

  // Check if MFA is required for user
  async isMFARequired(userId: string): Promise<boolean> {
    try {
      const mfaStatus = await this.getMFAStatus(userId);
      return mfaStatus === MFAStatus.ENABLED;
    } catch (error) {
      return false;
    }
  }

  // Get MFA status for user
  async getMFAStatus(userId: string): Promise<MFAStatus> {
    try {
      const result = await query(
        'SELECT mfa_enabled, mfa_verified FROM users WHERE id = $1',
        [userId],
      );

      if (result.rows.length === 0) {
        return MFAStatus.DISABLED;
      }

      const user = result.rows[0] as UserMFAResult;

      if (!user.mfa_enabled) {
        return MFAStatus.DISABLED;
      }

      if (!user.mfa_verified) {
        return MFAStatus.PENDING_VERIFICATION;
      }

      return MFAStatus.ENABLED;
    } catch (error) {
      return MFAStatus.DISABLED;
    }
  }

  // Disable MFA for user
  async disableMFA(userId: string): Promise<void> {
    try {
      await query(
        'UPDATE users SET mfa_enabled = false, mfa_verified = false, mfa_secret = NULL WHERE id = $1',
        [userId],
      );

      // Clear backup codes
      await query(
        'DELETE FROM user_backup_codes WHERE user_id = $1',
        [userId],
      );

      // Clear Redis cache
      await this.redis.del(`mfa:${userId}`);
    } catch (error) {
      throw new Error('Failed to disable MFA');
    }
  }

  // Generate new backup codes
  async regenerateBackupCodes(userId: string): Promise<string[]> {
    try {
      const newBackupCodes = this.generateBackupCodes();

      // Remove old backup codes
      await query(
        'DELETE FROM user_backup_codes WHERE user_id = $1',
        [userId],
      );

      // Store new backup codes
      await this.storeBackupCodes(userId, newBackupCodes);

      return newBackupCodes;
    } catch (error) {
      throw new Error('Failed to regenerate backup codes');
    }
  }

  // Check if user has exceeded verification attempts
  async hasExceededAttempts(userId: string): Promise<boolean> {
    try {
      const attempts = await this.getVerificationAttempts(userId);
      const maxAttempts = parseInt(process.env.MFA_MAX_ATTEMPTS || '5', 10);
      const lockoutDuration = parseInt(process.env.MFA_LOCKOUT_DURATION || '900', 10); // 15 minutes

      // Check if user is locked out
      if (attempts.length >= maxAttempts) {
        const lastAttempt = attempts[attempts.length - 1];
        const timeSinceLastAttempt = Date.now() - lastAttempt.timestamp;

        if (timeSinceLastAttempt < lockoutDuration * 1000) {
          return true; // Still locked out
        }
          // Clear old attempts
          await this.clearVerificationAttempts(userId);

      }

      return false;
    } catch (error) {
      return false;
    }
  }

  // Private helper methods

  private generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < 10; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      codes.push(code);
    }
    return codes;
  }

  private async storeMFASecret(userId: string, secret: string, backupCodes: string[]): Promise<void> {
    // Store MFA secret
    await query(
      'UPDATE users SET mfa_enabled = true, mfa_secret = $1 WHERE id = $2',
      [secret, userId],
    );

    // Store backup codes
    await this.storeBackupCodes(userId, backupCodes);
  }

  private async storeBackupCodes(userId: string, backupCodes: string[]): Promise<void> {
    for (const code of backupCodes) {
      const hashedCode = crypto.createHash('sha256').update(code).digest('hex');
      await query(
        'INSERT INTO user_backup_codes (user_id, code_hash, used) VALUES ($1, $2, false)',
        [userId, hashedCode],
      );
    }
  }

  private async getMFASecret(userId: string): Promise<string | null> {
    const result = await query(
      'SELECT mfa_secret FROM users WHERE id = $1 AND mfa_enabled = true',
      [userId],
    );

    const user = result.rows[0] as UserSecretResult | undefined;
    return user?.mfa_secret || null;
  }

  private async getBackupCodes(userId: string): Promise<string[]> {
    const result = await query(
      'SELECT code_hash FROM user_backup_codes WHERE user_id = $1 AND used = false',
      [userId],
    );

    return result.rows.map((row: BackupCodeResult) => row.code_hash);
  }

  private async removeBackupCode(userId: string, backupCode: string): Promise<void> {
    const hashedCode = crypto.createHash('sha256').update(backupCode).digest('hex');
    await query(
      'UPDATE user_backup_codes SET used = true WHERE user_id = $1 AND code_hash = $2',
      [userId, hashedCode],
    );
  }

  private async markMFAVerified(userId: string): Promise<void> {
    await query(
      'UPDATE users SET mfa_verified = true WHERE id = $1',
      [userId],
    );
  }

  private async recordFailedAttempt(userId: string): Promise<void> {
    const timestamp = Date.now();
    await this.redis.zadd(`mfa_attempts:${userId}`, timestamp, timestamp);
    await this.redis.expire(`mfa_attempts:${userId}`, 3600); // 1 hour TTL
  }

  private async getVerificationAttempts(userId: string): Promise<Array<{ timestamp: number }>> {
    const attempts = await this.redis.zrange(`mfa_attempts:${userId}`, 0, -1, 'WITHSCORES');
    const result: Array<{ timestamp: number }> = [];

    for (let i = 0; i < attempts.length; i += 2) {
      result.push({ timestamp: parseInt(attempts[i + 1]) });
    }

    return result;
  }

  private async clearVerificationAttempts(userId: string): Promise<void> {
    await this.redis.del(`mfa_attempts:${userId}`);
  }

  // Update MFA configuration
  updateConfig(newConfig: Partial<MFAConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  // Get current MFA configuration
  getConfig(): MFAConfig {
    return { ...this.config };
  }
}

// Singleton instance
export const mfaService = new MFAService();

// Convenience functions
export const generateMFASecret = (userId: string, userEmail: string): Promise<MFASetupResponse> => mfaService.generateSecret(userId, userEmail);

export const verifyMFATOTP = (userId: string, token: string): Promise<MFAVerificationResponse> => mfaService.verifyTOTP(userId, token);

export const verifyMFABackupCode = (userId: string, backupCode: string): Promise<MFAVerificationResponse> => mfaService.verifyBackupCode(userId, backupCode);

export const isMFARequired = (userId: string): Promise<boolean> => mfaService.isMFARequired(userId);

export const disableMFA = (userId: string): Promise<void> => mfaService.disableMFA(userId);

export const regenerateBackupCodes = (userId: string): Promise<string[]> => mfaService.regenerateBackupCodes(userId);

// Request interface for MFA middleware
interface MFARequest {
  user?: { id: string };
  headers: {
    get(name: string): string | null;
  };
}

// MFA middleware
export const requireMFA = (handler: (request: MFARequest) => Promise<Response>) => async (request: MFARequest) => {
    const userId = request.user?.id;

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // Check if MFA is required
    const mfaRequired = await mfaService.isMFARequired(userId);

    if (mfaRequired) {
      // Check if MFA has been verified in this session
      const mfaVerified = request.headers.get('x-mfa-verified') === 'true';

      if (!mfaVerified) {
        return new Response(
          JSON.stringify({
            error: 'MFA verification required',
            code: 'MFA_REQUIRED',
            requiresMFA: true,
          }),
          { status: 403, headers: { 'Content-Type': 'application/json' } },
        );
      }
    }

    return handler(request);
  };
