import { getRedisClient } from '../redis/connection-manager';

import { rateLimitConfig } from './config';

// User behavior metrics
export interface UserBehaviorMetrics {
  userId: string;
  endpoint: string;
  requestCount: number;
  successCount: number;
  errorCount: number;
  averageResponseTime: number;
  lastRequestTime: string;
  riskScore: number;
  behaviorPattern: 'normal' | 'suspicious' | 'malicious';
  learningData: {
    requestsPerHour: number[];
    errorRate: number[];
    responseTimeTrend: number[];
    lastUpdated: string;
  };
}

// Adaptive rate limit result
export interface AdaptiveRateLimitResult {
  allowed: boolean;
  currentLimit: number;
  adjustedLimit: number;
  reason: string;
  retryAfter?: number;
  headers: Record<string, string>;
}

// Adaptive rate limiter
export class AdaptiveRateLimiter {
  private static instance: AdaptiveRateLimiter;
  private redis: any;
  private config = rateLimitConfig.adaptiveLimiting;

  private constructor() {
    this.redis = getRedisClient();
  }

  static getInstance(): AdaptiveRateLimiter {
    if (!AdaptiveRateLimiter.instance) {
      AdaptiveRateLimiter.instance = new AdaptiveRateLimiter();
    }
    return AdaptiveRateLimiter.instance;
  }

  // Check if request should be allowed with adaptive limits
  async checkAdaptiveLimit(
    userId: string,
    endpoint: string,
    currentRequestCount: number,
  ): Promise<AdaptiveRateLimitResult> {
    try {
      if (!this.config.enabled) {
        return {
          allowed: true,
          currentLimit: rateLimitConfig.endpoints[endpoint]?.maxRequests || rateLimitConfig.defaultLimits.maxRequests,
          adjustedLimit: rateLimitConfig.endpoints[endpoint]?.maxRequests || rateLimitConfig.defaultLimits.maxRequests,
          reason: 'Adaptive limiting disabled',
          headers: {},
        };
      }

      // Get user behavior metrics
      const metrics = await this.getUserBehaviorMetrics(userId, endpoint);

      // Calculate adjusted limit based on behavior
      const adjustedLimit = this.calculateAdjustedLimit(metrics, endpoint);

      // Check if request is allowed
      const allowed = currentRequestCount < adjustedLimit;

      // Update behavior metrics
      await this.updateUserBehaviorMetrics(userId, endpoint, allowed);

      // Generate headers
      const headers = this.generateHeaders(currentRequestCount, adjustedLimit);

      return {
        allowed,
        currentLimit: rateLimitConfig.endpoints[endpoint]?.maxRequests || rateLimitConfig.defaultLimits.maxRequests,
        adjustedLimit,
        reason: allowed ? 'Request allowed' : 'Rate limit exceeded',
        retryAfter: allowed ? undefined : this.calculateRetryAfter(endpoint),
        headers,
      };

    } catch (error) {
      console.error('Adaptive rate limit check failed:', error);
      // Fallback to default limits
      const defaultLimit = rateLimitConfig.endpoints[endpoint]?.maxRequests || rateLimitConfig.defaultLimits.maxRequests;
      return {
        allowed: currentRequestCount < defaultLimit,
        currentLimit: defaultLimit,
        adjustedLimit: defaultLimit,
        reason: 'Fallback to default limits due to error',
        headers: {},
      };
    }
  }

  // Get user behavior metrics
  private async getUserBehaviorMetrics(userId: string, endpoint: string): Promise<UserBehaviorMetrics> {
    const key = `user_behavior:${userId}:${endpoint}`;

    try {
      const cached = await this.redis.get(key);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.warn('Failed to get cached behavior metrics:', error);
    }

    // Return default metrics if none exist
    return {
      userId,
      endpoint,
      requestCount: 0,
      successCount: 0,
      errorCount: 0,
      averageResponseTime: 0,
      lastRequestTime: new Date().toISOString(),
      riskScore: 0,
      behaviorPattern: 'normal',
      learningData: {
        requestsPerHour: [],
        errorRate: [],
        responseTimeTrend: [],
        lastUpdated: new Date().toISOString(),
      },
    };
  }

  // Calculate adjusted limit based on user behavior
  private calculateAdjustedLimit(metrics: UserBehaviorMetrics, endpoint: string): number {
    const baseLimit = rateLimitConfig.endpoints[endpoint]?.maxRequests || rateLimitConfig.defaultLimits.maxRequests;

    // Calculate risk-based adjustment
    const riskAdjustment = this.calculateRiskAdjustment(metrics);

    // Calculate behavior-based adjustment
    const behaviorAdjustment = this.calculateBehaviorAdjustment(metrics);

    // Calculate time-based adjustment
    const timeAdjustment = this.calculateTimeAdjustment(metrics);

    // Combine adjustments
    const totalAdjustment = riskAdjustment * behaviorAdjustment * timeAdjustment;

    // Apply adjustment to base limit
    let adjustedLimit = Math.round(baseLimit * totalAdjustment);

    // Ensure limits stay within bounds
    adjustedLimit = Math.max(this.config.minLimit, Math.min(this.config.maxLimit, adjustedLimit));

    return adjustedLimit;
  }

