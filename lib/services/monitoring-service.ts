import { query } from '@/lib/database';

// Types for monitoring data
export interface ApiMetrics {
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime: number;
  userId?: string;
  userAgent?: string;
  ipAddress?: string;
  timestamp: Date;
}

export interface ErrorMetrics {
  endpoint: string;
  method: string;
  error: string;
  stack?: string;
  userId?: string;
  userAgent?: string;
  ipAddress?: string;
  timestamp: Date;
}

export interface PerformanceMetrics {
  endpoint: string;
  method: string;
  responseTime: number;
  databaseQueries: number;
  memoryUsage?: number;
  timestamp: Date;
}

export class MonitoringService {
  private static instance: MonitoringService;
  private metrics: ApiMetrics[] = [];
  private errors: ErrorMetrics[] = [];
  private performance: PerformanceMetrics[] = [];
  private maxMetrics = 1000; // Keep last 1000 metrics in memory

  static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService();
    }
    return MonitoringService.instance;
  }

  // Record API metrics
  recordApiMetrics(metrics: Omit<ApiMetrics, 'timestamp'>): void {
    const metric: ApiMetrics = {
      ...metrics,
      timestamp: new Date(),
    };

    this.metrics.push(metric);

    // Keep only the most recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`📊 API: ${metrics.method} ${metrics.endpoint} - ${metrics.statusCode} (${metrics.responseTime}ms)`);
    }
  }

  // Record error metrics
  recordErrorMetrics(metrics: Omit<ErrorMetrics, 'timestamp'>): void {
    const error: ErrorMetrics = {
      ...metrics,
      timestamp: new Date(),
    };

    this.errors.push(error);

    // Keep only the most recent errors
    if (this.errors.length > this.maxMetrics) {
      this.errors = this.errors.slice(-this.maxMetrics);
    }

    // Log to console
    console.error(`❌ ERROR: ${metrics.method} ${metrics.endpoint} - ${metrics.error}`);
  }

  // Record performance metrics
  recordPerformanceMetrics(metrics: Omit<PerformanceMetrics, 'timestamp'>): void {
    const performance: PerformanceMetrics = {
      ...metrics,
      timestamp: new Date(),
    };

    this.performance.push(performance);

    // Keep only the most recent performance metrics
    if (this.performance.length > this.maxMetrics) {
      this.performance = this.performance.slice(-this.maxMetrics);
    }
  }

  // Get API metrics summary
  getApiMetricsSummary(hours: number = 24): {
    totalRequests: number;
    averageResponseTime: number;
    errorRate: number;
    statusCodes: Record<number, number>;
    topEndpoints: Array<{ endpoint: string; count: number }>;
  } {
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    const recentMetrics = this.metrics.filter(m => m.timestamp > cutoffTime);

    const totalRequests = recentMetrics.length;
    const totalResponseTime = recentMetrics.reduce((sum, m) => sum + m.responseTime, 0);
    const averageResponseTime = totalRequests > 0 ? totalResponseTime / totalRequests : 0;

    const errors = recentMetrics.filter(m => m.statusCode >= 400).length;
    const errorRate = totalRequests > 0 ? (errors / totalRequests) * 100 : 0;

    const statusCodes: Record<number, number> = {};
    recentMetrics.forEach(m => {
      statusCodes[m.statusCode] = (statusCodes[m.statusCode] || 0) + 1;
    });

    const endpointCounts: Record<string, number> = {};
    recentMetrics.forEach(m => {
      endpointCounts[m.endpoint] = (endpointCounts[m.endpoint] || 0) + 1;
    });

    const topEndpoints = Object.entries(endpointCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([endpoint, count]) => ({ endpoint, count }));

    return {
      totalRequests,
      averageResponseTime,
      errorRate,
      statusCodes,
      topEndpoints,
    };
  }

  // Get error metrics summary
  getErrorMetricsSummary(hours: number = 24): {
    totalErrors: number;
    topErrors: Array<{ error: string; count: number }>;
    topEndpoints: Array<{ endpoint: string; count: number }>;
  } {
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    const recentErrors = this.errors.filter(e => e.timestamp > cutoffTime);

    const totalErrors = recentErrors.length;

    const errorCounts: Record<string, number> = {};
    recentErrors.forEach(e => {
      errorCounts[e.error] = (errorCounts[e.error] || 0) + 1;
    });

    const topErrors = Object.entries(errorCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([error, count]) => ({ error, count }));

    const endpointCounts: Record<string, number> = {};
    recentErrors.forEach(e => {
      endpointCounts[e.endpoint] = (endpointCounts[e.endpoint] || 0) + 1;
    });

    const topEndpoints = Object.entries(endpointCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([endpoint, count]) => ({ endpoint, count }));

    return {
      totalErrors,
      topErrors,
      topEndpoints,
    };
  }

  // Get performance metrics summary
  getPerformanceMetricsSummary(hours: number = 24): {
    averageResponseTime: number;
    averageDatabaseQueries: number;
    slowestEndpoints: Array<{ endpoint: string; avgTime: number }>;
  } {
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    const recentPerformance = this.performance.filter(p => p.timestamp > cutoffTime);

    const totalResponseTime = recentPerformance.reduce((sum, p) => sum + p.responseTime, 0);
    const averageResponseTime = recentPerformance.length > 0 ? totalResponseTime / recentPerformance.length : 0;

    const totalQueries = recentPerformance.reduce((sum, p) => sum + p.databaseQueries, 0);
    const averageDatabaseQueries = recentPerformance.length > 0 ? totalQueries / recentPerformance.length : 0;

    const endpointTimes: Record<string, { totalTime: number; count: number }> = {};
    recentPerformance.forEach(p => {
      if (!endpointTimes[p.endpoint]) {
        endpointTimes[p.endpoint] = { totalTime: 0, count: 0 };
      }
      endpointTimes[p.endpoint].totalTime += p.responseTime;
      endpointTimes[p.endpoint].count += 1;
    });

    const slowestEndpoints = Object.entries(endpointTimes)
      .map(([endpoint, { totalTime, count }]) => ({
        endpoint,
        avgTime: totalTime / count,
      }))
      .sort((a, b) => b.avgTime - a.avgTime)
      .slice(0, 10);

    return {
      averageResponseTime,
      averageDatabaseQueries,
      slowestEndpoints,
    };
  }

  // Health check
  async getHealthStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    uptime: number;
    memoryUsage: NodeJS.MemoryUsage;
    metrics: {
      api: ReturnType<typeof this.getApiMetricsSummary>;
      errors: ReturnType<typeof this.getErrorMetricsSummary>;
      performance: ReturnType<typeof this.getPerformanceMetricsSummary>;
    };
  }> {
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();

    const apiMetrics = this.getApiMetricsSummary(1); // Last hour
    const errorMetrics = this.getErrorMetricsSummary(1);
    const performanceMetrics = this.getPerformanceMetricsSummary(1);

    // Determine health status
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    if (apiMetrics.errorRate > 5 || performanceMetrics.averageResponseTime > 5000) {
      status = 'degraded';
    }

    if (apiMetrics.errorRate > 10 || performanceMetrics.averageResponseTime > 10000 || errorMetrics.totalErrors > 50) {
      status = 'unhealthy';
    }

    return {
      status,
      uptime,
      memoryUsage,
      metrics: {
        api: apiMetrics,
        errors: errorMetrics,
        performance: performanceMetrics,
      },
    };
  }

  // Save metrics to database (for persistence)
  async saveMetricsToDatabase(): Promise<void> {
    try {
      // Save API metrics
      if (this.metrics.length > 0) {
        const apiMetricsValues = this.metrics.map(m => [
          m.endpoint,
          m.method,
          m.statusCode,
          m.responseTime,
          m.userId || null,
          m.userAgent || null,
          m.ipAddress || null,
          m.timestamp.toISOString(),
        ]);

        await query(`
          INSERT INTO api_metrics (endpoint, method, status_code, response_time, user_id, user_agent, ip_address, timestamp)
          VALUES ${apiMetricsValues.map((_, i) => `($${i * 8 + 1}, $${i * 8 + 2}, $${i * 8 + 3}, $${i * 8 + 4}, $${i * 8 + 5}, $${i * 8 + 6}, $${i * 8 + 7}, $${i * 8 + 8})`).join(', ')}
        `, apiMetricsValues.flat());
      }

      // Save error metrics
      if (this.errors.length > 0) {
        const errorMetricsValues = this.errors.map(e => [
          e.endpoint,
          e.method,
          e.error,
          e.stack || null,
          e.userId || null,
          e.userAgent || null,
          e.ipAddress || null,
          e.timestamp.toISOString(),
        ]);

        await query(`
          INSERT INTO error_metrics (endpoint, method, error, stack, user_id, user_agent, ip_address, timestamp)
          VALUES ${errorMetricsValues.map((_, i) => `($${i * 8 + 1}, $${i * 8 + 2}, $${i * 8 + 3}, $${i * 8 + 4}, $${i * 8 + 5}, $${i * 8 + 6}, $${i * 8 + 7}, $${i * 8 + 8})`).join(', ')}
        `, errorMetricsValues.flat());
      }

      // Clear in-memory metrics after saving
      this.metrics = [];
      this.errors = [];

    } catch (error) {
      console.error('Failed to save metrics to database:', error);
    }
  }
}

// Export singleton instance
export const monitoringService = MonitoringService.getInstance();
