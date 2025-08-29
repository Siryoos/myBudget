import type { NextRequest } from 'next/server';

import { query } from '@/lib/database';
import { getHealthData } from '@/lib/middleware/monitoring';
import { createSuccessResponse, generateRequestId, HTTP_SERVICE_UNAVAILABLE } from '@/lib/services/error-handler';

// Ensure this route is never statically evaluated or prerendered
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const GET = async (request: NextRequest) => {
  const requestId = generateRequestId();

  try {
    // Short-circuit during build to avoid DB/Redis access
    if (process.env.SKIP_DB_VALIDATION === 'true') {
      const buildTimeResponse = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        database: {
          healthy: true,
          latency: 0,
        },
        build: {
          note: 'Build-time health check placeholder (DB disabled)',
        },
      } as const;
      return createSuccessResponse(buildTimeResponse, requestId);
    }

    // Get monitoring health data
    const healthData = await getHealthData();

    // Additional database health check
    let databaseHealthy = true;
    let databaseLatency = 0;

    try {
      const dbStartTime = Date.now();
      await query('SELECT 1 as health_check');
      databaseLatency = Date.now() - dbStartTime;
    } catch (error) {
      databaseHealthy = false;
      console.error('Database health check failed:', error);
    }

    // Combine health data
    const response = {
      ...healthData,
      database: {
        healthy: databaseHealthy,
        latency: databaseLatency,
      },
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    };

    // Determine overall status
    const overallStatus = healthData.status === 'healthy' && databaseHealthy ? 'healthy' :
                         healthData.status === 'unhealthy' || !databaseHealthy ? 'unhealthy' : 'degraded';

    return createSuccessResponse({
      ...response,
      status: overallStatus,
    }, requestId);

  } catch (error) {
    console.error('Health check failed:', error);

    return createSuccessResponse({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Health check failed',
      timestamp: new Date().toISOString(),
    }, requestId, HTTP_SERVICE_UNAVAILABLE); // Service Unavailable
  }
};
