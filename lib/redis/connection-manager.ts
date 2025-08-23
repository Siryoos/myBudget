import Redis, { Cluster } from 'ioredis';

import { AuditEventType, AuditSeverity, logSystemEvent } from '@/lib/audit-logging';

// Connection state enum
enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  ERROR = 'error',
  RECONNECTING = 'reconnecting'
}

// Redis connection configuration
export interface RedisConnectionConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  retryDelayOnFailover?: number;
  maxRetriesPerRequest?: number;
  retryDelayOnClusterDown?: number;
  enableReadyCheck?: boolean;
  maxLoadingTimeout?: number;
  lazyConnect?: boolean;
  keepAlive?: number;
  family?: number;
  connectTimeout?: number;
  commandTimeout?: number;
  autoResubscribe?: boolean;
  autoResendUnfulfilledCommands?: boolean;
}

// Redis cluster configuration
export interface RedisClusterConfig {
  nodes: Array<{ host: string; port: number }>;
  redisOptions: Partial<RedisConnectionConfig>;
  clusterOptions: {
    scaleReads: 'master' | 'slave' | 'all';
    maxRedirections: number;
    retryDelayOnFailover: number;
    retryDelayOnClusterDown: number;
    enableOfflineQueue: boolean;
    enableReadyCheck: boolean;
    maxLoadingTimeout: number;
  };
}

// Redis error interface for better type safety
interface RedisError extends Error {
  code?: string;
  message: string;
}

// Default Redis configuration
const DEFAULT_REDIS_CONFIG: RedisConnectionConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0', 10),
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  retryDelayOnClusterDown: 300,
  enableReadyCheck: true,
  maxLoadingTimeout: 10000,
  lazyConnect: true,
  keepAlive: 30000,
  family: 4,
  connectTimeout: 10000,
  commandTimeout: 5000,
  autoResubscribe: true,
  autoResendUnfulfilledCommands: true,
};

