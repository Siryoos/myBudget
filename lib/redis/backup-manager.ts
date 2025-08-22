import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile, writeFile, mkdir, readdir, unlink } from 'fs/promises';
import { existsSync, statSync } from 'fs';
import path from 'path';
import Redis from 'ioredis';
import { auditLogger, logSystemEvent, AuditEventType, AuditSeverity } from '../audit-logging';
import { redisConnectionManager } from './connection-manager';

const execAsync = promisify(exec);

// Backup types
export enum BackupType {
  FULL = 'full',
  INCREMENTAL = 'incremental',
  DIFFERENTIAL = 'differential',
  SNAPSHOT = 'snapshot'
}

// Backup status
export enum BackupStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  EXPIRED = 'expired'
}

// Backup configuration
export interface BackupConfig {
  enabled: boolean;
  backupDirectory: string;
  retentionDays: number;
  maxBackups: number;
  compression: boolean;
  encryption: boolean;
  encryptionKey?: string;
  schedule: {
    full: string; // cron expression
    incremental: string;
    differential: string;
  };
  autoCleanup: boolean;
  verifyBackups: boolean;
  parallelBackups: number;
}

// Backup metadata
export interface BackupMetadata {
  id: string;
  type: BackupType;
  status: BackupStatus;
  filename: string;
  filePath: string;
  sizeBytes: number;
  checksum: string;
  createdAt: string;
  completedAt?: string;
  expiresAt: string;
  redisVersion: string;
  databaseCount: number;
  keyCount: number;
  compressionRatio?: number;
  encryptionEnabled: boolean;
  errorMessage?: string;
  tags: string[];
}

// Default backup configuration
const DEFAULT_BACKUP_CONFIG: BackupConfig = {
  enabled: process.env.REDIS_BACKUP_ENABLED !== 'false',
  backupDirectory: process.env.REDIS_BACKUP_DIR || './redis-backups',
  retentionDays: parseInt(process.env.REDIS_BACKUP_RETENTION_DAYS || '30'),
  maxBackups: parseInt(process.env.REDIS_BACKUP_MAX_COUNT || '100'),
  compression: process.env.REDIS_BACKUP_COMPRESSION !== 'false',
  encryption: process.env.REDIS_BACKUP_ENCRYPTION === 'true',
  encryptionKey: process.env.REDIS_BACKUP_ENCRYPTION_KEY,
  schedule: {
    full: process.env.REDIS_BACKUP_FULL_SCHEDULE || '0 2 * * 0', // Weekly at 2 AM Sunday
    incremental: process.env.REDIS_BACKUP_INCREMENTAL_SCHEDULE || '0 2 * * *', // Daily at 2 AM
    differential: process.env.REDIS_BACKUP_DIFFERENTIAL_SCHEDULE || '0 2 * * 0' // Weekly at 2 AM Sunday
  },
  autoCleanup: process.env.REDIS_BACKUP_AUTO_CLEANUP !== 'false',
  verifyBackups: process.env.REDIS_BACKUP_VERIFY !== 'false',
  parallelBackups: parseInt(process.env.REDIS_BACKUP_PARALLEL || '3')
};

// Redis backup manager
export class RedisBackupManager {
  private static instance: RedisBackupManager;
  private config: BackupConfig;
  private backupTimer: NodeJS.Timeout | null = null;
  private isBackingUp: boolean = false;
  private activeBackups: Map<string, BackupMetadata> = new Map();
  private redis: Redis | null = null;

  private constructor() {
    this.config = DEFAULT_BACKUP_CONFIG;
    this.initializeBackupDirectory();
    this.startScheduledBackups();
  }

  static getInstance(): RedisBackupManager {
    if (!RedisBackupManager.instance) {
      RedisBackupManager.instance = new RedisBackupManager();
    }
    return RedisBackupManager.instance;
  }

  // Initialize backup directory
  private async initializeBackupDirectory(): Promise<void> {
    try {
      if (!existsSync(this.config.backupDirectory)) {
        await mkdir(this.config.backupDirectory, { recursive: true });
        console.log(`Created backup directory: ${this.config.backupDirectory}`);
      }
    } catch (error) {
      console.error('Failed to create backup directory:', error);
    }
  }

