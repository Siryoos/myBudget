import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

import {
  NotFoundError,
  ValidationError,
  ConflictError,
  UnauthorizedError,
  ForbiddenError,
} from './base-service';

export interface ServiceErrorResponse {
  success: false;
  error: string;
  code: string;
  details?: Record<string, unknown>;
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
  public readonly details?: Record<string, unknown>;

  constructor(message: string, code: ErrorCode, statusCode: number, details?: Record<string, unknown>) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

// Constants for HTTP status codes
export const HTTP_OK = 200;
export const HTTP_CREATED = 201;
export const HTTP_BAD_REQUEST = 400;
export const HTTP_UNAUTHORIZED = 401;
export const HTTP_FORBIDDEN = 403;
export const HTTP_NOT_FOUND = 404;
export const HTTP_CONFLICT = 409;
export const HTTP_INTERNAL_SERVER_ERROR = 500;
export const HTTP_SERVICE_UNAVAILABLE = 503;

// Error factory functions
export const createValidationError = (message: string, details?: Record<string, unknown>): ApiError => new ApiError(message, ERROR_CODES.VALIDATION_ERROR, HTTP_BAD_REQUEST, details);

export const createNotFoundError = (resource: string, id?: string): ApiError => {
  const message = id ? `${resource} with id ${id} not found` : `${resource} not found`;
  return new ApiError(message, ERROR_CODES.NOT_FOUND, HTTP_NOT_FOUND);
};

export const createConflictError = (message: string, details?: Record<string, unknown>): ApiError => new ApiError(message, ERROR_CODES.CONFLICT, HTTP_CONFLICT, details);

export const createUnauthorizedError = (message: string = 'Unauthorized'): ApiError => new ApiError(message, ERROR_CODES.UNAUTHORIZED, HTTP_UNAUTHORIZED);

export const createForbiddenError = (message: string = 'Forbidden'): ApiError => new ApiError(message, ERROR_CODES.FORBIDDEN, HTTP_FORBIDDEN);

export const createInternalError = (message: string = 'Internal server error', details?: Record<string, unknown>): ApiError => new ApiError(message, ERROR_CODES.INTERNAL_ERROR, HTTP_INTERNAL_SERVER_ERROR, details);

export const createDatabaseError = (message: string = 'Database error', details?: Record<string, unknown>): ApiError => new ApiError(message, ERROR_CODES.DATABASE_ERROR, HTTP_INTERNAL_SERVER_ERROR, details);

/**
 * Convert any thrown error into a standardized NextResponse containing a ServiceErrorResponse.
 *
 * Maps known error types to appropriate HTTP status codes and error codes:
 * - ApiError: uses the instance's message, code, details and statusCode.
 * - ZodError: returns `VALIDATION_ERROR` with a structured `validationErrors` array (HTTP_BAD_REQUEST).
 * - NotFoundError / ValidationError / ConflictError / UnauthorizedError / ForbiddenError:
 *   mapped to `NOT_FOUND` (HTTP_NOT_FOUND), `VALIDATION_ERROR` (HTTP_BAD_REQUEST), `CONFLICT` (HTTP_CONFLICT), `UNAUTHORIZED` (HTTP_UNAUTHORIZED), and `FORBIDDEN` (HTTP_FORBIDDEN) respectively.
 * - Errors whose message contains "database" (case-insensitive): returns `DATABASE_ERROR` (HTTP_INTERNAL_SERVER_ERROR) with a generic message.
 * - Fallback: returns `INTERNAL_ERROR` (HTTP_INTERNAL_SERVER_ERROR) with the error message when available.
 *
 * @param error - The thrown value to normalize (can be any type).
 * @param requestId - Optional request identifier to include in the response.
 * @returns A NextResponse wrapping a ServiceErrorResponse with `success: false`, an error message, an error code,
 *          optional `details`, optional `requestId`, and the appropriate HTTP status.
 */
export const handleApiError = (error: unknown, requestId?: string): NextResponse<ServiceErrorResponse> => {
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
    }, { status: HTTP_BAD_REQUEST });
  }

  // Handle service layer errors
  if (error instanceof NotFoundError) {
    return NextResponse.json({
      success: false,
      error: error.message,
      code: ERROR_CODES.NOT_FOUND,
      requestId,
    }, { status: HTTP_NOT_FOUND });
  }

  if (error instanceof ValidationError) {
    return NextResponse.json({
      success: false,
      error: error.message,
      code: ERROR_CODES.VALIDATION_ERROR,
      requestId,
    }, { status: HTTP_BAD_REQUEST });
  }

  if (error instanceof ConflictError) {
    return NextResponse.json({
      success: false,
      error: error.message,
      code: ERROR_CODES.CONFLICT,
      requestId,
    }, { status: HTTP_CONFLICT });
  }

  if (error instanceof UnauthorizedError) {
    return NextResponse.json({
      success: false,
      error: error.message,
      code: ERROR_CODES.UNAUTHORIZED,
      requestId,
    }, { status: HTTP_UNAUTHORIZED });
  }

  if (error instanceof ForbiddenError) {
    return NextResponse.json({
      success: false,
      error: error.message,
      code: ERROR_CODES.FORBIDDEN,
      requestId,
    }, { status: HTTP_FORBIDDEN });
  }

  // Handle database errors
  if (error instanceof Error && error.message.toLowerCase().includes('database')) {
    return NextResponse.json({
      success: false,
      error: 'Database operation failed',
      code: ERROR_CODES.DATABASE_ERROR,
      requestId,
    }, { status: HTTP_INTERNAL_SERVER_ERROR });
  }

  // Handle generic errors
  const message = error instanceof Error ? error.message : 'An unexpected error occurred';
  return NextResponse.json({
    success: false,
    error: message,
    code: ERROR_CODES.INTERNAL_ERROR,
    requestId,
  }, { status: HTTP_INTERNAL_SERVER_ERROR });
};

/**
 * Create a standardized JSON success response for API routes.
 *
 * @param data - The response payload to return as `data`.
 * @param requestId - Optional request identifier to include in the response body.
 * @param status - HTTP status code for the response (defaults to `HTTP_OK`).
 * @returns A NextResponse whose JSON body is `{ success: true, data, requestId }`.
 */
export const createSuccessResponse = <T>(
  data: T,
  requestId?: string,
  status: number = HTTP_OK,
): NextResponse<{ success: true; data: T; requestId?: string }> => {
  return NextResponse.json({
    success: true,
    data,
    requestId,
  }, { status });
}

/**
 * Builds a standardized paginated successful JSON response.
 *
 * Returns a NextResponse with `{ success: true, data, pagination, requestId? }` suitable for list endpoints.
 *
 * @param data - Array of items for the current page.
 * @param pagination - Pagination metadata:
 *   - `page`: current page number
 *   - `limit`: items per page
 *   - `total`: total number of items across all pages
 *   - `totalPages`: total number of pages
 *   - `hasNext`: whether a next page exists
 *   - `hasPrev`: whether a previous page exists
 * @param requestId - Optional request identifier to echo back to the client.
 * @returns A NextResponse containing `{ success: true; data: T[]; pagination; requestId? }`.
 */
export const createPaginatedResponse = <T>(
  data: T[],
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  },
  requestId?: string,
): NextResponse<{
  success: true;
  data: T[];
  pagination: typeof pagination;
  requestId?: string;
}> => {
  return NextResponse.json({
    success: true,
    data,
    pagination,
    requestId,
  });
}

/**
 * Generates a unique request identifier.
 *
 * @returns A UUID string suitable for use as a request ID.
 */
export const generateRequestId = (): string => {
  return crypto.randomUUID();
};
