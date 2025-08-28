import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// Conditional import for Redis - only import in Node.js runtime
let rateLimiter: unknown = null;
// Unused variable - will be removed
// let rateLimitConfig: unknown = null;

if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV) {
  try {
    const redisModule = require('@/lib/redis');
    rateLimiter = redisModule.rateLimiter;
  } catch (error) {
    console.warn('Redis rate limiter not available in Edge Runtime');
  }
}

// Enhanced environment validation with better error handling
const validateEnvironment = () => {
  const requiredVars = [
    'ALLOWED_ORIGINS',
    'REDIS_HOST',
    'REDIS_PORT',
    'REDIS_PASSWORD',
  ];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    console.error('Missing required environment variables:', missingVars);
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  // Validate ALLOWED_ORIGINS format
  if (process.env.ALLOWED_ORIGINS) {
    const origins = process.env.ALLOWED_ORIGINS.split(',');
    const invalidOrigins = origins.filter(origin => {
      const trimmed = origin.trim();
      return !trimmed ||
             !trimmed.startsWith('http') ||
             !trimmed.match(/^https?:\/\/[^\s/]+(\/.*)?$/);
    });

    if (invalidOrigins.length > 0) {
      console.error('Invalid origins in ALLOWED_ORIGINS:', invalidOrigins);
      throw new Error('ALLOWED_ORIGINS must contain valid HTTP/HTTPS URLs');
    }
  }

  // Validate Redis configuration
  const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
  if (isNaN(redisPort) || redisPort < 1 || redisPort > 65535) {
    throw new Error('REDIS_PORT must be a valid port number (1-65535)');
  }
};

// Validate environment on module load
try {
  validateEnvironment();
} catch (error) {
  console.error('Environment validation failed:', error);
  // In production, this should cause the process to exit
  // Note: process.exit() not available in Edge Runtime, so we throw instead
  if (process.env.NODE_ENV === 'production') {
    // In Edge Runtime, we can't exit the process, so we throw an error
    // that will prevent the middleware from loading
    throw new Error('Critical environment validation failed in production');
  }
}

// Allowed origins for CORS - remove hardcoded fallbacks for security
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()).filter(Boolean) || [];

// Helper function to validate domain format
const isValidDomain = (domain: string): boolean => {
  try {
    const url = new URL(domain);
    return url.protocol === 'https:' && url.hostname.includes('.');
  } catch {
    return false;
  }
};

// Security headers configuration - configurable via environment variables
const getSecurityHeaders = () => {
  // Get external domains from environment variables for CSP with validation
  const externalDomains = process.env.EXTERNAL_DOMAINS?.split(',').map(d => d.trim()).filter(Boolean) || [];
  const sentryDomain = process.env.SENTRY_DSN ? 'https://sentry.io' : '';
  const apiDomain = process.env.API_DOMAIN || '';

  // Validate external domains format
  const validatedExternalDomains = externalDomains.filter(domain => {
    try {
      const url = new URL(domain);
      return url.protocol === 'https:' && url.hostname.includes('.');
    } catch {
      console.warn(`Invalid external domain in CSP: ${domain}`);
      return false;
    }
  });

  // Build CSP dynamically based on configuration
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'nonce-{NONCE}'",
    "style-src 'self' 'nonce-{NONCE}'",
    "img-src 'self'",
    "font-src 'self'",
    "connect-src 'self'",
    "media-src 'self'",
    "object-src 'none'",
    "frame-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    'upgrade-insecure-requests',
  ];

  // Add validated external domains if configured
  if (sentryDomain && isValidDomain(sentryDomain)) {
    cspDirectives.push(`script-src 'self' 'nonce-{NONCE}' ${sentryDomain}`);
    cspDirectives.push(`img-src 'self' ${sentryDomain}`);
    cspDirectives.push(`font-src 'self' ${sentryDomain}`);
    cspDirectives.push(`connect-src 'self' ${sentryDomain}`);
  }

  if (apiDomain && isValidDomain(apiDomain)) {
    cspDirectives.push(`connect-src 'self' ${apiDomain}`);
  }

  if (validatedExternalDomains.length > 0) {
    cspDirectives.push(`img-src 'self' ${validatedExternalDomains.join(' ')}`);
  }

  return {
    // Content Security Policy - Secure by default
    'Content-Security-Policy': cspDirectives.join('; '),

    // Other security headers
    'X-DNS-Prefetch-Control': 'on',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), clipboard-read=(), clipboard-write=(), document-domain=(), encrypted-media=(), fullscreen=(), picture-in-picture=(), publickey-credentials-get=(), screen-wake-lock=(), web-share=()',
    'X-XSS-Protection': '1; mode=block',
    'Cross-Origin-Embedder-Policy': 'require-corp',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin',
  };
};

