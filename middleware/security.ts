import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { logger } from '@/lib/logger';

// Conditional import for Redis - only import in Node.js runtime
let rateLimiter: any = null;
let RateLimitConfig: any = null;

if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV) {
  try {
    const redisModule = require('@/lib/redis');
    rateLimiter = redisModule.rateLimiter;
    RateLimitConfig = redisModule.RateLimitConfig;
  } catch (error) {
    logger.warn('Redis rate limiter not available in Edge Runtime');
  }
}

// Dynamic imports for non-Edge Runtime features
let getRateLimiter: any;
let RateLimitConfig: any;

if (typeof globalThis.EdgeRuntime === 'undefined') {
  try {
    const redisModule = require('@/lib/redis');
    getRateLimiter = redisModule.getRateLimiter;
    RateLimitConfig = redisModule.RateLimitConfig;
  } catch (error) {
    logger.warn('Redis rate limiter not available in Edge Runtime');
  }
}

// Origin validation function
const validateOrigin = (origin: string): { valid: boolean; error?: string } => {
  const trimmed = origin.trim();
  
  if (!trimmed) {
    return { valid: false, error: 'Empty origin' };
  }
  
  try {
    const url = new URL(trimmed);
    
    // Check protocol
    if (!['http:', 'https:'].includes(url.protocol)) {
      return { valid: false, error: `Invalid protocol: ${url.protocol}` };
    }
    
    // Check hostname
    if (!url.hostname) {
      return { valid: false, error: 'Missing hostname' };
    }
    
    // Validate hostname format
    const hostnameRegex = /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;
    const ipRegex = /^((25[0-5]|(2[0-4]|1\d|[1-9]|)\d)\.?\b){4}$/;
    const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
    
    if (!hostnameRegex.test(url.hostname) && !ipRegex.test(url.hostname) && !ipv6Regex.test(url.hostname)) {
      return { valid: false, error: `Invalid hostname: ${url.hostname}` };
    }
    
    // Check port
    if (url.port) {
      const port = parseInt(url.port);
      if (isNaN(port) || port < 1 || port > 65535) {
        return { valid: false, error: `Invalid port: ${url.port}` };
      }
    }
    
    // Warn about insecure origins in production
    if (process.env.NODE_ENV === 'production' && url.protocol === 'http:' && url.hostname !== 'localhost') {
      logger.warn('Insecure HTTP origin in production', { origin: trimmed });
    }
    
    return { valid: true };
  } catch (error) {
    return { valid: false, error: `Invalid URL format: ${error}` };
  }
};

