import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { middleware as securityMiddleware } from './middleware/security';

const locales = ['en', 'fa', 'ar'];
const defaultLocale = 'en';

// RTL locales
const rtlLocales = ['fa', 'ar'];

function getLocale(request: NextRequest): string {
  // Check if there's a locale in the pathname
  const pathname = request.nextUrl.pathname;
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
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
    (locale) => !pathname.startsWith(`/${locale}/`) && pathname !== `/${locale}`
  );

  // Redirect if pathname is missing a locale
  if (pathnameIsMissingLocale) {
    const locale = getLocale(request);
    
    // e.g. incoming request is /products
    // The new URL is now /en/products
    return NextResponse.redirect(
      new URL(`/${locale}${pathname}`, request.url)
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
    'Cross-Origin-Resource-Policy'
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

export function middleware(request: NextRequest) {
  try {
    // First apply locale middleware
    let response = localeMiddleware(request);
    
    // If locale middleware redirected, return early
    if (response.status === 302) {
      return response;
    }
    
    // Then apply security middleware
    const securityResponse = securityMiddleware(request);
    
    // Check if securityResponse is a terminal response (status !== 200 and !== 302)
    // Terminal responses include 204 (preflight), 429 (rate limit), etc.
    if (securityResponse.status !== 200 && securityResponse.status !== 302) {
      return securityResponse;
    }
    
    // Safely merge security headers into the locale response for non-terminal responses
    mergeHeadersSafely(response.headers, securityResponse.headers);
    
    return response;
  } catch (error) {
    console.error('Middleware error:', error);
    
    // Return a safe fallback response instead of crashing
    return new NextResponse(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
        message: 'Middleware processing failed'
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

export const config = {
  matcher: [
    // Simplified matcher that covers all necessary routes without conflicts
    '/((?!_next/static|_next/image|favicon.ico|public|sw.js|manifest.json|.*\\..*).*)',
  ],
};