  // Create a new backup
  async createBackup(type: BackupType = BackupType.FULL): Promise<BackupMetadata> {
    if (this.isBackingUp) {
      throw new Error('Backup already in progress');
    }

    this.isBackingUp = true;
    const backupId = crypto.randomUUID();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `redis-backup-${type}-${timestamp}.rdb`;
    const filePath = path.join(this.config.backupDirectory, filename);

    const metadata: BackupMetadata = {
      id: backupId,
      type,
      status: BackupStatus.PENDING,
      filename,
      filePath,
      sizeBytes: 0,
      checksum: '',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + this.config.retentionDays * 24 * 60 * 60 * 1000).toISOString(),
      redisVersion: '',
      databaseCount: 0,
      keyCount: 0,
      encryptionEnabled: this.config.encryption,
      tags: [type, 'automated']
    };

    try {
      // Update status
      metadata.status = BackupStatus.IN_PROGRESS;
      this.activeBackups.set(backupId, metadata);

      // Get Redis client
      this.redis = redisConnectionManager.getClient() as Redis;
      if (!this.redis) {
        throw new Error('Redis client not available');
      }

      // Get Redis info
      const info = await this.redis.info();
      metadata.redisVersion = this.extractRedisVersion(info);
      metadata.databaseCount = this.extractDatabaseCount(info);
      metadata.keyCount = this.extractKeyCount(info);

      // Create backup based on type
      switch (type) {
        case BackupType.FULL:
          await this.createFullBackup(metadata);
          break;
        case BackupType.INCREMENTAL:
          await this.createIncrementalBackup(metadata);
          break;
        case BackupType.DIFFERENTIAL:
          await this.createDifferentialBackup(metadata);
          break;
        case BackupType.SNAPSHOT:
          await this.createSnapshotBackup(metadata);
          break;
        default:
          throw new Error(`Unknown backup type: ${type}`);
      }

      // Verify backup if enabled
      if (this.config.verifyBackups) {
        await this.verifyBackup(metadata);
      }

      // Update metadata
      metadata.status = BackupStatus.COMPLETED;
      metadata.completedAt = new Date().toISOString();
      metadata.sizeBytes = statSync(filePath).size;
      metadata.checksum = await this.calculateChecksum(filePath);

      // Store metadata
      await this.storeBackupMetadata(metadata);

      // Log successful backup
      await logSystemEvent(
        AuditEventType.BACKUP_CREATED,
        AuditSeverity.LOW,
        {
          action: 'redis_backup_created',
          backupId: metadata.id,
          type: metadata.type,
          filename: metadata.filename,
          sizeBytes: metadata.sizeBytes,
          checksum: metadata.checksum
        }
      );

      console.log(`Backup completed successfully: ${filename}`);

    } catch (error) {
      metadata.status = BackupStatus.FAILED;
      metadata.errorMessage = error instanceof Error ? error.message : String(error);
      
      await logSystemEvent(
        AuditEventType.SYSTEM_ERROR,
        AuditSeverity.MEDIUM,
        {
          action: 'redis_backup_failed',
          backupId: metadata.id,
          type: metadata.type,
          error: metadata.errorMessage
        }
      );

      console.error(`Backup failed: ${metadata.errorMessage}`);
    } finally {
      this.activeBackups.delete(backupId);
      this.isBackingUp = false;
    }

