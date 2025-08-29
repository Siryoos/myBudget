// Performance metrics types are defined below
import { HTTP_INTERNAL_SERVER_ERROR, HTTP_BAD_REQUEST } from '@/lib/services/error-handler';

/**
 * Performance Monitoring System
 *
 * This module provides comprehensive performance monitoring including:
 * - API response times
 * - Database query performance
 * - Component render times
 * - Memory usage
 * - User interactions
 * - Error tracking
 */

export interface PerformanceMetric {
  id: string;
  type: 'api' | 'database' | 'component' | 'memory' | 'interaction' | 'error';
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  metadata?: Record<string, any>;
  tags?: string[];
}

export interface PerformanceThreshold {
  type: string;
  name: string;
  warning: number;
  critical: number;
  unit: string;
}

export interface PerformanceAlert {
  id: string;
  type: 'warning' | 'critical';
  metric: PerformanceMetric;
  threshold: PerformanceThreshold;
  message: string;
  timestamp: number;
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetric[] = [];
  private thresholds: PerformanceThreshold[] = [];
  private alerts: PerformanceAlert[] = [];
  private isEnabled: boolean;
  private maxMetrics: number;
  private flushInterval: number;
  private flushTimer?: NodeJS.Timeout;

  private constructor() {
    this.isEnabled = process.env.NODE_ENV === 'production' || process.env.ENABLE_PERFORMANCE_MONITORING === 'true';
    this.maxMetrics = parseInt(process.env.MAX_PERFORMANCE_METRICS || '1000');
    this.flushInterval = parseInt(process.env.PERFORMANCE_FLUSH_INTERVAL || '60000'); // 1 minute

    this.initializeThresholds();
    this.startFlushTimer();
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  private initializeThresholds(): void {
    this.thresholds = [
      // API performance thresholds
      {
        type: 'api',
        name: 'response_time',
        warning: 1000, // 1 second
        critical: 3000, // 3 seconds
        unit: 'ms',
      },
      {
        type: 'api',
        name: 'error_rate',
        warning: 5, // 5%
        critical: 10, // 10%
        unit: '%',
      },

      // Database performance thresholds
      {
        type: 'database',
        name: 'query_time',
        warning: 100, // 100ms
        critical: HTTP_INTERNAL_SERVER_ERROR, // 500ms
        unit: 'ms',
      },
      {
        type: 'database',
        name: 'connection_pool_usage',
        warning: 80, // 80%
        critical: 95, // 95%
        unit: '%',
      },

      // Component performance thresholds
      {
        type: 'component',
        name: 'render_time',
        warning: 50, // 50ms
        critical: 100, // 100ms
        unit: 'ms',
      },
      {
        type: 'component',
        name: 're_render_count',
        warning: 5, // 5 re-renders
        critical: 10, // 10 re-renders
        unit: 'count',
      },

      // Memory performance thresholds
      {
        type: 'memory',
        name: 'heap_usage',
        warning: 80, // 80%
        critical: 95, // 95%
        unit: '%',
      },
      {
        type: 'memory',
        name: 'event_listener_count',
        warning: 1000, // 1000 listeners
        critical: 5000, // 5000 listeners
        unit: 'count',
      },
    ];
  }

  /**
   * Record a performance metric
   */
  recordMetric(
    type: PerformanceMetric['type'],
    name: string,
    value: number,
    unit: string,
    metadata?: Record<string, any>,
    tags?: string[],
  ): void {
    if (!this.isEnabled) {return;}

    const metric: PerformanceMetric = {
      id: crypto.randomUUID(),
      type,
      name,
      value,
      unit,
      timestamp: Date.now(),
      metadata,
      tags,
    };

    this.metrics.push(metric);
    this.checkThresholds(metric);
    this.cleanupOldMetrics();
  }

  /**
   * Record API performance metrics
   */
  recordApiMetric(
    endpoint: string,
    method: string,
    responseTime: number,
    statusCode: number,
    metadata?: Record<string, any>,
  ): void {
    this.recordMetric(
      'api',
      'response_time',
      responseTime,
      'ms',
      {
        endpoint,
        method,
        statusCode,
        ...metadata,
      },
      ['api', endpoint, method, statusCode.toString()],
    );

    // Record error rate for non-2xx status codes
    if (statusCode >= HTTP_BAD_REQUEST) {
      this.recordMetric(
        'api',
        'error_rate',
        1,
        'count',
        {
          endpoint,
          method,
          statusCode,
        },
        ['api', 'error', endpoint, method],
      );
    }
  }

  /**
   * Record database performance metrics
   */
  recordDatabaseMetric(
    query: string,
    executionTime: number,
    rowCount: number,
    metadata?: Record<string, any>,
  ): void {
    this.recordMetric(
      'database',
      'query_time',
      executionTime,
      'ms',
      {
        query: query.substring(0, 100), // Truncate long queries
        rowCount,
        ...metadata,
      },
      ['database', 'query'],
    );
  }

  /**
   * Record component performance metrics
   */
  recordComponentMetric(
    componentName: string,
    renderTime: number,
    reRenderCount: number = 0,
    metadata?: Record<string, any>,
  ): void {
    this.recordMetric(
      'component',
      'render_time',
      renderTime,
      'ms',
      {
        componentName,
        reRenderCount,
        ...metadata,
      },
      ['component', componentName],
    );

    if (reRenderCount > 0) {
      this.recordMetric(
        'component',
        're_render_count',
        reRenderCount,
        'count',
        {
          componentName,
        },
        ['component', 're-render', componentName],
      );
    }
  }

  /**
   * Record memory usage metrics
   */
  recordMemoryMetric(): void {
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      const memory = (performance as any).memory;

      if (memory) {
        const heapUsagePercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;

        this.recordMetric(
          'memory',
          'heap_usage',
          heapUsagePercent,
          '%',
          {
            used: memory.usedJSHeapSize,
            total: memory.totalJSHeapSize,
            limit: memory.jsHeapSizeLimit,
          },
          ['memory', 'heap'],
        );
      }
    }
  }

