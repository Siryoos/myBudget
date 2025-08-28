import type { LogLevel, LogContext } from './logger';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: Error;
  requestId?: string;
  userId?: string;
  sessionId?: string;
  userAgent?: string;
  ipAddress?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface LoggingServiceConfig {
  service: 'sentry' | 'logrocket' | 'datadog' | 'console' | 'file';
  dsn?: string;
  environment?: string;
  release?: string;
  tags?: Record<string, string>;
  enabled?: boolean;
}

export abstract class BaseLoggingService {
  protected config: LoggingServiceConfig;
  protected isEnabled: boolean;

  constructor(config: LoggingServiceConfig) {
    this.config = config;
    this.isEnabled = config.enabled !== false;
  }

  abstract log(entry: LogEntry): Promise<void>;
  abstract logError(error: Error, context?: LogContext): Promise<void>;
  abstract logWarning(message: string, context?: LogContext): Promise<void>;
  abstract logInfo(message: string, context?: LogContext): Promise<void>;
  abstract logDebug(message: string, context?: LogContext): Promise<void>;

  protected formatLogEntry(entry: LogEntry): any {
    return {
      timestamp: entry.timestamp,
      level: entry.level,
      message: entry.message,
      context: entry.context,
      error: entry.error ? {
        name: entry.error.name,
        message: entry.error.message,
        stack: entry.error.stack,
      } : undefined,
      requestId: entry.requestId,
      userId: entry.userId,
      sessionId: entry.sessionId,
      userAgent: entry.userAgent,
      ipAddress: entry.ipAddress,
      severity: entry.severity,
      tags: entry.tags,
      metadata: entry.metadata,
    };
  }

  isServiceEnabled(): boolean {
    return this.isEnabled;
  }
}

export class ConsoleLoggingService extends BaseLoggingService {
  constructor(config: LoggingServiceConfig = { service: 'console' }) {
    super(config);
  }

  async log(entry: LogEntry): Promise<void> {
    if (!this.isEnabled) {return;}

    const formattedEntry = this.formatLogEntry(entry);

    switch (entry.level) {
      case 'error':
        console.error('🚨 ERROR:', formattedEntry);
        break;
      case 'warn':
        console.warn('⚠️ WARNING:', formattedEntry);
        break;
      case 'info':
        console.info('ℹ️ INFO:', formattedEntry);
        break;
      case 'debug':
        console.debug('🔍 DEBUG:', formattedEntry);
        break;
      default:
        console.log('📝 LOG:', formattedEntry);
    }
  }

  async logError(error: Error, context?: LogContext): Promise<void> {
    await this.log({
      timestamp: new Date().toISOString(),
      level: 'error',
      message: error.message,
      context,
      error,
    });
  }

  async logWarning(message: string, context?: LogContext): Promise<void> {
    await this.log({
      timestamp: new Date().toISOString(),
      level: 'warn',
      message,
      context,
    });
  }

  async logInfo(message: string, context?: LogContext): Promise<void> {
    await this.log({
      timestamp: new Date().toISOString(),
      level: 'info',
      message,
      context,
    });
  }

  async logDebug(message: string, context?: LogContext): Promise<void> {
    await this.log({
      timestamp: new Date().toISOString(),
      level: 'debug',
      message,
      context,
    });
  }
}

export class SentryLoggingService extends BaseLoggingService {
  private sentry: any;

  constructor(config: LoggingServiceConfig) {
    super(config);
    this.initializeSentry();
  }

  private async initializeSentry(): Promise<void> {
    if (!this.config.dsn) {
      console.warn('Sentry DSN not configured, falling back to console logging');
      return;
    }

    try {
      // Dynamic import to avoid bundling Sentry in client
      const Sentry = await import('@sentry/nextjs');

      Sentry.init({
        dsn: this.config.dsn,
        environment: this.config.environment || process.env.NODE_ENV,
        release: this.config.release,
        beforeSend(event) {
          // Filter out sensitive information
          if (event.request?.headers) {
            delete event.request.headers.authorization;
            delete event.request.headers.cookie;
          }
          return event;
        },
      });

      this.sentry = Sentry;
    } catch (error) {
      console.error('Failed to initialize Sentry:', error);
      this.isEnabled = false;
    }
  }

  async log(entry: LogEntry): Promise<void> {
    if (!this.isEnabled || !this.sentry) {return;}

    try {
      const formattedEntry = this.formatLogEntry(entry);

      if (entry.error) {
        this.sentry.captureException(entry.error, {
          tags: entry.tags,
          extra: {
            context: entry.context,
            requestId: entry.requestId,
            userId: entry.userId,
            sessionId: entry.sessionId,
            userAgent: entry.userAgent,
            ipAddress: entry.ipAddress,
            metadata: entry.metadata,
          },
        });
      } else {
        this.sentry.captureMessage(entry.message, {
          level: entry.level,
          tags: entry.tags,
          extra: {
            context: entry.context,
            requestId: entry.requestId,
            userId: entry.userId,
            sessionId: entry.sessionId,
            userAgent: entry.userAgent,
            ipAddress: entry.ipAddress,
            metadata: entry.metadata,
          },
        });
      }
    } catch (error) {
      console.error('Failed to send log to Sentry:', error);
    }
  }

