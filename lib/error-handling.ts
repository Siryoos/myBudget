import { ZodError } from 'zod';

// Error codes for consistent error handling
export enum ErrorCode {
  // Validation errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  
  // Authentication errors
  UNAUTHORIZED = 'UNAUTHORIZED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  
  // Database errors
  DATABASE_ERROR = 'DATABASE_ERROR',
  RECORD_NOT_FOUND = 'RECORD_NOT_FOUND',
  DUPLICATE_RECORD = 'DUPLICATE_RECORD',
  CONSTRAINT_VIOLATION = 'CONSTRAINT_VIOLATION',
  
  // Rate limiting
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  
  // Server errors
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  
  // Security errors
  SECURITY_VIOLATION = 'SECURITY_VIOLATION',
  CSRF_VIOLATION = 'CSRF_VIOLATION',
  XSS_ATTEMPT = 'XSS_ATTEMPT',
  
  // Business logic errors
  BUSINESS_RULE_VIOLATION = 'BUSINESS_RULE_VIOLATION',
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
  GOAL_ALREADY_EXISTS = 'GOAL_ALREADY_EXISTS'
}

// Error severity levels
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Base error class
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly severity: ErrorSeverity;
  public readonly isOperational: boolean;
  public readonly details?: any;
  public readonly requestId?: string;
  public readonly timestamp: Date;
  public readonly userAgent?: string;
  public readonly ipAddress?: string;

  constructor(
    message: string,
    code: ErrorCode = ErrorCode.INTERNAL_SERVER_ERROR,
    statusCode: number = 500,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    isOperational: boolean = true,
    details?: any,
    requestId?: string,
    userAgent?: string,
    ipAddress?: string
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.severity = severity;
    this.isOperational = isOperational;
    this.details = details;
    this.requestId = requestId;
    this.timestamp = new Date();
    this.userAgent = userAgent;
    this.ipAddress = ipAddress;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }
}

// Specific error types
export class ValidationError extends AppError {
  constructor(message: string, details?: any, requestId?: string) {
    super(message, ErrorCode.VALIDATION_ERROR, 400, ErrorSeverity.LOW, true, details, requestId);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string, details?: any, requestId?: string) {
    super(message, ErrorCode.UNAUTHORIZED, 401, ErrorSeverity.MEDIUM, true, details, requestId);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string, details?: any, requestId?: string) {
    super(message, ErrorCode.INSUFFICIENT_PERMISSIONS, 403, ErrorSeverity.MEDIUM, true, details, requestId);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string, details?: any, requestId?: string) {
    super(message, ErrorCode.RECORD_NOT_FOUND, 404, ErrorSeverity.LOW, true, details, requestId);
    this.name = 'NotFoundError';
  }
}

export class RateLimitError extends AppError {
  constructor(message: string, retryAfter?: number, requestId?: string) {
    super(message, ErrorCode.RATE_LIMIT_EXCEEDED, 429, ErrorSeverity.MEDIUM, true, { retryAfter }, requestId);
    this.name = 'RateLimitError';
  }
}

// Error response interface
export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    retryAfter?: number;
  };
  timestamp: string;
  requestId: string;
  path?: string;
}

// Success response interface
export interface SuccessResponse<T = any> {
  success: true;
  data: T;
  timestamp: string;
  requestId: string;
}

// Combined response type
export type ApiResponse<T = any> = SuccessResponse<T> | ErrorResponse;

// Error handler class
export class ErrorHandler {
  private static instance: ErrorHandler;
  private isDevelopment: boolean;

