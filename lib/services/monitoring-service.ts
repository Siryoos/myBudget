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

// Constants
const MINUTES_IN_HOUR = 60;
const SECONDS_IN_MINUTE = 60;
const MS_IN_SECOND = 1000;
const DEFAULT_HOURS = 24;
const MAX_METRICS = 1000;
const TOP_ITEMS_COUNT = 10;
const HTTP_BAD_REQUEST = 400;
const PERCENTAGE_MULTIPLIER = 100;
const MAX_RESPONSE_TIME_GOOD = 5000;
const MAX_RESPONSE_TIME_OK = 10000;
const MAX_ERROR_RATE_GOOD = 50;

export class MonitoringService {
  private static instance: MonitoringService;
  private metrics: ApiMetrics[] = [];
  private errors: ErrorMetrics[] = [];
  private performance: PerformanceMetrics[] = [];
  private maxMetrics = MAX_METRICS; // Keep last 1000 metrics in memory

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
      // console.log(`📊 API: ${metrics.method} ${metrics.endpoint} - ${metrics.statusCode} (${metrics.responseTime}ms)`);
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
  getApiMetricsSummary(hours = DEFAULT_HOURS): {
    totalRequests: number;
    averageResponseTime: number;
    errorRate: number;
    statusCodes: Record<number, number>;
    topEndpoints: Array<{ endpoint: string; count: number }>;
  } {
    const cutoffTime = new Date(Date.now() - hours * MINUTES_IN_HOUR * SECONDS_IN_MINUTE * MS_IN_SECOND);
    const recentMetrics = this.metrics.filter(m => m.timestamp > cutoffTime);

    const totalRequests = recentMetrics.length;
    const totalResponseTime = recentMetrics.reduce((sum, m) => sum + m.responseTime, 0);
    const averageResponseTime = totalRequests > 0 ? totalResponseTime / totalRequests : 0;

    const errors = recentMetrics.filter(m => m.statusCode >= HTTP_BAD_REQUEST).length;
    const errorRate = totalRequests > 0 ? (errors / totalRequests) * PERCENTAGE_MULTIPLIER : 0;

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
      .slice(0, TOP_ITEMS_COUNT)
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
  getErrorMetricsSummary(hours = DEFAULT_HOURS): {
    totalErrors: number;
    topErrors: Array<{ error: string; count: number }>;
    topEndpoints: Array<{ endpoint: string; count: number }>;
  } {
    const cutoffTime = new Date(Date.now() - hours * MINUTES_IN_HOUR * SECONDS_IN_MINUTE * MS_IN_SECOND);
    const recentErrors = this.errors.filter(e => e.timestamp > cutoffTime);

    const totalErrors = recentErrors.length;

    const errorCounts: Record<string, number> = {};
    recentErrors.forEach(e => {
      errorCounts[e.error] = (errorCounts[e.error] || 0) + 1;
    });

    const topErrors = Object.entries(errorCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, TOP_ITEMS_COUNT)
      .map(([error, count]) => ({ error, count }));

    const endpointCounts: Record<string, number> = {};
    recentErrors.forEach(e => {
      endpointCounts[e.endpoint] = (endpointCounts[e.endpoint] || 0) + 1;
    });

    const topEndpoints = Object.entries(endpointCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, TOP_ITEMS_COUNT)
      .map(([endpoint, count]) => ({ endpoint, count }));

    return {
      totalErrors,
      topErrors,
      topEndpoints,
    };
  }

  // Get performance metrics summary
  getPerformanceMetricsSummary(hours = DEFAULT_HOURS): {
    averageResponseTime: number;
    averageDatabaseQueries: number;
    slowestEndpoints: Array<{ endpoint: string; avgTime: number }>;
  } {
    const cutoffTime = new Date(Date.now() - hours * MINUTES_IN_HOUR * SECONDS_IN_MINUTE * MS_IN_SECOND);
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
      .slice(0, TOP_ITEMS_COUNT);

    return {
      averageResponseTime,
      averageDatabaseQueries,
      slowestEndpoints,
    };
  }

  // Health check
  getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    uptime: number;
    memoryUsage: NodeJS.MemoryUsage;
    metrics: {
      api: ReturnType<typeof this.getApiMetricsSummary>;
      errors: ReturnType<typeof this.getErrorMetricsSummary>;
      performance: ReturnType<typeof this.getPerformanceMetricsSummary>;
    };
  } {
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();

    const LAST_HOUR = 1;
    const apiMetrics = this.getApiMetricsSummary(LAST_HOUR); // Last hour
    const errorMetrics = this.getErrorMetricsSummary(LAST_HOUR);
    const performanceMetrics = this.getPerformanceMetricsSummary(LAST_HOUR);

    // Determine health status
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    const ERROR_RATE_THRESHOLD = 5;
    if (apiMetrics.errorRate > ERROR_RATE_THRESHOLD || performanceMetrics.averageResponseTime > MAX_RESPONSE_TIME_GOOD) {
      status = 'degraded';
    }

    const CRITICAL_ERROR_RATE = 10;
    const MIN_ERROR_THRESHOLD = 50;
    if (apiMetrics.errorRate > CRITICAL_ERROR_RATE || performanceMetrics.averageResponseTime > MAX_RESPONSE_TIME_OK || errorMetrics.totalErrors > MIN_ERROR_THRESHOLD) {
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
          VALUES ${apiMetricsValues.map((_, i) => {
            const FIELDS_PER_METRIC = 8;
            const baseIndex = i * FIELDS_PER_METRIC;
            return `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5}, $${baseIndex + 6}, $${baseIndex + 7}, $${baseIndex + 8})`;
          }).join(', ')}
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
          VALUES ${errorMetricsValues.map((_, i) => {
            const FIELDS_PER_ERROR = 8;
            const baseIndex = i * FIELDS_PER_ERROR;
            return `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5}, $${baseIndex + 6}, $${baseIndex + 7}, $${baseIndex + 8})`;
          }).join(', ')}
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
