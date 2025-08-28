import { NextRequest, NextResponse } from 'next/server';
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

// Middleware to track API metrics
export function withMonitoring(
  handler: (request: MonitoredRequest) => Promise<NextResponse>
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

// Middleware to track performance metrics
export function withPerformanceMonitoring(
  handler: (request: MonitoredRequest) => Promise<NextResponse>
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

// Combined middleware that includes both monitoring and performance tracking
export function withFullMonitoring(
  handler: (request: MonitoredRequest) => Promise<NextResponse>
) {
  return withMonitoring(withPerformanceMonitoring(handler));
}

// Health check endpoint data
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