// Redis connection manager
export class RedisConnectionManager {
  private redisClient: Redis | null = null;
  private clusterClient: Cluster | null = null;
  private connectionState: ConnectionState = ConnectionState.DISCONNECTED;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private reconnectDelay: number = 1000;
  private healthCheckInterval: ReturnType<typeof setInterval> | null = null;
  private isProduction: boolean;
  private config: RedisConnectionConfig;
  private clusterConfig?: RedisClusterConfig;

  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
    this.config = { ...DEFAULT_REDIS_CONFIG };
    this.startHealthCheck();
  }

  // Initialize Redis connection
  async initialize(
    config?: Partial<RedisConnectionConfig>,
    clusterConfig?: RedisClusterConfig,
  ): Promise<void> {
    try {
      this.config = { ...this.config, ...config };
      this.clusterConfig = clusterConfig;

      if (clusterConfig) {
        await this.initializeCluster();
      } else {
        await this.initializeStandalone();
      }

      this.setupEventHandlers();
      this.connectionState = ConnectionState.CONNECTED;

          await logSystemEvent({
      eventType: AuditEventType.CONFIGURATION_CHANGE,
      severity: AuditSeverity.LOW,
      details: {
        message: 'Redis connection initialized successfully',
        config: this.config,
        clusterMode: Boolean(clusterConfig),
      },
    });
    } catch (error) {
      this.connectionState = ConnectionState.ERROR;
      await logSystemEvent({
        eventType: AuditEventType.CONFIGURATION_CHANGE,
        severity: AuditSeverity.HIGH,
        details: {
          message: 'Failed to initialize Redis connection',
          error: error instanceof Error ? error.message : String(error),
        },
      });
      throw error;
    }
  }

  // Initialize standalone Redis connection
  private async initializeStandalone(): Promise<void> {
    this.redisClient = new Redis(this.config);
    await this.redisClient.ping();
  }

  // Initialize Redis cluster connection
  private async initializeCluster(): Promise<void> {
    if (!this.clusterConfig) {
      throw new Error('Cluster configuration is required for cluster mode');
    }

    this.clusterClient = new Cluster(this.clusterConfig.nodes, {
      redisOptions: this.clusterConfig.redisOptions,
      ...this.clusterConfig.clusterOptions,
    });

    this.clusterClient.on('error', (error: Error) => {
      console.error('Redis cluster error:', error);
      this.connectionState = ConnectionState.ERROR;
    });

    await this.clusterClient.ping();
  }

  // Setup event handlers
  private setupEventHandlers(): void {
    const client = this.getClient();
    if (!client) {return;}

    client.on('error', (error: Error) => {
      this.handleError(error).catch(console.error);
    });
    client.on('close', () => {
      this.handleClose().catch(console.error);
    });
    client.on('reconnecting', () => {
      this.handleReconnecting().catch(console.error);
    });
    client.on('connect', () => this.handleConnect());
    client.on('ready', () => {
      this.handleReady().catch(console.error);
    });
  }

  // Get Redis client (standalone or cluster)
  getClient(): Redis | Cluster | null {
    return this.clusterClient || this.redisClient;
  }

  // Execute Redis command with retry logic
  async executeCommand<T>(
    command: string,
    args: (string | number | Buffer)[],
    retries: number = 3,
  ): Promise<T> {
    const client = this.getClient();
    if (!client) {
      throw new Error('Redis client not available');
    }

    try {
      const result = await client.call(command, ...args);
      return result as T;
    } catch (error) {
      if (retries > 0 && this.isRetryableError(error)) {
        console.warn(`Redis command failed, retrying... (${retries} attempts left)`);
        await this.delay(this.getRetryDelay());
        return this.executeCommand(command, args, retries - 1);
      }

      throw error;
    }
  }

  // Check if error is retryable
  private isRetryableError(error: unknown): boolean {
    if (!error) {return false;}

    const redisError = error as RedisError;
    const errorMessage = redisError.message || String(error);
    const retryableErrors = [
      'ECONNREFUSED',
      'ECONNRESET',
      'ETIMEDOUT',
      'ENOTFOUND',
      'MOVED',
      'ASK',
      'TRYAGAIN',
      'LOADING',
      'BUSY',
    ];

    return retryableErrors.some(retryable =>
      errorMessage.includes(retryable) ||
      redisError.code === retryable,
    );
  }

  // Get retry delay with exponential backoff
  private getRetryDelay(): number {
    const maxDelay = 30000;
    return Math.min(1000 * Math.pow(2, this.reconnectAttempts), maxDelay);
  }

  // Delay utility
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => {
      setTimeout(resolve, ms);
    });
  }

  // Event handlers
  private async handleError(error: Error): Promise<void> {
    this.connectionState = ConnectionState.ERROR;
    console.error('Redis connection error:', error);

    await logSystemEvent({
      eventType: AuditEventType.SYSTEM_ERROR,
      severity: AuditSeverity.MEDIUM,
      details: {
        message: 'Redis connection error occurred',
        action: 'redis_connection_error',
        error: error.message,
        connectionState: this.connectionState,
      },
    });

    // Attempt reconnection if not in production
    if (!this.isProduction && this.reconnectAttempts < this.maxReconnectAttempts) {
      await this.attemptReconnection();
    }
  }

  private async handleClose(): Promise<void> {
    this.connectionState = ConnectionState.DISCONNECTED;
    console.warn('Redis connection closed');

    await logSystemEvent({
      eventType: AuditEventType.SYSTEM_ERROR,
      severity: AuditSeverity.LOW,
      details: {
        message: 'Redis connection closed',
        action: 'redis_connection_closed',
        connectionState: this.connectionState,
      },
    });
  }

  private async handleReconnecting(): Promise<void> {
    this.connectionState = ConnectionState.RECONNECTING;
    this.reconnectAttempts++;
    console.log(`Redis reconnecting... (attempt ${this.reconnectAttempts})`);

    await logSystemEvent({
      eventType: AuditEventType.SYSTEM_ERROR,
      severity: AuditSeverity.LOW,
      details: {
        message: 'Redis reconnecting',
        action: 'redis_reconnecting',
        attempt: this.reconnectAttempts,
        connectionState: this.connectionState,
      },
    });
  }

  private handleConnect(): void {
    this.connectionState = ConnectionState.CONNECTING;
    console.log('Redis connecting...');
  }

  private async handleReady(): Promise<void> {
    this.connectionState = ConnectionState.CONNECTED;
    this.reconnectAttempts = 0;
    console.log('Redis connection ready');

    await logSystemEvent({
      eventType: AuditEventType.CONFIGURATION_CHANGE,
      severity: AuditSeverity.LOW,
      details: {
        message: 'Redis connection ready',
        action: 'redis_connection_ready',
        connectionState: this.connectionState,
      },
    });
  }

  // Attempt reconnection
  private async attemptReconnection(): Promise<void> {
    try {
      console.log('Attempting Redis reconnection...');

      if (this.clusterConfig) {
        await this.initializeCluster();
      } else {
        await this.initializeStandalone();
      }

      this.setupEventHandlers();
      console.log('Redis reconnection successful');

    } catch (error) {
      console.error('Redis reconnection failed:', error);

      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        const delay = this.getRetryDelay();
        console.log(`Scheduling reconnection attempt in ${delay}ms`);
        setTimeout(() => {
          this.attemptReconnection().catch(console.error);
        }, delay);
      } else {
        console.error('Max reconnection attempts reached');
        this.connectionState = ConnectionState.ERROR;
      }
    }
  }

  // Health check
  private startHealthCheck(): void {
    const healthCheckIntervalMs = 30000; // Every 30 seconds
    this.healthCheckInterval = setInterval(() => {
      (async () => {
        try {
          const client = this.getClient();
          if (client && this.connectionState === ConnectionState.CONNECTED) {
            await client.ping();
          }
        } catch (error) {
          console.warn('Redis health check failed:', error);
          this.connectionState = ConnectionState.ERROR;
        }
      })().catch(console.error);
    }, healthCheckIntervalMs);
  }

  // Get connection status
  getConnectionStatus(): {
    state: ConnectionState;
    reconnectAttempts: number;
    isHealthy: boolean;
  } {
    return {
      state: this.connectionState,
      reconnectAttempts: this.reconnectAttempts,
      isHealthy: this.connectionState === ConnectionState.CONNECTED,
    };
  }

  // Graceful shutdown
  async shutdown(): Promise<void> {
    console.log('Shutting down Redis connection...');

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    const client = this.getClient();
    if (client) {
      await client.quit();
    }

    this.connectionState = ConnectionState.DISCONNECTED;
    console.log('Redis connection shut down');
  }

  // Cleanup
  destroy(): void {
    this.shutdown().catch(console.error);
  }

  // Static method to get instance
  static getInstance(): RedisConnectionManager {
    return new RedisConnectionManager();
  }
}

// Singleton instance
export const redisConnectionManager = RedisConnectionManager.getInstance();

// Convenience functions
export const getRedisClient = (): Redis | Cluster | null => redisConnectionManager.getClient();

export const executeRedisCommand = <T>(
  command: string,
  args: (string | number | Buffer)[],
  retries?: number,
): Promise<T> => redisConnectionManager.executeCommand(command, args, retries);

export const getRedisConnectionStatus = () => redisConnectionManager.getConnectionStatus();

// Cleanup on process exit
process.on('exit', () => {
  redisConnectionManager.destroy();
});

process.on('SIGINT', () => {
  redisConnectionManager.destroy();
  process.exit(0);
});

process.on('SIGTERM', () => {
  redisConnectionManager.destroy();
  process.exit(0);
});
