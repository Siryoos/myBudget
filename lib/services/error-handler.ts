import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import {
  NotFoundError,
  ValidationError,
  ConflictError,
  UnauthorizedError,
  ForbiddenError
} from './base-service';

export interface ErrorResponse {
  success: false;
  error: string;
  code: string;
  details?: any;
  requestId?: string;
}

// Standard error codes
export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];

export class ApiError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: any;

  constructor(message: string, code: ErrorCode, statusCode: number, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

// Error factory functions
export const createValidationError = (message: string, details?: any): ApiError => {
  return new ApiError(message, ERROR_CODES.VALIDATION_ERROR, 400, details);
};

export const createNotFoundError = (resource: string, id?: string): ApiError => {
  const message = id ? `${resource} with id ${id} not found` : `${resource} not found`;
  return new ApiError(message, ERROR_CODES.NOT_FOUND, 404);
};

export const createConflictError = (message: string, details?: any): ApiError => {
  return new ApiError(message, ERROR_CODES.CONFLICT, 409, details);
};

export const createUnauthorizedError = (message: string = 'Unauthorized'): ApiError => {
  return new ApiError(message, ERROR_CODES.UNAUTHORIZED, 401);
};

export const createForbiddenError = (message: string = 'Forbidden'): ApiError => {
  return new ApiError(message, ERROR_CODES.FORBIDDEN, 403);
};

export const createInternalError = (message: string = 'Internal server error', details?: any): ApiError => {
  return new ApiError(message, ERROR_CODES.INTERNAL_ERROR, 500, details);
};

export const createDatabaseError = (message: string = 'Database error', details?: any): ApiError => {
  return new ApiError(message, ERROR_CODES.DATABASE_ERROR, 500, details);
};

// Error handler function
export function handleApiError(error: unknown, requestId?: string): NextResponse<ErrorResponse> {
  console.error('API Error:', error);

  // Handle ApiError instances
  if (error instanceof ApiError) {
    return NextResponse.json({
      success: false,
      error: error.message,
      code: error.code,
      details: error.details,
      requestId,
    }, { status: error.statusCode });
  }

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    const validationErrors = error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code,
    }));

    return NextResponse.json({
      success: false,
      error: 'Validation failed',
      code: ERROR_CODES.VALIDATION_ERROR,
      details: { validationErrors },
      requestId,
    }, { status: 400 });
  }

  // Handle service layer errors
  if (error instanceof NotFoundError) {
    return NextResponse.json({
      success: false,
      error: error.message,
      code: ERROR_CODES.NOT_FOUND,
      requestId,
    }, { status: 404 });
  }

  if (error instanceof ValidationError) {
    return NextResponse.json({
      success: false,
      error: error.message,
      code: ERROR_CODES.VALIDATION_ERROR,
      requestId,
    }, { status: 400 });
  }

  if (error instanceof ConflictError) {
    return NextResponse.json({
      success: false,
      error: error.message,
      code: ERROR_CODES.CONFLICT,
      requestId,
    }, { status: 409 });
  }

  if (error instanceof UnauthorizedError) {
    return NextResponse.json({
      success: false,
      error: error.message,
      code: ERROR_CODES.UNAUTHORIZED,
      requestId,
    }, { status: 401 });
  }

  if (error instanceof ForbiddenError) {
    return NextResponse.json({
      success: false,
      error: error.message,
      code: ERROR_CODES.FORBIDDEN,
      requestId,
    }, { status: 403 });
  }

  // Handle database errors
  if (error instanceof Error && error.message.toLowerCase().includes('database')) {
    return NextResponse.json({
      success: false,
      error: 'Database operation failed',
      code: ERROR_CODES.DATABASE_ERROR,
      requestId,
    }, { status: 500 });
  }

  // Handle generic errors
  const message = error instanceof Error ? error.message : 'An unexpected error occurred';
  return NextResponse.json({
    success: false,
    error: message,
    code: ERROR_CODES.INTERNAL_ERROR,
    requestId,
  }, { status: 500 });
}

// Success response helpers
export function createSuccessResponse<T>(
  data: T,
  requestId?: string,
  status: number = 200
): NextResponse<{ success: true; data: T; requestId?: string }> {
  return NextResponse.json({
    success: true,
    data,
    requestId,
  }, { status });
}

export function createPaginatedResponse<T>(
  data: T[],
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  },
  requestId?: string
): NextResponse<{
  success: true;
  data: T[];
  pagination: typeof pagination;
  requestId?: string;
}> {
  return NextResponse.json({
    success: true,
    data,
    pagination,
    requestId,
  });
}

// Request ID generator
export function generateRequestId(): string {
  return crypto.randomUUID();
}
