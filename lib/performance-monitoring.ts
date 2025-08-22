import { performance } from 'perf_hooks';
import { getPool } from './database';
import { getRedisClient } from './redis';

// Performance metrics interface
export interface PerformanceMetrics {
  timestamp: string;
  requestId: string;
  endpoint: string;
  method: string;
  responseTime: number;
  memoryUsage: NodeJS.MemoryUsage;
  databaseQueries: number;
  databaseTime: number;
  redisOperations: number;
  redisTime: number;
  statusCode: number;
  userAgent?: string;
  ipAddress?: string;
}

// Performance thresholds
export interface PerformanceThresholds {
  responseTime: {
    warning: number; // milliseconds
    critical: number; // milliseconds
  };
  memoryUsage: {
    warning: number; // percentage
    critical: number; // percentage
  };
  databaseQueries: {
    warning: number;
    critical: number;
  };
}

// Default thresholds
const DEFAULT_THRESHOLDS: PerformanceThresholds = {
  responseTime: {
    warning: 1000, // 1 second
    critical: 3000 // 3 seconds
  },
  memoryUsage: {
    warning: 80, // 80%
    critical: 90 // 90%
  },
  databaseQueries: {
    warning: 10,
    critical: 20
  }
};

// Performance monitoring class
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetrics[] = [];
  private thresholds: PerformanceThresholds;
  private isEnabled: boolean;
  private maxMetrics: number;

  private constructor() {
    this.thresholds = DEFAULT_THRESHOLDS;
    this.isEnabled = process.env.PERFORMANCE_MONITORING_ENABLED !== 'false';
    this.maxMetrics = parseInt(process.env.MAX_PERFORMANCE_METRICS || '1000');
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  // Start monitoring a request
  startMonitoring(requestId: string, endpoint: string, method: string): string {
    if (!this.isEnabled) return '';

    const startTime = performance.now();
    const startMemory = process.memoryUsage();
    
    // Store monitoring context
    const context = {
      requestId,
      endpoint,
      method,
      startTime,
      startMemory,
      databaseQueries: 0,
      databaseTime: 0,
      redisOperations: 0,
      redisTime: 0
    };

    // Store in global context for this request
    (global as any).__performanceContext = context;
    
    return requestId;
  }

  // Record database operation
  recordDatabaseOperation(query: string, duration: number): void {
    if (!this.isEnabled) return;

    const context = (global as any).__performanceContext;
    if (context) {
      context.databaseQueries++;
      context.databaseTime += duration;
    }
  }

  // Record Redis operation
  recordRedisOperation(operation: string, duration: number): void {
    if (!this.isEnabled) return;

    const context = (global as any).__performanceContext;
    if (context) {
      context.redisOperations++;
      context.redisTime += duration;
    }
  }

  // Stop monitoring and record metrics
  stopMonitoring(
    requestId: string,
    statusCode: number,
    userAgent?: string,
    ipAddress?: string
  ): PerformanceMetrics | null {
    if (!this.isEnabled) return null;

    const context = (global as any).__performanceContext;
    if (!context || context.requestId !== requestId) return null;

    const endTime = performance.now();
    const endMemory = process.memoryUsage();
    
    const metrics: PerformanceMetrics = {
      timestamp: new Date().toISOString(),
      requestId,
      endpoint: context.endpoint,
      method: context.method,
      responseTime: endTime - context.startTime,
      memoryUsage: endMemory,
      databaseQueries: context.databaseQueries,
      databaseTime: context.databaseTime,
      redisOperations: context.redisOperations,
      redisTime: context.redisTime,
      statusCode,
      userAgent,
      ipAddress
    };

    // Store metrics
    this.storeMetrics(metrics);

    // Check thresholds and alert if needed
    this.checkThresholds(metrics);

    // Clean up context
    delete (global as any).__performanceContext;

    return metrics;
  }

  // Store performance metrics
  private storeMetrics(metrics: PerformanceMetrics): void {
    this.metrics.push(metrics);
    
    // Keep only the latest metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // Store in Redis for persistence (optional)
    this.persistMetrics(metrics);
  }

  // Persist metrics to Redis
  private async persistMetrics(metrics: PerformanceMetrics): Promise<void> {
    try {
      const redis = getRedisClient();
      const key = `performance:${metrics.requestId}`;
      const ttl = 24 * 60 * 60; // 24 hours
      
      await redis.setex(key, ttl, JSON.stringify(metrics));
    } catch (error) {
      console.warn('Failed to persist performance metrics:', error);
    }
  }

  // Check performance thresholds
  private checkThresholds(metrics: PerformanceMetrics): void {
    // Check response time
    if (metrics.responseTime > this.thresholds.responseTime.critical) {
      this.alert('CRITICAL', 'Response time exceeded critical threshold', metrics);
    } else if (metrics.responseTime > this.thresholds.responseTime.warning) {
      this.alert('WARNING', 'Response time exceeded warning threshold', metrics);
    }

    // Check memory usage
    const memoryPercentage = (metrics.memoryUsage.heapUsed / metrics.memoryUsage.heapTotal) * 100;
    if (memoryPercentage > this.thresholds.memoryUsage.critical) {
      this.alert('CRITICAL', 'Memory usage exceeded critical threshold', metrics);
    } else if (memoryPercentage > this.thresholds.memoryUsage.warning) {
      this.alert('WARNING', 'Memory usage exceeded warning threshold', metrics);
    }

    // Check database queries
    if (metrics.databaseQueries > this.thresholds.databaseQueries.critical) {
      this.alert('CRITICAL', 'Database queries exceeded critical threshold', metrics);
    } else if (metrics.databaseQueries > this.thresholds.databaseQueries.warning) {
      this.alert('WARNING', 'Database queries exceeded warning threshold', metrics);
    }
  }

  // Send performance alerts
  private alert(level: string, message: string, metrics: PerformanceMetrics): void {
    const alert = {
      level,
      message,
      timestamp: new Date().toISOString(),
      metrics: {
        endpoint: metrics.endpoint,
        responseTime: metrics.responseTime,
        databaseQueries: metrics.databaseQueries,
        memoryUsage: metrics.memoryUsage
      }
    };

    console.warn(`[PERFORMANCE ${level}] ${message}`, alert);

    // In production, send to monitoring service
    if (process.env.NODE_ENV === 'production') {
      this.sendToMonitoringService(alert);
    }
  }

  // Send to external monitoring service
  private async sendToMonitoringService(alert: any): Promise<void> {
    try {
      // Example: Send to DataDog, New Relic, or custom monitoring service
      const monitoringUrl = process.env.MONITORING_WEBHOOK_URL;
      if (monitoringUrl) {
        await fetch(monitoringUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(alert)
        });
      }
    } catch (error) {
      console.error('Failed to send alert to monitoring service:', error);
    }
  }

  // Get performance statistics
  getStatistics(timeRange: '1h' | '24h' | '7d' = '24h'): {
    totalRequests: number;
    averageResponseTime: number;
    slowestEndpoints: Array<{ endpoint: string; avgTime: number; count: number }>;
    memoryTrend: Array<{ timestamp: string; usage: number }>;
    databasePerformance: { totalQueries: number; averageTime: number };
    redisPerformance: { totalOperations: number; averageTime: number };
  } {
    const now = Date.now();
    let cutoffTime: number;

    switch (timeRange) {
      case '1h':
        cutoffTime = now - 60 * 60 * 1000;
        break;
      case '24h':
        cutoffTime = now - 24 * 60 * 60 * 1000;
        break;
      case '7d':
        cutoffTime = now - 7 * 24 * 60 * 60 * 1000;
        break;
      default:
        cutoffTime = now - 24 * 60 * 60 * 1000;
    }

    const recentMetrics = this.metrics.filter(m => 
      new Date(m.timestamp).getTime() > cutoffTime
    );

    if (recentMetrics.length === 0) {
      return {
        totalRequests: 0,
        averageResponseTime: 0,
        slowestEndpoints: [],
        memoryTrend: [],
        databasePerformance: { totalQueries: 0, averageTime: 0 },
        redisPerformance: { totalOperations: 0, averageTime: 0 }
      };
    }

    // Calculate statistics
    const totalRequests = recentMetrics.length;
    const averageResponseTime = recentMetrics.reduce((sum, m) => sum + m.responseTime, 0) / totalRequests;

    // Slowest endpoints
    const endpointStats = new Map<string, { totalTime: number; count: number }>();
    recentMetrics.forEach(m => {
      const existing = endpointStats.get(m.endpoint) || { totalTime: 0, count: 0 };
      existing.totalTime += m.responseTime;
      existing.count++;
      endpointStats.set(m.endpoint, existing);
    });

    const slowestEndpoints = Array.from(endpointStats.entries())
      .map(([endpoint, stats]) => ({
        endpoint,
        avgTime: stats.totalTime / stats.count,
        count: stats.count
      }))
      .sort((a, b) => b.avgTime - a.avgTime)
      .slice(0, 10);

    // Memory trend
    const memoryTrend = recentMetrics
      .filter((_, index) => index % Math.max(1, Math.floor(totalRequests / 20)) === 0)
      .map(m => ({
        timestamp: m.timestamp,
        usage: (m.memoryUsage.heapUsed / m.memoryUsage.heapTotal) * 100
      }));

    // Database performance
    const totalDatabaseQueries = recentMetrics.reduce((sum, m) => sum + m.databaseQueries, 0);
    const totalDatabaseTime = recentMetrics.reduce((sum, m) => sum + m.databaseTime, 0);
    const averageDatabaseTime = totalDatabaseQueries > 0 ? totalDatabaseTime / totalDatabaseQueries : 0;

    // Redis performance
    const totalRedisOperations = recentMetrics.reduce((sum, m) => sum + m.redisOperations, 0);
    const totalRedisTime = recentMetrics.reduce((sum, m) => sum + m.redisTime, 0);
    const averageRedisTime = totalRedisOperations > 0 ? totalRedisTime / totalRedisOperations : 0;

    return {
      totalRequests,
      averageResponseTime,
      slowestEndpoints,
      memoryTrend,
      databasePerformance: {
        totalQueries: totalDatabaseQueries,
        averageTime: averageDatabaseTime
      },
      redisPerformance: {
        totalOperations: totalRedisOperations,
        averageTime: averageRedisTime
      }
    };
  }

  // Get real-time metrics
  getRealTimeMetrics(): {
    currentMemoryUsage: number;
    activeRequests: number;
    databaseConnections: number;
    redisConnections: number;
  } {
    const currentMemory = process.memoryUsage();
    const memoryPercentage = (currentMemory.heapUsed / currentMemory.heapTotal) * 100;

    // Count active requests (requests with context)
    const activeRequests = (global as any).__performanceContext ? 1 : 0;

    // Get database connection info
    const pool = getPool();
    const databaseConnections = pool.totalCount - pool.idleCount;

    // Redis connection info (simplified)
    const redisConnections = 1; // Assuming single Redis connection

    return {
      currentMemoryUsage: Math.round(memoryPercentage * 100) / 100,
      activeRequests,
      databaseConnections,
      redisConnections
    };
  }

  // Update thresholds
  updateThresholds(newThresholds: Partial<PerformanceThresholds>): void {
    this.thresholds = { ...this.thresholds, ...newThresholds };
  }

  // Enable/disable monitoring
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  // Clear metrics
  clearMetrics(): void {
    this.metrics = [];
  }

  // Export metrics for analysis
  exportMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }
}

// Singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();

// Convenience functions
export const startPerformanceMonitoring = (
  requestId: string,
  endpoint: string,
  method: string
): string => {
  return performanceMonitor.startMonitoring(requestId, endpoint, method);
};

export const stopPerformanceMonitoring = (
  requestId: string,
  statusCode: number,
  userAgent?: string,
  ipAddress?: string
): PerformanceMetrics | null => {
  return performanceMonitor.stopMonitoring(requestId, statusCode, userAgent, ipAddress);
};

export const recordDatabaseOperation = (query: string, duration: number): void => {
  performanceMonitor.recordDatabaseOperation(query, duration);
};

export const recordRedisOperation = (operation: string, duration: number): void => {
  performanceMonitor.recordRedisOperation(operation, duration);
};

// Performance monitoring middleware
export const withPerformanceMonitoring = (handler: Function) => {
  return async (request: NextRequest) => {
    const requestId = crypto.randomUUID();
    const endpoint = request.nextUrl.pathname;
    const method = request.method;

    // Start monitoring
    startPerformanceMonitoring(requestId, endpoint, method);

    try {
      // Execute handler
      const response = await handler(request);

      // Stop monitoring
      stopPerformanceMonitoring(
        requestId,
        response.status,
        request.headers.get('user-agent'),
        request.ip || request.headers.get('x-forwarded-for')
      );

      return response;
    } catch (error) {
      // Stop monitoring with error status
      stopPerformanceMonitoring(requestId, 500);

      throw error;
    }
  };
};