/**
 * Enforces request-level security controls and injects security headers for incoming requests.
 *
 * Performs request validation (max body size, JSON content-type for POST/PUT), suspicious-user-agent detection,
 * CORS handling (including preflight OPTIONS responses), applies generated security headers and a CSP nonce
 * in production, and records relevant metrics to the security monitor.
 *
 * Behavior summary:
 * - Returns 413 when Content-Length exceeds 10 MB.
 * - Returns 400 for POST/PUT requests with non-JSON content types.
 * - Returns 204 for CORS preflight (OPTIONS) requests with appropriate CORS headers.
 * - Sets Access-Control-Allow-Origin and credentials when the Origin header matches configured ALLOWED_ORIGINS.
 * - Adds security headers from getSecurityHeaders(); in production attempts to generate and add a CSP nonce (X-Nonce)
 *   and substitutes it into the Content-Security-Policy header; if nonce generation fails, nonce-dependent CSP
 *   directives are removed.
 * - Records metrics via securityMonitor (e.g., largeRequests, invalidContentTypes, suspiciousRequests, unauthorizedOrigins).
 *
 * @returns A NextResponse representing the allowed response, a CORS preflight response, or an error response (413/400/500).
 */
export const securityMiddleware = (request: NextRequest) => {
  try {
    // Get the response
    const response = NextResponse.next();

    // Security monitoring and logging
    const securityLog = {
      timestamp: new Date().toISOString(),
      ip: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      method: request.method,
      path: request.nextUrl.pathname,
      origin: request.headers.get('origin') || 'unknown',
    };

    // Request validation with improved logic
    const contentLength = request.headers.get('content-length');
    if (contentLength) {
      const size = parseInt(contentLength, 10);
      if (isNaN(size) || size > 10 * 1024 * 1024) { // 10MB limit
        securityMonitor.recordRequest('largeRequests');
        console.warn('Large request detected:', { ...securityLog, size });
        return new NextResponse(
          JSON.stringify({
            success: false,
            error: 'Request too large',
          }),
          {
            status: 413,
            headers: { 'Content-Type': 'application/json' },
          },
        );
      }
    }

    // Improved content type validation for POST/PUT requests
    if (request.method === 'POST' || request.method === 'PUT') {
      const contentType = request.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        securityMonitor.recordRequest('invalidContentTypes');
        console.warn('Invalid content type:', { ...securityLog, contentType });
        return new NextResponse(
          JSON.stringify({
            success: false,
            error: 'Invalid content type. Expected application/json',
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          },
        );
      }
    }

    // Log suspicious requests
    if (securityLog.userAgent.includes('curl') ||
        securityLog.userAgent.includes('wget') ||
        securityLog.userAgent.includes('python') ||
        securityLog.userAgent.includes('bot')) {
      securityMonitor.recordRequest('suspiciousRequests');
      console.warn('Suspicious request detected:', securityLog);
    }

    // Handle CORS - consolidated logic to avoid duplication
    const origin = request.headers.get('origin');

    if (origin && ALLOWED_ORIGINS.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Access-Control-Allow-Credentials', 'true');
    } else if (origin) {
      // Log unauthorized origin attempts
      securityMonitor.recordRequest('unauthorizedOrigins');
      console.warn('Unauthorized origin attempt:', securityLog);
    }

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      // Create a new 204 response for preflight requests
      const preflightResponse = new NextResponse(null, { status: 204 });

      // Set CORS preflight headers
      preflightResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      preflightResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
      preflightResponse.headers.set('Access-Control-Max-Age', '86400'); // 24 hours

      // Add Vary header to prevent incorrect caching by intermediaries
      preflightResponse.headers.set('Vary', 'Origin');

      // Set origin-specific CORS headers if origin is allowed
      if (origin && ALLOWED_ORIGINS.includes(origin)) {
        preflightResponse.headers.set('Access-Control-Allow-Origin', origin);
        preflightResponse.headers.set('Access-Control-Allow-Credentials', 'true');
      }

      return preflightResponse;
    }

    // Apply security headers
    const securityHeaders = getSecurityHeaders();
    Object.entries(securityHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    // Add nonce for inline scripts if needed
    if (process.env.NODE_ENV === 'production') {
      try {
        // Generate cryptographically secure random bytes using Web Crypto API
        // Fallback to Node.js crypto if Web Crypto API is not available
        let randomBytes: Uint8Array;

        if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.getRandomValues) {
          randomBytes = globalThis.crypto.getRandomValues(new Uint8Array(32));
        } else if (typeof require !== 'undefined') {
          // Node.js fallback
          const crypto = require('crypto');
          randomBytes = crypto.randomBytes(32);
        } else {
          // Final fallback - generate pseudo-random string
          randomBytes = new Uint8Array(32);
          for (let i = 0; i < 32; i++) {
            randomBytes[i] = Math.floor(Math.random() * 256);
          }
        }

        // Convert to base64 using proper encoding
        const base64String = btoa(String.fromCharCode.apply(null, Array.from(randomBytes)));

        // Clean the nonce to ensure it's safe for CSP
        const nonce = base64String.replace(/[^a-zA-Z0-9+/=]/g, '');

        response.headers.set('X-Nonce', nonce);

        // Update CSP with nonce
        const csp = response.headers.get('Content-Security-Policy') || '';
        const updatedCsp = csp.replace(/{NONCE}/g, nonce);
        response.headers.set('Content-Security-Policy', updatedCsp);
      } catch (error) {
        console.error('Failed to generate nonce:', error);
        // Continue without nonce rather than failing the request
        // Remove nonce-dependent CSP directives
        const csp = response.headers.get('Content-Security-Policy') || '';
        const updatedCsp = csp.replace(/'nonce-{NONCE}'/g, '');
        response.headers.set('Content-Security-Policy', updatedCsp);
      }
    }

    return response;
  } catch (error) {
    console.error('Security middleware error:', error);
    // Return a generic error response instead of crashing
    return new NextResponse(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
};

// API-specific rate limits with improved type safety
export const apiRateLimits: Record<string, any> = {
  '/api/auth/login': {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
    message: 'Too many login attempts, please try again later',
  },
  '/api/auth/register': {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3,
    message: 'Too many registration attempts, please try again later',
  },
  '/api/upload': {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
    message: 'Too many upload requests, please slow down',
  },
  '/api/transactions': {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
    message: 'Too many requests, please slow down',
  },
};

// Enhanced security metrics and monitoring with better typing
interface SecurityMetrics {
  totalRequests: number;
  blockedRequests: number;
  suspiciousRequests: number;
  unauthorizedOrigins: number;
  largeRequests: number;
  invalidContentTypes: number;
}

class SecurityMonitor {
  private metrics: SecurityMetrics = {
    totalRequests: 0,
    blockedRequests: 0,
    suspiciousRequests: 0,
    unauthorizedOrigins: 0,
    largeRequests: 0,
    invalidContentTypes: 0,
  };

  recordRequest(type: keyof SecurityMetrics): void {
    this.metrics[type]++;
    this.metrics.totalRequests++;

    // Log metrics every 100 requests
    if (this.metrics.totalRequests % 100 === 0) {
      console.log('Security metrics:', this.metrics);
    }
  }

  getMetrics(): SecurityMetrics {
    return { ...this.metrics };
  }

  resetMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      blockedRequests: 0,
      suspiciousRequests: 0,
      unauthorizedOrigins: 0,
      largeRequests: 0,
      invalidContentTypes: 0,
    };
  }
}