  /**
   * Record user interaction metrics
   */
  recordInteractionMetric(
    action: string,
    duration: number,
    metadata?: Record<string, any>,
  ): void {
    this.recordMetric(
      'interaction',
      'duration',
      duration,
      'ms',
      {
        action,
        ...metadata,
      },
      ['interaction', action],
    );
  }

  /**
   * Record error performance impact
   */
  recordErrorMetric(
    errorType: string,
    recoveryTime: number,
    metadata?: Record<string, any>,
  ): void {
    this.recordMetric(
      'error',
      'recovery_time',
      recoveryTime,
      'ms',
      {
        errorType,
        ...metadata,
      },
      ['error', errorType],
    );
  }

  /**
   * Check if metrics exceed thresholds
   */
  private checkThresholds(metric: PerformanceMetric): void {
    const relevantThresholds = this.thresholds.filter(
      t => t.type === metric.type && t.name === metric.name,
    );

    relevantThresholds.forEach(threshold => {
      if (metric.value >= threshold.critical) {
        this.createAlert('critical', metric, threshold);
      } else if (metric.value >= threshold.warning) {
        this.createAlert('warning', metric, threshold);
      }
    });
  }

  /**
   * Create performance alerts
   */
  private createAlert(
    type: 'warning' | 'critical',
    metric: PerformanceMetric,
    threshold: PerformanceThreshold,
  ): void {
    const alert: PerformanceAlert = {
      id: crypto.randomUUID(),
      type,
      metric,
      threshold,
      message: `${metric.name} exceeded ${type} threshold: ${metric.value}${metric.unit} >= ${threshold[type]}${threshold.unit}`,
      timestamp: Date.now(),
    };

    this.alerts.push(alert);
    this.notifyAlert(alert);
  }

  /**
   * Notify about performance alerts
   */
  private notifyAlert(alert: PerformanceAlert): void {
    if (alert.type === 'critical') {
      console.error('🚨 CRITICAL PERFORMANCE ALERT:', alert.message);

      // In production, send to monitoring service
      if (process.env.NODE_ENV === 'production') {
        this.sendToMonitoringService(alert);
      }
    } else {
      console.warn('⚠️ PERFORMANCE WARNING:', alert.message);
    }
  }

