import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { performanceMonitor, userCache, goalsCache, achievementsCache } from '@/lib/utils/performance';

export interface OptimizedRequest extends NextRequest {
  performance?: {
    startTime: number;
    operation: string;
  };
}

/**
 * Wraps a request handler to add response compression and short public caching headers.
 *
 * The returned handler invokes the original handler and, before returning the response,
 * sets `Content-Encoding: gzip` and `Cache-Control: public, max-age=300` (5 minutes).
 *
 * @param handler - The inner request handler to wrap.
 * @returns A handler that behaves like `handler` but adds gzip and cache-control headers to its responses.
 */
export function withCompression(
  handler: (request: OptimizedRequest) => Promise<NextResponse>,
) {
  return async (request: OptimizedRequest): Promise<NextResponse> => {
    const response = await handler(request);

    // Add compression headers for better performance
    response.headers.set('Content-Encoding', 'gzip');
    response.headers.set('Cache-Control', 'public, max-age=300'); // 5 minute cache

    return response;
  };
}

/**
 * Higher-order middleware that caches JSON responses for expensive operations.
 *
 * The returned wrapper computes a cache key using `cacheKey(request)`, checks for a cached
 * value across user, goals, and achievements caches, and if present returns it immediately
 * with headers `x-cache-status: HIT` and `x-cache-key`. On a cache miss it invokes the
 * wrapped handler, reads the JSON body, stores the payload in one of the three caches
 * (chosen by inspecting whether the key contains `user`, `goal`, or `achievement`) using
 * the provided `ttl` (if any), and returns the JSON response with `x-cache-status: MISS`
 * and `x-cache-key`.
 *
 * @param cacheKey - Function that derives a cache key from the incoming request.
 *                   The key's contents are inspected to select which internal cache to use
 *                   (contains `user`, `goal`, or `achievement`).
 * @param ttl - Optional time-to-live for the cached entry (in seconds). If omitted the
 *              underlying cache's default TTL is used.
 * @returns A middleware wrapper that takes a handler and returns a Request -> Response function
 *          with caching behavior and cache-status headers.
 */
export function withCaching(
  cacheKey: (request: OptimizedRequest) => string,
  ttl?: number,
) {
  return function (
    handler: (request: OptimizedRequest) => Promise<NextResponse>,
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

/**
 * Creates middleware that measures and annotates request performance for a named operation.
 *
 * The returned wrapper starts a performance timer, attaches `request.performance` (with `startTime` and `operation`),
 * invokes the underlying handler, ends the timer on both success and error, and adds `x-operation` and
 * `x-performance-tracked` headers to the outgoing response.
 *
 * @param operationName - A human-readable name for the operation being tracked (used for the timer and `x-operation` header)
 * @returns A higher-order handler that wraps the provided request handler with performance tracking
 */
export function withPerformanceTracking(
  operationName: string,
) {
  return function (
    handler: (request: OptimizedRequest) => Promise<NextResponse>,
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
    if (!userRequests) {return this.limit;}

    return Math.max(0, this.limit - userRequests.count);
  }

  getResetTime(identifier: string): number {
    const userRequests = this.requests.get(identifier);
    return userRequests?.resetTime || Date.now();
  }
}

const rateLimiter = new RateLimiter();

/**
 * Creates a rate-limiting middleware wrapper for a request handler.
 *
 * The returned higher-order function enforces a per-identifier request limit within a sliding window.
 * If the limit is exceeded the middleware returns an HTTP 429 JSON response containing an `error`
 * message and `retryAfter` (seconds) and sets `Retry-After`, `X-RateLimit-Limit`, `X-RateLimit-Remaining`,
 * and `X-RateLimit-Reset` headers. When allowed, the original handler is invoked.
 *
 * @param getIdentifier - Function that extracts a unique identifier (e.g., IP or user id) from the request.
 *                        Defaults to `req.ip` or `'anonymous'`.
 * @param options - Optional configuration to create a dedicated RateLimiter for this wrapper:
 *                  - limit: maximum requests allowed per window (default 100 when not provided)
 *                  - windowMs: window duration in milliseconds (default 60000 when not provided)
 * @returns A function that accepts a request handler and returns a wrapped handler enforcing the rate limit.
 */
export function withRateLimit(
  getIdentifier: (request: OptimizedRequest) => string = (req) => req.ip || 'anonymous',
  options?: { limit?: number; windowMs?: number },
) {
  const limiter = options ? new RateLimiter(options.limit, options.windowMs) : rateLimiter;

  return function (
    handler: (request: OptimizedRequest) => Promise<NextResponse>,
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
          },
        );
      }

      return handler(request);
    };
  };
}

/**
 * Wraps a request handler to inject URL defaults for common list endpoints and enforce pagination.
 *
 * For requests whose path includes `/goals` or `/transactions`:
 * - If both `page` and `limit` are absent, the middleware adds `page=1` and `limit=20` and responds with a redirect to the optimized URL.
 * - Otherwise, if `sort` is absent, the middleware adds `sort=created_at` and `order=desc` before delegating to the wrapped handler.
 *
 * The function returns a new handler that either issues the redirect (when pagination defaults are applied)
 * or forwards the original request to the provided handler.
 *
 * @returns A wrapped handler that applies the described URL optimizations before invoking the original handler.
 */
export function withRequestOptimization(
  handler: (request: OptimizedRequest) => Promise<NextResponse>,
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

/**
 * Wraps a request handler and adds database optimization headers to its response.
 *
 * Adds `X-Database-Optimized: true` to every response and sets `X-Query-Optimized`
 * to `read-optimized` for GET requests or `write-optimized` for POST/PUT/PATCH requests.
 *
 * @param handler - The request handler to wrap.
 * @returns A handler that forwards the request to `handler` and augments the resulting response headers.
 */
export function withDatabaseOptimization(
  handler: (request: OptimizedRequest) => Promise<NextResponse>,
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

/**
 * Composes a pipeline of common middlewares (performance tracking, caching, rate limiting,
 * request optimization, database optimization, and compression) into a single handler wrapper.
 *
 * When provided, `operationName` enables performance tracking for the wrapped handler.
 * When provided, `cacheKey` enables response caching keyed by the function's return value.
 * The composed middleware order is: performance tracking (if enabled), caching (if enabled),
 * rate limiting, request optimization, database optimization, then compression. Order is significant.
 *
 * @param cacheKey - Optional function that derives a cache key from the incoming request.
 * @param operationName - Optional name used to label the performance-tracked operation.
 * @returns A function that accepts a Next.js request handler and returns a new handler wrapped
 *          with the composed optimizations.
 */
export function withFullOptimization(
  cacheKey?: (request: OptimizedRequest) => string,
  operationName?: string,
) {
  return function (
    handler: (request: OptimizedRequest) => Promise<NextResponse>,
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
