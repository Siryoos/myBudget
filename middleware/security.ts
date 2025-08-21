import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Allowed origins for CORS
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:3000',
  'https://app.smartsave.com',
  'https://www.smartsave.com'
];

// Security headers configuration
const SECURITY_HEADERS = {
  // Content Security Policy
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.sentry.io",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https: blob:",
    "font-src 'self' data:",
    "connect-src 'self' https://api.smartsave.com https://sentry.io wss://",
    "media-src 'self'",
    "object-src 'none'",
    "frame-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests"
  ].join('; '),
  
  // Other security headers
  'X-DNS-Prefetch-Control': 'on',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Frame-Options': 'SAMEORIGIN',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'X-XSS-Protection': '1; mode=block'
};

export function securityMiddleware(request: NextRequest) {
  // Get the response
  const response = NextResponse.next();
  
  // Handle CORS
  const origin = request.headers.get('origin');
  
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }
  
  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    response.headers.set('Access-Control-Max-Age', '86400'); // 24 hours
    return response;
  }
  
  // Apply security headers
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  // Add nonce for inline scripts if needed
  if (process.env.NODE_ENV === 'production') {
    const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
    response.headers.set('X-Nonce', nonce);
    
    // Update CSP with nonce
    const csp = response.headers.get('Content-Security-Policy') || '';
    const updatedCsp = csp.replace(
      "'unsafe-inline'",
      `'nonce-${nonce}'`
    );
    response.headers.set('Content-Security-Policy', updatedCsp);
  }
  
  return response;
}

// Rate limiting configuration
export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  message?: string;
}

// In-memory rate limit store (use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function rateLimitMiddleware(config: RateLimitConfig = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 60,
  message: 'Too many requests, please try again later'
}) {
  return (request: NextRequest) => {
    const identifier = request.ip || request.headers.get('x-forwarded-for') || 'anonymous';
    const now = Date.now();
    
    // Clean up expired entries
    for (const [key, value] of rateLimitStore.entries()) {
      if (value.resetTime < now) {
        rateLimitStore.delete(key);
      }
    }
    
    // Get or create rate limit entry
    let entry = rateLimitStore.get(identifier);
    
    if (!entry || entry.resetTime < now) {
      entry = {
        count: 0,
        resetTime: now + config.windowMs
      };
      rateLimitStore.set(identifier, entry);
    }
    
    // Increment request count
    entry.count++;
    
    // Check if limit exceeded
    if (entry.count > config.maxRequests) {
      return new NextResponse(
        JSON.stringify({
          success: false,
          error: config.message,
          retryAfter: Math.ceil((entry.resetTime - now) / 1000)
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': config.maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(entry.resetTime).toISOString(),
            'Retry-After': Math.ceil((entry.resetTime - now) / 1000).toString()
          }
        }
      );
    }
    
    // Add rate limit headers to response
    const response = NextResponse.next();
    response.headers.set('X-RateLimit-Limit', config.maxRequests.toString());
    response.headers.set('X-RateLimit-Remaining', (config.maxRequests - entry.count).toString());
    response.headers.set('X-RateLimit-Reset', new Date(entry.resetTime).toISOString());
    
    return response;
  };
}

// API-specific rate limits
export const apiRateLimits: Record<string, RateLimitConfig> = {
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

// Combined middleware
export function middleware(request: NextRequest) {
  // Apply security headers
  let response = securityMiddleware(request);
  
  // Apply rate limiting for API routes
  if (request.nextUrl.pathname.startsWith('/api')) {
    const path = request.nextUrl.pathname;
    
    // Find matching rate limit config
    const rateLimitConfig = Object.entries(apiRateLimits).find(([pattern]) => 
      path.startsWith(pattern)
    )?.[1];
    
    if (rateLimitConfig) {
      const rateLimitHandler = rateLimitMiddleware(rateLimitConfig);
      const rateLimitResponse = rateLimitHandler(request);
      
      if (rateLimitResponse.status === 429) {
        return rateLimitResponse;
      }
      
      // Merge headers
      rateLimitResponse.headers.forEach((value, key) => {
        response.headers.set(key, value);
      });
    }
  }
  
  return response;
}

// Export config
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};