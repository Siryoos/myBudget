import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { checkRedisHealth } from '@/lib/redis';
import { securityMonitor } from '@/middleware/security';
import { HTTP_OK, HTTP_SERVICE_UNAVAILABLE, HTTP_INTERNAL_SERVER_ERROR } from '@/lib/services/error-handler';

// Ensure this route is never statically evaluated or prerendered
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest): Promise<NextResponse> {
  // Skip execution during build time
  if (process.env.SKIP_DB_VALIDATION === 'true') {
    return NextResponse.json(
      {
        status: 'healthy',
        message: 'Build-time health check - services not available',
        timestamp: new Date().toISOString(),
      },
      { status: HTTP_OK }
    );
  }

  try {
    const metrics = securityMonitor.getMetrics();

    // Check Redis health dynamically
    let redisHealth: { healthy: boolean; latency?: number; error: string } = {
      healthy: false,
      latency: undefined,
      error: 'Not checked',
    };
    try {
      const healthResult = await checkRedisHealth();
      redisHealth = {
        healthy: healthResult.healthy,
        latency: healthResult.latency,
        error: healthResult.error || 'Unknown error',
      };
    } catch (error) {
      console.error('Failed to check Redis health:', error);
      redisHealth = {
        healthy: false,
        latency: undefined,
        error: 'Health check failed',
      };
    }

    const isHealthy = redisHealth.healthy;
    const health = {
      status: isHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      metrics,
      environment: {
        nodeEnv: process.env.NODE_ENV,
        allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',').length || 0,
        secureMode: process.env.REDIS_SECURE_MODE !== 'false',
      },
      redis: {
        available: redisHealth.healthy,
        latency: redisHealth.latency,
        error: redisHealth.error,
      },
    };

    return NextResponse.json(health, {
      status: isHealthy ? HTTP_OK : HTTP_SERVICE_UNAVAILABLE,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: 'Health check failed',
        timestamp: new Date().toISOString(),
      },
      {
        status: HTTP_INTERNAL_SERVER_ERROR,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      },
    );
  }
}