  // Calculate risk-based adjustment
  private calculateRiskAdjustment(metrics: UserBehaviorMetrics): number {
    // Higher risk score = lower limits
    const riskFactor = Math.max(0.1, 1 - (metrics.riskScore / 100));
    return riskFactor;
  }

  // Calculate behavior-based adjustment
  private calculateBehaviorAdjustment(metrics: UserBehaviorMetrics): number {
    let adjustment = 1.0;

    // Adjust based on error rate
    if (metrics.requestCount > 0) {
      const errorRate = metrics.errorCount / metrics.requestCount;
      if (errorRate > 0.5) {
        adjustment *= 0.5; // Reduce limits for high error rates
      } else if (errorRate < 0.1) {
        adjustment *= 1.2; // Increase limits for low error rates
      }
    }

    // Adjust based on response time
    if (metrics.averageResponseTime > 1000) {
      adjustment *= 0.8; // Reduce limits for slow responses
    } else if (metrics.averageResponseTime < 100) {
      adjustment *= 1.1; // Increase limits for fast responses
    }

    // Adjust based on behavior pattern
    switch (metrics.behaviorPattern) {
      case 'normal':
        adjustment *= 1.0;
        break;
      case 'suspicious':
        adjustment *= 0.7;
        break;
      case 'malicious':
        adjustment *= 0.3;
        break;
    }

    return adjustment;
  }

  // Calculate time-based adjustment
  private calculateTimeAdjustment(metrics: UserBehaviorMetrics): number {
    const now = new Date();
    const lastRequest = new Date(metrics.lastRequestTime);
    const timeSinceLastRequest = now.getTime() - lastRequest.getTime();

    // If user hasn't made requests recently, gradually increase limits
    if (timeSinceLastRequest > 3600000) { // 1 hour
      return 1.2;
    } else if (timeSinceLastRequest > 300000) { // 5 minutes
      return 1.1;
    } else if (timeSinceLastRequest < 1000) { // 1 second
      return 0.8; // Reduce limits for rapid requests
    }

    return 1.0;
  }

  // Update user behavior metrics
  private async updateUserBehaviorMetrics(
    userId: string,
    endpoint: string,
    requestAllowed: boolean,
  ): Promise<void> {
    const key = `user_behavior:${userId}:${endpoint}`;
    const metrics = await this.getUserBehaviorMetrics(userId, endpoint);

    // Update basic metrics
    metrics.requestCount++;
    if (requestAllowed) {
      metrics.successCount++;
    } else {
      metrics.errorCount++;
    }

    // Update response time (simplified - in real implementation, this would come from actual response times)
    const responseTime = Math.random() * 500 + 100; // Simulated response time
    metrics.averageResponseTime = this.updateAverage(metrics.averageResponseTime, responseTime, metrics.requestCount);

    // Update last request time
    metrics.lastRequestTime = new Date().toISOString();

    // Update learning data
    this.updateLearningData(metrics);

    // Recalculate risk score
    metrics.riskScore = this.calculateRiskScore(metrics);

    // Update behavior pattern
    metrics.behaviorPattern = this.determineBehaviorPattern(metrics);

    // Store updated metrics
    try {
      await this.redis.setex(key, 86400, JSON.stringify(metrics)); // Cache for 24 hours
    } catch (error) {
      console.warn('Failed to store behavior metrics:', error);
    }
  }

  // Update learning data
  private updateLearningData(metrics: UserBehaviorMetrics): void {
    const now = new Date();
    const lastUpdated = new Date(metrics.learningData.lastUpdated);

    // Update requests per hour (simplified)
    if (now.getTime() - lastUpdated.getTime() > 3600000) { // 1 hour
      metrics.learningData.requestsPerHour.push(metrics.requestCount);
      if (metrics.learningData.requestsPerHour.length > 24) {
        metrics.learningData.requestsPerHour.shift(); // Keep last 24 hours
      }
    }

    // Update error rate
    if (metrics.requestCount > 0) {
      const errorRate = metrics.errorCount / metrics.requestCount;
      metrics.learningData.errorRate.push(errorRate);
      if (metrics.learningData.errorRate.length > 100) {
        metrics.learningData.errorRate.shift(); // Keep last 100 measurements
      }
    }

    // Update response time trend
    metrics.learningData.responseTimeTrend.push(metrics.averageResponseTime);
    if (metrics.learningData.responseTimeTrend.length > 100) {
      metrics.learningData.responseTimeTrend.shift(); // Keep last 100 measurements
    }

    metrics.learningData.lastUpdated = now.toISOString();
  }

