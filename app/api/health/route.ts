import { NextRequest, NextResponse } from 'next/server';

import { query } from '@/lib/database';

// Health check status
enum HealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy'
}

// Service health information
interface ServiceHealth {
  name: string;
  status: HealthStatus;
  responseTime: number;
  lastChecked: string;
  details?: any;
  error?: string;
}

// Overall health response
interface HealthResponse {
  status: HealthStatus;
  timestamp: string;
  version: string;
  uptime: number;
  services: {
    database: ServiceHealth;
    redis: ServiceHealth;
    application: ServiceHealth;
  };
  environment: string;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
}

// Health check thresholds
const HEALTH_CHECK_CONFIG = {
  database: {
    timeout: 5000, // 5 seconds
    maxResponseTime: 1000, // 1 second
  },
  redis: {
    timeout: 3000, // 3 seconds
    maxResponseTime: 500, // 500ms
  },
  application: {
    maxResponseTime: 100, // 100ms
  },
};

// Database health check
async function checkDatabaseHealth(): Promise<ServiceHealth> {
  const startTime = Date.now();

  try {
    // Test database connection and basic query
    const result = await query('SELECT 1 as test, NOW() as timestamp');

    const responseTime = Date.now() - startTime;
    const status = responseTime <= HEALTH_CHECK_CONFIG.database.maxResponseTime
      ? HealthStatus.HEALTHY
      : HealthStatus.DEGRADED;

    return {
      name: 'PostgreSQL Database',
      status,
      responseTime,
      lastChecked: new Date().toISOString(),
      details: {
        version: result.rows[0]?.test,
        timestamp: result.rows[0]?.timestamp,
      },
    };
  } catch (error) {
    return {
      name: 'PostgreSQL Database',
      status: HealthStatus.UNHEALTHY,
      responseTime: Date.now() - startTime,
      lastChecked: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// Redis health check
async function checkRedisHealth(): Promise<ServiceHealth> {
  const startTime = Date.now();

  try {
    // For now, return a basic health check since Redis might not be available in Edge Runtime
    return {
      name: 'Redis Cache',
      status: HealthStatus.HEALTHY,
      responseTime: Date.now() - startTime,
      lastChecked: new Date().toISOString(),
      details: {
        note: 'Redis health check not implemented in Edge Runtime',
      },
    };
  } catch (error) {
    return {
      name: 'Redis Cache',
      status: HealthStatus.UNHEALTHY,
      responseTime: Date.now() - startTime,
      lastChecked: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// Application health check
function checkApplicationHealth(): ServiceHealth {
  const startTime = Date.now();

  try {
    // Basic application health check
    const responseTime = Date.now() - startTime;
    const status = responseTime <= HEALTH_CHECK_CONFIG.application.maxResponseTime
      ? HealthStatus.HEALTHY
      : HealthStatus.DEGRADED;

    return {
      name: 'Application Server',
      status,
      responseTime,
      lastChecked: new Date().toISOString(),
      details: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
      },
    };
  } catch (error) {
    return {
      name: 'Application Server',
      status: HealthStatus.UNHEALTHY,
      responseTime: Date.now() - startTime,
      lastChecked: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// Memory usage check
function getMemoryUsage() {
  if (typeof process !== 'undefined' && process.memoryUsage) {
    const memUsage = process.memoryUsage();
    const total = memUsage.heapTotal;
    const used = memUsage.heapUsed;
    const percentage = total > 0 ? (used / total) * 100 : 0;

    return {
      used: Math.round(used / 1024 / 1024), // MB
      total: Math.round(total / 1024 / 1024), // MB
      percentage: Math.round(percentage * 100) / 100,
    };
  }

  return {
    used: 0,
    total: 0,
    percentage: 0,
  };
}

// Main health check endpoint
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const startTime = Date.now();

    // Run health checks in parallel
    const [databaseHealth, redisHealth, applicationHealth] = await Promise.all([
      checkDatabaseHealth(),
      checkRedisHealth(),
      checkApplicationHealth(),
    ]);

    // Determine overall health status
    let overallStatus = [databaseHealth, redisHealth, applicationHealth].every(
      service => service.status === HealthStatus.HEALTHY,
    ) ? HealthStatus.HEALTHY : HealthStatus.DEGRADED;

    // Check if any service is unhealthy
    if ([databaseHealth, redisHealth, applicationHealth].some(
      service => service.status === HealthStatus.UNHEALTHY,
    )) {
      overallStatus = HealthStatus.UNHEALTHY;
    }

    const healthResponse: HealthResponse = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime ? Math.round(process.uptime()) : 0,
      services: {
        database: databaseHealth,
        redis: redisHealth,
        application: applicationHealth,
      },
      environment: process.env.NODE_ENV || 'development',
      memory: getMemoryUsage(),
    };

    const responseTime = Date.now() - startTime;

    // Set appropriate status code based on health
    const statusCode = overallStatus === HealthStatus.HEALTHY ? 200 :
                      overallStatus === HealthStatus.DEGRADED ? 200 : 503;

    return NextResponse.json(healthResponse, {
      status: statusCode,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Response-Time': `${responseTime}ms`,
      },
    });

  } catch (error) {
    console.error('Health check error:', error);

    const errorResponse = {
      status: HealthStatus.UNHEALTHY,
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    };

    return NextResponse.json(errorResponse, {
      status: 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  }
}
