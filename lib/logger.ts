import { createWriteStream, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { hostname } from 'os';

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
  TRACE = 4
}

export interface LogContext {
  [key: string]: any;
}

export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  context?: LogContext;
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
  metadata?: {
    hostname: string;
    pid: number;
    version?: string;
    environment: string;
  };
}

class Logger {
  private static instance: Logger;
  private logLevel: LogLevel;
  private isProduction: boolean;
  private logStream?: NodeJS.WritableStream;
  private logDir: string;
  private context: LogContext = {};

  private constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
    this.logLevel = this.parseLogLevel(process.env.LOG_LEVEL || 'info');
    this.logDir = process.env.LOG_DIR || join(process.cwd(), 'logs');
    
    // Ensure log directory exists
    if (this.isProduction && !existsSync(this.logDir)) {
      mkdirSync(this.logDir, { recursive: true });
    }
    
    // Set up file logging in production
    if (this.isProduction) {
      const logFile = join(this.logDir, `app-${new Date().toISOString().split('T')[0]}.log`);
      this.logStream = createWriteStream(logFile, { flags: 'a' });
    }
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private parseLogLevel(level: string): LogLevel {
    switch (level.toLowerCase()) {
      case 'error': return LogLevel.ERROR;
      case 'warn': return LogLevel.WARN;
      case 'info': return LogLevel.INFO;
      case 'debug': return LogLevel.DEBUG;
      case 'trace': return LogLevel.TRACE;
      default: return LogLevel.INFO;
    }
  }

  private formatLogEntry(level: LogLevel, message: string, context?: LogContext, error?: Error): LogEntry {
    const levelName = LogLevel[level];
    
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: levelName,
      message,
      metadata: {
        hostname: hostname(),
        pid: process.pid,
        version: process.env.npm_package_version,
        environment: process.env.NODE_ENV || 'development'
      }
    };

    // Merge instance context with provided context
    if (this.context || context) {
      entry.context = { ...this.context, ...context };
    }

    if (error) {
      entry.error = {
        message: error.message,
        stack: error.stack,
        code: (error as any).code
      };
    }

    return entry;
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.logLevel;
  }

  private output(entry: LogEntry): void {
    if (this.isProduction) {
      // Production: Write JSON to file
      if (this.logStream) {
        this.logStream.write(JSON.stringify(entry) + '\n');
      }
    } else {
      // Development: Pretty print to console
      const { timestamp, level, message, context, error } = entry;
      const prefix = `[${timestamp}] [${level}]`;
      
      switch (level) {
        case 'ERROR':
          console.error(prefix, message, context || '', error || '');
          break;
        case 'WARN':
          console.warn(prefix, message, context || '');
          break;
        case 'DEBUG':
        case 'TRACE':
          console.debug(prefix, message, context || '');
          break;
        default:
          console.log(prefix, message, context || '');
      }
    }
  }

  // Set persistent context for all logs from this logger instance
  setContext(context: LogContext): void {
    this.context = { ...this.context, ...context };
  }

  // Clear persistent context
  clearContext(): void {
    this.context = {};
  }

  // Create a child logger with additional context
  child(context: LogContext): Logger {
    const child = Object.create(this);
    child.context = { ...this.context, ...context };
    return child;
  }

  error(message: string, error?: Error | any, context?: LogContext): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      const err = error instanceof Error ? error : error ? new Error(String(error)) : undefined;
      const entry = this.formatLogEntry(LogLevel.ERROR, message, context, err);
      this.output(entry);
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.WARN)) {
      const entry = this.formatLogEntry(LogLevel.WARN, message, context);
      this.output(entry);
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.INFO)) {
      const entry = this.formatLogEntry(LogLevel.INFO, message, context);
      this.output(entry);
    }
  }

  debug(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      const entry = this.formatLogEntry(LogLevel.DEBUG, message, context);
      this.output(entry);
    }
  }

  trace(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.TRACE)) {
      const entry = this.formatLogEntry(LogLevel.TRACE, message, context);
      this.output(entry);
    }
  }

  // Security-specific logging methods
  security(message: string, context?: LogContext): void {
    this.info(`[SECURITY] ${message}`, { ...context, security: true });
  }

  audit(action: string, userId?: string, context?: LogContext): void {
    this.info(`[AUDIT] ${action}`, { 
      ...context, 
      audit: true, 
      userId, 
      action,
      timestamp: new Date().toISOString() 
    });
  }

  // Performance logging
  performance(operation: string, duration: number, context?: LogContext): void {
    this.info(`[PERFORMANCE] ${operation}`, { 
      ...context, 
      performance: true, 
      operation, 
      duration_ms: duration 
    });
  }

  // HTTP request logging
  http(method: string, url: string, statusCode: number, duration: number, context?: LogContext): void {
    const level = statusCode >= 500 ? LogLevel.ERROR : 
                  statusCode >= 400 ? LogLevel.WARN : 
                  LogLevel.INFO;
    
    if (this.shouldLog(level)) {
      const message = `[HTTP] ${method} ${url} ${statusCode} ${duration}ms`;
      const entry = this.formatLogEntry(level, message, {
        ...context,
        http: true,
        method,
        url,
        statusCode,
        duration_ms: duration
      });
      this.output(entry);
    }
  }

  // Database query logging
  query(sql: string, duration: number, context?: LogContext): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      this.debug(`[SQL] Query executed in ${duration}ms`, {
        ...context,
        sql: this.isProduction ? 'REDACTED' : sql,
        duration_ms: duration
      });
    }
  }

  // Flush logs (useful for graceful shutdown)
  async flush(): Promise<void> {
    if (this.logStream && 'end' in this.logStream) {
      return new Promise((resolve) => {
        this.logStream!.end(() => resolve());
      });
    }
  }
}

// Export singleton instance
export const logger = Logger.getInstance();

// Export function to create child loggers
export function createLogger(context: LogContext): Logger {
  return logger.child(context);
}

// Middleware for Express/Next.js API routes
export function requestLogger(req: any, res: any, next: any): void {
  const start = Date.now();
  const requestId = req.headers['x-request-id'] || crypto.randomUUID();
  
  // Add request ID to request object
  req.requestId = requestId;
  
  // Create child logger for this request
  req.logger = logger.child({ requestId });
  
  // Log request
  req.logger.info(`Incoming ${req.method} ${req.url}`, {
    method: req.method,
    url: req.url,
    ip: req.ip || req.headers['x-forwarded-for'],
    userAgent: req.headers['user-agent']
  });
  
  // Capture response
  const originalSend = res.send;
  res.send = function(data: any) {
    const duration = Date.now() - start;
    req.logger.http(req.method, req.url, res.statusCode, duration, {
      responseSize: data ? data.length : 0
    });
    return originalSend.call(this, data);
  };
  
  next();
}

// Error logger middleware
export function errorLogger(err: Error, req: any, res: any, next: any): void {
  const logger = req.logger || logger;
  logger.error('Unhandled error in request', err, {
    method: req.method,
    url: req.url,
    requestId: req.requestId
  });
  next(err);
}

// Graceful shutdown helper
export async function gracefulShutdown(): Promise<void> {
  logger.info('Graceful shutdown initiated');
  await logger.flush();
}
