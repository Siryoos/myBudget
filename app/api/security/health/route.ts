import { NextRequest, NextResponse } from 'next/server';

import { checkRedisHealth } from '@/lib/redis';
import { securityMonitor } from '@/middleware/security';

export async function GET(request: NextRequest): Promise<NextResponse> {
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
      status: isHealthy ? 200 : 503,
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
        status: 500,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      },
    );
  }
}

