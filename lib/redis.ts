import Redis from 'ioredis';
import * as dotenv from 'dotenv';

dotenv.config();

// Validate Redis configuration
const validateRedisConfig = (): void => {
  if (!process.env.REDIS_HOST) {
    throw new Error('REDIS_HOST environment variable is required');
  }
  
  const port = parseInt(process.env.REDIS_PORT || '6379');
  if (isNaN(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid Redis port: ${process.env.REDIS_PORT}`);
  }
};

// Validate configuration before creating client
validateRedisConfig();

// Create Redis client
const redis = new Redis({
  host: process.env.REDIS_HOST!,
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  keepAlive: 30000,
  connectTimeout: 10000,
  commandTimeout: 5000,
});

// Handle Redis connection events
redis.on('connect', () => {
  console.log('Connected to Redis');
});

redis.on('error', (err) => {
  console.error('Redis connection error:', err);
});

redis.on('close', () => {
  console.log('Redis connection closed');
});

redis.on('reconnecting', () => {
  console.log('Reconnecting to Redis...');
});

// Rate limiting utilities
export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  message?: string;
}

export class RedisRateLimiter {
  private redis: Redis;
  private secureMode: boolean;
  
  constructor(redisClient: Redis, secureMode: boolean = true) {
    this.redis = redisClient;
    this.secureMode = secureMode;
  }
  
  async checkRateLimit(
    identifier: string,
    config: RateLimitConfig
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number; retryAfter?: number }> {
    const key = `rate_limit:${identifier}`;
    const now = Date.now();
    const windowStart = now - config.windowMs;
    
    try {
      // Check Redis connection health first
      await this.redis.ping();
      
      // Use Redis pipeline for atomic operations
      const pipeline = this.redis.pipeline();
      
      // Remove expired entries
      pipeline.zremrangebyscore(key, 0, windowStart);
      
      // Count current requests in window after cleanup
      pipeline.zcard(key);
      
      // Set expiry on the key (extend TTL)
      pipeline.expire(key, Math.ceil(config.windowMs / 1000));
      
      const results = await pipeline.exec();
      
      if (!results || results.length !== 3) {
        throw new Error('Redis pipeline execution failed or returned unexpected results');
      }
      
      // Check for pipeline errors
      for (let i = 0; i < results.length; i++) {
        if (results[i][0]) {
          throw new Error(`Redis pipeline command ${i} failed: ${results[i][0]}`);
        }
      }
      
      const currentCount = results[1][1] as number;
      const isAllowed = currentCount < config.maxRequests;
      
      if (isAllowed) {
        // Add current request to the set only if allowed
        await this.redis.zadd(key, now, `${now}-${Math.random()}`);
        await this.redis.expire(key, Math.ceil(config.windowMs / 1000));
      }
      
      // Calculate reset time - when the window will reset
      const resetTime = now + config.windowMs;
      const remaining = Math.max(0, config.maxRequests - currentCount - (isAllowed ? 1 : 0));
      
      return {
        allowed: isAllowed,
        remaining,
        resetTime,
        retryAfter: isAllowed ? undefined : Math.ceil(config.windowMs / 1000)
      };
    } catch (error) {
      console.error('Rate limiting error:', error);
      
      // Implement secure fallback behavior based on configuration
      if (this.secureMode) {
        // FAIL CLOSED: Deny the request if Redis is unavailable
        // This is more secure but can impact availability
        console.warn('Redis unavailable - failing closed (denying request) for security');
        return {
          allowed: false,
          remaining: 0,
          resetTime: now + config.windowMs,
          retryAfter: Math.ceil(config.windowMs / 1000)
        };
      } else {
        // FAIL OPEN: Allow the request but log the incident
        // This maintains availability but is less secure
        console.warn('Redis unavailable - failing open (allowing request) for availability');
        return {
          allowed: true,
          remaining: config.maxRequests,
          resetTime: now + config.windowMs
        };
      }
    }
  }
  
  async getRateLimitInfo(identifier: string): Promise<{ count: number; resetTime: number } | null> {
    const key = `rate_limit:${identifier}`;
    try {
      await this.redis.ping();
      const count = await this.redis.zcard(key);
      const ttl = await this.redis.ttl(key);
      const resetTime = Date.now() + (ttl * 1000);
      
      return { count, resetTime };
    } catch (error) {
      console.error('Error getting rate limit info:', error);
      return null;
    }
  }
  
  /**
   * Clear rate limit data for a specific identifier
   * Useful for testing or administrative actions
   */
  async clearRateLimit(identifier: string): Promise<boolean> {
    const key = `rate_limit:${identifier}`;
    try {
      await this.redis.ping();
      await this.redis.del(key);
      return true;
    } catch (error) {
      console.error('Error clearing rate limit:', error);
      return false;
    }
  }
  
  /**
   * Check Redis connection health
   */
  async isHealthy(): Promise<boolean> {
    try {
      const response = await this.redis.ping();
      return response === 'PONG';
    } catch (error) {
      console.error('Redis health check failed:', error);
      return false;
    }
  }
  
  /**
   * Get Redis connection status and metrics
   */
  async getConnectionInfo(): Promise<{
    status: 'connected' | 'disconnected' | 'error';
    latency?: number;
    memory?: string;
    connections?: number;
  }> {
    try {
      const start = Date.now();
      await this.redis.ping();
      const latency = Date.now() - start;
      
      const info = await this.redis.info('memory');
      const memoryMatch = info.match(/used_memory_human:([^\r\n]+)/);
      const memory = memoryMatch ? memoryMatch[1] : 'unknown';
      
      const clientsInfo = await this.redis.info('clients');
      const connectionsMatch = clientsInfo.match(/connected_clients:(\d+)/);
      const connections = connectionsMatch ? parseInt(connectionsMatch[1]) : 0;
      
      return {
        status: 'connected',
        latency,
        memory,
        connections
      };
    } catch (error) {
      console.error('Error getting Redis connection info:', error);
      return {
        status: 'error'
      };
    }
  }
}

// Cache utilities
export class RedisCache {
  private redis: Redis;
  private defaultTTL: number;
  
  constructor(redisClient: Redis, defaultTTL: number = 3600) {
    this.redis = redisClient;
    this.defaultTTL = defaultTTL;
  }
  
  async get<T>(key: string): Promise<T | null> {
    try {
      await this.redis.ping();
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }
  
  async set<T>(key: string, value: T, ttl: number = this.defaultTTL): Promise<boolean> {
    try {
      await this.redis.ping();
      await this.redis.setex(key, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }
  
  async del(key: string): Promise<boolean> {
    try {
      await this.redis.ping();
      const result = await this.redis.del(key);
      return result > 0;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }
  
  async exists(key: string): Promise<boolean> {
    try {
      await this.redis.ping();
      return (await this.redis.exists(key)) === 1;
    } catch (error) {
      console.error('Cache exists error:', error);
      return false;
    }
  }
  
  /**
   * Clear all cache entries (use with caution)
   */
  async flush(): Promise<boolean> {
    try {
      await this.redis.ping();
      await this.redis.flushdb();
      return true;
    } catch (error) {
      console.error('Cache flush error:', error);
      return false;
    }
  }
  
  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    totalKeys: number;
    memory: string;
    hitRate?: string;
  } | null> {
    try {
      await this.redis.ping();
      const dbsize = await this.redis.dbsize();
      const info = await this.redis.info('memory');
      const memoryMatch = info.match(/used_memory_human:([^\r\n]+)/);
      const memory = memoryMatch ? memoryMatch[1] : 'unknown';
      
      return {
        totalKeys: dbsize,
        memory
      };
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return null;
    }
  }
}

// Configuration for secure mode (fail closed vs fail open)
const SECURE_MODE = process.env.REDIS_SECURE_MODE !== 'false'; // Default to secure (fail closed)

// Export instances with secure configuration
export const rateLimiter = new RedisRateLimiter(redis, SECURE_MODE);
export const cache = new RedisCache(redis);

// Export utility function to create rate limiters with different security configurations
export const createRateLimiter = (secureMode: boolean = true) => new RedisRateLimiter(redis, secureMode);

// Export Redis connection for direct access when needed
export default redis;

// Export connection health check utility
export const checkRedisHealth = async (): Promise<{
  healthy: boolean;
  latency?: number;
  error?: string;
}> => {
  try {
    const start = Date.now();
    await redis.ping();
    const latency = Date.now() - start;
    
    return {
      healthy: true,
      latency
    };
  } catch (error) {
    return {
      healthy: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};
