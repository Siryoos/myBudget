import { apiClient } from './api-client';

export interface ErrorContext {
  userId?: string;
  userAgent?: string;
  url?: string;
  component?: string;
  action?: string;
  extra?: Record<string, any>;
}

export interface ErrorReport {
  message: string;
  stack?: string;
  level: 'error' | 'warning' | 'info';
  timestamp: string;
  context: ErrorContext;
  fingerprint?: string;
}

export class ErrorReportingService {
  private static instance: ErrorReportingService;
  private isInitialized = false;
  private userId?: string;
  private queue: ErrorReport[] = [];
  private flushTimer?: NodeJS.Timeout;
  
  private constructor() {}
  
  static getInstance(): ErrorReportingService {
    if (!ErrorReportingService.instance) {
      ErrorReportingService.instance = new ErrorReportingService();
    }
    return ErrorReportingService.instance;
  }
  
  /**
   * Initialize error reporting service
   */
  initialize(config: {
    dsn?: string;
    environment?: string;
    userId?: string;
  }) {
    if (this.isInitialized) return;
    
    this.userId = config.userId;
    
    // Set up global error handlers
    if (typeof window !== 'undefined') {
      window.addEventListener('error', this.handleWindowError.bind(this));
      window.addEventListener('unhandledrejection', this.handleUnhandledRejection.bind(this));
    }
    
    // Initialize Sentry if DSN is provided
    if (config.dsn && typeof window !== 'undefined') {
      this.initializeSentry(config);
    }
    
    this.isInitialized = true;
  }
  
  /**
   * Initialize Sentry SDK
   */
  private async initializeSentry(config: any) {
    try {
      const Sentry = await import('@sentry/nextjs');
      
      Sentry.init({
        dsn: config.dsn,
        environment: config.environment || 'production',
        integrations: [
          // new Sentry.BrowserTracing(), // Disabled for compatibility
                      // new Sentry.Replay({ // Disabled for compatibility
            //   maskAllText: true,
            //   blockAllMedia: true,
            // }),
        ],
        tracesSampleRate: config.environment === 'production' ? 0.1 : 1.0,
        replaysSessionSampleRate: 0.1,
        replaysOnErrorSampleRate: 1.0,
        beforeSend: (event, hint) => {
          // Sanitize sensitive data
          if (event.request?.cookies) {
            delete event.request.cookies;
          }
          if (event.user?.email) {
            event.user.email = this.hashEmail(event.user.email);
          }
          return event;
        },
      });
      
      if (this.userId) {
        Sentry.setUser({ id: this.userId });
      }
    } catch (error) {
      console.error('Failed to initialize Sentry:', error);
    }
  }
  
