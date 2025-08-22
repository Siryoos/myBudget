import { rateLimitConfig } from './config';
import { NextRequest, NextResponse } from 'next/server';

// Rate limit header types
export interface RateLimitHeaders {
  'X-RateLimit-Limit': string;
  'X-RateLimit-Remaining': string;
  'X-RateLimit-Reset': string;
  'Retry-After'?: string;
  'X-RateLimit-Reset-Time'?: string;
  'X-RateLimit-Window'?: string;
  'X-RateLimit-User'?: string;
  'X-RateLimit-Endpoint'?: string;
}

// Header generation options
export interface HeaderGenerationOptions {
  includeUserInfo?: boolean;
  includeEndpointInfo?: boolean;
  includeResetTime?: boolean;
  includeWindowInfo?: boolean;
  customHeaders?: Record<string, string>;
}

// Rate limit header manager
export class RateLimitHeaderManager {
  private static instance: RateLimitHeaderManager;
  private config = rateLimitConfig.headers;

  private constructor() {}

  static getInstance(): RateLimitHeaderManager {
    if (!RateLimitHeaderManager.instance) {
      RateLimitHeaderManager.instance = new RateLimitHeaderManager();
    }
    return RateLimitHeaderManager.instance;
  }

  // Generate rate limit headers for response
  generateHeaders(
    currentCount: number,
    limit: number,
    windowMs: number,
    options: HeaderGenerationOptions = {}
  ): RateLimitHeaders {
    const headers: RateLimitHeaders = {
      'X-RateLimit-Limit': limit.toString(),
      'X-RateLimit-Remaining': Math.max(0, limit - currentCount).toString(),
      'X-RateLimit-Reset': this.calculateResetTime(windowMs).toISOString()
    };

    // Add optional headers based on configuration and options
    if (this.config.enabled) {
      if (options.includeResetTime) {
        headers['X-RateLimit-Reset-Time'] = this.formatResetTime(windowMs);
      }

      if (options.includeWindowInfo) {
        headers['X-RateLimit-Window'] = this.formatWindowTime(windowMs);
      }

      if (options.includeUserInfo) {
        headers['X-RateLimit-User'] = 'anonymous'; // Would be set by middleware
      }

      if (options.includeEndpointInfo) {
        headers['X-RateLimit-Endpoint'] = 'unknown'; // Would be set by middleware
      }
    }

    // Add custom headers
    if (options.customHeaders) {
      Object.assign(headers, options.customHeaders);
    }

    return headers;
  }

  // Generate headers for rate limit exceeded
  generateExceededHeaders(
    limit: number,
    windowMs: number,
    options: HeaderGenerationOptions = {}
  ): RateLimitHeaders & { 'Retry-After': string } {
    const baseHeaders = this.generateHeaders(limit, limit, windowMs, options);
    
    return {
      ...baseHeaders,
      'Retry-After': this.calculateRetryAfter(windowMs).toString()
    };
  }

  // Apply headers to Next.js response
  applyHeaders(
    response: NextResponse,
    headers: RateLimitHeaders
  ): NextResponse {
    Object.entries(headers).forEach(([key, value]) => {
      if (value !== undefined) {
        response.headers.set(key, value);
      }
    });

    return response;
  }

  // Apply headers to existing headers object
  applyToHeaders(
    existingHeaders: Record<string, string>,
    headers: RateLimitHeaders
  ): Record<string, string> {
    return {
      ...existingHeaders,
      ...headers
    };
  }

  // Generate headers for specific endpoint
  generateEndpointHeaders(
    endpoint: string,
    currentCount: number,
    options: HeaderGenerationOptions = {}
  ): RateLimitHeaders {
    const endpointConfig = rateLimitConfig.endpoints[endpoint];
    const limit = endpointConfig?.maxRequests || rateLimitConfig.defaultLimits.maxRequests;
    const windowMs = endpointConfig?.windowMs || rateLimitConfig.defaultLimits.windowMs;

    return this.generateHeaders(currentCount, limit, windowMs, {
      ...options,
      includeEndpointInfo: true
    });
  }