// Enhanced environment validation with better error handling
const validateEnvironment = () => {
  const requiredVars = [
    'ALLOWED_ORIGINS',
    'REDIS_HOST',
    'REDIS_PORT',
    'REDIS_PASSWORD'
  ];
  
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    logger.error('Missing required environment variables', undefined, { missingVars });
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
  
  // Validate ALLOWED_ORIGINS format
  if (process.env.ALLOWED_ORIGINS) {
    const origins = process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim());
    const validationErrors: string[] = [];
    
    origins.forEach(origin => {
      const result = validateOrigin(origin);
      if (!result.valid) {
        validationErrors.push(`${origin}: ${result.error}`);
      }
    });
    
    if (validationErrors.length > 0) {
      logger.error('Invalid origins in ALLOWED_ORIGINS', undefined, { 
        errors: validationErrors 
      });
      throw new Error(`ALLOWED_ORIGINS validation failed:\n${validationErrors.join('\n')}`);
    }
    
    // Warn about wildcards
    if (origins.includes('*')) {
      logger.warn('Wildcard origin (*) detected in ALLOWED_ORIGINS - this is insecure');
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
  logger.error('Environment validation failed', error as Error);
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
  // Get external domains from environment variables for CSP
  const externalDomains = process.env.EXTERNAL_DOMAINS?.split(',').map(d => d.trim()).filter(Boolean) || [];
  const sentryDomain = process.env.SENTRY_DSN ? 'https://sentry.io' : '';
  const apiDomain = process.env.API_DOMAIN || '';
  
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
    "upgrade-insecure-requests"
  ];
  
  // Add external domains if configured
  if (sentryDomain) {
    cspDirectives.push("script-src 'self' 'nonce-{NONCE}' " + sentryDomain);
    cspDirectives.push("img-src 'self' " + sentryDomain);
    cspDirectives.push("font-src 'self' " + sentryDomain);
    cspDirectives.push("connect-src 'self' " + sentryDomain);
  }
  
  if (apiDomain) {
    cspDirectives.push("connect-src 'self' " + apiDomain);
  }
  
  if (externalDomains.length > 0) {
    cspDirectives.push("img-src 'self' " + externalDomains.join(' '));
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
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), clipboard-read=(), clipboard-write=()',
    'X-XSS-Protection': '1; mode=block',
    'Cross-Origin-Embedder-Policy': 'require-corp',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin'
  };
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
      origin: request.headers.get('origin') || 'unknown'
    };
    
    // Request validation with improved logic
    const contentLength = request.headers.get('content-length');
    if (contentLength) {
      const size = parseInt(contentLength);
      if (isNaN(size) || size > 10 * 1024 * 1024) { // 10MB limit
        securityMonitor.recordRequest('largeRequests');
        logger.warn('Large request detected', { ...securityLog, size });
        return new NextResponse(
          JSON.stringify({
            success: false,
            error: 'Request too large'
          }),
          {
            status: 413,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
    }
    
    // Improved content type validation for POST/PUT requests
    if (request.method === 'POST' || request.method === 'PUT') {
      const contentType = request.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        securityMonitor.recordRequest('invalidContentTypes');
        logger.warn('Invalid content type', { ...securityLog, contentType });
        return new NextResponse(
          JSON.stringify({
            success: false,
            error: 'Invalid content type. Expected application/json'
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
    }
    
    // Log suspicious requests
    if (securityLog.userAgent.includes('curl') || 
        securityLog.userAgent.includes('wget') ||
        securityLog.userAgent.includes('python') ||
        securityLog.userAgent.includes('bot')) {
      securityMonitor.recordRequest('suspiciousRequests');
      logger.warn('Suspicious request detected', securityLog);
    }
    
    // Handle CORS - consolidated logic to avoid duplication
    const origin = request.headers.get('origin');
    
    if (origin && ALLOWED_ORIGINS.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Access-Control-Allow-Credentials', 'true');
    } else if (origin) {
      // Log unauthorized origin attempts
      securityMonitor.recordRequest('unauthorizedOrigins');
      logger.warn('Unauthorized origin attempt', securityLog);
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
        logger.error('Failed to generate nonce', error as Error);
        // Continue without nonce rather than failing the request
        // Remove nonce-dependent CSP directives
        const csp = response.headers.get('Content-Security-Policy') || '';
        const updatedCsp = csp.replace(/'nonce-{NONCE}'/g, '');
        response.headers.set('Content-Security-Policy', updatedCsp);
      }
    }
    
    return response;
  } catch (error) {
    logger.error('Security middleware error', error as Error);
    // Return a generic error response instead of crashing
    return new NextResponse(
      JSON.stringify({
        success: false,
        error: 'Internal server error'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// API-specific rate limits with improved type safety
export const apiRateLimits: Record<string, any> = {
  '/api/auth/login': {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
    message: 'Too many login attempts, please try again later'
  },
  '/api/auth/register': {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3,
    message: 'Too many registration attempts, please try again later'
  },
  '/api/upload': {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
    message: 'Too many upload requests, please slow down'
  },
  '/api/transactions': {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
    message: 'Too many requests, please slow down'
  }
};

// Enhanced security metrics and monitoring with comprehensive typing
interface SecurityMetrics {
  // Request counters
  totalRequests: number;
  blockedRequests: number;
  suspiciousRequests: number;
  largeRequests: number;
  invalidContentTypes: number;
  unauthorizedOrigins: number;
  errors: number;
  
  // Rate limiting metrics
  rateLimitHits: number;
  rateLimitMisses: number;
  rateLimitErrors: number;
  
  // Security event metrics
  csrfAttempts: number;
  xssAttempts: number;
  sqlInjectionAttempts: number;
  
  // Performance metrics
  avgResponseTime: number;
  maxResponseTime: number;
  responseCount: number;
  
  // Timestamp tracking
  startTime: number;
  lastResetTime: number;
}

interface SecurityEvent {
  type: 'blocked' | 'suspicious' | 'error' | 'rate_limit' | 'security_violation';
  timestamp: number;
  ip?: string;
  userAgent?: string;
  path?: string;
  method?: string;
  reason?: string;
  details?: Record<string, any>;
}

class SecurityMonitor {
  private metrics: SecurityMetrics = {
    // Request counters
    totalRequests: 0,
    blockedRequests: 0,
    suspiciousRequests: 0,
    largeRequests: 0,
    invalidContentTypes: 0,
    unauthorizedOrigins: 0,
    errors: 0,
    
    // Rate limiting metrics
    rateLimitHits: 0,
    rateLimitMisses: 0,
    rateLimitErrors: 0,
    
    // Security event metrics
    csrfAttempts: 0,
    xssAttempts: 0,
    sqlInjectionAttempts: 0,
    
    // Performance metrics
    avgResponseTime: 0,
    maxResponseTime: 0,
    responseCount: 0,
    
    // Timestamp tracking
    startTime: Date.now(),
    lastResetTime: Date.now()
  };
  
  private events: SecurityEvent[] = [];
  private maxEvents = 1000; // Keep last 1000 security events
  
  recordRequest(type: keyof Omit<SecurityMetrics, 'avgResponseTime' | 'maxResponseTime' | 'responseCount' | 'startTime' | 'lastResetTime'>): void {
    if (type in this.metrics && typeof this.metrics[type as keyof SecurityMetrics] === 'number') {
      (this.metrics[type as keyof SecurityMetrics] as number)++;
    }
    this.metrics.totalRequests++;
    
    // Log metrics every 100 requests
    if (this.metrics.totalRequests % 100 === 0) {
      logger.info('Security metrics', this.getMetrics());
    }
  }
  
  recordSecurityEvent(event: Omit<SecurityEvent, 'timestamp'>): void {
    const fullEvent: SecurityEvent = {
      ...event,
      timestamp: Date.now()
    };
    
    this.events.push(fullEvent);
    
    // Keep only the last maxEvents
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }
    
    // Log security events
    logger.security(`Security event: ${event.type}`, event);
  }
  
  recordResponseTime(duration: number): void {
    this.metrics.responseCount++;
    this.metrics.maxResponseTime = Math.max(this.metrics.maxResponseTime, duration);
    
    // Calculate running average
    const currentAvg = this.metrics.avgResponseTime;
    const count = this.metrics.responseCount;
    this.metrics.avgResponseTime = (currentAvg * (count - 1) + duration) / count;
  }
  
  getMetrics(): SecurityMetrics & { uptime: number } {
    return {
      ...this.metrics,
      uptime: Date.now() - this.metrics.startTime
    };
  }
  
  getRecentEvents(limit: number = 100): SecurityEvent[] {
    return this.events.slice(-limit);
  }
  
  resetMetrics(): void {
    const now = Date.now();
    this.metrics = {
      ...this.metrics,
      totalRequests: 0,
      blockedRequests: 0,
      suspiciousRequests: 0,
      largeRequests: 0,
      invalidContentTypes: 0,
      unauthorizedOrigins: 0,
      errors: 0,
      rateLimitHits: 0,
      rateLimitMisses: 0,
      rateLimitErrors: 0,
      csrfAttempts: 0,
      xssAttempts: 0,
      sqlInjectionAttempts: 0,
      avgResponseTime: 0,
      maxResponseTime: 0,
      responseCount: 0,
      lastResetTime: now
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
    'Vary'
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
    let response = securityMiddleware(request);
    
    // Skip rate limiting for preflight and HEAD requests
    if (request.method === 'OPTIONS' || request.method === 'HEAD') {
      return response;
    }
    
    // Apply rate limiting for API routes
    if (request.nextUrl.pathname.startsWith('/api')) {
      const path = request.nextUrl.pathname;
      
      // Find matching rate limit config
      const rateLimitConfig = Object.entries(apiRateLimits).find(([pattern]) => 
        path.startsWith(pattern)
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
                retryAfter: rateLimitResult.retryAfter
              }),
              {
                status: 429,
                headers: {
                  'Content-Type': 'application/json',
                  'X-RateLimit-Limit': rateLimitConfig.maxRequests.toString(),
                  'X-RateLimit-Remaining': '0',
                  'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString(),
                  'Retry-After': rateLimitResult.retryAfter?.toString() || '0'
                }
              }
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
          logger.error('Rate limiting error', error as Error);
          // Fail securely - return 500 error instead of continuing
          return new NextResponse(
            JSON.stringify({
              success: false,
              error: 'Internal server error - rate limiting unavailable'
            }),
            {
              status: 500,
              headers: {
                'Content-Type': 'application/json'
              }
            }
          );
        }
      }
    }
    
    return response;
  } catch (error) {
    logger.error('Middleware error', error as Error);
    // Return a generic error response instead of crashing
    return new NextResponse(
      JSON.stringify({
        success: false,
        error: 'Internal server error'
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      }
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
        error: 'Not checked' 
      };
      if (rateLimiter) {
        try {
          const { checkRedisHealth } = await import('@/lib/redis');
          const healthResult = await checkRedisHealth();
          redisHealth = {
            healthy: healthResult.healthy,
            latency: healthResult.latency,
            error: healthResult.error || 'Unknown error'
          };
        } catch (error) {
          logger.error('Failed to check Redis health', error as Error);
          redisHealth = {
            healthy: false,
            latency: undefined,
            error: 'Health check failed'
          };
        }
      } else {
        redisHealth = {
          healthy: false,
          latency: undefined,
          error: 'Redis not available in Edge Runtime'
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
          secureMode: process.env.REDIS_SECURE_MODE !== 'false'
        },
        redis: {
          available: redisHealth.healthy,
          latency: redisHealth.latency,
          error: redisHealth.error
        }
      };
      
      return new NextResponse(JSON.stringify(health), {
        status: isHealthy ? 200 : 503,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });
    }
    
    return NextResponse.next();
  } catch (error) {
    logger.error('Health check error', error as Error);
    return new NextResponse(
      JSON.stringify({
        status: 'unhealthy',
        error: 'Health check failed',
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      }
    );
  }
}