  async logError(error: Error, context?: LogContext): Promise<void> {
    await this.log({
      timestamp: new Date().toISOString(),
      level: 'error',
      message: error.message,
      context,
      error,
    });
  }

  async logWarning(message: string, context?: LogContext): Promise<void> {
    await this.log({
      timestamp: new Date().toISOString(),
      level: 'warn',
      message,
      context,
    });
  }

  async logInfo(message: string, context?: LogContext): Promise<void> {
    await this.log({
      timestamp: new Date().toISOString(),
      level: 'info',
      message,
      context,
    });
  }

  async logDebug(message: string, context?: LogContext): Promise<void> {
    await this.log({
      timestamp: new Date().toISOString(),
      level: 'debug',
      message,
      context,
    });
  }
}

export class FileLoggingService extends BaseLoggingService {
  private logFilePath: string;

  constructor(config: LoggingServiceConfig = { service: 'file' }) {
    super(config);
    this.logFilePath = process.env.LOG_FILE_PATH || './logs/app.log';
  }

  async log(entry: LogEntry): Promise<void> {
    if (!this.isEnabled) {return;}

    try {
      const formattedEntry = this.formatLogEntry(entry);
      const logLine = `${JSON.stringify(formattedEntry)}\n`;

      // In a real implementation, you'd use a proper file logging library
      // For now, we'll use console as fallback
      console.log(`[FILE LOG] ${logLine.trim()}`);
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  async logError(error: Error, context?: LogContext): Promise<void> {
    await this.log({
      timestamp: new Date().toISOString(),
      level: 'error',
      message: error.message,
      context,
      error,
    });
  }

  async logWarning(message: string, context?: LogContext): Promise<void> {
    await this.log({
      timestamp: new Date().toISOString(),
      level: 'warn',
      message,
      context,
    });
  }

  async logInfo(message: string, context?: LogContext): Promise<void> {
    await this.log({
      timestamp: new Date().toISOString(),
      level: 'info',
      message,
      context,
    });
  }

  async logDebug(message: string, context?: LogContext): Promise<void> {
    await this.log({
      timestamp: new Date().toISOString(),
      level: 'debug',
      message,
      context,
    });
  }
}

export class LoggingServiceManager {
  private static instance: LoggingServiceManager;
  private services: BaseLoggingService[] = [];

  private constructor() {
    this.initializeServices();
  }

  static getInstance(): LoggingServiceManager {
    if (!LoggingServiceManager.instance) {
      LoggingServiceManager.instance = new LoggingServiceManager();
    }
    return LoggingServiceManager.instance;
  }

  private initializeServices(): void {
    // Initialize based on environment variables
    const config = this.getServiceConfig();

    switch (config.service) {
      case 'sentry':
        if (config.dsn) {
          this.services.push(new SentryLoggingService(config));
        }
        break;
      case 'file':
        this.services.push(new FileLoggingService(config));
        break;
      default:
        this.services.push(new ConsoleLoggingService(config));
    }
  }

  private getServiceConfig(): LoggingServiceConfig {
    if (process.env.SENTRY_DSN) {
      return {
        service: 'sentry',
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV,
        release: process.env.APP_VERSION,
        tags: {
          environment: process.env.NODE_ENV || 'development',
          service: 'mybudget',
        },
      };
    }

    if (process.env.LOG_FILE_PATH) {
      return {
        service: 'file',
      };
    }

    return {
      service: 'console',
    };
  }

  async log(entry: LogEntry): Promise<void> {
    const promises = this.services.map(service => service.log(entry));
    await Promise.allSettled(promises);
  }

  async logError(error: Error, context?: LogContext): Promise<void> {
    await this.log({
      timestamp: new Date().toISOString(),
      level: 'error',
      message: error.message,
      context,
      error,
    });
  }

  async logWarning(message: string, context?: LogContext): Promise<void> {
    await this.log({
      timestamp: new Date().toISOString(),
      level: 'warn',
      message,
      context,
    });
  }

  async logInfo(message: string, context?: LogContext): Promise<void> {
    await this.log({
      timestamp: new Date().toISOString(),
      level: 'info',
      message,
      context,
    });
  }

  async logDebug(message: string, context?: LogContext): Promise<void> {
    await this.log({
      timestamp: new Date().toISOString(),
      level: 'debug',
      message,
      context,
    });
  }

  getServices(): BaseLoggingService[] {
    return this.services;
  }

  isAnyServiceEnabled(): boolean {
    return this.services.some(service => service.isServiceEnabled());
  }
}

// Export singleton instance
export const loggingService = LoggingServiceManager.getInstance();
