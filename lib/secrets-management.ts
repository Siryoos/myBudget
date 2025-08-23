import * as crypto from 'crypto';

import { logSystemEvent, AuditEventType, AuditSeverity } from './audit-logging';
import { query } from './database';
import { getRedisClient } from './redis';

// Secret types
export enum SecretType {
  JWT_SECRET = 'jwt_secret',
  DATABASE_PASSWORD = 'database_password',
  REDIS_PASSWORD = 'redis_password',
  API_KEYS = 'api_keys',
  ENCRYPTION_KEYS = 'encryption_keys'
}

// Secret metadata
export interface SecretMetadata {
  id: string;
  type: SecretType;
  name: string;
  version: number;
  createdAt: string;
  expiresAt?: string;
  lastRotated: string;
  nextRotation: string;
  status: 'active' | 'expired' | 'rotating' | 'deprecated';
  tags: string[];
}

// Secret rotation configuration
export interface RotationConfig {
  autoRotate: boolean;
  rotationInterval: number; // days
  warningDays: number; // days before expiration to warn
  gracePeriod: number; // days after expiration before forcing rotation
  maxVersions: number; // maximum number of versions to keep
}

// Default rotation configuration
const DEFAULT_ROTATION_CONFIG: Record<SecretType, RotationConfig> = {
  [SecretType.JWT_SECRET]: {
    autoRotate: true,
    rotationInterval: 90, // 3 months
    warningDays: 30,
    gracePeriod: 7,
    maxVersions: 3,
  },
  [SecretType.DATABASE_PASSWORD]: {
    autoRotate: true,
    rotationInterval: 180, // 6 months
    warningDays: 60,
    gracePeriod: 14,
    maxVersions: 2,
  },
  [SecretType.REDIS_PASSWORD]: {
    autoRotate: true,
    rotationInterval: 180, // 6 months
    warningDays: 60,
    gracePeriod: 14,
    maxVersions: 2,
  },
  [SecretType.API_KEYS]: {
    autoRotate: true,
    rotationInterval: 365, // 1 year
    warningDays: 90,
    gracePeriod: 30,
    maxVersions: 5,
  },
  [SecretType.ENCRYPTION_KEYS]: {
    autoRotate: false, // Manual rotation only
    rotationInterval: 365,
    warningDays: 90,
    gracePeriod: 30,
    maxVersions: 3,
  },
};

// Type for Redis client
type RedisClient = ReturnType<typeof getRedisClient>;

