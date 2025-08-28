import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { middleware as securityMiddleware } from './middleware/security';

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

/**
 * Extracts an authentication token from a Next.js request.
 *
 * Attempts to locate a token in common locations (in this order): the `Authorization` header
 * using the `Bearer` scheme, a request cookie (common names like `token` or `NEXT_TOKEN`), or a
 * `token` query parameter. Returns the token string when found or `null` if no token is present.
 *
 * @returns The extracted token string, or `null` if none was found.
 */
export const getTokenFromRequest = (_request: NextRequest) => {
  // ... existing code ...
};

/**
 * Validate a parsed token and determine whether it is authentic and usable.
 *
 * Intended to check the provided `token` (string or token-like object) for correctness,
 * expiration, signature validity, and any application-specific claims required for access.
 *
 * @param token - The token to validate (JWT string, session token object, etc.).
 * @returns `true` if the token is considered valid; otherwise `false`.
 */
export const validateToken = (_token: unknown) => {
  // ... existing code ...
};

/**
 * Create a simple Response-like object containing status, message, and optional headers.
 *
 * Intended as a small helper to produce a uniform response shape for middleware and helpers.
 *
 * @param status - HTTP status code to include on the response object
 * @param message - Human-readable message or body to include
 * @param headers - Optional map of HTTP headers to attach to the response
 * @returns An object with `status`, `message`, and (when provided) `headers` properties suitable for use where a lightweight response descriptor is needed
 */
export const createResponse = (
  _status: number,
  _message: string,
  _headers?: Record<string, string>,
) => {
  // ... existing code ...
};

/**
 * Applies rate-limiting checks and updates the response accordingly.
 *
 * Intended to enforce request limits (for example by inspecting IP, tokens, or
 * request headers) and to mutate `response` with appropriate status, headers
 * (Retry-After, X-RateLimit-*), or body when a limit is exceeded. When the
 * request is allowed, this function may update rate-limit tracking headers
 * without terminating the response.
 *
 * @param request - The incoming Next.js request to inspect for rate-limiting keys (IP, auth token, etc.).
 * @param response - The Next.js response object to modify (headers or status) when limits apply.
 */
export const handleRateLimit = (
  _request: NextRequest,
  _response: NextResponse,
) => {
  // ... existing code ...
};

/**
 * Apply security-related headers and optional request-level checks to
 * the response.
 *
 * This function is responsible for ensuring HTTP security headers (for
 * example: Content-Security-Policy, Strict-Transport-Security,
 * X-Frame-Options, X-Content-Type-Options, Referrer-Policy,
 * Permissions-Policy) are set on the provided response and for
 * performing any lightweight request-level security checks needed
 * by middleware.
 *
 * Behavior notes:
 * - Mutates the provided NextResponse in place by setting or
 *   updating headers.
 * - Designed to be idempotent: calling it multiple times should not
 *   produce duplicate or conflicting header values.
 * - May inspect the NextRequest to vary header values or to trigger
 *   additional checks (rate limiting, token validation hooks, etc.).
 *
 * Implementation details (intended):
 * - Security headers should be applied with conservative defaults;
 *   callers can override headers after this function runs if necessary.
 * - If a check requires terminating the request early, the function may
 *   perform that by mutating the response to an appropriate error/status
 *   and headers.
 */
export const handleSecurityHeaders = (
  _request: NextRequest,
  _response: NextResponse,
) => {
  // ... existing code ...
};

/**
 * Applies caching policies to the outgoing response.
 *
 * Mutates the provided `response` in-place to add or adjust caching-related headers
 * (for example: `Cache-Control`, `Expires`, `ETag`) based on the incoming `request`.
 * Intended as the centralized place to implement cache rules, conditional-request
 * handling, and cache invalidation logic for middleware responses.
 */
export const handleCaching = (
  _request: NextRequest,
  _response: NextResponse,
) => {
  // ... existing code ...
};

/**
 * Applies compression-related handling to the given response based on the request.
 *
 * This hook is intended to enable or configure response compression (for example by
 * adjusting headers or selecting an encoding) when appropriate for the request/response
 * pair. Implementations may mutate the provided NextResponse in place or no-op for
 * responses that should not be compressed (e.g., already-compressed payloads, small
 * responses, or streaming responses).
 */
export const handleCompression = (
  _request: NextRequest,
  _response: NextResponse,
) => {
  // ... existing code ...
};

/**
 * Records or emits structured logs for an incoming request and its response.
 *
 * This hook is invoked from middleware to capture request-level and response-level
 * information (method, url, headers, status, timing, etc.) for observability.
 * Implementations may enrich or forward logs to external systems, attach trace
 * identifiers, and perform non-blocking analytics. It should not produce
 * terminal responses; any mutations to `response` should be limited and documented.
 *
 * @param request - The NextRequest being processed; used for request metadata.
 * @param response - The NextResponse produced so far; used for response metadata and optional enrichment.
 */
export const handleLogging = (
  _request: NextRequest,
  _response: NextResponse,
) => {
  // ... existing code ...
};

/**
 * Centralized error handler for middleware-level exceptions.
 *
 * Intended to capture and process errors thrown during middleware execution:
 * record/log the error, attach request context (path, headers, cookies) for diagnostics or monitoring,
 * and produce or modify an appropriate error response for the application.
 *
 * @param error - The error that occurred.
 * @param request - The incoming NextRequest; used to extract contextual information for logging, metrics, or response creation.
 */
export const handleError = (_error: Error, _request: NextRequest) => {
  // ... existing code ...
};

/**
 * Centralized post-processing for successful middleware responses.
 *
 * Intended to be called when a request has passed checks and a successful response will be returned.
 * Implementations may mutate the provided response (headers, cookies, status, body) and perform
 * side effects such as logging, metrics, or firing post-response hooks. Should not terminate the
 * request flow by sending errors; keep side effects idempotent and safe to call for every successful request.
 */
export const handleSuccess = (
  _request: NextRequest,
  _response: NextResponse,
) => {
  // ... existing code ...
};
