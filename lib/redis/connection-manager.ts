import Redis, { Cluster } from 'ioredis';
import { AuditEventType, AuditSeverity } from '@/lib/audit-logging';
import { logSystemEvent } from '@/lib/audit-logging';

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

// Default Redis configuration
const DEFAULT_REDIS_CONFIG: RedisConnectionConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
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
  autoResendUnfulfilledCommands: true
};

// Redis connection manager
export class RedisConnectionManager {
  private static instance: RedisConnectionManager;
  private redisClient: Redis | null = null;
  private clusterClient: Cluster | null = null;
  private connectionState: ConnectionState = ConnectionState.DISCONNECTED;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private reconnectDelay: number = 1000;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private isProduction: boolean;
  private config: RedisConnectionConfig;
  private clusterConfig?: RedisClusterConfig;

  private constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
    this.config = { ...DEFAULT_REDIS_CONFIG };
    this.startHealthCheck();
  }

  static getInstance(): RedisConnectionManager {
    if (!RedisConnectionManager.instance) {
      RedisConnectionManager.instance = new RedisConnectionManager();
    }
    return RedisConnectionManager.instance;
  }

  // Initialize Redis connection
  async initialize(config?: Partial<RedisConnectionConfig>, clusterConfig?: RedisClusterConfig): Promise<void> {
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
      
      await logSystemEvent(
        AuditEventType.CONFIGURATION_CHANGE,
        AuditSeverity.LOW,
        'Redis connection initialized successfully',
        { config: this.config, clusterMode: !!clusterConfig }
      );
    } catch (error) {
      this.connectionState = ConnectionState.ERROR;
      await logSystemEvent(
        AuditEventType.CONFIGURATION_CHANGE,
        AuditSeverity.HIGH,
        'Failed to initialize Redis connection',
        { error: error instanceof Error ? error.message : String(error) }
      );
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
      ...this.clusterConfig.clusterOptions
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
    if (!client) return;

    client.on('error', this.handleError.bind(this));
    client.on('close', this.handleClose.bind(this));
    client.on('reconnecting', this.handleReconnecting.bind(this));
    client.on('connect', this.handleConnect.bind(this));
    client.on('ready', this.handleReady.bind(this));
  }

  // Get Redis client (standalone or cluster)
  getClient(): Redis | Cluster | null {
    return this.clusterClient || this.redisClient;
  }

  // Execute Redis command with retry logic
  async executeCommand<T>(
    command: string,
    args: any[],
    retries: number = 3
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
  private isRetryableError(error: any): boolean {
    if (!error) return false;

    const errorMessage = error.message || String(error);
    const retryableErrors = [
      'ECONNREFUSED',
      'ECONNRESET',
      'ETIMEDOUT',
      'ENOTFOUND',
      'MOVED',
      'ASK',
      'TRYAGAIN',
      'LOADING',
      'BUSY'
    ];

    return retryableErrors.some(retryable =>
      errorMessage.includes(retryable) ||
      error.code === retryable
    );
  }

  // Get retry delay with exponential backoff
  private getRetryDelay(): number {
    return Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
  }

  // Delay utility
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Event handlers
  private async handleError(error: Error): Promise<void> {
    this.connectionState = ConnectionState.ERROR;
    console.error('Redis connection error:', error);

    await logSystemEvent(
      AuditEventType.SYSTEM_ERROR,
      AuditSeverity.MEDIUM,
      {
        action: 'redis_connection_error',
        error: error.message,
        connectionState: this.connectionState
      }
    );

    // Attempt reconnection if not in production
    if (!this.isProduction && this.reconnectAttempts < this.maxReconnectAttempts) {
      await this.attemptReconnection();
    }
  }

  private async handleClose(): Promise<void> {
    this.connectionState = ConnectionState.DISCONNECTED;
    console.warn('Redis connection closed');

    await logSystemEvent(
      AuditEventType.SYSTEM_ERROR,
      AuditSeverity.LOW,
      {
        action: 'redis_connection_closed',
        connectionState: this.connectionState
      }
    );
  }

  private async handleReconnecting(): Promise<void> {
    this.connectionState = ConnectionState.RECONNECTING;
    this.reconnectAttempts++;
    console.log(`Redis reconnecting... (attempt ${this.reconnectAttempts})`);

    await logSystemEvent(
      AuditEventType.SYSTEM_ERROR,
      AuditSeverity.LOW,
      {
        action: 'redis_reconnecting',
        attempt: this.reconnectAttempts,
        connectionState: this.connectionState
      }
    );
  }

  private async handleConnect(): Promise<void> {
    this.connectionState = ConnectionState.CONNECTING;
    console.log('Redis connecting...');
  }

  private async handleReady(): Promise<void> {
    this.connectionState = ConnectionState.CONNECTED;
    this.reconnectAttempts = 0;
    console.log('Redis connection ready');

    await logSystemEvent(
      AuditEventType.CONFIGURATION_CHANGE,
      AuditSeverity.LOW,
      {
        action: 'redis_connection_ready',
        connectionState: this.connectionState
      }
    );
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
        setTimeout(() => this.attemptReconnection(), delay);
      } else {
        console.error('Max reconnection attempts reached');
        this.connectionState = ConnectionState.ERROR;
      }
    }
  }

  // Health check
  private startHealthCheck(): void {
    this.healthCheckInterval = setInterval(async () => {
      try {
        const client = this.getClient();
        if (client && this.connectionState === ConnectionState.CONNECTED) {
          await client.ping();
        }
      } catch (error) {
        console.warn('Redis health check failed:', error);
        this.connectionState = ConnectionState.ERROR;
      }
    }, 30000); // Every 30 seconds
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
      isHealthy: this.connectionState === ConnectionState.CONNECTED
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
    this.shutdown();
  }
}

// Singleton instance
export const redisConnectionManager = RedisConnectionManager.getInstance();

// Convenience functions
export const getRedisClient = (): Redis | Cluster | null => {
  return redisConnectionManager.getClient();
};

export const executeRedisCommand = <T>(
  command: string,
  args: any[],
  retries?: number
): Promise<T> => {
  return redisConnectionManager.executeCommand(command, args, retries);
};

export const getRedisConnectionStatus = () => {
  return redisConnectionManager.getConnectionStatus();
};

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
