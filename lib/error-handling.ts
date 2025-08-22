import { errorReporter } from './error-reporting';

// Error types
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public field?: string,
    public value?: any
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends Error {
  constructor(message: string = 'Authentication required') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error {
  constructor(message: string = 'Insufficient permissions') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class NetworkError extends Error {
  constructor(message: string = 'Network error') {
    super(message);
    this.name = 'NetworkError';
  }
}

export class DatabaseError extends Error {
  constructor(
    message: string = 'Database operation failed',
    public operation?: string,
    public table?: string
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class RateLimitError extends Error {
  constructor(
    message: string = 'Rate limit exceeded',
    public retryAfter?: number,
    public limit?: number
  ) {
    super(message);
    this.name = 'RateLimitError';
  }
}

// Error handler type
export type ErrorHandler = (error: Error) => void | Promise<void>;

// Default error messages
export const ERROR_MESSAGES = {
  GENERIC: 'Something went wrong. Please try again.',
  NETWORK: 'Unable to connect. Please check your internet connection.',
  AUTH_REQUIRED: 'Please sign in to continue.',
  PERMISSION_DENIED: 'You do not have permission to perform this action.',
  VALIDATION: 'Please check your input and try again.',
  NOT_FOUND: 'The requested resource was not found.',
  SERVER_ERROR: 'Server error. Please try again later.',
  RATE_LIMIT: 'Too many requests. Please slow down.',
  DATABASE_ERROR: 'Database operation failed. Please try again.',
  INVALID_TOKEN: 'Invalid or expired session. Please sign in again.',
} as const;

// Standardized error response format
export interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code: string;
    status: number;
    details?: any;
    timestamp: string;
    requestId?: string;
  };
}

// Error handling utilities
export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.status) {
      case 400:
        return error.message || ERROR_MESSAGES.VALIDATION;
      case 401:
        return ERROR_MESSAGES.AUTH_REQUIRED;
      case 403:
        return ERROR_MESSAGES.PERMISSION_DENIED;
      case 404:
        return ERROR_MESSAGES.NOT_FOUND;
      case 429:
        return ERROR_MESSAGES.RATE_LIMIT;
      case 500:
      case 502:
      case 503:
        return ERROR_MESSAGES.SERVER_ERROR;
      default:
        return error.message || ERROR_MESSAGES.GENERIC;
    }
  }
  
  if (error instanceof NetworkError) {
    return ERROR_MESSAGES.NETWORK;
  }
  
  if (error instanceof AuthenticationError) {
    return ERROR_MESSAGES.AUTH_REQUIRED;
  }
  
  if (error instanceof AuthorizationError) {
    return ERROR_MESSAGES.PERMISSION_DENIED;
  }
  
  if (error instanceof ValidationError) {
    return error.message || ERROR_MESSAGES.VALIDATION;
  }
  
  if (error instanceof DatabaseError) {
    return ERROR_MESSAGES.DATABASE_ERROR;
  }
  
  if (error instanceof RateLimitError) {
    return ERROR_MESSAGES.RATE_LIMIT;
  }
  
  // Handle unknown errors
  if (error instanceof Error) {
    return error.message || ERROR_MESSAGES.GENERIC;
  }
  
  return ERROR_MESSAGES.GENERIC;
}

export function getErrorCode(error: unknown): string {
  if (error instanceof ApiError) {
    return error.code || `HTTP_${error.status}`;
  }
  
  if (error instanceof ValidationError) {
    return 'VALIDATION_ERROR';
  }
  
  if (error instanceof AuthenticationError) {
    return 'AUTHENTICATION_ERROR';
  }
  
  if (error instanceof AuthorizationError) {
    return 'AUTHORIZATION_ERROR';
  }
  
  if (error instanceof NetworkError) {
    return 'NETWORK_ERROR';
  }
  
  if (error instanceof DatabaseError) {
    return 'DATABASE_ERROR';
  }
  
  if (error instanceof RateLimitError) {
    return 'RATE_LIMIT_ERROR';
  }
  
  return 'UNKNOWN_ERROR';
}

export function getErrorStatus(error: unknown): number {
  if (error instanceof ApiError) {
    return error.status;
  }
  
  if (error instanceof ValidationError) {
    return 400;
  }
  
  if (error instanceof AuthenticationError) {
    return 401;
  }
  
  if (error instanceof AuthorizationError) {
    return 403;
  }
  
  if (error instanceof NetworkError) {
    return 503;
  }
  
  if (error instanceof DatabaseError) {
    return 500;
  }
  
  if (error instanceof RateLimitError) {
    return 429;
  }
  
  return 500;
}

// Create standardized error response
export function createErrorResponse(
  error: unknown,
  requestId?: string
): ErrorResponse {
  const message = getErrorMessage(error);
  const code = getErrorCode(error);
  const status = getErrorStatus(error);
  
  return {
    success: false,
    error: {
      message,
      code,
      status,
      details: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
      requestId,
    },
  };
}

// Error logging and reporting
export async function handleError(
  error: unknown,
  context?: string,
  requestId?: string
): Promise<{ recovered: boolean; message: string }> {
  const errorResponse = createErrorResponse(error, requestId);
  
  // Log error
  console.error(`[${context || 'UNKNOWN'}] Error:`, {
    ...errorResponse.error,
    context,
    requestId,
  });
  
  // Report to error reporting service if available
  try {
    if (errorReporter && errorReporter.captureException) {
      await errorReporter.captureException(error, {
        tags: { context, requestId },
        extra: { errorResponse },
      });
    }
  } catch (reportingError) {
    console.error('Failed to report error:', reportingError);
  }
  
  return {
    recovered: false,
    message: errorResponse.error.message
  };
}

// Validation error helpers
export function createValidationError(
  field: string,
  message: string,
  value?: any
): ValidationError {
  return new ValidationError(message, field, value);
}

export function createFieldValidationErrors(
  errors: Array<{ field: string; message: string; value?: any }>
): ValidationError[] {
  return errors.map(({ field, message, value }) =>
    createValidationError(field, message, value)
  );
}

// Database error helpers
export function createDatabaseError(
  message: string,
  operation?: string,
  table?: string
): DatabaseError {
  return new DatabaseError(message, operation, table);
}

// Rate limit error helpers
export function createRateLimitError(
  message: string,
  retryAfter?: number,
  limit?: number
): RateLimitError {
  return new RateLimitError(message, retryAfter, limit);
}
