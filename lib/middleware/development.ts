import { NextRequest, NextResponse } from 'next/server';

// Development-specific middleware for enhanced development experience

interface DevRequest extends NextRequest {
  dev?: {
    startTime: number;
    requestId: string;
    userAgent?: string;
    ipAddress?: string;
  };
}

/**
 * Wraps a request handler to attach lightweight development metadata, log the request/response, and emit development headers.
 *
 * The returned handler adds a `dev` object to the incoming request containing `startTime`, a generated `requestId`, `userAgent`, and `ipAddress`. In NODE_ENV === 'development' it logs the incoming request, logs the response status and duration (or errors), and sets `x-dev-request-id`, `x-dev-response-time`, and `x-dev-environment` headers on successful responses. Errors from the wrapped handler are rethrown after optional development logging.
 *
 * @param handler - The original request handler to wrap.
 * @returns A handler with the same signature that augments the request and response with development information.
 */
export function withDevLogging(
  handler: (request: DevRequest) => Promise<NextResponse>
) {
  return async (request: DevRequest): Promise<NextResponse> => {
    const startTime = Date.now();
    const requestId = `dev_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Extract request information
    const url = new URL(request.url);
    const method = request.method;
    const userAgent = request.headers.get('user-agent') || 'Unknown';
    const forwardedFor = request.headers.get('x-forwarded-for');
    const ipAddress = forwardedFor ? forwardedFor.split(',')[0].trim() :
                     request.headers.get('x-real-ip') ||
                     '127.0.0.1';

    // Add development information to request
    request.dev = {
      startTime,
      requestId,
      userAgent,
      ipAddress,
    };

    // Log request (development only)
    if (process.env.NODE_ENV === 'development') {
      console.log(`🚀 [${requestId}] ${method} ${url.pathname} - ${ipAddress}`);
    }

    try {
      const response = await handler(request);
      const duration = Date.now() - startTime;

      // Log response (development only)
      if (process.env.NODE_ENV === 'development') {
        const statusColor = response.status >= 400 ? '\x1b[31m' :
                           response.status >= 300 ? '\x1b[33m' :
                           response.status >= 200 ? '\x1b[32m' : '\x1b[37m';

        console.log(`✅ [${requestId}] ${statusColor}${response.status}\x1b[0m - ${duration}ms`);

        // Add development headers
        response.headers.set('x-dev-request-id', requestId);
        response.headers.set('x-dev-response-time', `${duration}ms`);
        response.headers.set('x-dev-environment', 'development');
      }

      return response;

    } catch (error) {
      const duration = Date.now() - startTime;

      // Log error (development only)
      if (process.env.NODE_ENV === 'development') {
        console.error(`❌ [${requestId}] Error after ${duration}ms:`, error);
      }

      throw error;
    }
  };
}

/**
 * Middleware wrapper that serves an in-browser API documentation page for requests to /api/docs.
 *
 * If the incoming request's pathname is `/api/docs` or `/api/docs/`, returns a 200 HTML response
 * produced by `generateApiDocs()` with `Content-Type: text/html` and `x-dev-api-docs: true`.
 * For all other requests, delegates to the provided handler and returns its response.
 */
export function withDevApiDocs(
  handler: (request: DevRequest) => Promise<NextResponse>
) {
  return async (request: DevRequest): Promise<NextResponse> => {
    const url = new URL(request.url);

    // Intercept API docs requests
    if (url.pathname === '/api/docs' || url.pathname === '/api/docs/') {
      const apiDocs = generateApiDocs();
      return new NextResponse(apiDocs, {
        status: 200,
        headers: {
          'Content-Type': 'text/html',
          'x-dev-api-docs': 'true',
        },
      });
    }

    return handler(request);
  };
}

/**
 * Wraps a request handler to measure memory and execution time and inject development performance headers.
 *
 * This middleware records heap memory before and after the wrapped handler runs, computes the heapUsed delta,
 * and measures request duration. It skips monitoring for common static asset extensions. On completion it sets
 * the response headers `x-dev-memory-delta` and `x-dev-memory-peak` (both in bytes). When NODE_ENV is `development`
 * and the request takes more than 100ms, a brief performance log is emitted to stdout.
 *
 * @returns A new request handler that performs the described performance measurements and returns the original response.
 */
export function withDevPerformance(
  handler: (request: DevRequest) => Promise<NextResponse>
) {
  return async (request: DevRequest): Promise<NextResponse> => {
    const startTime = Date.now();
    const url = new URL(request.url);

    // Skip performance monitoring for static assets
    if (url.pathname.match(/\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
      return handler(request);
    }

    // Track memory usage before request
    const memoryBefore = process.memoryUsage();

    const response = await handler(request);

    // Track memory usage after request
    const memoryAfter = process.memoryUsage();
    const memoryDelta = memoryAfter.heapUsed - memoryBefore.heapUsed;
    const duration = Date.now() - startTime;

    // Add performance headers
    response.headers.set('x-dev-memory-delta', `${memoryDelta} bytes`);
    response.headers.set('x-dev-memory-peak', `${memoryAfter.heapUsed} bytes`);

    // Log performance metrics (development only)
    if (process.env.NODE_ENV === 'development' && duration > 100) {
      console.log(`📊 [PERF] ${request.method} ${url.pathname} - ${duration}ms, Memory: ${memoryDelta > 0 ? '+' : ''}${memoryDelta} bytes`);
    }

    return response;
  };
}

/**
 * Wraps a request handler to render a development-friendly HTML error overlay on thrown errors.
 *
 * When the wrapped handler throws and NODE_ENV === 'development', returns a 500 HTML response
 * produced by `generateErrorHtml(error)` with `Content-Type: text/html` and header `x-dev-error: true`.
 * In non-development environments the original error is rethrown.
 *
 * @param handler - The request handler to wrap.
 * @returns A new handler that delegates to `handler` and converts thrown errors into a development error page when applicable.
 */
export function withDevErrorOverlay(
  handler: (request: DevRequest) => Promise<NextResponse>
) {
  return async (request: DevRequest): Promise<NextResponse> => {
    try {
      return await handler(request);
    } catch (error) {
      // Enhanced error response for development
      if (process.env.NODE_ENV === 'development') {
        const errorHtml = generateErrorHtml(error);
        return new NextResponse(errorHtml, {
          status: 500,
          headers: {
            'Content-Type': 'text/html',
            'x-dev-error': 'true',
          },
        });
      }

      throw error;
    }
  };
}

/**
 * Wraps a request handler to inject development hot-reload indicator headers.
 *
 * When NODE_ENV is 'development', the returned handler sets `x-dev-hot-reload: enabled`
 * and `x-dev-turbo: enabled` on successful responses to signal in-browser tooling.
 *
 * @returns A new handler that delegates to the provided `handler` and adds the hot-reload headers in development.
 */
export function withDevHotReload(
  handler: (request: DevRequest) => Promise<NextResponse>
) {
  return async (request: DevRequest): Promise<NextResponse> => {
    const response = await handler(request);

    // Add hot reload headers
    if (process.env.NODE_ENV === 'development') {
      response.headers.set('x-dev-hot-reload', 'enabled');
      response.headers.set('x-dev-turbo', 'enabled');
    }

    return response;
  };
}

/**
 * Wraps a request handler with the full set of development middleware: request logging, performance monitoring,
 * API docs interception, error overlay rendering, and hot-reload indicators.
 *
 * @param handler - The original request handler to enhance.
 * @returns A new handler equivalent to `handler` but augmented with development-only behavior and headers.
 */
export function withDevEnhancements(
  handler: (request: DevRequest) => Promise<NextResponse>
) {
  return withDevLogging(
    withDevPerformance(
      withDevApiDocs(
        withDevErrorOverlay(
          withDevHotReload(handler)
        )
      )
    )
  );
}

/**
 * Generate a development-only HTML page documenting available API endpoints and local dev tooling.
 *
 * The returned string is a complete HTML document that lists predefined endpoints (method, path, description),
 * includes development notices, monitoring links, and common local commands — intended to be served at
 * /api/docs during development.
 *
 * @returns A string containing the full HTML for the API documentation page.
 */
function generateApiDocs(): string {
  const endpoints = [
    { method: 'GET', path: '/api/health', description: 'Health check endpoint' },
    { method: 'POST', path: '/api/auth/login', description: 'User authentication' },
    { method: 'POST', path: '/api/auth/register', description: 'User registration' },
    { method: 'GET', path: '/api/auth/logout', description: 'User logout' },
    { method: 'GET', path: '/api/user/profile', description: 'Get user profile' },
    { method: 'PUT', path: '/api/user/profile', description: 'Update user profile' },
    { method: 'GET', path: '/api/goals', description: 'List user goals' },
    { method: 'POST', path: '/api/goals', description: 'Create new goal' },
    { method: 'GET', path: '/api/goals/[id]', description: 'Get specific goal' },
    { method: 'PUT', path: '/api/goals/[id]', description: 'Update goal' },
    { method: 'DELETE', path: '/api/goals/[id]', description: 'Delete goal' },
    { method: 'GET', path: '/api/transactions', description: 'List transactions' },
    { method: 'POST', path: '/api/transactions', description: 'Create transaction' },
    { method: 'GET', path: '/api/achievements', description: 'List achievements' },
    { method: 'GET', path: '/api/user/achievements', description: 'User achievements' },
  ];

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SmartSave API Documentation - Development</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 10px;
            margin-bottom: 30px;
            text-align: center;
        }
        .endpoint {
            background: white;
            margin: 10px 0;
            padding: 15px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            border-left: 4px solid #667eea;
        }
        .method {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-weight: bold;
            font-size: 12px;
            margin-right: 10px;
        }
        .method.GET { background: #28a745; color: white; }
        .method.POST { background: #007bff; color: white; }
        .method.PUT { background: #ffc107; color: black; }
        .method.DELETE { background: #dc3545; color: white; }
        .path { font-family: monospace; font-weight: bold; }
        .description { color: #666; margin-top: 5px; }
        .env-notice {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🚀 SmartSave API Documentation</h1>
        <p>Development Environment - Version 1.0.0</p>
        <p>Base URL: <code>http://localhost:3000/api</code></p>
    </div>

    <div class="env-notice">
        <strong>🔧 Development Environment Notice:</strong>
        This API documentation is for the development environment.
        Features may differ in production. Always test thoroughly before deploying.
    </div>

    <h2>📋 Available Endpoints</h2>

    ${endpoints.map(endpoint => `
    <div class="endpoint">
        <span class="method ${endpoint.method}">${endpoint.method}</span>
        <span class="path">${endpoint.path}</span>
        <div class="description">${endpoint.description}</div>
    </div>
    `).join('')}

    <h2>🔧 Development Tools</h2>
    <div class="endpoint">
        <span class="method GET">GET</span>
        <span class="path">/api/docs</span>
        <div class="description">View this API documentation</div>
    </div>

    <div class="endpoint">
        <span class="method GET">GET</span>
        <span class="path">/api/health</span>
        <div class="description">Check API health and status</div>
    </div>

    <h2>📊 Monitoring & Debugging</h2>
    <ul>
        <li><strong>Grafana:</strong> http://localhost:3002 (admin/admin123)</li>
        <li><strong>Prometheus:</strong> http://localhost:9090</li>
        <li><strong>Application Logs:</strong> Available in console and ./logs/</li>
        <li><strong>Performance Metrics:</strong> Enabled in development mode</li>
    </ul>

    <h2>🛠️ Development Commands</h2>
    <ul>
        <li><code>npm run dev</code> - Start development server</li>
        <li><code>npm run test:api</code> - Test API endpoints</li>
        <li><code>npm run docker:logs</code> - View container logs</li>
        <li><code>npm run db:reset</code> - Reset development database</li>
    </ul>

    <footer style="text-align: center; margin-top: 50px; color: #666;">
        <p>Generated for SmartSave Development Environment</p>
        <p>Last updated: ${new Date().toLocaleString()}</p>
    </footer>
</body>
</html>`;
}

/**
 * Generate an HTML development error overlay for a thrown error.
 *
 * Produces a styled, printable HTML page that includes the error message, stack trace (if available),
 * timestamp, Node.js version, platform, and quick development actions/links. Intended for use only in
 * development environments as a human-readable debugging aid.
 *
 * @param error - The thrown value or Error object to render; if not an Error an "Unknown error" message is shown.
 * @returns A full HTML document as a string suitable for returning in an HTTP response.
 */
function generateErrorHtml(error: any): string {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  const stackTrace = error instanceof Error ? error.stack : '';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Development Error - SmartSave</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .error-container {
            background: white;
            border: 2px solid #e74c3c;
            border-radius: 10px;
            padding: 20px;
            margin: 20px 0;
        }
        .error-title {
            color: #e74c3c;
            font-size: 24px;
            margin-bottom: 10px;
        }
        .error-message {
            background: #f8d7da;
            border: 1px solid #f5c6cb;
            padding: 10px;
            border-radius: 5px;
            font-family: monospace;
            white-space: pre-wrap;
            margin: 10px 0;
        }
        .stack-trace {
            background: #f1f3f4;
            border: 1px solid #ddd;
            padding: 15px;
            border-radius: 5px;
            font-family: monospace;
            font-size: 12px;
            white-space: pre-wrap;
            max-height: 400px;
            overflow-y: auto;
            margin: 10px 0;
        }
        .dev-notice {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
        }
        .actions {
            margin-top: 20px;
            padding: 15px;
            background: #e8f5e8;
            border-radius: 8px;
        }
        .btn {
            background: #007bff;
            color: white;
            padding: 8px 16px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            text-decoration: none;
            display: inline-block;
            margin: 5px;
        }
        .btn:hover {
            background: #0056b3;
        }
    </style>
</head>
<body>
    <div class="dev-notice">
        <strong>🔧 Development Error Overlay</strong><br>
        This detailed error page is only shown in development mode.
        In production, a generic error page would be displayed instead.
    </div>

    <div class="error-container">
        <div class="error-title">🚨 Application Error</div>

        <h3>Error Message:</h3>
        <div class="error-message">${errorMessage}</div>

        <h3>Stack Trace:</h3>
        <div class="stack-trace">${stackTrace}</div>

        <h3>Error Details:</h3>
        <ul>
            <li><strong>Timestamp:</strong> ${new Date().toISOString()}</li>
            <li><strong>Environment:</strong> Development</li>
            <li><strong>Node Version:</strong> ${process.version}</li>
            <li><strong>Platform:</strong> ${process.platform}</li>
        </ul>
    </div>

    <div class="actions">
        <h3>🔧 Development Actions:</h3>
        <a href="javascript:window.location.reload()" class="btn">🔄 Reload Page</a>
        <a href="/api/health" class="btn">🏥 Check Health</a>
        <a href="/api/docs" class="btn">📖 API Docs</a>
        <a href="http://localhost:3002" class="btn">📊 Monitoring</a>

        <h4>Quick Commands:</h4>
        <ul>
            <li><code>npm run dev</code> - Restart development server</li>
            <li><code>npm run lint:fix</code> - Fix code style issues</li>
            <li><code>npm run type-check</code> - Check TypeScript types</li>
            <li><code>npm run test</code> - Run tests to verify fixes</li>
        </ul>
    </div>

    <footer style="text-align: center; margin-top: 50px; color: #666;">
        <p>SmartSave Development Environment</p>
        <p>This error page is for debugging purposes only</p>
    </footer>
</body>
</html>`;
}
