import { RedisRateLimiter, RateLimitConfig } from '@/lib/redis';

// Mock Redis client
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
};

jest.mock('ioredis', () => ({
  __esModule: true,
  default: jest.fn(() => mockRedis),
}));

describe('Redis Rate Limiting', () => {
  let rateLimiter: RedisRateLimiter;
  let config: RateLimitConfig;

  beforeEach(() => {
    jest.clearAllMocks();
    rateLimiter = new RedisRateLimiter(mockRedis as any);
    config = {
      windowMs: 60000, // 1 minute
      maxRequests: 5,
      message: 'Too many requests',
    };
  });

  describe('checkRateLimit', () => {
    it('should allow requests within limit', async () => {
      // Mock successful Redis operations
      mockRedis.ping.mockResolvedValue('PONG');
      mockRedis.pipeline.mockReturnValue({
        zremrangebyscore: jest.fn(),
        zcard: jest.fn(),
        expire: jest.fn(),
        exec: jest.fn().mockResolvedValue([
          [null, 1], // zremrangebyscore result
          [null, 2], // zcard result (2 requests)
          [null, 1], // expire result
        ]),
      });
      mockRedis.zadd.mockResolvedValue(1);
      mockRedis.expire.mockResolvedValue(1);

      const result = await rateLimiter.checkRateLimit('test-user', config);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(2);
      expect(result.retryAfter).toBeUndefined();
    });

    it('should block requests over limit', async () => {
      // Mock successful Redis operations but over limit
      mockRedis.ping.mockResolvedValue('PONG');
      mockRedis.pipeline.mockReturnValue({
        zremrangebyscore: jest.fn(),
        zcard: jest.fn(),
        expire: jest.fn(),
        exec: jest.fn().mockResolvedValue([
          [null, 1], // zremrangebyscore result
          [null, 5], // zcard result (5 requests - at limit)
          [null, 1], // expire result
        ]),
      });

      const result = await rateLimiter.checkRateLimit('test-user', config);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBeDefined();
    });

    it('should fail closed when Redis is unavailable (secure mode)', async () => {
      // Mock Redis failure
      mockRedis.ping.mockRejectedValue(new Error('Connection failed'));

      const result = await rateLimiter.checkRateLimit('test-user', config);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBeDefined();
    });

    it('should fail open when Redis is unavailable (non-secure mode)', async () => {
      // Create rate limiter in non-secure mode
      const nonSecureRateLimiter = new RedisRateLimiter(mockRedis as any, false);
      
      // Mock Redis failure
      mockRedis.ping.mockRejectedValue(new Error('Connection failed'));

      const result = await nonSecureRateLimiter.checkRateLimit('test-user', config);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(5);
    });
  });

  describe('getRateLimitInfo', () => {
    it('should return rate limit information', async () => {
      mockRedis.ping.mockResolvedValue('PONG');
      mockRedis.zcard.mockResolvedValue(3);
      mockRedis.ttl.mockResolvedValue(45); // 45 seconds remaining

      const result = await rateLimiter.getRateLimitInfo('test-user');

      expect(result).toEqual({
        count: 3,
        resetTime: expect.any(Number),
      });
    });

    it('should return null on error', async () => {
      mockRedis.ping.mockRejectedValue(new Error('Connection failed'));

      const result = await rateLimiter.getRateLimitInfo('test-user');

      expect(result).toBeNull();
    });
  });

  describe('clearRateLimit', () => {
    it('should clear rate limit data', async () => {
      mockRedis.ping.mockResolvedValue('PONG');
      mockRedis.del.mockResolvedValue(1);

      const result = await rateLimiter.clearRateLimit('test-user');

      expect(result).toBe(true);
      expect(mockRedis.del).toHaveBeenCalledWith('rate_limit:test-user');
    });

    it('should return false on error', async () => {
      mockRedis.ping.mockRejectedValue(new Error('Connection failed'));

      const result = await rateLimiter.clearRateLimit('test-user');

      expect(result).toBe(false);
    });
  });

  describe('health checks', () => {
    it('should check Redis health', async () => {
      mockRedis.ping.mockResolvedValue('PONG');

      const result = await rateLimiter.isHealthy();

      expect(result).toBe(true);
    });

    it('should return false on health check failure', async () => {
      mockRedis.ping.mockRejectedValue(new Error('Connection failed'));

      const result = await rateLimiter.isHealthy();

      expect(result).toBe(false);
    });

    it('should get connection information', async () => {
      mockRedis.ping.mockResolvedValue('PONG');
      mockRedis.info.mockResolvedValue('used_memory_human:1.2M\nconnected_clients:5');
      mockRedis.dbsize.mockResolvedValue(100);

      const result = await rateLimiter.getConnectionInfo();

      expect(result.status).toBe('connected');
      expect(result.latency).toBeDefined();
      expect(result.memory).toBe('1.2M');
      expect(result.connections).toBe(5);
    });
  });

  describe('error handling', () => {
    it('should handle pipeline execution failures', async () => {
      mockRedis.ping.mockResolvedValue('PONG');
      mockRedis.pipeline.mockReturnValue({
        zremrangebyscore: jest.fn(),
        zcard: jest.fn(),
        expire: jest.fn(),
        exec: jest.fn().mockResolvedValue(null), // Pipeline execution failed
      });

      const result = await rateLimiter.checkRateLimit('test-user', config);

      expect(result.allowed).toBe(false); // Should fail closed in secure mode
    });

    it('should handle pipeline command failures', async () => {
      mockRedis.ping.mockResolvedValue('PONG');
      mockRedis.pipeline.mockReturnValue({
        zremrangebyscore: jest.fn(),
        zcard: jest.fn(),
        expire: jest.fn(),
        exec: jest.fn().mockResolvedValue([
          [null, 1], // zremrangebyscore result
          [new Error('Command failed'), null], // zcard failed
          [null, 1], // expire result
        ]),
      });

      const result = await rateLimiter.checkRateLimit('test-user', config);

      expect(result.allowed).toBe(false); // Should fail closed in secure mode
    });
  });
});
