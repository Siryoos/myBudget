import { query } from './database';
import { getRedisClient } from './redis';

// Audit event types
export enum AuditEventType {
  // Authentication events
  USER_LOGIN = 'user_login',
  USER_LOGOUT = 'user_logout',
  USER_REGISTER = 'user_register',
  PASSWORD_CHANGE = 'password_change',
  PASSWORD_RESET = 'password_reset',

  // MFA events
  MFA_ENABLE = 'mfa_enable',
  MFA_DISABLE = 'mfa_disable',
  MFA_VERIFY = 'mfa_verify',
  MFA_FAILED = 'mfa_failed',

  // Security events
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  INVALID_TOKEN = 'invalid_token',
  UNAUTHORIZED_ACCESS = 'unauthorized_access',

  // Data events
  DATA_CREATE = 'data_create',
  DATA_UPDATE = 'data_update',
  DATA_DELETE = 'data_delete',
  DATA_EXPORT = 'data_export',
  DATA_IMPORT = 'data_import',

  // System events
  SYSTEM_ERROR = 'system_error',
  CONFIGURATION_CHANGE = 'configuration_change',
  BACKUP_CREATED = 'backup_created',
  MAINTENANCE_MODE = 'maintenance_mode'
}

// Audit event severity levels
export enum AuditSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Type-safe details and metadata
export type AuditEventDetails = Record<string, unknown>;
export type AuditMetadata = {
  requestId?: string;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  responseTime?: number;
} & Record<string, unknown>;

// Audit event interface
export interface AuditEvent {
  id: string;
  timestamp: string;
  eventType: AuditEventType;
  severity: AuditSeverity;
  userId?: string;
  userEmail?: string;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  resourceType?: string;
  resourceId?: string;
  action?: string;
  details?: AuditEventDetails;
  metadata?: AuditMetadata;
  tags?: string[];
}

// Audit log configuration
export interface AuditLogConfig {
  enabled: boolean;
  retentionDays: number;
  batchSize: number;
  flushInterval: number; // milliseconds
  includeMetadata: boolean;
  includeUserContext: boolean;
  externalLogging: boolean;
  externalLoggingUrl?: string;
}

// Default configuration
const DEFAULT_CONFIG: AuditLogConfig = {
  enabled: process.env.AUDIT_LOGGING_ENABLED !== 'false',
  retentionDays: parseInt(process.env.AUDIT_LOG_RETENTION_DAYS || '90', 10),
  batchSize: parseInt(process.env.AUDIT_LOG_BATCH_SIZE || '100', 10),
  flushInterval: parseInt(process.env.AUDIT_LOG_FLUSH_INTERVAL || '5000', 10),
  includeMetadata: true,
  includeUserContext: true,
  externalLogging: process.env.EXTERNAL_AUDIT_LOGGING === 'true',
  externalLoggingUrl: process.env.EXTERNAL_AUDIT_LOGGING_URL,
};

// Type for Redis client
type RedisClient = ReturnType<typeof getRedisClient>;

// Authentication event parameters
export interface AuthEventParams {
  eventType: AuditEventType;
  userId: string;
  userEmail: string;
  success: boolean;
  details?: AuditEventDetails;
  metadata?: AuditMetadata;
}

// Security event parameters
export interface SecurityEventParams {
  eventType: AuditEventType;
  severity: AuditSeverity;
  details: AuditEventDetails;
  userId?: string;
  metadata?: AuditMetadata;
}

// Data event parameters
export interface DataEventParams {
  eventType: AuditEventType;
  resourceType: string;
  resourceId: string;
  action: string;
  userId: string;
  details?: AuditEventDetails;
  metadata?: AuditMetadata;
}

// System event parameters
export interface SystemEventParams {
  eventType: AuditEventType;
  severity: AuditSeverity;
  details: AuditEventDetails;
  metadata?: AuditMetadata;
}