  // Calculate risk score
  private calculateRiskScore(metrics: UserBehaviorMetrics): number {
    let riskScore = 0;

    // Error rate contribution
    if (metrics.requestCount > 0) {
      const errorRate = metrics.errorCount / metrics.requestCount;
      riskScore += errorRate * 50;
    }

    // Response time contribution
    if (metrics.averageResponseTime > 1000) {
      riskScore += Math.min(20, (metrics.averageResponseTime - 1000) / 100);
    }

    // Request frequency contribution
    const recentRequests = metrics.learningData.requestsPerHour.slice(-6); // Last 6 hours
    if (recentRequests.length > 0) {
      const avgRequestsPerHour = recentRequests.reduce((sum, count) => sum + count, 0) / recentRequests.length;
      if (avgRequestsPerHour > 100) {
        riskScore += Math.min(30, (avgRequestsPerHour - 100) / 10);
      }
    }

    // Behavior pattern contribution
    switch (metrics.behaviorPattern) {
      case 'suspicious':
        riskScore += 20;
        break;
      case 'malicious':
        riskScore += 50;
        break;
    }

    return Math.min(100, Math.max(0, riskScore));
  }

  // Determine behavior pattern
  private determineBehaviorPattern(metrics: UserBehaviorMetrics): 'normal' | 'suspicious' | 'malicious' {
    if (metrics.riskScore > 70) {
      return 'malicious';
    } else if (metrics.riskScore > 40) {
      return 'suspicious';
    }
      return 'normal';

  }

  // Update average value
  private updateAverage(currentAvg: number, newValue: number, count: number): number {
    return (currentAvg * (count - 1) + newValue) / count;
  }

  // Calculate retry after time
  private calculateRetryAfter(endpoint: string): number {
    const windowMs = rateLimitConfig.endpoints[endpoint]?.windowMs || rateLimitConfig.defaultLimits.windowMs;
    return Math.ceil(windowMs / 1000); // Convert to seconds
  }

  // Generate rate limit headers
  private generateHeaders(currentCount: number, limit: number): Record<string, string> {
    if (!rateLimitConfig.headers.enabled) {
      return {};
    }

    return {
      [rateLimitConfig.headers.limit]: limit.toString(),
      [rateLimitConfig.headers.remaining]: Math.max(0, limit - currentCount).toString(),
      [rateLimitConfig.headers.reset]: new Date(Date.now() + rateLimitConfig.defaultLimits.windowMs).toISOString(),
    };
  }

  // Get user behavior insights
  async getUserBehaviorInsights(userId: string, endpoint: string): Promise<{
    riskScore: number;
    behaviorPattern: string;
    recommendations: string[];
    limits: {
      current: number;
      adjusted: number;
      base: number;
    };
  }> {
    const metrics = await this.getUserBehaviorMetrics(userId, endpoint);
    const baseLimit = rateLimitConfig.endpoints[endpoint]?.maxRequests || rateLimitConfig.defaultLimits.maxRequests;
    const adjustedLimit = this.calculateAdjustedLimit(metrics, endpoint);

    const recommendations: string[] = [];

    if (metrics.riskScore > 70) {
      recommendations.push('User behavior indicates potential security risk. Consider additional monitoring.');
    }

    if (metrics.errorCount > metrics.successCount) {
      recommendations.push('High error rate detected. User may need assistance or training.');
    }

    if (metrics.averageResponseTime > 1000) {
      recommendations.push('Slow response times detected. Consider performance optimization.');
    }

    return {
      riskScore: metrics.riskScore,
      behaviorPattern: metrics.behaviorPattern,
      recommendations,
      limits: {
        current: baseLimit,
        adjusted: adjustedLimit,
        base: baseLimit,
      },
    };
  }

  // Reset user behavior metrics
  async resetUserBehavior(userId: string, endpoint: string): Promise<void> {
    const key = `user_behavior:${userId}:${endpoint}`;
    try {
      await this.redis.del(key);
    } catch (error) {
      console.warn('Failed to reset user behavior:', error);
    }
  }
}

// Singleton instance
export const adaptiveRateLimiter = AdaptiveRateLimiter.getInstance();

// Convenience functions
export const checkAdaptiveLimit = (
  userId: string,
  endpoint: string,
  currentRequestCount: number,
): Promise<AdaptiveRateLimitResult> => adaptiveRateLimiter.checkAdaptiveLimit(userId, endpoint, currentRequestCount);

export const getUserBehaviorInsights = (
  userId: string,
  endpoint: string,
): Promise<{
  riskScore: number;
  behaviorPattern: string;
  recommendations: string[];
  limits: { current: number; adjusted: number; base: number };
}> => adaptiveRateLimiter.getUserBehaviorInsights(userId, endpoint);