// Secrets management service
export class SecretsManager {
  private redis: RedisClient;
  private rotationTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.redis = getRedisClient();
    this.startRotationTimer();
  }

  // Generate a new secret
  async generateSecret(type: SecretType, name: string, length: number = 32): Promise<string> {
    try {
      let secret: string;

      switch (type) {
        case SecretType.JWT_SECRET:
          secret = crypto.randomBytes(length).toString('base64');
          break;
        case SecretType.DATABASE_PASSWORD:
          secret = this.generateSecurePassword(length);
          break;
        case SecretType.REDIS_PASSWORD:
          secret = this.generateSecurePassword(length);
          break;
        case SecretType.API_KEYS:
          secret = crypto.randomBytes(length).toString('hex');
          break;
        case SecretType.ENCRYPTION_KEYS:
          secret = crypto.randomBytes(length).toString('base64');
          break;
        default:
          secret = crypto.randomBytes(length).toString('base64');
      }

      // Store secret metadata
      await this.storeSecretMetadata(type, name, secret);

      // Log secret generation
      await logSystemEvent({
        eventType: AuditEventType.CONFIGURATION_CHANGE,
        severity: AuditSeverity.HIGH,
        details: {
          action: 'secret_generated',
          secretType: type,
          secretName: name,
          version: await this.getNextVersion(type, name),
        },
      });

      return secret;
    } catch (error) {
      console.error('Failed to generate secret:', error);
      throw new Error(`Failed to generate ${type} secret`);
    }
  }

  // Rotate a secret
  async rotateSecret(type: SecretType, name: string, force: boolean = false): Promise<{
    oldSecret: string;
    newSecret: string;
    rotationTime: string;
  }> {
    try {
      // Check if rotation is needed
      const metadata = await this.getSecretMetadata(type, name);
      if (!metadata) {
        throw new Error(`Secret ${type}:${name} not found`);
      }

      if (!force && !this.shouldRotate(metadata)) {
        throw new Error(`Secret ${type}:${name} does not need rotation yet`);
      }

      // Generate new secret
      const newSecret = await this.generateSecret(type, name);

      // Get current secret
      const oldSecret = await this.getCurrentSecret(type, name);
      if (!oldSecret) {
        throw new Error(`Current secret ${type}:${name} not found`);
      }

      // Update secret in environment/system
      await this.updateSecretInSystem(type, name, newSecret);

      // Mark old secret as deprecated
      await this.deprecateSecret(type, name, metadata.version);

      // Log rotation
      await logSystemEvent({
        eventType: AuditEventType.CONFIGURATION_CHANGE,
        severity: AuditSeverity.HIGH,
        details: {
          action: 'secret_rotated',
          secretType: type,
          secretName: name,
          oldVersion: metadata.version,
          newVersion: metadata.version + 1,
          force,
        },
      });

      return {
        oldSecret,
        newSecret,
        rotationTime: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Failed to rotate secret:', error);
      throw new Error(`Failed to rotate ${type} secret: ${error}`);
    }
  }

  // Check if secret needs rotation
  shouldRotate(metadata: SecretMetadata): boolean {
    const now = new Date();
    const nextRotation = new Date(metadata.nextRotation);

    return now >= nextRotation;
  }

  // Get secrets that need rotation
  async getSecretsNeedingRotation(): Promise<SecretMetadata[]> {
    try {
      const allSecrets = await this.getAllSecretMetadata();
      const now = new Date();

      return allSecrets.filter(secret => {
        const nextRotation = new Date(secret.nextRotation);
        return now >= nextRotation;
      });
    } catch (error) {
      console.error('Failed to get secrets needing rotation:', error);
      return [];
    }
  }

  // Get secrets expiring soon
  async getSecretsExpiringSoon(days: number = 30): Promise<SecretMetadata[]> {
    try {
      const allSecrets = await this.getAllSecretMetadata();
      const now = new Date();
      const warningDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

      return allSecrets.filter(secret => {
        if (!secret.expiresAt) {return false;}
        const expiresAt = new Date(secret.expiresAt);
        return expiresAt <= warningDate && expiresAt > now;
      });
    } catch (error) {
      console.error('Failed to get secrets expiring soon:', error);
      return [];
    }
  }

  // Validate secret strength
  validateSecretStrength(secret: string, type: SecretType): {
    isValid: boolean;
    score: number;
    issues: string[];
  } {
    const issues: string[] = [];
    let score = 0;

    // Length check
    if (secret.length < 16) {
      issues.push('Secret is too short (minimum 16 characters)');
      score -= 2;
    } else if (secret.length >= 32) {
      score += 2;
    } else {
      score += 1;
    }

    // Character variety check
    const hasLower = /[a-z]/.test(secret);
    const hasUpper = /[A-Z]/.test(secret);
    const hasNumbers = /\d/.test(secret);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(secret);

    if (hasLower) {score += 1;}
    if (hasUpper) {score += 1;}
    if (hasNumbers) {score += 1;}
    if (hasSpecial) {score += 1;}

    if (!hasLower || !hasUpper || !hasNumbers || !hasSpecial) {
      issues.push('Secret should contain lowercase, uppercase, numbers, and special characters');
    }

    // Entropy check
    const entropy = this.calculateEntropy(secret);
    if (entropy < 3.5) {
      issues.push('Secret has low entropy (too predictable)');
      score -= 2;
    } else if (entropy >= 4.5) {
      score += 2;
    } else {
      score += 1;
    }

    // Type-specific checks
    switch (type) {
      case SecretType.JWT_SECRET:
        if (secret.length < 32) {
          issues.push('JWT secrets should be at least 32 characters long');
          score -= 1;
        }
        break;
      case SecretType.DATABASE_PASSWORD:
        if (secret.includes('password') || secret.includes('admin')) {
          issues.push('Database password should not contain common words');
          score -= 1;
        }
        break;
    }

    const isValid = score >= 3 && issues.length === 0;

    return {
      isValid,
      score: Math.max(0, score),
      issues,
    };
  }

  // Emergency secret rotation
  async emergencyRotateAll(): Promise<{
    rotated: string[];
    failed: string[];
  }> {
    const rotated: string[] = [];
    const failed: string[] = [];

    try {
      const allSecrets = await this.getAllSecretMetadata();

      for (const secret of allSecrets) {
        try {
          await this.rotateSecret(secret.type, secret.name, true);
          rotated.push(`${secret.type}:${secret.name}`);
        } catch (error) {
          failed.push(`${secret.type}:${secret.name}`);
          console.error(`Failed to emergency rotate ${secret.type}:${secret.name}:`, error);
        }
      }

      // Log emergency rotation
      await logSystemEvent({
        eventType: AuditEventType.CONFIGURATION_CHANGE,
        severity: AuditSeverity.CRITICAL,
        details: {
          action: 'emergency_secret_rotation',
          rotatedCount: rotated.length,
          failedCount: failed.length,
          rotated,
          failed,
        },
      });

    } catch (error) {
      console.error('Emergency rotation failed:', error);
    }

    return { rotated, failed };
  }

  // Private methods

  private generateSecurePassword(length: number): string {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
    let password = '';

    // Ensure at least one character from each category
    password += charset[Math.floor(Math.random() * 26)]; // lowercase
    password += charset[26 + Math.floor(Math.random() * 26)]; // uppercase
    password += charset[52 + Math.floor(Math.random() * 10)]; // numbers
    password += charset[62 + Math.floor(Math.random() * 32)]; // special chars

    // Fill the rest randomly
    for (let i = 4; i < length; i++) {
      password += charset[Math.floor(Math.random() * charset.length)];
    }

    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  private calculateEntropy(secret: string): number {
    const charCount: { [key: string]: number } = {};

    for (const char of secret) {
      charCount[char] = (charCount[char] || 0) + 1;
    }

    let entropy = 0;
    const length = secret.length;

    for (const count of Object.values(charCount)) {
      const probability = count / length;
      entropy -= probability * Math.log2(probability);
    }

    return entropy;
  }

  private async storeSecretMetadata(type: SecretType, name: string, secret: string): Promise<void> {
    const metadata: SecretMetadata = {
      id: crypto.randomUUID(),
      type,
      name,
      version: await this.getNextVersion(type, name),
      createdAt: new Date().toISOString(),
      lastRotated: new Date().toISOString(),
      nextRotation: this.calculateNextRotation(type),
      status: 'active',
      tags: [type, 'auto-generated'],
    };

    // Store in Redis for quick access
    const key = `secret:${type}:${name}`;
    await this.redis.setex(key, 24 * 60 * 60, JSON.stringify(metadata));

    // Store in database for persistence
    await query(
      `INSERT INTO secret_metadata (
        id, type, name, version, created_at, last_rotated, next_rotation, status, tags
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (type, name) DO UPDATE SET
        version = EXCLUDED.version,
        last_rotated = EXCLUDED.last_rotated,
        next_rotation = EXCLUDED.next_rotation,
        status = EXCLUDED.status,
        tags = EXCLUDED.tags`,
      [
        metadata.id,
metadata.type,
metadata.name,
metadata.version,
        metadata.createdAt,
metadata.lastRotated,
metadata.nextRotation,
        metadata.status,
JSON.stringify(metadata.tags),
      ],
    );
  }

  private async getNextVersion(type: SecretType, name: string): Promise<number> {
    const result = await query(
      'SELECT MAX(version) as max_version FROM secret_metadata WHERE type = $1 AND name = $2',
      [type, name],
    );

    return (result.rows[0]?.max_version || 0) + 1;
  }

  private calculateNextRotation(type: SecretType): string {
    const config = DEFAULT_ROTATION_CONFIG[type];
    const nextRotation = new Date();
    nextRotation.setDate(nextRotation.getDate() + config.rotationInterval);
    return nextRotation.toISOString();
  }

  private async getSecretMetadata(type: SecretType, name: string): Promise<SecretMetadata | null> {
    // Try Redis first
    const key = `secret:${type}:${name}`;
    const cached = await this.redis.get(key);
    if (cached) {
      return JSON.parse(cached);
    }

    // Fall back to database
    const result = await query(
      'SELECT * FROM secret_metadata WHERE type = $1 AND name = $2 ORDER BY version DESC LIMIT 1',
      [type, name],
    );

    if (result.rows.length === 0) {return null;}

    const metadata = result.rows[0];
    return {
      id: metadata.id,
      type: metadata.type,
      name: metadata.name,
      version: metadata.version,
      createdAt: metadata.created_at,
      expiresAt: metadata.expires_at,
      lastRotated: metadata.last_rotated,
      nextRotation: metadata.next_rotation,
      status: metadata.status,
      tags: metadata.tags ? JSON.parse(metadata.tags) : [],
    };
  }

  private async getAllSecretMetadata(): Promise<SecretMetadata[]> {
    const result = await query(
      'SELECT * FROM secret_metadata ORDER BY type, name, version DESC',
    );

    return result.rows.map(row => ({
      id: row.id,
      type: row.type,
      name: row.name,
      version: row.version,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      lastRotated: row.last_rotated,
      nextRotation: row.next_rotation,
      status: row.status,
      tags: row.tags ? JSON.parse(row.tags) : [],
    }));
  }

  private async getCurrentSecret(type: SecretType, name: string): Promise<string | null> {
    // In a real implementation, this would get the secret from the system
    // For now, we'll return a placeholder
    return process.env[type] || null;
  }

  private async updateSecretInSystem(type: SecretType, name: string, newSecret: string): Promise<void> {
    // In a real implementation, this would update the secret in the system
    // For now, we'll just log it
    console.log(`[SECRETS] Updated ${type}:${name} in system`);

    // Update environment variable (in production, this would be more sophisticated)
    process.env[type] = newSecret;
  }

  private async deprecateSecret(type: SecretType, name: string, version: number): Promise<void> {
    await query(
      'UPDATE secret_metadata SET status = $1 WHERE type = $2 AND name = $3 AND version = $4',
      ['deprecated', type, name, version],
    );
  }

  private startRotationTimer(): void {
    // Check for secrets needing rotation every hour
    this.rotationTimer = setInterval(async () => {
      try {
        const secretsNeedingRotation = await this.getSecretsNeedingRotation();

        for (const secret of secretsNeedingRotation) {
          try {
            await this.rotateSecret(secret.type, secret.name);
            console.log(`[SECRETS] Auto-rotated ${secret.type}:${secret.name}`);
          } catch (error) {
            console.error(`[SECRETS] Failed to auto-rotate ${secret.type}:${secret.name}:`, error);
          }
        }
      } catch (error) {
        console.error('[SECRETS] Rotation check failed:', error);
      }
    }, 60 * 60 * 1000); // 1 hour
  }

  // Cleanup
  destroy(): void {
    if (this.rotationTimer) {
      clearInterval(this.rotationTimer);
    }
  }
}

// Singleton instance
export const secretsManager = new SecretsManager();

// Convenience functions
export const generateSecret = (type: SecretType, name: string, length?: number): Promise<string> => secretsManager.generateSecret(type, name, length);

export const rotateSecret = (type: SecretType, name: string, force?: boolean): Promise<{
  oldSecret: string;
  newSecret: string;
  rotationTime: string;
}> => secretsManager.rotateSecret(type, name, force);

export const getSecretsNeedingRotation = (): Promise<SecretMetadata[]> => secretsManager.getSecretsNeedingRotation();

export const emergencyRotateAll = (): Promise<{
  rotated: string[];
  failed: string[];
}> => secretsManager.emergencyRotateAll();

// Cleanup on process exit
process.on('exit', () => {
  secretsManager.destroy();
});

process.on('SIGINT', () => {
  secretsManager.destroy();
  process.exit(0);
});

process.on('SIGTERM', () => {
  secretsManager.destroy();
  process.exit(0);
});