  // Generate headers with user context
  generateUserHeaders(
    userId: string,
    endpoint: string,
    currentCount: number,
    options: HeaderGenerationOptions = {}
  ): RateLimitHeaders {
    const endpointConfig = rateLimitConfig.endpoints[endpoint];
    const limit = endpointConfig?.maxRequests || rateLimitConfig.defaultLimits.maxRequests;
    const windowMs = endpointConfig?.windowMs || rateLimitConfig.defaultLimits.windowMs;

    return this.generateHeaders(currentCount, limit, windowMs, {
      ...options,
      includeUserInfo: true,
      includeEndpointInfo: true,
      customHeaders: {
        'X-RateLimit-User': userId,
        'X-RateLimit-Endpoint': endpoint
      }
    });
  }

  // Generate headers for trusted IP bypass
  generateTrustedIPHeaders(
    ip: string,
    bypassLevel: 'full' | 'partial',
    options: HeaderGenerationOptions = {}
  ): Record<string, string> {
    const headers: Record<string, string> = {
      'X-Trusted-IP': 'true',
      'X-Bypass-Level': bypassLevel,
      'X-Trusted-IP-Address': ip
    };

    if (bypassLevel === 'full') {
      headers['X-RateLimit-Bypass'] = 'true';
      headers['X-RateLimit-Limit'] = 'unlimited';
      headers['X-RateLimit-Remaining'] = 'unlimited';
      headers['X-RateLimit-Reset'] = 'never';
    } else if (bypassLevel === 'partial') {
      headers['X-RateLimit-Bypass'] = 'partial';
      headers['X-RateLimit-Limit'] = 'increased';
    }

    // Add custom headers
    if (options.customHeaders) {
      Object.assign(headers, options.customHeaders);
    }

    return headers;
  }

  // Generate headers for adaptive rate limiting
  generateAdaptiveHeaders(
    currentCount: number,
    baseLimit: number,
    adjustedLimit: number,
    windowMs: number,
    options: HeaderGenerationOptions = {}
  ): RateLimitHeaders & { 'X-RateLimit-Adjusted': string; 'X-RateLimit-Base': string } {
    const baseHeaders = this.generateHeaders(currentCount, adjustedLimit, windowMs, options);
    
    return {
      ...baseHeaders,
      'X-RateLimit-Adjusted': adjustedLimit.toString(),
      'X-RateLimit-Base': baseLimit.toString()
    };
  }

  // Calculate reset time
  private calculateResetTime(windowMs: number): Date {
    const now = Date.now();
    const resetTime = now + windowMs;
    return new Date(resetTime);
  }

  // Format reset time for display
  private formatResetTime(windowMs: number): string {
    const resetTime = this.calculateResetTime(windowMs);
    return resetTime.toLocaleString();
  }

  // Format window time for display
  private formatWindowTime(windowMs: number): string {
    const minutes = Math.floor(windowMs / 60000);
    const seconds = Math.floor((windowMs % 60000) / 1000);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  }

  // Calculate retry after time
  private calculateRetryAfter(windowMs: number): number {
    return Math.ceil(windowMs / 1000); // Convert to seconds
  }

  // Validate headers
  validateHeaders(headers: RateLimitHeaders): string[] {
    const errors: string[] = [];

    // Check required headers
    if (!headers['X-RateLimit-Limit']) {
      errors.push('X-RateLimit-Limit header is required');
    }

    if (!headers['X-RateLimit-Remaining']) {
      errors.push('X-RateLimit-Remaining header is required');
    }

    if (!headers['X-RateLimit-Reset']) {
      errors.push('X-RateLimit-Reset header is required');
    }

    // Validate numeric values
    const limit = parseInt(headers['X-RateLimit-Limit']);
    const remaining = parseInt(headers['X-RateLimit-Remaining']);

    if (isNaN(limit) || limit < 0) {
      errors.push('X-RateLimit-Limit must be a positive number');
    }

    if (isNaN(remaining) || remaining < 0) {
      errors.push('X-RateLimit-Remaining must be a non-negative number');
    }

    if (remaining > limit) {
      errors.push('X-RateLimit-Remaining cannot exceed X-RateLimit-Limit');
    }

    // Validate reset time
    try {
      const resetTime = new Date(headers['X-RateLimit-Reset']);
      if (isNaN(resetTime.getTime())) {
        errors.push('X-RateLimit-Reset must be a valid ISO date string');
      }
    } catch {
      errors.push('X-RateLimit-Reset must be a valid ISO date string');
    }

    return errors;
  }