  /**
   * Send alert to external monitoring service
   */
  private async sendToMonitoringService(alert: PerformanceAlert): Promise<void> {
    try {
      // Example: Send to Sentry, DataDog, or custom monitoring service
      if (process.env.MONITORING_WEBHOOK_URL) {
        await fetch(process.env.MONITORING_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(alert),
        });
      }
    } catch (error) {
      console.error('Failed to send alert to monitoring service:', error);
    }
  }

  /**
   * Get performance metrics
   */
  getMetrics(
    type?: PerformanceMetric['type'],
    timeRange?: { start: number; end: number },
  ): PerformanceMetric[] {
    let filtered = this.metrics;

    if (type) {
      filtered = filtered.filter(m => m.type === type);
    }

    if (timeRange) {
      filtered = filtered.filter(
        m => m.timestamp >= timeRange.start && m.timestamp <= timeRange.end,
      );
    }

    return filtered.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): {
    totalMetrics: number;
    alerts: { warning: number; critical: number };
    averages: Record<string, number>;
  } {
    const now = Date.now();
    const lastHour = now - 60 * 60 * 1000;
    const recentMetrics = this.metrics.filter(m => m.timestamp >= lastHour);

    const averages: Record<string, number> = {};
    const metricGroups = this.groupMetricsByName(recentMetrics);

    Object.entries(metricGroups).forEach(([name, metrics]) => {
      const values = metrics.map(m => m.value);
      averages[name] = values.reduce((sum, val) => sum + val, 0) / values.length;
    });

    return {
      totalMetrics: this.metrics.length,
      alerts: {
        warning: this.alerts.filter(a => a.type === 'warning').length,
        critical: this.alerts.filter(a => a.type === 'critical').length,
      },
      averages,
    };
  }

  /**
   * Group metrics by name for analysis
   */
  private groupMetricsByName(metrics: PerformanceMetric[]): Record<string, PerformanceMetric[]> {
    return metrics.reduce((groups, metric) => {
      const key = `${metric.type}:${metric.name}`;
      if (!groups[key]) {groups[key] = [];}
      groups[key].push(metric);
      return groups;
    }, {} as Record<string, PerformanceMetric[]>);
  }

  /**
   * Clean up old metrics to prevent memory issues
   */
  private cleanupOldMetrics(): void {
    if (this.metrics.length > this.maxMetrics) {
      const cutoff = Date.now() - 24 * 60 * 60 * 1000; // 24 hours
      this.metrics = this.metrics.filter(m => m.timestamp > cutoff);
    }
  }

  /**
   * Start periodic flush timer
   */
  private startFlushTimer(): void {
    if (this.flushInterval > 0) {
      this.flushTimer = setInterval(() => {
        this.flushMetrics();
      }, this.flushInterval);
    }
  }

  /**
   * Flush metrics to external service
   */
  private async flushMetrics(): Promise<void> {
    if (this.metrics.length === 0) {return;}

    try {
      // Example: Send to monitoring service
      if (process.env.METRICS_ENDPOINT_URL) {
        const batch = {
          timestamp: Date.now(),
          metrics: this.metrics,
        };

        await fetch(process.env.METRICS_ENDPOINT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(batch),
        });

        // Clear sent metrics
        this.metrics = [];
      }
    } catch (error) {
      console.error('Failed to flush metrics:', error);
    }
  }

  /**
   * Enable/disable monitoring
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Get monitoring status
   */
  isMonitoringEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Clear all metrics and alerts
   */
  clear(): void {
    this.metrics = [];
    this.alerts = [];
  }

  /**
   * Destroy monitor and cleanup
   */
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.clear();
  }
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();

// Convenience functions for common metrics
export const recordApiPerformance = (
  endpoint: string,
  method: string,
  responseTime: number,
  statusCode: number,
  metadata?: Record<string, any>,
) => performanceMonitor.recordApiMetric(endpoint, method, responseTime, statusCode, metadata);

export const recordDatabasePerformance = (
  query: string,
  executionTime: number,
  rowCount: number,
  metadata?: Record<string, any>,
) => performanceMonitor.recordDatabaseMetric(query, executionTime, rowCount, metadata);

export const recordComponentPerformance = (
  componentName: string,
  renderTime: number,
  reRenderCount?: number,
  metadata?: Record<string, any>,
) => performanceMonitor.recordComponentMetric(componentName, renderTime, reRenderCount, metadata);

export const recordInteractionPerformance = (
  action: string,
  duration: number,
  metadata?: Record<string, any>,
) => performanceMonitor.recordInteractionMetric(action, duration, metadata);
