import { Redis } from 'ioredis';
import { logger } from '@/lib/logger';

export interface AdaptiveRateLimitConfig {
  baseWindowMs: number;
  baseMaxRequests: number;
  trustScoreThreshold: number;
  suspicionScoreThreshold: number;
  adaptiveFactors: {
    trustBonus: number;        // Multiplier for trusted users
    suspicionPenalty: number;  // Divisor for suspicious users
    burstAllowance: number;    // Extra requests for burst traffic
  };
}

export interface UserBehaviorMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgResponseTime: number;
  lastRequestTime: number;
  trustScore: number;
  suspicionScore: number;
  violations: number;
  patterns: {
    isBot: boolean;
    isCrawler: boolean;
    isApiUser: boolean;
    hasValidSession: boolean;
  };
}

export class AdaptiveRateLimiter {
  private redis: Redis;
  private config: AdaptiveRateLimitConfig;
  
  constructor(redis: Redis, config: AdaptiveRateLimitConfig) {
    this.redis = redis;
    this.config = config;
  }
  
  /**
   * Calculate adaptive rate limit based on user behavior
   */
  async getAdaptiveLimit(
    identifier: string,
    userAgent?: string,
    sessionId?: string
  ): Promise<{ windowMs: number; maxRequests: number }> {
    const metrics = await this.getUserMetrics(identifier);
    const patterns = await this.analyzePatterns(identifier, userAgent, sessionId);
    
    // Update patterns in metrics
    metrics.patterns = patterns;
    
    // Calculate trust score
    const trustScore = this.calculateTrustScore(metrics);
    const suspicionScore = this.calculateSuspicionScore(metrics);
    
    // Update scores
    await this.updateUserScores(identifier, trustScore, suspicionScore);
    
    // Determine rate limit
    let windowMs = this.config.baseWindowMs;
    let maxRequests = this.config.baseMaxRequests;
    
    // Apply adaptive factors
    if (trustScore > this.config.trustScoreThreshold) {
      // Trusted user - increase limits
      maxRequests = Math.floor(maxRequests * this.config.adaptiveFactors.trustBonus);
      logger.debug('Applying trust bonus to rate limit', { identifier, trustScore, maxRequests });
    } else if (suspicionScore > this.config.suspicionScoreThreshold) {
      // Suspicious user - decrease limits
      maxRequests = Math.floor(maxRequests / this.config.adaptiveFactors.suspicionPenalty);
      windowMs = windowMs * 2; // Double the window for suspicious users
      logger.warn('Applying suspicion penalty to rate limit', { identifier, suspicionScore, maxRequests });
    }
    
    // Allow burst traffic for established users
    if (metrics.totalRequests > 100 && metrics.successfulRequests / metrics.totalRequests > 0.95) {
      maxRequests += this.config.adaptiveFactors.burstAllowance;
    }
    
    return { windowMs, maxRequests };
  }
  
  /**
   * Get user behavior metrics
   */
  private async getUserMetrics(identifier: string): Promise<UserBehaviorMetrics> {
    const key = `user_metrics:${identifier}`;
    const data = await this.redis.hgetall(key);
    
    if (!data || Object.keys(data).length === 0) {
      return this.createDefaultMetrics();
    }
    
    return {
      totalRequests: parseInt(data.totalRequests || '0'),
      successfulRequests: parseInt(data.successfulRequests || '0'),
      failedRequests: parseInt(data.failedRequests || '0'),
      avgResponseTime: parseFloat(data.avgResponseTime || '0'),
      lastRequestTime: parseInt(data.lastRequestTime || '0'),
      trustScore: parseFloat(data.trustScore || '0'),
      suspicionScore: parseFloat(data.suspicionScore || '0'),
      violations: parseInt(data.violations || '0'),
      patterns: {
        isBot: data.isBot === 'true',
        isCrawler: data.isCrawler === 'true',
        isApiUser: data.isApiUser === 'true',
        hasValidSession: data.hasValidSession === 'true'
      }
    };
  }
  
