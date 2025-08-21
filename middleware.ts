import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { middleware as securityMiddleware, config as securityConfig } from './middleware/security';

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

export function middleware(request: NextRequest) {
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
  
  // Merge security headers into the locale response for non-terminal responses
  securityResponse.headers.forEach((value, key) => {
    response.headers.set(key, value);
  });
  
  return response;
}

export const config = {
  matcher: [
    // Combine both locale and security matchers
    // Locale matcher: Skip internal paths but include locale-specific routes
    '/((?!_next|api|favicon.ico|fonts|images|sw.js|manifest.json|.*\\..*|locales).*)',
    // Security matcher: Include all routes except static files
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ].filter((pattern, index, array) => {
    // Remove duplicates and ensure proper ordering
    return array.indexOf(pattern) === index;
  }),
};