    return metadata;
  }

  // Create full backup
  private async createFullBackup(metadata: BackupMetadata): Promise<void> {
    // Use Redis SAVE command for full backup
    await this.redis!.save();
    
    // Copy the dump.rdb file
    const dumpPath = await this.getRedisDumpPath();
    if (dumpPath && existsSync(dumpPath)) {
      await this.copyFile(dumpPath, metadata.filePath);
    } else {
      throw new Error('Redis dump file not found');
    }
  }

  // Create incremental backup
  private async createIncrementalBackup(metadata: BackupMetadata): Promise<void> {
    // For incremental backup, we'll use Redis BGSAVE and track changes
    await this.redis!.bgsave();
    
    // Wait for background save to complete
    let saveInProgress = true;
    while (saveInProgress) {
      const info = await this.redis!.info('persistence');
      saveInProgress = info.includes('rdb_bgsave_in_progress:1');
      if (saveInProgress) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    const dumpPath = await this.getRedisDumpPath();
    if (dumpPath && existsSync(dumpPath)) {
      await this.copyFile(dumpPath, metadata.filePath);
    } else {
      throw new Error('Redis dump file not found');
    }
  }

  // Create differential backup
  private async createDifferentialBackup(metadata: BackupMetadata): Promise<void> {
    // Differential backup tracks changes since last full backup
    // This is a simplified implementation
    await this.createIncrementalBackup(metadata);
  }

  // Create snapshot backup
  private async createSnapshotBackup(metadata: BackupMetadata): Promise<void> {
    // Snapshot backup using Redis BGSAVE
    await this.redis!.bgsave();
    
    // Wait for completion
    let saveInProgress = true;
    while (saveInProgress) {
      const info = await this.redis!.info('persistence');
      saveInProgress = info.includes('rdb_bgsave_in_progress:1');
      if (saveInProgress) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    const dumpPath = await this.getRedisDumpPath();
    if (dumpPath && existsSync(dumpPath)) {
      await this.copyFile(dumpPath, metadata.filePath);
    } else {
      throw new Error('Redis dump file not found');
    }
  }

  // Get Redis dump file path
  private async getRedisDumpPath(): Promise<string | null> {
    try {
      const config = await this.redis!.config('GET', 'dir');
      const dir = Array.isArray(config) && config.length > 1 ? config[1] : null;
      if (!dir || typeof dir !== 'string') {
        throw new Error('Invalid Redis config response');
      }
      return path.join(dir, 'dump.rdb');
    } catch (error) {
      console.warn('Failed to get Redis dump path:', error);
      // Fallback to common locations
      const commonPaths = [
        '/var/lib/redis/dump.rdb',
        '/var/redis/dump.rdb',
        './dump.rdb'
      ];
      
      for (const commonPath of commonPaths) {
        if (existsSync(commonPath)) {
          return commonPath;
        }
      }
      
      return null;
    }
  }

  // Copy file with compression/encryption
  private async copyFile(source: string, destination: string): Promise<void> {
    try {
      if (this.config.compression) {
        // Use gzip compression
        await execAsync(`gzip -c "${source}" > "${destination}.gz"`);
        // Update metadata
        const metadata = Array.from(this.activeBackups.values()).find(m => m.filePath === destination);
        if (metadata) {
          metadata.filePath = `${destination}.gz`;
          metadata.filename = `${metadata.filename}.gz`;
        }
      } else {
        // Direct copy
        await execAsync(`cp "${source}" "${destination}"`);
      }

      // Apply encryption if enabled
      if (this.config.encryption && this.config.encryptionKey) {
        await this.encryptFile(destination);
      }

    } catch (error) {
      throw new Error(`Failed to copy file: ${error}`);
    }
  }

  // Encrypt file
  private async encryptFile(filePath: string): Promise<void> {
    try {
      const encryptedPath = `${filePath}.enc`;
      await execAsync(`openssl enc -aes-256-cbc -salt -in "${filePath}" -out "${encryptedPath}" -k "${this.config.encryptionKey}"`);
      
      // Remove original file
      await unlink(filePath);
      
      // Update metadata
      const metadata = Array.from(this.activeBackups.values()).find(m => m.filePath === filePath);
      if (metadata) {
        metadata.filePath = encryptedPath;
        metadata.filename = `${metadata.filename}.enc`;
      }
    } catch (error) {
      throw new Error(`Failed to encrypt file: ${error}`);
    }
  }

  // Verify backup integrity
  private async verifyBackup(metadata: BackupMetadata): Promise<boolean> {
    try {
      // Check file exists and has size
      if (!existsSync(metadata.filePath)) {
        throw new Error('Backup file not found');
      }

      const stats = statSync(metadata.filePath);
      if (stats.size === 0) {
        throw new Error('Backup file is empty');
      }

      // Verify checksum
      const calculatedChecksum = await this.calculateChecksum(metadata.filePath);
      if (metadata.checksum && calculatedChecksum !== metadata.checksum) {
        throw new Error('Checksum verification failed');
      }

      // Test file readability
      const testContent = await readFile(metadata.filePath, { encoding: null });
      if (testContent.length === 0) {
        throw new Error('Backup file is not readable');
      }

      console.log(`Backup verification successful: ${metadata.filename}`);
      return true;

    } catch (error) {
      console.error(`Backup verification failed: ${error}`);
      return false;
    }
  }

  // Calculate file checksum
  private async calculateChecksum(filePath: string): Promise<string> {
    try {
      const { stdout } = await execAsync(`sha256sum "${filePath}"`);
      return stdout.split(' ')[0];
    } catch (error) {
      console.warn('Failed to calculate checksum:', error);
      return '';
    }
  }

  // Restore from backup
  async restoreFromBackup(backupId: string, targetRedis?: Redis): Promise<boolean> {
    try {
      const metadata = await this.getBackupMetadata(backupId);
      if (!metadata) {
        throw new Error(`Backup ${backupId} not found`);
      }

      if (metadata.status !== BackupStatus.COMPLETED) {
        throw new Error(`Backup ${backupId} is not in completed status`);
      }

      if (!existsSync(metadata.filePath)) {
        throw new Error(`Backup file not found: ${metadata.filePath}`);
      }

      const redis = targetRedis || this.redis;
      if (!redis) {
        throw new Error('Redis client not available');
      }

      console.log(`Starting restore from backup: ${metadata.filename}`);

      // Stop Redis if possible (this would require external coordination)
      // For now, we'll assume Redis is stopped or we're doing a live restore

      // Copy backup file to Redis data directory
      const dumpPath = await this.getRedisDumpPath();
      if (!dumpPath) {
        throw new Error('Cannot determine Redis data directory');
      }

      // Decrypt if needed
      let sourceFile = metadata.filePath;
      if (metadata.filename.endsWith('.enc')) {
        sourceFile = await this.decryptFile(metadata.filePath);
      }

      // Decompress if needed
      if (metadata.filename.endsWith('.gz')) {
        sourceFile = await this.decompressFile(sourceFile);
      }

      // Copy to Redis data directory
      await execAsync(`cp "${sourceFile}" "${dumpPath}"`);

      // Log restore operation
      await logSystemEvent(
        AuditEventType.CONFIGURATION_CHANGE,
        AuditSeverity.HIGH,
        {
          action: 'redis_backup_restored',
          backupId: metadata.id,
          filename: metadata.filename,
          targetPath: dumpPath
        }
      );

      console.log(`Restore completed successfully from: ${metadata.filename}`);
      return true;

    } catch (error) {
      console.error(`Restore failed: ${error}`);
      
      await logSystemEvent(
        AuditEventType.SYSTEM_ERROR,
        AuditSeverity.HIGH,
        {
          action: 'redis_backup_restore_failed',
          backupId,
          error: error instanceof Error ? error.message : String(error)
        }
      );

      return false;
    }
  }

  // Decrypt file
  private async decryptFile(filePath: string): Promise<string> {
    try {
      const decryptedPath = filePath.replace('.enc', '');
      await execAsync(`openssl enc -aes-256-cbc -d -in "${filePath}" -out "${decryptedPath}" -k "${this.config.encryptionKey}"`);
      return decryptedPath;
    } catch (error) {
      throw new Error(`Failed to decrypt file: ${error}`);
    }
  }

  // Decompress file
  private async decompressFile(filePath: string): Promise<string> {
    try {
      const decompressedPath = filePath.replace('.gz', '');
      await execAsync(`gunzip -c "${filePath}" > "${decompressedPath}"`);
      return decompressedPath;
    } catch (error) {
      throw new Error(`Failed to decompress file: ${error}`);
    }
  }

  // List all backups
  async listBackups(): Promise<BackupMetadata[]> {
    try {
      const files = await readdir(this.config.backupDirectory);
      const backups: BackupMetadata[] = [];

      for (const file of files) {
        if (file.endsWith('.rdb') || file.endsWith('.gz') || file.endsWith('.enc')) {
          const filePath = path.join(this.config.backupDirectory, file);
          const stats = statSync(filePath);
          
          const backup: BackupMetadata = {
            id: crypto.randomUUID(),
            type: this.determineBackupType(file),
            status: BackupStatus.COMPLETED,
            filename: file,
            filePath,
            sizeBytes: stats.size,
            checksum: '',
            createdAt: new Date(stats.birthtime).toISOString(),
            expiresAt: new Date(stats.birthtime.getTime() + this.config.retentionDays * 24 * 60 * 60 * 1000).toISOString(),
            redisVersion: '',
            databaseCount: 0,
            keyCount: 0,
            encryptionEnabled: file.endsWith('.enc'),
            tags: ['discovered']
          };

          backups.push(backup);
        }
      }

      return backups.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    } catch (error) {
      console.error('Failed to list backups:', error);
      return [];
    }
  }

  // Determine backup type from filename
  private determineBackupType(filename: string): BackupType {
    if (filename.includes('full')) return BackupType.FULL;
    if (filename.includes('incremental')) return BackupType.INCREMENTAL;
    if (filename.includes('differential')) return BackupType.DIFFERENTIAL;
    if (filename.includes('snapshot')) return BackupType.SNAPSHOT;
    return BackupType.FULL; // Default
  }

  // Clean up expired backups
  async cleanupExpiredBackups(): Promise<number> {
    try {
      const backups = await this.listBackups();
      const now = new Date();
      let cleanedCount = 0;

      for (const backup of backups) {
        const expiresAt = new Date(backup.expiresAt);
        if (expiresAt < now) {
          try {
            await unlink(backup.filePath);
            cleanedCount++;
            console.log(`Cleaned up expired backup: ${backup.filename}`);
          } catch (error) {
            console.warn(`Failed to clean up backup ${backup.filename}:`, error);
          }
        }
      }

      if (cleanedCount > 0) {
        await logSystemEvent(
          AuditEventType.CONFIGURATION_CHANGE,
          AuditSeverity.LOW,
          {
            action: 'redis_backup_cleanup',
            cleanedCount,
            totalBackups: backups.length
          }
        );
      }

      return cleanedCount;

    } catch (error) {
      console.error('Failed to cleanup expired backups:', error);
      return 0;
    }
  }

  // Start scheduled backups
  private startScheduledBackups(): void {
    if (!this.config.enabled) return;

    // This is a simplified scheduler - in production, use a proper cron library
    setInterval(async () => {
      try {
        await this.createBackup(BackupType.INCREMENTAL);
      } catch (error) {
        console.error('Scheduled incremental backup failed:', error);
      }
    }, 24 * 60 * 60 * 1000); // Daily

    setInterval(async () => {
      try {
        await this.createBackup(BackupType.FULL);
      } catch (error) {
        console.error('Scheduled full backup failed:', error);
      }
    }, 7 * 24 * 60 * 60 * 1000); // Weekly
  }

  // Store backup metadata
  private async storeBackupMetadata(metadata: BackupMetadata): Promise<void> {
    try {
      const metadataPath = path.join(this.config.backupDirectory, `${metadata.id}.json`);
      await writeFile(metadataPath, JSON.stringify(metadata, null, 2));
    } catch (error) {
      console.warn('Failed to store backup metadata:', error);
    }
  }

  // Get backup metadata
  private async getBackupMetadata(backupId: string): Promise<BackupMetadata | null> {
    try {
      const metadataPath = path.join(this.config.backupDirectory, `${backupId}.json`);
      if (existsSync(metadataPath)) {
        const content = await readFile(metadataPath, 'utf-8');
        return JSON.parse(content);
      }
    } catch (error) {
      console.warn('Failed to read backup metadata:', error);
    }
    return null;
  }

  // Utility methods
  private extractRedisVersion(info: string): string {
    const match = info.match(/redis_version:([^\r\n]+)/);
    return match ? match[1].trim() : 'unknown';
  }

  private extractDatabaseCount(info: string): number {
    const match = info.match(/db\d+:/g);
    return match ? match.length : 0;
  }

  private extractKeyCount(info: string): number {
    const match = info.match(/keys=(\d+)/g);
    if (!match) return 0;
    return match.reduce((sum, m) => {
      const keyMatch = m.match(/keys=(\d+)/);
      return sum + (keyMatch ? parseInt(keyMatch[1]) : 0);
    }, 0);
  }

  // Configuration methods
  updateConfig(newConfig: Partial<BackupConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  getConfig(): BackupConfig {
    return { ...this.config };
  }

  // Get backup statistics
  getBackupStats(): {
    totalBackups: number;
    totalSize: number;
    activeBackups: number;
    lastBackup?: string;
  } {
    const totalSize = Array.from(this.activeBackups.values())
      .reduce((sum, backup) => sum + backup.sizeBytes, 0);

    const lastBackup = Array.from(this.activeBackups.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

    return {
      totalBackups: this.activeBackups.size,
      totalSize,
      activeBackups: this.activeBackups.size,
      lastBackup: lastBackup?.createdAt
    };
  }

  // Cleanup
  destroy(): void {
    if (this.backupTimer) {
      clearInterval(this.backupTimer);
    }
  }
}

// Singleton instance
export const redisBackupManager = RedisBackupManager.getInstance();

// Convenience functions
export const createRedisBackup = (type?: BackupType): Promise<BackupMetadata> => {
  return redisBackupManager.createBackup(type);
};

export const restoreRedisBackup = (backupId: string, targetRedis?: Redis): Promise<boolean> => {
  return redisBackupManager.restoreFromBackup(backupId, targetRedis);
};

export const listRedisBackups = (): Promise<BackupMetadata[]> => {
  return redisBackupManager.listBackups();
};

export const cleanupExpiredRedisBackups = (): Promise<number> => {
  return redisBackupManager.cleanupExpiredBackups();
};

// Cleanup on process exit
process.on('exit', () => {
  redisBackupManager.destroy();
});

process.on('SIGINT', () => {
  redisBackupManager.destroy();
  process.exit(0);
});

process.on('SIGTERM', () => {
  redisBackupManager.destroy();
  process.exit(0);
});
