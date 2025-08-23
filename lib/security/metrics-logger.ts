import { logSystemEvent, AuditEventType, AuditSeverity } from '../audit-logging';

// Security metric types
export interface SecurityMetric {
  id: string;
  timestamp: string;
  type: 'request' | 'response' | 'error' | 'violation' | 'performance';
  endpoint: string;
  method: string;
  ipAddress: string;
  userAgent?: string;
  userId?: string;
  sessionId?: string;
  statusCode?: number;
  responseTime?: number;
  headers?: Record<string, string>;
  metadata: Record<string, any>;
}

// Security metrics configuration
export interface SecurityMetricsConfig {
  enabled: boolean;
  logLevel: 'info' | 'warn' | 'error';
  includeHeaders: boolean;
  includeUserAgent: boolean;
  includeMetadata: boolean;
  batchSize: number;
  flushInterval: number; // milliseconds
  retentionDays: number;
  exportFormat: 'json' | 'csv' | 'logfmt';
}

// Default configuration
const DEFAULT_CONFIG: SecurityMetricsConfig = {
  enabled: process.env.SECURITY_METRICS_LOGGING !== 'false',
  logLevel: (process.env.SECURITY_METRICS_LOG_LEVEL as 'info' | 'warn' | 'error') || 'info',
  includeHeaders: process.env.SECURITY_METRICS_INCLUDE_HEADERS !== 'false',
  includeUserAgent: process.env.SECURITY_METRICS_INCLUDE_USER_AGENT !== 'false',
  includeMetadata: process.env.SECURITY_METRICS_INCLUDE_METADATA !== 'false',
  batchSize: parseInt(process.env.SECURITY_METRICS_BATCH_SIZE || '100'),
  flushInterval: parseInt(process.env.SECURITY_METRICS_FLUSH_INTERVAL || '5000'),
  retentionDays: parseInt(process.env.SECURITY_METRICS_RETENTION_DAYS || '30'),
  exportFormat: (process.env.SECURITY_METRICS_EXPORT_FORMAT as 'json' | 'csv' | 'logfmt') || 'json',
};