const securityMonitor = new SecurityMonitor();

// Export for external monitoring
export { securityMonitor, type SecurityMetrics };

/**
 * Copies a curated set of security and CORS headers from one Headers object into another.
 *
 * Only the following headers are transferred if present on `source`: Content-Security-Policy,
 * X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, Strict-Transport-Security,
 * Access-Control-Allow-Origin, Access-Control-Allow-Credentials, and Vary.
 *
 * This function mutates `target` by setting each header's value (overwriting existing values)
 * and does nothing for headers that are absent on `source`. Header lookup is performed using
 * the Headers API (case-insensitive).
 *
 * @param target - The Headers object to receive the selected headers.
 * @param source - The Headers object to copy headers from.
 */
function mergeSecurityHeaders(target: Headers, source: Headers): void {
  // Only copy essential security and CORS headers
  const essentialHeaders = [
    'Content-Security-Policy',
    'X-Frame-Options',
    'X-Content-Type-Options',
    'X-XSS-Protection',
    'Strict-Transport-Security',
    'Access-Control-Allow-Origin',
    'Access-Control-Allow-Credentials',
    'Vary',
  ];

  essentialHeaders.forEach(header => {
    const value = source.get(header);
    if (value) {
      target.set(header, value);
    }
  });
}

/**
 * Main middleware that enforces security headers and optional per-route API rate limits.
 *
 * Applies security middleware to every request, then:
 * - Bypasses rate limiting for OPTIONS and HEAD requests.
 * - For requests under /api, looks up a matching rate limit from `apiRateLimits` and, if present,
 *   checks the limit via the runtime rate limiter.
 *   - If the request is rate-limited, records a blocked request, returns 429 with JSON body and
 *     standard rate-limit headers, and copies essential security headers from the base response.
 *   - If the rate check succeeds, attaches `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and
 *     `X-RateLimit-Reset` to the response.
 * - On rate-limiter failures returns a 500 JSON error; unexpected errors also produce a 500 JSON error.
 *
 * Returns a NextResponse with appropriate headers and status codes depending on the outcome.
 */