  /**
   * Analyze user patterns
   */
  private async analyzePatterns(
    identifier: string,
    userAgent?: string,
    sessionId?: string
  ): Promise<UserBehaviorMetrics['patterns']> {
    const patterns = {
      isBot: false,
      isCrawler: false,
      isApiUser: false,
      hasValidSession: !!sessionId
    };
    
    if (userAgent) {
      // Bot detection
      const botPatterns = /bot|spider|crawler|scraper|curl|wget|python|java|ruby/i;
      patterns.isBot = botPatterns.test(userAgent);
      
      // Crawler detection
      const crawlerPatterns = /googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot/i;
      patterns.isCrawler = crawlerPatterns.test(userAgent);
      
      // API user detection
      const apiPatterns = /postman|insomnia|axios|fetch|okhttp/i;
      patterns.isApiUser = apiPatterns.test(userAgent);
    }
    
    // Check request patterns
    const recentRequests = await this.getRecentRequestPatterns(identifier);
    
    // Detect automated behavior
    if (recentRequests.length > 10) {
      const intervals = [];
      for (let i = 1; i < recentRequests.length; i++) {
        intervals.push(recentRequests[i] - recentRequests[i - 1]);
      }
      
      // Check if intervals are too regular (bot-like)
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const variance = intervals.reduce((sum, interval) => sum + Math.pow(interval - avgInterval, 2), 0) / intervals.length;
      
      if (variance < 100) { // Very regular intervals
        patterns.isBot = true;
      }
    }
    
    return patterns;
  }
  
  /**
   * Calculate trust score based on user behavior
   */
  private calculateTrustScore(metrics: UserBehaviorMetrics): number {
    let score = 50; // Base score
    
    // Positive factors
    if (metrics.totalRequests > 0) {
      const successRate = metrics.successfulRequests / metrics.totalRequests;
      score += successRate * 20; // Up to +20 for high success rate
    }
    
    if (metrics.patterns.hasValidSession) {
      score += 10; // Valid session bonus
    }
    
    if (metrics.avgResponseTime > 0 && metrics.avgResponseTime < 1000) {
      score += 5; // Fast response time bonus
    }
    
    // Negative factors
    if (metrics.patterns.isBot && !metrics.patterns.isCrawler) {
      score -= 20; // Penalty for non-crawler bots
    }
    
    if (metrics.violations > 0) {
      score -= metrics.violations * 5; // -5 per violation
    }
    
    if (metrics.failedRequests > metrics.successfulRequests) {
      score -= 15; // High failure rate penalty
    }
    
    // Normalize to 0-100
    return Math.max(0, Math.min(100, score));
  }
  
  /**
   * Calculate suspicion score based on anomalies
   */
  private calculateSuspicionScore(metrics: UserBehaviorMetrics): number {
    let score = 0; // Base score
    
    // Suspicious factors
    if (metrics.patterns.isBot && !metrics.patterns.isCrawler && !metrics.patterns.isApiUser) {
      score += 30; // Unknown bot
    }
    
    if (metrics.violations > 5) {
      score += metrics.violations * 2; // Multiple violations
    }
    
    if (metrics.totalRequests > 0) {
      const failureRate = metrics.failedRequests / metrics.totalRequests;
      if (failureRate > 0.5) {
        score += 20; // High failure rate
      }
    }
    
    // Very rapid requests
    const timeSinceLastRequest = Date.now() - metrics.lastRequestTime;
    if (timeSinceLastRequest < 100 && metrics.totalRequests > 10) {
      score += 15; // Too fast for human
    }
    
    // No session but many requests
    if (!metrics.patterns.hasValidSession && metrics.totalRequests > 50) {
      score += 10;
    }
    
    // Normalize to 0-100
    return Math.max(0, Math.min(100, score));
  }
  
