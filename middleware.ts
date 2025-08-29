import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { HTTP_OK, HTTP_INTERNAL_SERVER_ERROR } from '@/lib/http-status';

import { securityMiddleware } from './middleware/security';

const locales = ['en', 'fa', 'ar'];
const defaultLocale = 'en';

// RTL locales
const rtlLocales = ['fa', 'ar'];

const getLocale = (request: NextRequest): string => {
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
};

// Locale middleware function
const localeMiddleware = (request: NextRequest): NextResponse => {
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
};

// Safe header merging function to prevent conflicts
const mergeHeadersSafely = (target: Headers, source: Headers): void => {
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
};

/**
 * Main Next.js middleware that enforces locale-prefixed routes and
 * delegates to security middleware.
 *
 * If the request targets static assets, API routes, or file-like
 * paths (contains a dot), this middleware is a no-op.
 * Otherwise it ensures the pathname starts with the resolved locale
 * (from request.nextUrl.locale or `'en'`) and redirects to the
 * locale-prefixed path when missing. After locale handling, it invokes
 * `securityMiddleware(request)` and, if that returns a terminal
 * response (status not HTTP_OK and not 302), returns that response.
 * On success it allows normal processing to continue by returning
 * `NextResponse.next()`. Any unhandled error is caught and a generic
 * HTTP_INTERNAL_SERVER_ERROR response is returned.
 *
 * @param request - The incoming NextRequest to process.
 * @returns A NextResponse (redirect, terminal security response,
 * next response, or a HTTP_INTERNAL_SERVER_ERROR error response).
 */
export const middleware = async (request: NextRequest) => {
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

    // Check if securityResponse is a terminal response (status !== HTTP_OK and !== 302)
    // Terminal responses include 204 (preflight), 429 (rate limit), etc.
    if (securityResponse && securityResponse.status !== HTTP_OK && securityResponse.status !== 302) {
      return securityResponse;
    }

    // Continue with normal processing
    return NextResponse.next();
  } catch (error) {
    console.error('Middleware error:', error);

    // Return a generic error response
    return new NextResponse('Internal Server Error', { status: HTTP_INTERNAL_SERVER_ERROR });
  }
};

/**
 * Returns Next.js middleware matcher configuration that excludes
 * static assets and specific public files.
 *
 * The matcher targets all application routes except paths under
 * `_next/static`, `_next/image`, routes with file extensions,
 * and specific public files like `favicon.ico`, `sw.js`, and
 * `manifest.json`.
 *
 * @returns An object with a `matcher` array containing the route
 * pattern used by Next.js middleware.
 */
export const config = {
  matcher: [
    // Simplified matcher that covers all necessary routes without conflicts
    '/((?!_next/static|_next/image|favicon.ico|public|sw.js|manifest.json|.*\\..*).*)',
  ],
};