export async function middleware(request: NextRequest) {
  try {
    // Apply security headers
    const response = securityMiddleware(request);

    // Skip rate limiting for preflight and HEAD requests
    if (request.method === 'OPTIONS' || request.method === 'HEAD') {
      return response;
    }

    // Apply rate limiting for API routes
    if (request.nextUrl.pathname.startsWith('/api')) {
      const path = request.nextUrl.pathname;

      // Find matching rate limit config
      const rateLimitConfig = Object.entries(apiRateLimits).find(([pattern]) =>
        path.startsWith(pattern),
      )?.[1];

      if (rateLimitConfig) {
        // Get client identifier
        const identifier = request.ip || request.headers.get('x-forwarded-for') || 'anonymous';

        try {
          // Check rate limit asynchronously
          if (!rateLimiter || typeof (rateLimiter as any).checkRateLimit !== 'function') {
            throw new Error('Rate limiter is unavailable');
          }
          const rateLimitResult = await (rateLimiter as any).checkRateLimit(identifier, rateLimitConfig);

          if (!rateLimitResult.allowed) {
            // Create rate limit response
            securityMonitor.recordRequest('blockedRequests');
            const rateLimitResponse = new NextResponse(
              JSON.stringify({
                success: false,
                error: rateLimitConfig.message || 'Too many requests',
                retryAfter: rateLimitResult.retryAfter,
              }),
              {
                status: 429,
                headers: {
                  'Content-Type': 'application/json',
                  'X-RateLimit-Limit': rateLimitConfig.maxRequests.toString(),
                  'X-RateLimit-Remaining': '0',
                  'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString(),
                  'Retry-After': rateLimitResult.retryAfter?.toString() || '0',
                },
              },
            );

            // Optimized header merging - only copy essential headers
            mergeSecurityHeaders(rateLimitResponse.headers, response.headers);

            return rateLimitResponse;
          }

          // Add rate limit headers for successful requests
          response.headers.set('X-RateLimit-Limit', rateLimitConfig.maxRequests.toString());
          response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
          response.headers.set('X-RateLimit-Reset', new Date(rateLimitResult.resetTime).toISOString());

        } catch (error) {
          console.error('Rate limiting error:', error);
          // Fail securely - return 500 error instead of continuing
          return new NextResponse(
            JSON.stringify({
              success: false,
              error: 'Internal server error - rate limiting unavailable',
            }),
            {
              status: 500,
              headers: {
                'Content-Type': 'application/json',
              },
            },
          );
        }
      }
    }

    return response;
  } catch (error) {
    console.error('Middleware error:', error);
    // Return a generic error response instead of crashing
    return new NextResponse(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
  }
}

// Note: Config is exported from the root middleware.ts file

/**
 * Handles the security health-check endpoint at `/api/security/health`.
 *
 * Performs an in-memory metrics snapshot and, when available, a dynamic Redis health check.
 * Returns a JSON payload with overall status (`healthy` when Redis is healthy, otherwise `degraded`),
 * timestamp, current security metrics, environment info, and Redis availability/latency/error details.
 *
 * If the request path is not `/api/security/health`, the request is delegated to the next handler.
 * Errors during health evaluation are caught and result in a 500 JSON response describing the failure.
 *
 * @returns A NextResponse containing the JSON health object.
 *          - Status 200: Redis reported healthy.
 *          - Status 503: Redis reported unhealthy or degraded.
 *          - Status 500: An internal error occurred during health evaluation.
 */
export async function GET(request: NextRequest) {
  try {
    if (request.nextUrl.pathname === '/api/security/health') {
      const metrics = securityMonitor.getMetrics();

      // Check Redis health dynamically (only if Redis is available)
      let redisHealth: { healthy: boolean; latency?: number; error: string } = {
        healthy: false,
        latency: undefined,
        error: 'Not checked',
      };
      if (rateLimiter) {
        try {
          const { checkRedisHealth } = await import('@/lib/redis');
          const healthResult = await checkRedisHealth();
          redisHealth = {
            healthy: healthResult.healthy,
            latency: healthResult.latency,
            error: healthResult.error || 'Unknown error',
          };
        } catch (error) {
          console.error('Failed to check Redis health:', error);
          redisHealth = {
            healthy: false,
            latency: undefined,
            error: 'Health check failed',
          };
        }
      } else {
        redisHealth = {
          healthy: false,
          latency: undefined,
          error: 'Redis not available in Edge Runtime',
        };
      }

      const isHealthy = redisHealth.healthy;
      const health = {
        status: isHealthy ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        metrics,
        environment: {
          nodeEnv: process.env.NODE_ENV,
          allowedOrigins: ALLOWED_ORIGINS.length,
          secureMode: process.env.REDIS_SECURE_MODE !== 'false',
        },
        redis: {
          available: redisHealth.healthy,
          latency: redisHealth.latency,
          error: redisHealth.error,
        },
      };

      return new NextResponse(JSON.stringify(health), {
        status: isHealthy ? 200 : 503,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      });
    }

    return NextResponse.next();
  } catch (error) {
    console.error('Health check error:', error);
    return new NextResponse(
      JSON.stringify({
        status: 'unhealthy',
        error: 'Health check failed',
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      },
    );
  }
}
