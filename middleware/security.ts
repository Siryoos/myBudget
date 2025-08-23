import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Conditional import for Redis - only import in Node.js runtime
let rateLimiter: any = null;
let RateLimitConfig: any = null;

if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV) {
  try {
    const redisModule = require('@/lib/redis');
    rateLimiter = redisModule.rateLimiter;
    RateLimitConfig = redisModule.RateLimitConfig;
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
             !trimmed.match(/^https?:\/\/[^\s\/]+(\/.*)?$/);
    });

    if (invalidOrigins.length > 0) {
      console.error('Invalid origins in ALLOWED_ORIGINS:', invalidOrigins);
      throw new Error('ALLOWED_ORIGINS must contain valid HTTP/HTTPS URLs');
    }
  }

  // Validate Redis configuration
  const redisPort = parseInt(process.env.REDIS_PORT || '6379');
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

// Helper function to validate domain format
const isValidDomain = (domain: string): boolean => {
  try {
    const url = new URL(domain);
    return url.protocol === 'https:' && url.hostname.includes('.');
  } catch {
    return false;
  }
};

// Enhanced security middleware with proper error boundaries
export function securityMiddleware(request: NextRequest): NextResponse {
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
      const size = parseInt(contentLength);
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
}

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

// Optimized header merging utility
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

// Enhanced combined middleware with better error handling and async rate limiting
export async function middleware(request: NextRequest): Promise<NextResponse> {
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
          const rateLimitResult = await rateLimiter.checkRateLimit(identifier, rateLimitConfig);

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

// Enhanced security health check endpoint with better error handling
export async function GET(request: NextRequest): Promise<NextResponse> {
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