// Security metrics logger
export class SecurityMetricsLogger {
  private static instance: SecurityMetricsLogger;
  private config: SecurityMetricsConfig;
  private metricsBuffer: SecurityMetric[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private isFlushing: boolean = false;

  private constructor() {
    this.config = DEFAULT_CONFIG;
    this.startFlushTimer();
  }

  static getInstance(): SecurityMetricsLogger {
    if (!SecurityMetricsLogger.instance) {
      SecurityMetricsLogger.instance = new SecurityMetricsLogger();
    }
    return SecurityMetricsLogger.instance;
  }

  // Log security metric
  async logMetric(metric: Omit<SecurityMetric, 'id' | 'timestamp'>): Promise<void> {
    if (!this.config.enabled) {return;}

    const fullMetric: SecurityMetric = {
      ...metric,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    };

    // Add to buffer
    this.metricsBuffer.push(fullMetric);

    // Flush if buffer is full
    if (this.metricsBuffer.length >= this.config.batchSize) {
      await this.flushMetrics();
    }
  }

  // Log request metric
  async logRequest(
    endpoint: string,
    method: string,
    ipAddress: string,
    userAgent?: string,
    userId?: string,
    sessionId?: string,
    headers?: Record<string, string>,
    metadata?: Record<string, any>,
  ): Promise<void> {
    await this.logMetric({
      type: 'request',
      endpoint,
      method,
      ipAddress,
      userAgent: this.config.includeUserAgent ? userAgent : undefined,
      userId,
      sessionId,
      headers: this.config.includeHeaders ? headers : undefined,
      metadata: this.config.includeMetadata ? (metadata || {}) : {},
    });
  }

  // Log response metric
  async logResponse(
    endpoint: string,
    method: string,
    ipAddress: string,
    statusCode: number,
    responseTime: number,
    userAgent?: string,
    userId?: string,
    sessionId?: string,
    headers?: Record<string, string>,
    metadata?: Record<string, any>,
  ): Promise<void> {
    await this.logMetric({
      type: 'response',
      endpoint,
      method,
      ipAddress,
      userAgent: this.config.includeUserAgent ? userAgent : undefined,
      userId,
      sessionId,
      statusCode,
      responseTime,
      headers: this.config.includeHeaders ? headers : undefined,
      metadata: this.config.includeMetadata ? (metadata || {}) : {},
    });
  }

  // Log error metric
  async logError(
    endpoint: string,
    method: string,
    ipAddress: string,
    error: Error | string,
    statusCode?: number,
    userAgent?: string,
    userId?: string,
    sessionId?: string,
    headers?: Record<string, string>,
    metadata?: Record<string, any>,
  ): Promise<void> {
    await this.logMetric({
      type: 'error',
      endpoint,
      method,
      ipAddress,
      userAgent: this.config.includeUserAgent ? userAgent : undefined,
      userId,
      sessionId,
      statusCode,
      headers: this.config.includeHeaders ? headers : undefined,
      metadata: {
        ...this.config.includeMetadata ? (metadata || {}) : {},
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
      },
    });
  }

  // Log security violation
  async logViolation(
    endpoint: string,
    method: string,
    ipAddress: string,
    violationType: string,
    details: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    userAgent?: string,
    userId?: string,
    sessionId?: string,
    headers?: Record<string, string>,
    metadata?: Record<string, any>,
  ): Promise<void> {
    // Log to audit system
    await logSystemEvent({
      eventType: AuditEventType.SUSPICIOUS_ACTIVITY,
      severity: this.mapSeverity(severity),
      details: {
        action: 'security_violation',
        endpoint,
        method,
        ipAddress,
        violationType,
        details,
        userAgent,
        userId,
        sessionId,
        metadata,
      },
    });

    // Log to metrics
    await this.logMetric({
      type: 'violation',
      endpoint,
      method,
      ipAddress,
      userAgent: this.config.includeUserAgent ? userAgent : undefined,
      userId,
      sessionId,
      headers: this.config.includeHeaders ? headers : undefined,
      metadata: {
        ...this.config.includeMetadata ? (metadata || {}) : {},
        violationType,
        details,
        severity,
      },
    });
  }

  // Log performance metric
  async logPerformance(
    endpoint: string,
    method: string,
    ipAddress: string,
    responseTime: number,
    userAgent?: string,
    userId?: string,
    sessionId?: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    await this.logMetric({
      type: 'performance',
      endpoint,
      method,
      ipAddress,
      userAgent: this.config.includeUserAgent ? userAgent : undefined,
      userId,
      sessionId,
      responseTime,
      metadata: this.config.includeMetadata ? (metadata || {}) : {},
    });
  }

  // Flush metrics buffer
  async flushMetrics(): Promise<void> {
    if (this.isFlushing || this.metricsBuffer.length === 0) {return;}

    this.isFlushing = true;
    const metricsToFlush = [...this.metricsBuffer];
    this.metricsBuffer = [];

    try {
      // Log metrics in structured format
      for (const metric of metricsToFlush) {
        await this.logStructuredMetric(metric);
      }

      console.log(`Flushed ${metricsToFlush.length} security metrics`);
    } catch (error) {
      console.error('Failed to flush security metrics:', error);
      // Restore metrics to buffer on failure
      this.metricsBuffer.unshift(...metricsToFlush);
    } finally {
      this.isFlushing = false;
    }
  }

  // Log metric in structured format
  private async logStructuredMetric(metric: SecurityMetric): Promise<void> {
    const logData = {
      timestamp: metric.timestamp,
      level: this.config.logLevel,
      message: `Security metric: ${metric.type}`,
      metric: {
        id: metric.id,
        type: metric.type,
        endpoint: metric.endpoint,
        method: metric.method,
        ipAddress: metric.ipAddress,
        userAgent: metric.userAgent,
        userId: metric.userId,
        sessionId: metric.sessionId,
        statusCode: metric.statusCode,
        responseTime: metric.responseTime,
        headers: metric.headers,
        metadata: metric.metadata,
      },
    };

    // Log based on configuration
    switch (this.config.exportFormat) {
      case 'json':
        console.log(JSON.stringify(logData));
        break;
      case 'csv':
        console.log(this.formatCSV(logData));
        break;
      case 'logfmt':
        console.log(this.formatLogfmt(logData));
        break;
      default:
        console.log(JSON.stringify(logData));
    }
  }

  // Format as CSV
  private formatCSV(data: any): string {
    const headers = ['timestamp', 'level', 'message', 'metric_type', 'endpoint', 'method', 'ip_address'];
    const values = [
      data.timestamp,
      data.level,
      data.message,
      data.metric.type,
      data.metric.endpoint,
      data.metric.method,
      data.metric.ipAddress,
    ];

    return `${headers.join(',')}\n${values.join(',')}`;
  }

  // Format as logfmt
  private formatLogfmt(data: any): string {
    const pairs = [
      `timestamp=${data.timestamp}`,
      `level=${data.level}`,
      `message="${data.message}"`,
      `metric_type=${data.metric.type}`,
      `endpoint=${data.metric.endpoint}`,
      `method=${data.metric.method}`,
      `ip_address=${data.metric.ipAddress}`,
    ];

    return pairs.join(' ');
  }

  // Map severity levels
  private mapSeverity(severity: string): AuditSeverity {
    switch (severity) {
      case 'critical': return AuditSeverity.CRITICAL;
      case 'high': return AuditSeverity.HIGH;
      case 'medium': return AuditSeverity.MEDIUM;
      case 'low': return AuditSeverity.LOW;
      default: return AuditSeverity.MEDIUM;
    }
  }

  // Start flush timer
  private startFlushTimer(): void {
    if (this.config.flushInterval > 0) {
      this.flushTimer = setInterval(async () => {
        await this.flushMetrics();
      }, this.config.flushInterval);
    }
  }

  // Get metrics statistics
  getMetricsStats(): {
    totalMetrics: number;
    bufferSize: number;
    lastFlush: string;
    config: SecurityMetricsConfig;
  } {
    return {
      totalMetrics: this.metricsBuffer.length,
      bufferSize: this.config.batchSize,
      lastFlush: new Date().toISOString(),
      config: { ...this.config },
    };
  }

  // Update configuration
  updateConfig(newConfig: Partial<SecurityMetricsConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  // Get configuration
  getConfig(): SecurityMetricsConfig {
    return { ...this.config };
  }

  // Cleanup
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flushMetrics();
  }
}

// Singleton instance
export const securityMetricsLogger = SecurityMetricsLogger.getInstance();

// Convenience functions
export const logSecurityRequest = (
  endpoint: string,
  method: string,
  ipAddress: string,
  userAgent?: string,
  userId?: string,
  sessionId?: string,
  headers?: Record<string, string>,
  metadata?: Record<string, any>,
): Promise<void> => securityMetricsLogger.logRequest(endpoint, method, ipAddress, userAgent, userId, sessionId, headers, metadata);

export const logSecurityResponse = (
  endpoint: string,
  method: string,
  ipAddress: string,
  statusCode: number,
  responseTime: number,
  userAgent?: string,
  userId?: string,
  sessionId?: string,
  headers?: Record<string, string>,
  metadata?: Record<string, any>,
): Promise<void> => securityMetricsLogger.logResponse(endpoint, method, ipAddress, statusCode, responseTime, userAgent, userId, sessionId, headers, metadata);

export const logSecurityError = (
  endpoint: string,
  method: string,
  ipAddress: string,
  error: Error | string,
  statusCode?: number,
  userAgent?: string,
  userId?: string,
  sessionId?: string,
  headers?: Record<string, string>,
  metadata?: Record<string, any>,
): Promise<void> => securityMetricsLogger.logError(endpoint, method, ipAddress, error, statusCode, userAgent, userId, sessionId, headers, metadata);

export const logSecurityViolation = (
  endpoint: string,
  method: string,
  ipAddress: string,
  violationType: string,
  details: string,
  severity: 'low' | 'medium' | 'high' | 'critical',
  userAgent?: string,
  userId?: string,
  sessionId?: string,
  headers?: Record<string, string>,
  metadata?: Record<string, any>,
): Promise<void> => securityMetricsLogger.logViolation(endpoint, method, ipAddress, violationType, details, severity, userAgent, userId, sessionId, headers, metadata);

// Cleanup on process exit
process.on('exit', () => {
  securityMetricsLogger.destroy();
});

process.on('SIGINT', () => {
  securityMetricsLogger.destroy();
  process.exit(0);
});

process.on('SIGTERM', () => {
  securityMetricsLogger.destroy();
  process.exit(0);
});
