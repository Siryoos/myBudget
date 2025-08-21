import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { validateJWTSecret } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Validate JWT_SECRET on startup
    validateJWTSecret();
    
    // Check database connection
    const dbResult = await query('SELECT 1 as status');
    const dbStatus = dbResult.rows.length > 0 ? 'healthy' : 'unhealthy';
    
    // Check if we can perform a basic query
    const healthResult = await query('SELECT health_check() as status');
    const healthStatus = healthResult.rows[0]?.status === 'OK' ? 'healthy' : 'unhealthy';
    
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        api: 'healthy',
        database: dbStatus,
        health_check: healthStatus,
        jwt: 'healthy'
      },
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    };
    
    // Overall status
    const overallStatus = Object.values(health.services).every(status => status === 'healthy') 
      ? 'healthy' 
      : 'degraded';
    
    health.status = overallStatus;
    
    const statusCode = overallStatus === 'healthy' ? 200 : 503;
    
    return NextResponse.json(health, { status: statusCode });
    
  } catch (error) {
    console.error('Health check failed:', error);
    
    const health = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        api: 'healthy',
        database: 'unhealthy',
        health_check: 'unhealthy',
        jwt: 'unhealthy'
      },
      error: error instanceof Error ? error.message : 'Unknown error',
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    };
    
    return NextResponse.json(health, { status: 503 });
  }
}
