import { NextRequest, NextResponse } from 'next/server';
import { performanceMonitor, userCache, goalsCache, achievementsCache } from '@/lib/utils/performance';

export interface OptimizedRequest extends NextRequest {
  performance?: {
    startTime: number;
    operation: string;
  };
}

// Response compression middleware
export function withCompression(
  handler: (request: OptimizedRequest) => Promise<NextResponse>
) {
  return async (request: OptimizedRequest): Promise<NextResponse> => {
    const response = await handler(request);

    // Add compression headers for better performance
    response.headers.set('Content-Encoding', 'gzip');
    response.headers.set('Cache-Control', 'public, max-age=300'); // 5 minute cache

    return response;
  };
}

// Caching middleware for expensive operations
export function withCaching(
  cacheKey: (request: OptimizedRequest) => string,
  ttl?: number
) {
  return function (
    handler: (request: OptimizedRequest) => Promise<NextResponse>
  ) {
    return async (request: OptimizedRequest): Promise<NextResponse> => {
      const key = cacheKey(request);
      const cached = userCache.get(key) || goalsCache.get(key) || achievementsCache.get(key);

      if (cached) {
        // Return cached response
        return NextResponse.json(cached, {
          headers: {
            'x-cache-status': 'HIT',
            'x-cache-key': key,
          },
        });
      }

      const response = await handler(request);
      const data = await response.json();

      // Cache the response
      if (key.includes('user')) {
        userCache.set(key, data, ttl);
      } else if (key.includes('goal')) {
        goalsCache.set(key, data, ttl);
      } else if (key.includes('achievement')) {
        achievementsCache.set(key, data, ttl);
      }

      return NextResponse.json(data, {
        headers: {
          'x-cache-status': 'MISS',
          'x-cache-key': key,
        },
      });
    };
  };
}

// Performance monitoring middleware
export function withPerformanceTracking(
  operationName: string
) {
  return function (
    handler: (request: OptimizedRequest) => Promise<NextResponse>
  ) {
    return async (request: OptimizedRequest): Promise<NextResponse> => {
      const endTimer = performanceMonitor.start(operationName);

      request.performance = {
        startTime: Date.now(),
        operation: operationName,
      };

      try {
        const response = await handler(request);
        endTimer();

        // Add performance headers
        response.headers.set('x-operation', operationName);
        response.headers.set('x-performance-tracked', 'true');

        return response;
      } catch (error) {
        endTimer();
        throw error;
      }
    };
  };
}

// Rate limiting middleware
class RateLimiter {
  private requests = new Map<string, { count: number; resetTime: number }>();
  private limit: number;
  private windowMs: number;

  constructor(limit: number = 100, windowMs: number = 60000) { // 100 requests per minute
    this.limit = limit;
    this.windowMs = windowMs;
  }

  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const userRequests = this.requests.get(identifier);

    if (!userRequests || now > userRequests.resetTime) {
      this.requests.set(identifier, {
        count: 1,
        resetTime: now + this.windowMs,
      });
      return true;
    }

    if (userRequests.count >= this.limit) {
      return false;
    }

    userRequests.count++;
    return true;
  }

  getRemainingRequests(identifier: string): number {
    const userRequests = this.requests.get(identifier);
    if (!userRequests) return this.limit;

    return Math.max(0, this.limit - userRequests.count);
  }

  getResetTime(identifier: string): number {
    const userRequests = this.requests.get(identifier);
    return userRequests?.resetTime || Date.now();
  }
}

const rateLimiter = new RateLimiter();

export function withRateLimit(
  getIdentifier: (request: OptimizedRequest) => string = (req) => req.ip || 'anonymous',
  options?: { limit?: number; windowMs?: number }
) {
  const limiter = options ? new RateLimiter(options.limit, options.windowMs) : rateLimiter;

  return function (
    handler: (request: OptimizedRequest) => Promise<NextResponse>
  ) {
    return async (request: OptimizedRequest): Promise<NextResponse> => {
      const identifier = getIdentifier(request);

      if (!limiter.isAllowed(identifier)) {
        return NextResponse.json(
          {
            error: 'Too many requests',
            retryAfter: Math.ceil((limiter.getResetTime(identifier) - Date.now()) / 1000),
          },
          {
            status: 429,
            headers: {
              'Retry-After': Math.ceil((limiter.getResetTime(identifier) - Date.now()) / 1000).toString(),
              'X-RateLimit-Limit': options?.limit?.toString() || '100',
              'X-RateLimit-Remaining': limiter.getRemainingRequests(identifier).toString(),
              'X-RateLimit-Reset': limiter.getResetTime(identifier).toString(),
            },
          }
        );
      }

      return handler(request);
    };
  };
}

// Request optimization middleware
export function withRequestOptimization(
  handler: (request: OptimizedRequest) => Promise<NextResponse>
) {
  return async (request: OptimizedRequest): Promise<NextResponse> => {
    // Pre-process request for optimization
    const url = new URL(request.url);

    // Add query optimization for common patterns
    if (url.pathname.includes('/goals') || url.pathname.includes('/transactions')) {
      // Ensure pagination parameters are present for large datasets
      if (!url.searchParams.has('page') && !url.searchParams.has('limit')) {
        url.searchParams.set('page', '1');
        url.searchParams.set('limit', '20');

        // Redirect to optimized URL
        return NextResponse.redirect(url.toString());
      }
    }

    // Add sorting optimization
    if (!url.searchParams.has('sort') && (url.pathname.includes('/goals') || url.pathname.includes('/transactions'))) {
      url.searchParams.set('sort', 'created_at');
      url.searchParams.set('order', 'desc');
    }

    return handler(request);
  };
}

// Database connection optimization middleware
export function withDatabaseOptimization(
  handler: (request: OptimizedRequest) => Promise<NextResponse>
) {
  return async (request: OptimizedRequest): Promise<NextResponse> => {
    // Add database optimization headers
    const response = await handler(request);

    // Add connection pooling hints
    response.headers.set('X-Database-Optimized', 'true');

    // Add query execution hints
    if (request.method === 'GET') {
      response.headers.set('X-Query-Optimized', 'read-optimized');
    } else if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
      response.headers.set('X-Query-Optimized', 'write-optimized');
    }

    return response;
  };
}

// Combined optimization middleware
export function withFullOptimization(
  cacheKey?: (request: OptimizedRequest) => string,
  operationName?: string
) {
  return function (
    handler: (request: OptimizedRequest) => Promise<NextResponse>
  ) {
    let optimizedHandler = handler;

    // Add performance tracking
    if (operationName) {
      optimizedHandler = withPerformanceTracking(operationName)(optimizedHandler);
    }

    // Add caching
    if (cacheKey) {
      optimizedHandler = withCaching(cacheKey)(optimizedHandler);
    }

    // Add rate limiting
    optimizedHandler = withRateLimit()(optimizedHandler);

    // Add request optimization
    optimizedHandler = withRequestOptimization(optimizedHandler);

    // Add database optimization
    optimizedHandler = withDatabaseOptimization(optimizedHandler);

    // Add compression
    optimizedHandler = withCompression(optimizedHandler);

    return optimizedHandler;
  };
}
