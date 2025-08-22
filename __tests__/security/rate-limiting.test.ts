import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { RedisRateLimiter } from '@/lib/redis';
import Redis from 'ioredis';

// Mock ioredis
jest.mock('ioredis');

describe('Rate Limiting Security Tests', () => {
  let rateLimiter: RedisRateLimiter;
  let mockRedis: jest.Mocked<Redis>;
  
  beforeEach(() => {
    // Create mock Redis instance
    mockRedis = new Redis() as jest.Mocked<Redis>;
    
    // Setup default mock implementations
    mockRedis.ping.mockResolvedValue('PONG');
    mockRedis.pipeline.mockReturnValue({
      zremrangebyscore: jest.fn().mockReturnThis(),
      zcard: jest.fn().mockReturnThis(),
      expire: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([
        [null, 0],  // zremrangebyscore result
        [null, 2],  // zcard result
        [null, 1]   // expire result
      ])
    } as any);
    mockRedis.zadd.mockResolvedValue(1);
    mockRedis.expire.mockResolvedValue(1);
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rate Limiting', () => {
    it('should allow requests within rate limit', async () => {
      rateLimiter = new RedisRateLimiter(mockRedis, true);
      
      const config = {
        windowMs: 60000, // 1 minute
        maxRequests: 5
      };
      
      const result = await rateLimiter.checkRateLimit('test-user', config);
      
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(3); // 5 max - 2 existing = 3
      expect(result.resetTime).toBeDefined();
      expect(result.retryAfter).toBeUndefined();
    });
    
    it('should block requests exceeding rate limit', async () => {
      rateLimiter = new RedisRateLimiter(mockRedis, true);
      
      // Mock pipeline to return count at limit
      mockRedis.pipeline.mockReturnValue({
        zremrangebyscore: jest.fn().mockReturnThis(),
        zcard: jest.fn().mockReturnThis(),
        expire: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          [null, 0],  // zremrangebyscore result
          [null, 5],  // zcard result (at limit)
          [null, 1]   // expire result
        ])
      } as any);
      
      const config = {
        windowMs: 60000,
        maxRequests: 5
      };
      
      const result = await rateLimiter.checkRateLimit('test-user', config);
      
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBeDefined();
      expect(result.retryAfter).toBe(60); // 60000ms / 1000
    });
    
    it('should use sliding window algorithm', async () => {
      rateLimiter = new RedisRateLimiter(mockRedis, true);
      
      const config = {
        windowMs: 60000,
        maxRequests: 5
      };
      
      await rateLimiter.checkRateLimit('test-user', config);
      
      // Verify sliding window operations
      expect(mockRedis.pipeline).toHaveBeenCalled();
      const pipeline = mockRedis.pipeline();
      expect(pipeline.zremrangebyscore).toHaveBeenCalled();
      expect(pipeline.zcard).toHaveBeenCalled();
      expect(pipeline.expire).toHaveBeenCalled();
    });
  });

  describe('Redis Failure Handling', () => {
    it('should fail closed when Redis is unavailable in secure mode', async () => {
      rateLimiter = new RedisRateLimiter(mockRedis, true); // secure mode = true
      
      // Mock Redis connection failure
      mockRedis.ping.mockRejectedValue(new Error('Redis connection failed'));
      
      const config = {
        windowMs: 60000,
        maxRequests: 5
      };
      
      const result = await rateLimiter.checkRateLimit('test-user', config);
      
      expect(result.allowed).toBe(false); // Fail closed
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBe(60);
    });
    
    it('should fail open when Redis is unavailable in non-secure mode', async () => {
      rateLimiter = new RedisRateLimiter(mockRedis, false); // secure mode = false
      
      // Mock Redis connection failure
      mockRedis.ping.mockRejectedValue(new Error('Redis connection failed'));
      
      const config = {
        windowMs: 60000,
        maxRequests: 5
      };
      
      const result = await rateLimiter.checkRateLimit('test-user', config);
      
      expect(result.allowed).toBe(true); // Fail open
      expect(result.remaining).toBe(5);
      expect(result.retryAfter).toBeUndefined();
    });
    
    it('should handle pipeline execution errors', async () => {
      rateLimiter = new RedisRateLimiter(mockRedis, true);
      
      // Mock pipeline execution error
      mockRedis.pipeline.mockReturnValue({
        zremrangebyscore: jest.fn().mockReturnThis(),
        zcard: jest.fn().mockReturnThis(),
        expire: jest.fn().mockReturnThis(),
        exec: jest.fn().mockRejectedValue(new Error('Pipeline failed'))
      } as any);
      
      const config = {
        windowMs: 60000,
        maxRequests: 5
      };
      
      const result = await rateLimiter.checkRateLimit('test-user', config);
      
      expect(result.allowed).toBe(false); // Fail closed in secure mode
    });
  });

  describe('Rate Limit Configuration', () => {
    it('should respect different window sizes', async () => {
      rateLimiter = new RedisRateLimiter(mockRedis, true);
      
      const configs = [
        { windowMs: 60000, maxRequests: 60 },    // 1 minute
        { windowMs: 900000, maxRequests: 100 },  // 15 minutes
        { windowMs: 3600000, maxRequests: 1000 } // 1 hour
      ];
      
      for (const config of configs) {
        const result = await rateLimiter.checkRateLimit('test-user', config);
        expect(result.resetTime).toBeGreaterThan(Date.now());
        expect(result.resetTime).toBeLessThanOrEqual(Date.now() + config.windowMs);
      }
    });
    
    it('should handle different user identifiers', async () => {
      rateLimiter = new RedisRateLimiter(mockRedis, true);
      
      const config = {
        windowMs: 60000,
        maxRequests: 5
      };
      
      const identifiers = [
        'user-123',
        '192.168.1.1',
        'api-key-abc123',
        'session-xyz789'
      ];
      
      for (const identifier of identifiers) {
        const result = await rateLimiter.checkRateLimit(identifier, config);
        expect(result).toBeDefined();
        expect(typeof result.allowed).toBe('boolean');
      }
    });
  });

  describe('Security Best Practices', () => {
    it('should use unique keys per identifier', async () => {
      rateLimiter = new RedisRateLimiter(mockRedis, true);
      
      const config = {
        windowMs: 60000,
        maxRequests: 5
      };
      
      await rateLimiter.checkRateLimit('user-1', config);
      await rateLimiter.checkRateLimit('user-2', config);
      
      // Each user should have their own rate limit counter
      const zaddCalls = mockRedis.zadd.mock.calls;
      expect(zaddCalls[0][0]).toBe('rate_limit:user-1');
      expect(zaddCalls[1][0]).toBe('rate_limit:user-2');
    });
    
    it('should set proper TTL on rate limit keys', async () => {
      rateLimiter = new RedisRateLimiter(mockRedis, true);
      
      const config = {
        windowMs: 60000, // 1 minute
        maxRequests: 5
      };
      
      await rateLimiter.checkRateLimit('test-user', config);
      
      // Verify TTL is set
      const expireCalls = mockRedis.expire.mock.calls;
      expect(expireCalls[0][1]).toBe(60); // 60 seconds
    });
    
    it('should clean up expired entries', async () => {
      rateLimiter = new RedisRateLimiter(mockRedis, true);
      
      const config = {
        windowMs: 60000,
        maxRequests: 5
      };
      
      const now = Date.now();
      await rateLimiter.checkRateLimit('test-user', config);
      
      // Verify cleanup of expired entries
      const pipeline = mockRedis.pipeline();
      const zremCall = pipeline.zremrangebyscore.mock.calls[0];
      expect(zremCall[0]).toBe('rate_limit:test-user');
      expect(zremCall[1]).toBe(0);
      expect(zremCall[2]).toBeLessThanOrEqual(now - config.windowMs);
    });
  });

  describe('Rate Limit Info Retrieval', () => {
    it('should retrieve current rate limit status', async () => {
      rateLimiter = new RedisRateLimiter(mockRedis, true);
      
      mockRedis.zcard.mockResolvedValue(3);
      mockRedis.ttl.mockResolvedValue(45);
      
      const info = await rateLimiter.getRateLimitInfo('test-user');
      
      expect(info).toBeDefined();
      expect(info?.count).toBe(3);
      expect(info?.resetTime).toBeGreaterThan(Date.now());
    });
    
    it('should handle missing rate limit data', async () => {
      rateLimiter = new RedisRateLimiter(mockRedis, true);
      
      mockRedis.zcard.mockResolvedValue(0);
      mockRedis.ttl.mockResolvedValue(-2); // Key doesn't exist
      
      const info = await rateLimiter.getRateLimitInfo('test-user');
      
      expect(info).toBeNull();
    });
  });
});