  private constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
  }

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  // Handle different types of errors
  handleError(error: Error | AppError, requestId?: string): ErrorResponse {
    if (error instanceof AppError) {
      return this.handleAppError(error);
    }

    if (error instanceof ZodError) {
      return this.handleZodError(error, requestId);
    }

    // Handle unknown errors
    return this.handleUnknownError(error, requestId);
  }

  private handleAppError(error: AppError): ErrorResponse {
    // Log error with appropriate level
    this.logError(error);

    return {
      success: false,
      error: {
        code: error.code,
        message: this.isDevelopment ? error.message : this.getProductionMessage(error.code),
        details: this.isDevelopment ? error.details : undefined,
        retryAfter: error.details?.retryAfter
      },
      timestamp: error.timestamp.toISOString(),
      requestId: error.requestId || 'unknown',
      path: error.details?.path
    };
  }

  private handleZodError(error: ZodError, requestId?: string): ErrorResponse {
    const validationError = new ValidationError(
      'Validation failed',
      error.flatten(),
      requestId
    );

    return this.handleAppError(validationError);
  }

  private handleUnknownError(error: Error, requestId?: string): ErrorResponse {
    const appError = new AppError(
      'An unexpected error occurred',
      ErrorCode.INTERNAL_SERVER_ERROR,
      500,
      ErrorSeverity.HIGH,
      false,
      this.isDevelopment ? { originalError: error.message, stack: error.stack } : undefined,
      requestId
    );

    return this.handleAppError(appError);
  }

  // Get production-safe error messages
  private getProductionMessage(code: ErrorCode): string {
    const productionMessages: Record<ErrorCode, string> = {
      [ErrorCode.VALIDATION_ERROR]: 'The provided data is invalid',
      [ErrorCode.INVALID_INPUT]: 'Invalid input provided',
      [ErrorCode.MISSING_REQUIRED_FIELD]: 'Required information is missing',
      [ErrorCode.UNAUTHORIZED]: 'Authentication required',
      [ErrorCode.INVALID_CREDENTIALS]: 'Invalid credentials provided',
      [ErrorCode.TOKEN_EXPIRED]: 'Your session has expired',
      [ErrorCode.TOKEN_INVALID]: 'Invalid authentication token',
      [ErrorCode.INSUFFICIENT_PERMISSIONS]: 'Access denied',
      [ErrorCode.DATABASE_ERROR]: 'Database operation failed',
      [ErrorCode.RECORD_NOT_FOUND]: 'The requested resource was not found',
      [ErrorCode.DUPLICATE_RECORD]: 'A record with this information already exists',
      [ErrorCode.CONSTRAINT_VIOLATION]: 'Data constraint violation',
      [ErrorCode.RATE_LIMIT_EXCEEDED]: 'Too many requests, please try again later',
      [ErrorCode.INTERNAL_SERVER_ERROR]: 'An internal server error occurred',
      [ErrorCode.SERVICE_UNAVAILABLE]: 'Service temporarily unavailable',
      [ErrorCode.SECURITY_VIOLATION]: 'Security violation detected',
      [ErrorCode.CSRF_VIOLATION]: 'CSRF token validation failed',
      [ErrorCode.XSS_ATTEMPT]: 'Potential XSS attempt detected',
      [ErrorCode.BUSINESS_RULE_VIOLATION]: 'Business rule violation',
      [ErrorCode.INSUFFICIENT_FUNDS]: 'Insufficient funds for this operation',
      [ErrorCode.GOAL_ALREADY_EXISTS]: 'A goal with this name already exists'
    };

    return productionMessages[code] || 'An error occurred';
  }

  // Log errors with appropriate level
  private logError(error: AppError): void {
    const logData = {
      timestamp: error.timestamp.toISOString(),
      level: error.severity,
      code: error.code,
      message: error.message,
      statusCode: error.statusCode,
      requestId: error.requestId,
      userAgent: error.userAgent,
      ipAddress: error.ipAddress,
      stack: error.stack,
      details: error.details
    };

    if (error.severity === ErrorSeverity.CRITICAL) {
      console.error('🚨 CRITICAL ERROR:', logData);
    } else if (error.severity === ErrorSeverity.HIGH) {
      console.error('❌ HIGH ERROR:', logData);
    } else if (error.severity === ErrorSeverity.MEDIUM) {
      console.warn('⚠️ MEDIUM ERROR:', logData);
    } else {
      console.log('ℹ️ LOW ERROR:', logData);
    }

    // In production, send to external logging service
    if (process.env.NODE_ENV === 'production') {
      this.sendToLoggingService(logData);
    }
  }

  private sendToLoggingService(logData: any): void {
    // TODO: Implement external logging service integration
    // Examples: Sentry, LogRocket, DataDog, etc.
    console.log('[EXTERNAL_LOGGING]', logData);
  }
}

// Convenience functions for creating error responses
export const createErrorResponse = (
  error: Error | AppError,
  requestId?: string,
  userAgent?: string,
  ipAddress?: string
): ErrorResponse => {
  const errorHandler = ErrorHandler.getInstance();
  
  if (error instanceof AppError) {
    error.userAgent = userAgent;
    error.ipAddress = ipAddress;
  }
  
  return errorHandler.handleError(error, requestId);
};

export const createValidationError = (
  error: ZodError,
  requestId?: string
): ErrorResponse => {
  const errorHandler = ErrorHandler.getInstance();
  return errorHandler.handleError(error, requestId);
};

export const createDatabaseError = (
  error: Error,
  requestId?: string
): ErrorResponse => {
  const dbError = new AppError(
    'Database operation failed',
    ErrorCode.DATABASE_ERROR,
    500,
    ErrorSeverity.HIGH,
    true,
    process.env.NODE_ENV === 'development' ? { originalError: error.message } : undefined,
    requestId
  );
  
  const errorHandler = ErrorHandler.getInstance();
  return errorHandler.handleError(dbError);
};

// Global error handler for unhandled errors
export const setupGlobalErrorHandling = (): void => {
  process.on('uncaughtException', (error: Error) => {
    console.error('🚨 UNCAUGHT EXCEPTION:', error);
    const errorHandler = ErrorHandler.getInstance();
    errorHandler.handleError(error);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    console.error('🚨 UNHANDLED REJECTION:', reason);
    const errorHandler = ErrorHandler.getInstance();
    errorHandler.handleError(new Error(String(reason)));
    process.exit(1);
  });
};

// Initialize global error handling
setupGlobalErrorHandling();
