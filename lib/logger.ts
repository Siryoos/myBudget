type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  component?: string;
  action?: string;
  userId?: string;
  [key: string]: any;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private isEnabled = process.env.NEXT_PUBLIC_ENABLE_LOGGING === 'true';
  
  private shouldLog(level: LogLevel): boolean {
    // In production, only log warnings and errors
    if (!this.isDevelopment) {
      return level === 'warn' || level === 'error';
    }
    return this.isEnabled || this.isDevelopment;
  }
  
  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
  }
  
  debug(message: string, context?: LogContext) {
    if (this.shouldLog('debug')) {
      console.log(this.formatMessage('debug', message, context));
    }
  }
  
  info(message: string, context?: LogContext) {
    if (this.shouldLog('info')) {
      console.info(this.formatMessage('info', message, context));
    }
  }
  
  warn(message: string, context?: LogContext) {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, context));
    }
    
    // Send warnings to error reporter in production
    if (!this.isDevelopment && typeof window !== 'undefined') {
      import('./error-reporting').then(({ errorReporter }) => {
        errorReporter.captureMessage(message, 'warning', context);
      });
    }
  }
  
  error(message: string, error?: Error, context?: LogContext) {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message, context), error);
    }
    
    // Send errors to error reporter
    if (typeof window !== 'undefined') {
      import('./error-reporting').then(({ errorReporter }) => {
        errorReporter.captureError(error || message, context, 'error');
      });
    }
  }
  
  // Group logging for better organization in development
  group(label: string, fn: () => void) {
    if (this.isDevelopment && console.group) {
      console.group(label);
      try {
        fn();
      } finally {
        console.groupEnd();
      }
    } else {
      fn();
    }
  }
  
  // Table logging for data visualization in development
  table(data: any[], columns?: string[]) {
    if (this.isDevelopment && console.table) {
      console.table(data, columns);
    }
  }
  
  // Performance logging
  time(label: string) {
    if (this.isDevelopment && console.time) {
      console.time(label);
    }
  }
  
  timeEnd(label: string) {
    if (this.isDevelopment && console.timeEnd) {
      console.timeEnd(label);
    }
  }
}

// Export singleton instance
export const logger = new Logger();

// Export a no-op logger for production builds
export const prodLogger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  group: (_: string, fn: () => void) => fn(),
  table: () => {},
  time: () => {},
  timeEnd: () => {},
};

// Use appropriate logger based on environment
export default process.env.NODE_ENV === 'production' ? prodLogger : logger;