// Audit logging service
export class AuditLogger {
  private config: AuditLogConfig;
  private redis: RedisClient;
  private eventBuffer: AuditEvent[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private isFlushing: boolean = false;

  constructor() {
    this.config = DEFAULT_CONFIG;
    this.redis = getRedisClient();
    this.startFlushTimer();
  }

  // Log an audit event
  async logEvent(event: Omit<AuditEvent, 'id' | 'timestamp'>): Promise<string> {
    if (!this.config.enabled) {return '';}

    const auditEvent: AuditEvent = {
      ...event,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    };

    // Add to buffer
    this.eventBuffer.push(auditEvent);

    // Flush if buffer is full
    if (this.eventBuffer.length >= this.config.batchSize) {
      await this.flushBuffer();
    }

    // Store in Redis for immediate access
    await this.storeInRedis(auditEvent);

    return auditEvent.id;
  }

  // Log authentication event
  async logAuthEvent(params: AuthEventParams): Promise<string> {
    const { eventType, userId, userEmail, success, details, metadata } = params;
    const severity = success ? AuditSeverity.LOW : AuditSeverity.MEDIUM;

    return this.logEvent({
      eventType,
      severity,
      userId,
      userEmail,
      details: {
        ...details,
        success,
        timestamp: new Date().toISOString(),
      },
      metadata,
      tags: ['authentication', success ? 'success' : 'failure'],
    });
  }

  // Log security event
  async logSecurityEvent(params: SecurityEventParams): Promise<string> {
    const { eventType, severity, details, userId, metadata } = params;
    return this.logEvent({
      eventType,
      severity,
      userId,
      details,
      metadata,
      tags: ['security', severity],
    });
  }

  // Log data access event
  async logDataEvent(params: DataEventParams): Promise<string> {
    const { eventType, resourceType, resourceId, action, userId, details, metadata } = params;
    const severity = this.determineDataEventSeverity(eventType, resourceType);

    return this.logEvent({
      eventType,
      severity,
      userId,
      resourceType,
      resourceId,
      action,
      details,
      metadata,
      tags: ['data', resourceType, action],
    });
  }

  // Log system event
  async logSystemEvent(params: SystemEventParams): Promise<string> {
    const { eventType, severity, details, metadata } = params;
    return this.logEvent({
      eventType,
      severity,
      details,
      metadata,
      tags: ['system', severity],
    });
  }

  // Get audit events for a user
  async getUserAuditEvents(
    userId: string,
    limit: number = 100,
    offset: number = 0,
  ): Promise<AuditEvent[]> {
    try {
      const result = await query(
        `SELECT * FROM audit_logs 
         WHERE user_id = $1 
         ORDER BY timestamp DESC 
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset],
      );

      return result.rows.map(this.mapDatabaseRowToEvent);
    } catch (error) {
      console.error('Failed to get user audit events:', error);
      return [];
    }
  }

  // Get audit events by type
  async getAuditEventsByType(
    eventType: AuditEventType,
    limit: number = 100,
    offset: number = 0,
  ): Promise<AuditEvent[]> {
    try {
      const result = await query(
        `SELECT * FROM audit_logs 
         WHERE event_type = $1 
         ORDER BY timestamp DESC 
         LIMIT $2 OFFSET $3`,
        [eventType, limit, offset],
      );

      return result.rows.map(this.mapDatabaseRowToEvent);
    } catch (error) {
      console.error('Failed to get audit events by type:', error);
      return [];
    }
  }

  // Get audit events by severity
  async getAuditEventsBySeverity(
    severity: AuditSeverity,
    limit: number = 100,
    offset: number = 0,
  ): Promise<AuditEvent[]> {
    try {
      const result = await query(
        `SELECT * FROM audit_logs 
         WHERE severity = $1 
         ORDER BY timestamp DESC 
         LIMIT $2 OFFSET $3`,
        [severity, limit, offset],
      );

      return result.rows.map(this.mapDatabaseRowToEvent);
    } catch (error) {
      console.error('Failed to get audit events by severity:', error);
      return [];
    }
  }

  // Search audit events
  async searchAuditEvents(
    filters: {
      eventType?: AuditEventType;
      severity?: AuditSeverity;
      userId?: string;
      resourceType?: string;
      startDate?: string;
      endDate?: string;
      tags?: string[];
    },
    limit: number = 100,
    offset: number = 0,
  ): Promise<AuditEvent[]> {
    try {
      let queryText = 'SELECT * FROM audit_logs WHERE 1=1';
      const params: any[] = [];
      let paramIndex = 1;

      if (filters.eventType) {
        queryText += ` AND event_type = $${paramIndex++}`;
        params.push(filters.eventType);
      }

      if (filters.severity) {
        queryText += ` AND severity = $${paramIndex++}`;
        params.push(filters.severity);
      }

      if (filters.userId) {
        queryText += ` AND user_id = $${paramIndex++}`;
        params.push(filters.userId);
      }

      if (filters.resourceType) {
        queryText += ` AND resource_type = $${paramIndex++}`;
        params.push(filters.resourceType);
      }

      if (filters.startDate) {
        queryText += ` AND timestamp >= $${paramIndex++}`;
        params.push(filters.startDate);
      }

      if (filters.endDate) {
        queryText += ` AND timestamp <= $${paramIndex++}`;
        params.push(filters.endDate);
      }

      queryText += ` ORDER BY timestamp DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
      params.push(limit, offset);

      const result = await query(queryText, params);
      return result.rows.map(this.mapDatabaseRowToEvent);
    } catch (error) {
      console.error('Failed to search audit events:', error);
      return [];
    }
  }

  // Get audit statistics
  async getAuditStatistics(timeRange: '1h' | '24h' | '7d' | '30d' = '24h'): Promise<{
    totalEvents: number;
    eventsByType: Record<AuditEventType, number>;
    eventsBySeverity: Record<AuditSeverity, number>;
    topUsers: Array<{ userId: string; eventCount: number }>;
    topResources: Array<{ resourceType: string; eventCount: number }>;
  }> {
    try {
      const now = new Date();
      let cutoffDate: Date;

      switch (timeRange) {
        case '1h':
          cutoffDate = new Date(now.getTime() - 60 * 60 * 1000);
          break;
        case '24h':
          cutoffDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          cutoffDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      }

      const result = await query(
        `SELECT 
           COUNT(*) as total_events,
           event_type,
           severity,
           user_id,
           resource_type
         FROM audit_logs 
         WHERE timestamp >= $1 
         GROUP BY event_type, severity, user_id, resource_type`,
        [cutoffDate.toISOString()],
      );

      // Process results
      const stats = {
        totalEvents: 0,
        eventsByType: {
          [AuditEventType.USER_LOGIN]: 0,
          [AuditEventType.USER_LOGOUT]: 0,
          [AuditEventType.USER_REGISTER]: 0,
          [AuditEventType.PASSWORD_CHANGE]: 0,
          [AuditEventType.PASSWORD_RESET]: 0,
          [AuditEventType.MFA_ENABLE]: 0,
          [AuditEventType.MFA_DISABLE]: 0,
          [AuditEventType.MFA_VERIFY]: 0,
          [AuditEventType.MFA_FAILED]: 0,
          [AuditEventType.SUSPICIOUS_ACTIVITY]: 0,
          [AuditEventType.RATE_LIMIT_EXCEEDED]: 0,
          [AuditEventType.INVALID_TOKEN]: 0,
          [AuditEventType.UNAUTHORIZED_ACCESS]: 0,
          [AuditEventType.DATA_CREATE]: 0,
          [AuditEventType.DATA_UPDATE]: 0,
          [AuditEventType.DATA_DELETE]: 0,
          [AuditEventType.DATA_EXPORT]: 0,
          [AuditEventType.DATA_IMPORT]: 0,
          [AuditEventType.SYSTEM_ERROR]: 0,
          [AuditEventType.CONFIGURATION_CHANGE]: 0,
          [AuditEventType.BACKUP_CREATED]: 0,
          [AuditEventType.MAINTENANCE_MODE]: 0,
        },
        eventsBySeverity: {
          [AuditSeverity.LOW]: 0,
          [AuditSeverity.MEDIUM]: 0,
          [AuditSeverity.HIGH]: 0,
          [AuditSeverity.CRITICAL]: 0,
        },
        topUsers: [] as Array<{ userId: string; eventCount: number }>,
        topResources: [] as Array<{ resourceType: string; eventCount: number }>,
      };

      const userCounts = new Map<string, number>();
      const resourceCounts = new Map<string, number>();

      result.rows.forEach(row => {
        stats.totalEvents += parseInt(row.total_events);

        // Count by event type
        if (row.event_type && typeof row.event_type === 'string' && row.event_type in stats.eventsByType) {
          stats.eventsByType[row.event_type as AuditEventType] = (stats.eventsByType[row.event_type as AuditEventType] || 0) + parseInt(row.total_events);
        }

        // Count by severity
        if (row.severity && typeof row.severity === 'string' && row.severity in stats.eventsBySeverity) {
          stats.eventsBySeverity[row.severity as AuditSeverity] = (stats.eventsBySeverity[row.severity as AuditSeverity] || 0) + parseInt(row.total_events);
        }

        // Count by user
        if (row.user_id) {
          userCounts.set(row.user_id, (userCounts.get(row.user_id) || 0) + parseInt(row.total_events));
        }

        // Count by resource
        if (row.resource_type) {
          resourceCounts.set(row.resource_type, (resourceCounts.get(row.resource_type) || 0) + parseInt(row.total_events));
        }
      });

      // Get top users
      stats.topUsers = Array.from(userCounts.entries())
        .map(([userId, count]) => ({ userId, eventCount: count }))
        .sort((a, b) => b.eventCount - a.eventCount)
        .slice(0, 10);

      // Get top resources
      stats.topResources = Array.from(resourceCounts.entries())
        .map(([resourceType, count]) => ({ resourceType, eventCount: count }))
        .sort((a, b) => b.eventCount - a.eventCount)
        .slice(0, 10);

      return stats;
    } catch (error) {
      console.error('Failed to get audit statistics:', error);
      return {
        totalEvents: 0,
        eventsByType: {
          [AuditEventType.USER_LOGIN]: 0,
          [AuditEventType.USER_LOGOUT]: 0,
          [AuditEventType.USER_REGISTER]: 0,
          [AuditEventType.PASSWORD_CHANGE]: 0,
          [AuditEventType.PASSWORD_RESET]: 0,
          [AuditEventType.MFA_ENABLE]: 0,
          [AuditEventType.MFA_DISABLE]: 0,
          [AuditEventType.MFA_VERIFY]: 0,
          [AuditEventType.MFA_FAILED]: 0,
          [AuditEventType.SUSPICIOUS_ACTIVITY]: 0,
          [AuditEventType.RATE_LIMIT_EXCEEDED]: 0,
          [AuditEventType.INVALID_TOKEN]: 0,
          [AuditEventType.UNAUTHORIZED_ACCESS]: 0,
          [AuditEventType.DATA_CREATE]: 0,
          [AuditEventType.DATA_UPDATE]: 0,
          [AuditEventType.DATA_DELETE]: 0,
          [AuditEventType.DATA_EXPORT]: 0,
          [AuditEventType.DATA_IMPORT]: 0,
          [AuditEventType.SYSTEM_ERROR]: 0,
          [AuditEventType.CONFIGURATION_CHANGE]: 0,
          [AuditEventType.BACKUP_CREATED]: 0,
          [AuditEventType.MAINTENANCE_MODE]: 0,
        },
        eventsBySeverity: {
          [AuditSeverity.LOW]: 0,
          [AuditSeverity.MEDIUM]: 0,
          [AuditSeverity.HIGH]: 0,
          [AuditSeverity.CRITICAL]: 0,
        },
        topUsers: [],
        topResources: [],
      };
    }
  }

  // Clean up old audit logs
  async cleanupOldLogs(): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);

      const result = await query(
        'DELETE FROM audit_logs WHERE timestamp < $1',
        [cutoffDate.toISOString()],
      );

      console.log(`Cleaned up ${result.rowCount} old audit logs`);
      return result.rowCount || 0;
    } catch (error) {
      console.error('Failed to cleanup old audit logs:', error);
      return 0;
    }
  }

  // Export audit logs
  async exportAuditLogs(
    format: 'json' | 'csv' = 'json',
    filters?: any,
  ): Promise<string> {
    try {
      const events = await this.searchAuditEvents(filters || {}, 10000, 0);

      if (format === 'csv') {
        return this.convertToCSV(events);
      }
        return JSON.stringify(events, null, 2);

    } catch (error) {
      console.error('Failed to export audit logs:', error);
      throw new Error('Failed to export audit logs');
    }
  }

  // Private methods

  private determineDataEventSeverity(eventType: AuditEventType, resourceType: string): AuditSeverity {
    // Critical data operations
    if (eventType === AuditEventType.DATA_DELETE ||
        eventType === AuditEventType.DATA_EXPORT ||
        resourceType === 'financial_data' ||
        resourceType === 'personal_data') {
      return AuditSeverity.HIGH;
    }

    // Sensitive data operations
    if (eventType === AuditEventType.DATA_UPDATE ||
        resourceType === 'user_profile' ||
        resourceType === 'settings') {
      return AuditSeverity.MEDIUM;
    }

    return AuditSeverity.LOW;
  }

  private async storeInRedis(event: AuditEvent): Promise<void> {
    try {
      const key = `audit:${event.id}`;
      const ttl = 24 * 60 * 60; // 24 hours

      await this.redis.setex(key, ttl, JSON.stringify(event));
    } catch (error) {
      console.warn('Failed to store audit event in Redis:', error);
    }
  }

  private async flushBuffer(): Promise<void> {
    if (this.isFlushing || this.eventBuffer.length === 0) {return;}

    this.isFlushing = true;
    const eventsToFlush = [...this.eventBuffer];
    this.eventBuffer = [];

    try {
      // Store in database
      await this.storeInDatabase(eventsToFlush);

      // Send to external logging service if configured
      if (this.config.externalLogging && this.config.externalLoggingUrl) {
        await this.sendToExternalService(eventsToFlush);
      }
    } catch (error) {
      console.error('Failed to flush audit buffer:', error);

      // Put events back in buffer for retry
      this.eventBuffer.unshift(...eventsToFlush);
    } finally {
      this.isFlushing = false;
    }
  }

  private async storeInDatabase(events: AuditEvent[]): Promise<void> {
    if (events.length === 0) {return;}

    const values = events.map((event, index) => {
      const offset = index * 12;
      return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12})`;
    }).join(', ');

    const queryText = `
      INSERT INTO audit_logs (
        id, timestamp, event_type, severity, user_id, user_email, 
        ip_address, user_agent, session_id, resource_type, resource_id, 
        action, details, metadata, tags
      ) VALUES ${values}
    `;

    const params = events.flatMap(event => [
      event.id,
event.timestamp,
event.eventType,
event.severity,
      event.userId,
event.userEmail,
event.ipAddress,
event.userAgent,
      event.sessionId,
event.resourceType,
event.resourceId,
event.action,
      JSON.stringify(event.details),
JSON.stringify(event.metadata),
      JSON.stringify(event.tags),
    ]);

    await query(queryText, params);
  }

  private async sendToExternalService(events: AuditEvent[]): Promise<void> {
    try {
      const response = await fetch(this.config.externalLoggingUrl!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events }),
      });

      if (!response.ok) {
        throw new Error(`External logging service responded with ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to send audit events to external service:', error);
    }
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flushBuffer();
    }, this.config.flushInterval);
  }

  private mapDatabaseRowToEvent(row: any): AuditEvent {
    return {
      id: row.id,
      timestamp: row.timestamp,
      eventType: row.event_type,
      severity: row.severity,
      userId: row.user_id,
      userEmail: row.user_email,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      sessionId: row.session_id,
      resourceType: row.resource_type,
      resourceId: row.resource_id,
      action: row.action,
      details: row.details ? JSON.parse(row.details) : undefined,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      tags: row.tags ? JSON.parse(row.tags) : [],
    };
  }

  private convertToCSV(events: AuditEvent[]): string {
    if (events.length === 0) {return '';}

    const headers = [
      'ID',
'Timestamp',
'Event Type',
'Severity',
'User ID',
'User Email',
      'IP Address',
'User Agent',
'Session ID',
'Resource Type',
'Resource ID',
      'Action',
'Details',
'Metadata',
'Tags',
    ];

    const csvRows = [headers.join(',')];

    events.forEach(event => {
      const row = [
        event.id,
        event.timestamp,
        event.eventType,
        event.severity,
        event.userId || '',
        event.userEmail || '',
        event.ipAddress || '',
        `"${(event.userAgent || '').replace(/"/g, '""')}"`,
        event.sessionId || '',
        event.resourceType || '',
        event.resourceId || '',
        event.action || '',
        `"${JSON.stringify(event.details || {}).replace(/"/g, '""')}"`,
        `"${JSON.stringify(event.metadata || {}).replace(/"/g, '""')}"`,
        `"${(event.tags || []).join(';')}"`,
      ];
      csvRows.push(row.join(','));
    });

    return csvRows.join('\n');
  }

  // Configuration methods
  updateConfig(newConfig: Partial<AuditLogConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  getConfig(): AuditLogConfig {
    return { ...this.config };
  }

  // Cleanup
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
  }
}

// Singleton instance
export const auditLogger = new AuditLogger();

// Type-safe convenience functions
export const logAuthEvent = (params: AuthEventParams): Promise<string> =>
  auditLogger.logAuthEvent(params);

export const logSecurityEvent = (params: SecurityEventParams): Promise<string> =>
  auditLogger.logSecurityEvent(params);

export const logDataEvent = (params: DataEventParams): Promise<string> =>
  auditLogger.logDataEvent(params);

export const logSystemEvent = (params: SystemEventParams): Promise<string> =>
  auditLogger.logSystemEvent(params);

// Cleanup on process exit
process.on('exit', () => {
  auditLogger.destroy();
});

process.on('SIGINT', () => {
  auditLogger.destroy();
  process.exit(0);
});

process.on('SIGTERM', () => {
  auditLogger.destroy();
  process.exit(0);
});
