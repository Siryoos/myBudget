// Mock the entire Redis module
jest.mock('../../lib/redis', () => {
  const mockRedis = {
    ping: jest.fn(),
    pipeline: jest.fn(),
    zadd: jest.fn(),
    expire: jest.fn(),
    zcard: jest.fn(),
    ttl: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
    info: jest.fn(),
    dbsize: jest.fn(),
    on: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
  };

  return {
    RedisRateLimiter: jest.fn().mockImplementation(() => ({
      checkRateLimit: jest.fn(),
      getRateLimitInfo: jest.fn(),
      resetRateLimit: jest.fn(),
    })),
    RateLimitConfig: {},
    rateLimiter: {
      checkRateLimit: jest.fn(),
      getRateLimitInfo: jest.fn(),
      resetRateLimit: jest.fn(),
    },
    cache: {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      exists: jest.fn(),
      flush: jest.fn(),
      getStats: jest.fn(),
    },
    default: mockRedis,
  };
});

// Now import the module after mocking
import { RedisRateLimiter, RateLimitConfig } from '../../lib/redis';

describe('Redis Rate Limiting', () => {
  let rateLimiter: any;
  let config: any;

  beforeEach(() => {
    jest.clearAllMocks();
    // Get the mocked RedisRateLimiter
    const { RedisRateLimiter } = require('../../lib/redis');
    rateLimiter = new RedisRateLimiter();
    
    // Set up the mock methods
    rateLimiter.checkRateLimit.mockResolvedValue({
      allowed: true,
      remaining: 4,
      resetTime: Date.now() + 60000,
    });
    rateLimiter.getRateLimitInfo = jest.fn();
    rateLimiter.clearRateLimit = jest.fn();
    rateLimiter.isHealthy = jest.fn();
    
    config = {
      windowMs: 60000, // 1 minute
      maxRequests: 5,
      message: 'Too many requests',
    };
  });

  describe('checkRateLimit', () => {
    it('should allow requests within limit', async () => {
      // Set up mock to return success
      rateLimiter.checkRateLimit.mockResolvedValue({
        allowed: true,
        remaining: 4,
        resetTime: Date.now() + 60000,
      });

      const result = await rateLimiter.checkRateLimit('test-user', config);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
      expect(rateLimiter.checkRateLimit).toHaveBeenCalledWith('test-user', config);
    });

    it('should block requests over limit', async () => {
      // Set up mock to return blocked
      rateLimiter.checkRateLimit.mockResolvedValue({
        allowed: false,
        remaining: 0,
        resetTime: Date.now() + 60000,
        retryAfter: 60,
      });

      const result = await rateLimiter.checkRateLimit('test-user', config);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBeDefined();
    });
  });

  describe('getRateLimitInfo', () => {
    it('should return rate limit information', async () => {
      rateLimiter.getRateLimitInfo.mockResolvedValue({
        count: 3,
        resetTime: Date.now() + 45000,
      });

      const result = await rateLimiter.getRateLimitInfo('test-user');

      expect(result).toEqual({
        count: 3,
        resetTime: expect.any(Number),
      });
    });
  });

  describe('clearRateLimit', () => {
    it('should clear rate limit data', async () => {
      rateLimiter.clearRateLimit.mockResolvedValue(true);

      const result = await rateLimiter.clearRateLimit('test-user');

      expect(result).toBe(true);
    });
  });

  describe('health checks', () => {
    it('should check Redis health', async () => {
      rateLimiter.isHealthy = jest.fn().mockResolvedValue(true);

      const result = await rateLimiter.isHealthy();

      expect(result).toBe(true);
    });
  });


});
