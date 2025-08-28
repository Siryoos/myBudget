import { NextResponse } from 'next/server';

import type { ApiResponse, ErrorResponse, SuccessResponse } from '@/types';

/**
 * Standardized API Response Utility
 * 
 * This utility ensures all API endpoints return consistent response formats
 * with proper typing, error handling, and metadata.
 */

export interface ApiResponseOptions {
  status?: number;
  headers?: Record<string, string>;
  requestId?: string;
  timestamp?: string;
  cacheControl?: string;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface BulkOperationResult<T = any> {
  id: string;
  status: 'success' | 'error';
  message: string;
  data?: T;
  error?: string;
}

export interface BulkOperationSummary {
  total: number;
  successful: number;
  failed: number;
}

/**
 * Create a standardized success response
 */
export function createSuccessResponse<T>(
  data: T,
  options: ApiResponseOptions = {}
): NextResponse<SuccessResponse<T>> {
  const {
    status = 200,
    headers = {},
    requestId,
    timestamp = new Date().toISOString(),
    cacheControl,
  } = options;

  const response: SuccessResponse<T> = {
    success: true,
    data,
    timestamp,
    ...(requestId && { requestId }),
  };

  const responseHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  if (cacheControl) {
    responseHeaders['Cache-Control'] = cacheControl;
  }

  return NextResponse.json(response, {
    status,
    headers: responseHeaders,
  });
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  error: Error | string,
  options: ApiResponseOptions & {
    code?: string;
    details?: any;
    retryAfter?: number;
    path?: string;
  } = {}
): NextResponse<ErrorResponse> {
  const {
    status = 500,
    headers = {},
    requestId,
    timestamp = new Date().toISOString(),
    code = 'INTERNAL_ERROR',
    details,
    retryAfter,
    path,
  } = options;

  const errorMessage = typeof error === 'string' ? error : error.message;

  const response: ErrorResponse = {
    success: false,
    error: {
      code,
      message: errorMessage,
      ...(details && { details }),
      ...(retryAfter && { retryAfter }),
    },
    timestamp,
    ...(requestId && { requestId }),
    ...(path && { path }),
  };

  const responseHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  if (retryAfter) {
    responseHeaders['Retry-After'] = retryAfter.toString();
  }

  return NextResponse.json(response, {
    status,
    headers: responseHeaders,
  });
}

/**
 * Create a paginated response
 */
export function createPaginatedResponse<T>(
  data: T[],
  pagination: PaginationInfo,
  options: ApiResponseOptions = {}
): NextResponse<SuccessResponse<{ data: T[]; pagination: PaginationInfo }>> {
  return createSuccessResponse(
    { data, pagination },
    options
  );
}

/**
 * Create a bulk operation response
 */
export function createBulkOperationResponse<T>(
  results: BulkOperationResult<T>[],
  summary: BulkOperationSummary,
  options: ApiResponseOptions = {}
): NextResponse<SuccessResponse<{ results: BulkOperationResult<T>[]; summary: BulkOperationSummary }>> {
  return createSuccessResponse(
    { results, summary },
    options
  );
}

/**
 * Create a validation error response
 */
export function createValidationErrorResponse(
  errors: any[],
  options: ApiResponseOptions & { requestId?: string } = {}
): NextResponse<ErrorResponse> {
  return createErrorResponse(
    'Validation failed',
    {
      status: 400,
      code: 'VALIDATION_ERROR',
      details: errors,
      ...options,
    }
  );
}

/**
 * Create an authentication error response
 */
export function createAuthenticationErrorResponse(
  message: string = 'Authentication required',
  options: ApiResponseOptions = {}
): NextResponse<ErrorResponse> {
  return createErrorResponse(
    message,
    {
      status: 401,
      code: 'AUTHENTICATION_ERROR',
      ...options,
    }
  );
}

/**
 * Create an authorization error response
 */
export function createAuthorizationErrorResponse(
  message: string = 'Insufficient permissions',
  options: ApiResponseOptions = {}
): NextResponse<ErrorResponse> {
  return createErrorResponse(
    message,
    {
      status: 403,
      code: 'AUTHORIZATION_ERROR',
      ...options,
    }
  );
}

/**
 * Create a not found error response
 */
export function createNotFoundErrorResponse(
  resource: string = 'Resource',
  options: ApiResponseOptions = {}
): NextResponse<ErrorResponse> {
  return createErrorResponse(
    `${resource} not found`,
    {
      status: 404,
      code: 'NOT_FOUND',
      ...options,
    }
  );
}

/**
 * Create a conflict error response
 */
export function createConflictErrorResponse(
  message: string = 'Resource conflict',
  options: ApiResponseOptions = {}
): NextResponse<ErrorResponse> {
  return createErrorResponse(
    message,
    {
      status: 409,
      code: 'CONFLICT',
      ...options,
    }
  );
}

/**
 * Create a rate limit error response
 */
export function createRateLimitErrorResponse(
  retryAfter: number,
  options: ApiResponseOptions = {}
): NextResponse<ErrorResponse> {
  return createErrorResponse(
    'Too many requests. Please try again later.',
    {
      status: 429,
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter,
      ...options,
    }
  );
}

/**
 * Create a created response (201)
 */
export function createCreatedResponse<T>(
  data: T,
  options: Omit<ApiResponseOptions, 'status'> = {}
): NextResponse<SuccessResponse<T>> {
  return createSuccessResponse(data, { ...options, status: 201 });
}

/**
 * Create a no content response (204)
 */
export function createNoContentResponse(
  options: Omit<ApiResponseOptions, 'status'> = {}
): NextResponse {
  return new NextResponse(null, {
    status: 204,
    headers: options.headers,
  });
}

/**
 * Create a response with custom cache control
 */
export function createCachedResponse<T>(
  data: T,
  maxAge: number,
  options: ApiResponseOptions = {}
): NextResponse<SuccessResponse<T>> {
  return createSuccessResponse(data, {
    ...options,
    cacheControl: `public, max-age=${maxAge}`,
  });
}

/**
 * Create a response with no cache
 */
export function createNoCacheResponse<T>(
  data: T,
  options: ApiResponseOptions = {}
): NextResponse<SuccessResponse<T>> {
  return createSuccessResponse(data, {
    ...options,
    cacheControl: 'no-cache, no-store, must-revalidate',
  });
}

/**
 * Helper to extract request ID from request
 */
export function extractRequestId(request: Request): string | undefined {
  return request.headers.get('x-request-id') || undefined;
}

/**
 * Helper to create response options with request context
 */
export function createResponseOptions(
  request: Request,
  options: Partial<ApiResponseOptions> = {}
): ApiResponseOptions {
  return {
    requestId: extractRequestId(request),
    timestamp: new Date().toISOString(),
    ...options,
  };
}

/**
 * Type guard to check if response is a success response
 */
export function isSuccessResponse<T>(response: ApiResponse<T>): response is SuccessResponse<T> {
  return response.success === true;
}

/**
 * Type guard to check if response is an error response
 */
export function isErrorResponse(response: ApiResponse<any>): response is ErrorResponse {
  return response.success === false;
}
