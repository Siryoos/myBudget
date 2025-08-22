import { query } from './database';
import { getRedisClient } from './redis';
import { createErrorResponse } from './error-handling';

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
  details?: any;
  metadata?: {
    requestId?: string;
    endpoint?: string;
    method?: string;
    statusCode?: number;
    responseTime?: number;
    [key: string]: any;
  };
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
  retentionDays: parseInt(process.env.AUDIT_LOG_RETENTION_DAYS || '90'),
  batchSize: parseInt(process.env.AUDIT_LOG_BATCH_SIZE || '100'),
  flushInterval: parseInt(process.env.AUDIT_LOG_FLUSH_INTERVAL || '5000'),
  includeMetadata: true,
  includeUserContext: true,
  externalLogging: process.env.EXTERNAL_AUDIT_LOGGING === 'true',
  externalLoggingUrl: process.env.EXTERNAL_AUDIT_LOGGING_URL
};

// Audit logging service
export class AuditLogger {
  private static instance: AuditLogger;
  private config: AuditLogConfig;
  private redis: any;
  private eventBuffer: AuditEvent[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private isFlushing: boolean = false;

  private constructor() {
    this.config = DEFAULT_CONFIG;
    this.redis = getRedisClient();
    this.startFlushTimer();
  }

  static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger();
    }
    return AuditLogger.instance;
  }

  // Log an audit event
  async logEvent(event: Omit<AuditEvent, 'id' | 'timestamp'>): Promise<string> {
    if (!this.config.enabled) return '';

    const auditEvent: AuditEvent = {
      ...event,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString()
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
  async logAuthEvent(
    eventType: AuditEventType,
    userId: string,
    userEmail: string,
    success: boolean,
    details?: any,
    metadata?: any
  ): Promise<string> {
    const severity = success ? AuditSeverity.LOW : AuditSeverity.MEDIUM;
    
    return this.logEvent({
      eventType,
      severity,
      userId,
      userEmail,
      details: {
        ...details,
        success,
        timestamp: new Date().toISOString()
      },
      metadata,
      tags: ['authentication', success ? 'success' : 'failure']
    });
  }

  // Log security event
  async logSecurityEvent(
    eventType: AuditEventType,
    severity: AuditSeverity,
    details: any,
    userId?: string,
    metadata?: any
  ): Promise<string> {
    return this.logEvent({
      eventType,
      severity,
      userId,
      details,
      metadata,
      tags: ['security', severity]
    });
  }

  // Log data access event
  async logDataEvent(
    eventType: AuditEventType,
    resourceType: string,
    resourceId: string,
    action: string,
    userId: string,
    details?: any,
    metadata?: any
  ): Promise<string> {
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
      tags: ['data', resourceType, action]
    });
  }

  // Log system event
  async logSystemEvent(
    eventType: AuditEventType,
    severity: AuditSeverity,
    details: any,
    metadata?: any
  ): Promise<string> {
    return this.logEvent({
      eventType,
      severity,
      details,
      metadata,
      tags: ['system', severity]
    });
  }

  // Get audit events for a user
  async getUserAuditEvents(
    userId: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<AuditEvent[]> {
    try {
      const result = await query(
        `SELECT * FROM audit_logs 
         WHERE user_id = $1 
         ORDER BY timestamp DESC 
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
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
    offset: number = 0
  ): Promise<AuditEvent[]> {
    try {
      const result = await query(
        `SELECT * FROM audit_logs 
         WHERE event_type = $1 
         ORDER BY timestamp DESC 
         LIMIT $2 OFFSET $3`,
        [eventType, limit, offset]
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
    offset: number = 0
  ): Promise<AuditEvent[]> {
    try {
      const result = await query(
        `SELECT * FROM audit_logs 
         WHERE severity = $1 
         ORDER BY timestamp DESC 
         LIMIT $2 OFFSET $3`,
        [severity, limit, offset]
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
    offset: number = 0
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
        [cutoffDate.toISOString()]
      );

      // Process results
      const stats = {
        totalEvents: 0,
        eventsByType: {} as Record<AuditEventType, number>,
        eventsBySeverity: {} as Record<AuditSeverity, number>,
        topUsers: [] as Array<{ userId: string; eventCount: number }>,
        topResources: [] as Array<{ resourceType: string; eventCount: number }>
      };

      const userCounts = new Map<string, number>();
      const resourceCounts = new Map<string, number>();

      result.rows.forEach(row => {
        stats.totalEvents += parseInt(row.total_events);
        
        // Count by event type
        stats.eventsByType[row.event_type] = (stats.eventsByType[row.event_type] || 0) + parseInt(row.total_events);
        
        // Count by severity
        stats.eventsBySeverity[row.severity] = (stats.eventsBySeverity[row.severity] || 0) + parseInt(row.total_events);
        
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
        eventsByType: {},
        eventsBySeverity: {},
        topUsers: [],
        topResources: []
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
        [cutoffDate.toISOString()]
      );

      console.log(`Cleaned up ${result.rowCount} old audit logs`);
      return result.rowCount;
    } catch (error) {
      console.error('Failed to cleanup old audit logs:', error);
      return 0;
    }
  }

  // Export audit logs
  async exportAuditLogs(
    format: 'json' | 'csv' = 'json',
    filters?: any
  ): Promise<string> {
    try {
      const events = await this.searchAuditEvents(filters || {}, 10000, 0);

      if (format === 'csv') {
        return this.convertToCSV(events);
      } else {
        return JSON.stringify(events, null, 2);
      }
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
    if (this.isFlushing || this.eventBuffer.length === 0) return;

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
    if (events.length === 0) return;

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
      event.id, event.timestamp, event.eventType, event.severity,
      event.userId, event.userEmail, event.ipAddress, event.userAgent,
      event.sessionId, event.resourceType, event.resourceId, event.action,
      JSON.stringify(event.details), JSON.stringify(event.metadata), 
      JSON.stringify(event.tags)
    ]);

    await query(queryText, params);
  }

  private async sendToExternalService(events: AuditEvent[]): Promise<void> {
    try {
      const response = await fetch(this.config.externalLoggingUrl!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events })
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
      tags: row.tags ? JSON.parse(row.tags) : []
    };
  }

  private convertToCSV(events: AuditEvent[]): string {
    if (events.length === 0) return '';

    const headers = [
      'ID', 'Timestamp', 'Event Type', 'Severity', 'User ID', 'User Email',
      'IP Address', 'User Agent', 'Session ID', 'Resource Type', 'Resource ID',
      'Action', 'Details', 'Metadata', 'Tags'
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
        `"${(event.tags || []).join(';')}"`
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
export const auditLogger = AuditLogger.getInstance();

// Convenience functions
export const logAuthEvent = (
  eventType: AuditEventType,
  userId: string,
  userEmail: string,
  success: boolean,
  details?: any,
  metadata?: any
): Promise<string> => {
  return auditLogger.logAuthEvent(eventType, userId, userEmail, success, details, metadata);
};

export const logSecurityEvent = (
  eventType: AuditEventType,
  severity: AuditSeverity,
  details: any,
  userId?: string,
  metadata?: any
): Promise<string> => {
  return auditLogger.logSecurityEvent(eventType, severity, details, userId, metadata);
};

export const logDataEvent = (
  eventType: AuditEventType,
  resourceType: string,
  resourceId: string,
  action: string,
  userId: string,
  details?: any,
  metadata?: any
): Promise<string> => {
  return auditLogger.logDataEvent(eventType, resourceType, resourceId, action, userId, details, metadata);
};

export const logSystemEvent = (
  eventType: AuditEventType,
  severity: AuditSeverity,
  details: any,
  metadata?: any
): Promise<string> => {
  return auditLogger.logSystemEvent(eventType, severity, details, metadata);
};

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