  // Parse headers from response
  parseHeaders(response: NextResponse): Partial<RateLimitHeaders> {
    const headers: Partial<RateLimitHeaders> = {};

    // Extract rate limit headers
    const limit = response.headers.get('X-RateLimit-Limit');
    const remaining = response.headers.get('X-RateLimit-Remaining');
    const reset = response.headers.get('X-RateLimit-Reset');
    const retryAfter = response.headers.get('Retry-After');

    if (limit) headers['X-RateLimit-Limit'] = limit;
    if (remaining) headers['X-RateLimit-Remaining'] = remaining;
    if (reset) headers['X-RateLimit-Reset'] = reset;
    if (retryAfter) headers['Retry-After'] = retryAfter;

    return headers;
  }

  // Check if response has rate limit headers
  hasRateLimitHeaders(response: NextResponse): boolean {
    return response.headers.has('X-RateLimit-Limit') ||
           response.headers.has('X-RateLimit-Remaining') ||
           response.headers.has('X-RateLimit-Reset');
  }

  // Get rate limit information from headers
  getRateLimitInfo(headers: RateLimitHeaders): {
    limit: number;
    remaining: number;
    reset: Date;
    retryAfter?: number;
  } {
    return {
      limit: parseInt(headers['X-RateLimit-Limit']),
      remaining: parseInt(headers['X-RateLimit-Remaining']),
      reset: new Date(headers['X-RateLimit-Reset']),
      retryAfter: headers['Retry-After'] ? parseInt(headers['Retry-After']) : undefined
    };
  }

  // Check if rate limit is exceeded
  isRateLimitExceeded(headers: RateLimitHeaders): boolean {
    const remaining = parseInt(headers['X-RateLimit-Remaining']);
    return remaining <= 0;
  }

  // Get time until reset
  getTimeUntilReset(headers: RateLimitHeaders): number {
    const reset = new Date(headers['X-RateLimit-Reset']);
    const now = Date.now();
    return Math.max(0, reset.getTime() - now);
  }

  // Format time until reset
  formatTimeUntilReset(headers: RateLimitHeaders): string {
    const timeUntilReset = this.getTimeUntilReset(headers);
    const minutes = Math.floor(timeUntilReset / 60000);
    const seconds = Math.floor((timeUntilReset % 60000) / 1000);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  }
}

// Singleton instance
export const rateLimitHeaderManager = RateLimitHeaderManager.getInstance();

// Convenience functions
export const generateRateLimitHeaders = (
  currentCount: number,
  limit: number,
  windowMs: number,
  options?: HeaderGenerationOptions
): RateLimitHeaders => {
  return rateLimitHeaderManager.generateHeaders(currentCount, limit, windowMs, options);
};

export const generateEndpointHeaders = (
  endpoint: string,
  currentCount: number,
  options?: HeaderGenerationOptions
): RateLimitHeaders => {
  return rateLimitHeaderManager.generateEndpointHeaders(endpoint, currentCount, options);
};

export const generateUserHeaders = (
  userId: string,
  endpoint: string,
  currentCount: number,
  options?: HeaderGenerationOptions
): RateLimitHeaders => {
  return rateLimitHeaderManager.generateUserHeaders(userId, endpoint, currentCount, options);
};

export const applyHeadersToResponse = (
  response: NextResponse,
  headers: RateLimitHeaders
): NextResponse => {
  return rateLimitHeaderManager.applyHeaders(response, headers);
};