  /**
   * Update user metrics after request
   */
  async updateMetrics(
    identifier: string,
    success: boolean,
    responseTime: number,
    userAgent?: string,
    sessionId?: string
  ): Promise<void> {
    const key = `user_metrics:${identifier}`;
    const now = Date.now();
    
    // Get current metrics
    const metrics = await this.getUserMetrics(identifier);
    
    // Update basic counters
    metrics.totalRequests++;
    if (success) {
      metrics.successfulRequests++;
    } else {
      metrics.failedRequests++;
    }
    
    // Update average response time
    metrics.avgResponseTime = 
      (metrics.avgResponseTime * (metrics.totalRequests - 1) + responseTime) / metrics.totalRequests;
    
    metrics.lastRequestTime = now;
    
    // Store updated metrics
    const updates: Record<string, string> = {
      totalRequests: metrics.totalRequests.toString(),
      successfulRequests: metrics.successfulRequests.toString(),
      failedRequests: metrics.failedRequests.toString(),
      avgResponseTime: metrics.avgResponseTime.toString(),
      lastRequestTime: metrics.lastRequestTime.toString(),
      trustScore: metrics.trustScore.toString(),
      suspicionScore: metrics.suspicionScore.toString(),
      violations: metrics.violations.toString()
    };
    
    await this.redis.hmset(key, updates);
    await this.redis.expire(key, 86400 * 7); // Keep for 7 days
    
    // Store request timestamp for pattern analysis
    await this.storeRequestTimestamp(identifier, now);
    
    // Log significant changes
    if (!success) {
      logger.debug('Failed request recorded', { identifier, totalFailures: metrics.failedRequests });
    }
  }
  
  /**
   * Record a rate limit violation
   */
  async recordViolation(identifier: string): Promise<void> {
    const key = `user_metrics:${identifier}`;
    await this.redis.hincrby(key, 'violations', 1);
    
    const violations = await this.redis.hget(key, 'violations');
    logger.warn('Rate limit violation recorded', { identifier, totalViolations: violations });
    
    // Temporary ban for excessive violations
    if (parseInt(violations || '0') > 10) {
      await this.temporaryBan(identifier);
    }
  }
  
  /**
   * Temporary ban for abusive users
   */
  private async temporaryBan(identifier: string): Promise<void> {
    const banKey = `ban:${identifier}`;
    const banDuration = 3600; // 1 hour
    
    await this.redis.setex(banKey, banDuration, '1');
    logger.warn('User temporarily banned for excessive violations', { identifier, duration: banDuration });
  }
  
  /**
   * Check if user is banned
   */
  async isBanned(identifier: string): Promise<boolean> {
    const banKey = `ban:${identifier}`;
    const banned = await this.redis.exists(banKey);
    return banned === 1;
  }
  
  /**
   * Update user trust and suspicion scores
   */
  private async updateUserScores(
    identifier: string,
    trustScore: number,
    suspicionScore: number
  ): Promise<void> {
    const key = `user_metrics:${identifier}`;
    await this.redis.hmset(key, {
      trustScore: trustScore.toString(),
      suspicionScore: suspicionScore.toString()
    });
  }
  
  /**
   * Store request timestamp for pattern analysis
   */
  private async storeRequestTimestamp(identifier: string, timestamp: number): Promise<void> {
    const key = `request_times:${identifier}`;
    
    // Add timestamp to sorted set
    await this.redis.zadd(key, timestamp, timestamp.toString());
    
    // Keep only recent timestamps (last hour)
    const oneHourAgo = timestamp - 3600000;
    await this.redis.zremrangebyscore(key, 0, oneHourAgo);
    
    // Set expiry
    await this.redis.expire(key, 3600);
  }
  
  /**
   * Get recent request patterns
   */
  private async getRecentRequestPatterns(identifier: string): Promise<number[]> {
    const key = `request_times:${identifier}`;
    const timestamps = await this.redis.zrange(key, -20, -1); // Last 20 requests
    return timestamps.map(ts => parseInt(ts));
  }
  
  /**
   * Create default metrics for new users
   */
  private createDefaultMetrics(): UserBehaviorMetrics {
    return {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      avgResponseTime: 0,
      lastRequestTime: 0,
      trustScore: 50,
      suspicionScore: 0,
      violations: 0,
      patterns: {
        isBot: false,
        isCrawler: false,
        isApiUser: false,
        hasValidSession: false
      }
    };
  }
  
  /**
   * Get user behavior report
   */
  async getUserReport(identifier: string): Promise<{
    metrics: UserBehaviorMetrics;
    isBanned: boolean;
    adaptiveLimit: { windowMs: number; maxRequests: number };
  }> {
    const metrics = await this.getUserMetrics(identifier);
    const isBanned = await this.isBanned(identifier);
    const adaptiveLimit = await this.getAdaptiveLimit(identifier);
    
    return {
      metrics,
      isBanned,
      adaptiveLimit
    };
  }
}