import { NextRequest, NextResponse } from 'next/server';

import { middleware as securityMiddleware } from './middleware/security';

const locales = ['en', 'fa', 'ar'];
const defaultLocale = 'en';

// RTL locales
const rtlLocales = ['fa', 'ar'];

function getLocale(request: NextRequest): string {
  // Check if there's a locale in the pathname
  const pathname = request.nextUrl.pathname;
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`,
  );

  if (pathnameHasLocale) {
    const locale = pathname.split('/')[1];
    return locale;
  }

  // Check Accept-Language header
  const acceptLanguage = request.headers.get('Accept-Language');
  if (acceptLanguage) {
    const detectedLocale = acceptLanguage
      .split(',')
      .map((lang) => lang.split(';')[0].trim().split('-')[0])
      .find((lang) => locales.includes(lang));

    if (detectedLocale) {
      return detectedLocale;
    }
  }

  // Check cookie
  const localeCookie = request.cookies.get('NEXT_LOCALE');
  if (localeCookie && locales.includes(localeCookie.value)) {
    return localeCookie.value;
  }

  return defaultLocale;
}

// Locale middleware function
function localeMiddleware(request: NextRequest): NextResponse {
  const pathname = request.nextUrl.pathname;

  // Skip API routes entirely - they don't need locale handling
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Check if the pathname is missing a locale
  const pathnameIsMissingLocale = locales.every(
    (locale) => !pathname.startsWith(`/${locale}/`) && pathname !== `/${locale}`,
  );

  // Redirect if pathname is missing a locale
  if (pathnameIsMissingLocale) {
    const locale = getLocale(request);

    // e.g. incoming request is /products
    // The new URL is now /en/products
    return NextResponse.redirect(
      new URL(`/${locale}${pathname}`, request.url),
    );
  }

  // Set the locale cookie and direction
  const response = NextResponse.next();
  const locale = pathname.split('/')[1];

  response.cookies.set('NEXT_LOCALE', locale, {
    maxAge: 60 * 60 * 24 * 365, // 1 year
    path: '/',
  });

  // Set RTL header for RTL locales
  if (rtlLocales.includes(locale)) {
    response.headers.set('x-text-direction', 'rtl');
  } else {
    response.headers.set('x-text-direction', 'ltr');
  }

  // Set locale header
  response.headers.set('x-locale', locale);

  return response;
}

// Safe header merging function to prevent conflicts
function mergeHeadersSafely(target: Headers, source: Headers): void {
  // Define priority order: security headers take precedence over locale headers
  const securityPriorityHeaders = [
    'Content-Security-Policy',
    'X-Frame-Options',
    'X-Content-Type-Options',
    'X-XSS-Protection',
    'Strict-Transport-Security',
    'Cross-Origin-Embedder-Policy',
    'Cross-Origin-Opener-Policy',
    'Cross-Origin-Resource-Policy',
  ];

  // Merge all headers, but security headers from security middleware take priority
  source.forEach((value, key) => {
    if (securityPriorityHeaders.includes(key)) {
      // Security headers always override
      target.set(key, value);
    } else if (!target.has(key)) {
      // Non-security headers only if not already set
      target.set(key, value);
    }
    // If header already exists and it's not security-related, keep the existing one
  });
}

export async function middleware(request: NextRequest) {
  try {
    // First apply locale middleware
    const locale = request.nextUrl.locale || 'en';
    const pathname = request.nextUrl.pathname;

    // Skip middleware for static files and API routes that don't need locale handling
    if (
      pathname.startsWith('/_next/') ||
      pathname.startsWith('/api/') ||
      pathname.startsWith('/static/') ||
      pathname.includes('.')
    ) {
      return NextResponse.next();
    }

    // Handle locale routing
    if (!pathname.startsWith(`/${locale}`)) {
      // Redirect to locale-prefixed path
      const url = request.nextUrl.clone();
      url.pathname = `/${locale}${pathname}`;
      return NextResponse.redirect(url);
    }

    // Then apply security middleware
    const securityResponse = await securityMiddleware(request);

    // Check if securityResponse is a terminal response (status !== 200 and !== 302)
    // Terminal responses include 204 (preflight), 429 (rate limit), etc.
    if (securityResponse && securityResponse.status !== 200 && securityResponse.status !== 302) {
      return securityResponse;
    }

    // Continue with normal processing
    return NextResponse.next();
  } catch (error) {
    console.error('Middleware error:', error);
    
    // Return a generic error response
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export function config() {
  return {
    matcher: [
      // Simplified matcher that covers all necessary routes without conflicts
      '/((?!_next/static|_next/image|favicon.ico|public|sw.js|manifest.json|.*\\..*).*)',
    ],
  };
}

export function getTokenFromRequest(request: NextRequest) {
  // ... existing code ...
}

export function validateToken(token: any) {
  // ... existing code ...
}

export function createResponse(status: number, message: string, headers?: Record<string, string>) {
  // ... existing code ...
}

export function handleRateLimit(request: NextRequest, response: NextResponse) {
  // ... existing code ...
}

export function handleSecurityHeaders(request: NextRequest, response: NextResponse) {
  // ... existing code ...
}

export function handleCaching(request: NextRequest, response: NextResponse) {
  // ... existing code ...
}

export function handleCompression(request: NextRequest, response: NextResponse) {
  // ... existing code ...
}

export function handleLogging(request: NextRequest, response: NextResponse) {
  // ... existing code ...
}

export function handleError(error: Error, request: NextRequest) {
  // ... existing code ...
}

export function handleSuccess(request: NextRequest, response: NextResponse) {
  // ... existing code ...
}