  /**
   * Set user context
   */
  setUser(userId: string, email?: string) {
    this.userId = userId;
    
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.setUser({
        id: userId,
        email: email ? this.hashEmail(email) : undefined,
      });
    }
  }
  
  /**
   * Clear user context
   */
  clearUser() {
    this.userId = undefined;
    
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.setUser(null);
    }
  }
  
  /**
   * Capture an error
   */
  captureError(
    error: Error | string,
    context?: ErrorContext,
    level: 'error' | 'warning' | 'info' = 'error'
  ) {
    const errorReport: ErrorReport = {
      message: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      level,
      timestamp: new Date().toISOString(),
      context: {
        ...context,
        userId: context?.userId || this.userId,
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
        url: typeof window !== 'undefined' ? window.location.href : undefined,
      },
      fingerprint: this.generateFingerprint(error),
    };
    
    // Add to queue
    this.queue.push(errorReport);
    
    // Send to Sentry if available
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      if (error instanceof Error) {
        (window as any).Sentry.captureException(error, {
          level,
          contexts: {
            custom: context,
          },
        });
      } else {
        (window as any).Sentry.captureMessage(error, level);
      }
    }
    
    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.group(`🚨 ${level.toUpperCase()}: ${errorReport.message}`);
      console.error('Error details:', errorReport);
      console.groupEnd();
    }
    
    // Schedule flush
    this.scheduleFlush();
  }
  
  /**
   * Capture an exception (alias for captureError for compatibility)
   */
  captureException(
    error: Error | string,
    options?: {
      tags?: Record<string, string>;
      extra?: Record<string, any>;
    }
  ) {
    const context: ErrorContext = {
      ...options?.extra,
    };
    this.captureError(error, context, 'error');
  }

  /**
   * Capture a message
   */
  captureMessage(message: string, level: 'error' | 'warning' | 'info' = 'info', context?: ErrorContext) {
    this.captureError(message, context, level);
  }
  
  /**
   * Add breadcrumb for debugging
   */
  addBreadcrumb(breadcrumb: {
    message: string;
    category?: string;
    data?: Record<string, any>;
    level?: 'debug' | 'info' | 'warning' | 'error';
  }) {
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.addBreadcrumb({
        ...breadcrumb,
        timestamp: Date.now() / 1000,
      });
    }
  }
  
  /**
   * Capture user feedback
   */
  async captureUserFeedback(feedback: {
    name?: string;
    email?: string;
    message: string;
    associatedEventId?: string;
  }) {
    try {
      // Send to backend
      await apiClient.request('/api/feedback', {
        method: 'POST',
        body: JSON.stringify({
          ...feedback,
          email: feedback.email ? this.hashEmail(feedback.email) : undefined,
          timestamp: new Date().toISOString(),
          context: {
            url: typeof window !== 'undefined' ? window.location.href : undefined,
            userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
          },
        }),
      });
      
      // Also send to Sentry if available
      if (typeof window !== 'undefined' && (window as any).Sentry && feedback.associatedEventId) {
        const user = feedback.name || feedback.email ? {
          name: feedback.name,
          email: feedback.email,
        } : undefined;
        
        (window as any).Sentry.captureUserFeedback({
          event_id: feedback.associatedEventId,
          name: user?.name,
          email: user?.email,
          comments: feedback.message,
        });
      }
    } catch (error) {
      console.error('Failed to capture user feedback:', error);
    }
  }
  
  /**
   * Handle window error events
   */
  private handleWindowError(event: ErrorEvent) {
    this.captureError(event.error || event.message, {
      component: 'window',
      action: 'error',
      extra: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
    });
  }
  
  /**
   * Handle unhandled promise rejections
   */
  private handleUnhandledRejection(event: PromiseRejectionEvent) {
    this.captureError(
      event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
      {
        component: 'promise',
        action: 'unhandledRejection',
      }
    );
  }
  
  /**
   * Generate fingerprint for error deduplication
   */
  private generateFingerprint(error: Error | string): string {
    const message = error instanceof Error ? error.message : error;
    const stack = error instanceof Error ? error.stack : '';
    
    // Simple hash function
    let hash = 0;
    const str = `${message}${stack}`;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(36);
  }
  
  /**
   * Hash email for privacy
   */
  private hashEmail(email: string): string {
    // Simple hash for demo - use proper hashing in production
    return email.split('@')[0].substring(0, 3) + '***@' + email.split('@')[1];
  }
  
  /**
   * Schedule flush of error queue
   */
  private scheduleFlush() {
    if (this.flushTimer) return;
    
    this.flushTimer = setTimeout(() => {
      this.flush();
    }, 5000); // Flush every 5 seconds
  }
  
  /**
   * Flush error queue to backend
   */
  private async flush() {
    if (this.queue.length === 0) {
      this.flushTimer = undefined;
      return;
    }
    
    const errors = [...this.queue];
    this.queue = [];
    
    try {
      await apiClient.request('/api/errors/batch', {
        method: 'POST',
        body: JSON.stringify({ errors }),
      });
    } catch (error) {
      // Re-add to queue on failure
      this.queue.unshift(...errors);
      console.error('Failed to flush error queue:', error);
    }
    
    this.flushTimer = undefined;
  }
  
  /**
   * Manually flush errors
   */
  async forceFlush() {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = undefined;
    }
    await this.flush();
  }
}

// Export singleton instance
export const errorReporter = ErrorReportingService.getInstance();

// Export convenience hook
export function useErrorHandler() {
  return {
    captureError: (error: Error | string, context?: ErrorContext) => 
      errorReporter.captureError(error, context),
    captureMessage: (message: string, level?: 'error' | 'warning' | 'info', context?: ErrorContext) =>
      errorReporter.captureMessage(message, level, context),
    addBreadcrumb: (breadcrumb: any) =>
      errorReporter.addBreadcrumb(breadcrumb),
  };
}
