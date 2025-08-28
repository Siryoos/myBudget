import type { NextRequest, NextResponse } from 'next/server';

import { monitoringService } from '@/lib/services/monitoring-service';

export interface MonitoredRequest extends NextRequest {
  monitoring?: {
    startTime: number;
    endpoint: string;
    method: string;
  };
}

export interface MonitoredResponse extends NextResponse {
  monitoring?: {
    statusCode: number;
    responseTime: number;
  };
}

/**
 * Wraps a request handler to capture and record API metrics and errors.
 *
 * The returned middleware records request start time, endpoint, HTTP method, response status and duration,
 * extracts user context (x-user-id, user-agent, x-forwarded-for) from headers, and forwards those values to the monitoring service.
 * On success it records API metrics and, in development mode, injects `x-response-time` and `x-request-id` headers into the response.
 * On failure it records error metrics (including error message and stack when available) and re-throws the error.
 *
 * @param handler - The original request handler to wrap. It receives a `MonitoredRequest` (augmented with monitoring metadata) and must return a `NextResponse`.
 * @returns A handler function with identical signature that adds monitoring around the original handler.
 */
export function withMonitoring(
  handler: (request: MonitoredRequest) => Promise<NextResponse>,
) {
  return async (request: MonitoredRequest): Promise<NextResponse> => {
    const startTime = Date.now();
    const url = new URL(request.url);
    const endpoint = url.pathname;
    const method = request.method;

    // Add monitoring data to request
    request.monitoring = {
      startTime,
      endpoint,
      method,
    };

    try {
      // Call the original handler
      const response = await handler(request);

      // Record metrics
      const responseTime = Date.now() - startTime;
      const statusCode = response.status;

      // Extract user info from headers (set by auth middleware)
      const userId = request.headers.get('x-user-id') || undefined;
      const userAgent = request.headers.get('user-agent') || undefined;
      const forwardedFor = request.headers.get('x-forwarded-for');
      const ipAddress = forwardedFor ? forwardedFor.split(',')[0].trim() : undefined;

      monitoringService.recordApiMetrics({
        endpoint,
        method,
        statusCode,
        responseTime,
        userId,
        userAgent,
        ipAddress,
      });

      // Add monitoring data to response for debugging
      if (process.env.NODE_ENV === 'development') {
        response.headers.set('x-response-time', `${responseTime}ms`);
        response.headers.set('x-request-id', `req_${Date.now()}`);
      }

      return response;

    } catch (error) {
      // Record error metrics
      const responseTime = Date.now() - startTime;

      const userId = request.headers.get('x-user-id') || undefined;
      const userAgent = request.headers.get('user-agent') || undefined;
      const forwardedFor = request.headers.get('x-forwarded-for');
      const ipAddress = forwardedFor ? forwardedFor.split(',')[0].trim() : undefined;

      monitoringService.recordErrorMetrics({
        endpoint,
        method,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        userId,
        userAgent,
        ipAddress,
      });

      // Re-throw the error so it can be handled by the error handler
      throw error;
    }
  };
}

/**
 * Wraps a request handler to measure and report API performance metrics.
 *
 * The returned async handler records response time, an estimated database query count,
 * and current heap memory (heapUsed) to monitoringService.recordPerformanceMetrics for both
 * successful and failing executions. Any error thrown by the wrapped handler is re-thrown.
 *
 * @param handler - Request handler that accepts a MonitoredRequest and returns a Promise<NextResponse>.
 * @returns An async handler that instruments performance and delegates to `handler`.
 */
export function withPerformanceMonitoring(
  handler: (request: MonitoredRequest) => Promise<NextResponse>,
) {
  return async (request: MonitoredRequest): Promise<NextResponse> => {
    const startTime = Date.now();
    const url = new URL(request.url);
    const endpoint = url.pathname;
    const method = request.method;

    // Track database queries (this would need to be integrated with your database client)
    let queryCount = 0;

    // You could wrap the database query function to count queries
    // For now, we'll use a simple estimate based on endpoint patterns
    if (endpoint.includes('/goals') || endpoint.includes('/transactions') || endpoint.includes('/budgets')) {
      queryCount = endpoint.includes('/list') || endpoint.includes('/') && !endpoint.includes('/id') ? 3 : 1;
    }

    try {
      const response = await handler(request);
      const responseTime = Date.now() - startTime;

      monitoringService.recordPerformanceMetrics({
        endpoint,
        method,
        responseTime,
        databaseQueries: queryCount,
        memoryUsage: process.memoryUsage().heapUsed,
      });

      return response;

    } catch (error) {
      const responseTime = Date.now() - startTime;

      monitoringService.recordPerformanceMetrics({
        endpoint,
        method,
        responseTime,
        databaseQueries: queryCount,
        memoryUsage: process.memoryUsage().heapUsed,
      });

      throw error;
    }
  };
}

/**
 * Composes monitoring and performance middleware around a request handler.
 *
 * Wraps `handler` first with performance monitoring and then with API/error monitoring,
 * returning a new handler that records performance metrics, API metrics, and errors.
 *
 * @param handler - The original request handler that accepts a MonitoredRequest and returns a NextResponse.
 * @returns A handler function with both monitoring and performance instrumentation applied.
 */
export function withFullMonitoring(
  handler: (request: MonitoredRequest) => Promise<NextResponse>,
) {
  return withMonitoring(withPerformanceMonitoring(handler));
}

/**
 * Retrieves health status from the monitoring service and falls back to a safe "unhealthy" payload on error.
 *
 * Calls `monitoringService.getHealthStatus()` and returns its result. If that call throws, the function logs the error and returns a fallback object:
 * `{ status: 'unhealthy', uptime: number, memoryUsage: NodeJS.MemoryUsage, metrics: null, error: string }`.
 *
 * @returns The health status returned by the monitoring service or a fallback unhealthy status object containing `status`, `uptime`, `memoryUsage`, `metrics`, and an `error` message.
 */
export async function getHealthData() {
  try {
    return await monitoringService.getHealthStatus();
  } catch (error) {
    console.error('Failed to get health data:', error);
    return {
      status: 'unhealthy' as const,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      metrics: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
