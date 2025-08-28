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
 * Build a standardized JSON success response for Next.js endpoints.
 *
 * Returns a NextResponse containing a payload with `success: true`, the provided `data`,
 * a `timestamp`, and an optional `requestId`. The response status defaults to `200` but
 * can be overridden via `options.status`. Provided `options.headers` are merged with
 * `Content-Type: application/json`. If `options.cacheControl` is set, a `Cache-Control`
 * header is added.
 *
 * @param data - The response body to include under the `data` field.
 * @param options - Optional metadata and response configuration (status, headers, requestId, timestamp, cacheControl).
 * @returns A NextResponse wrapping a `SuccessResponse<T>` payload.
 */
export function createSuccessResponse<T>(
  data: T,
  options: ApiResponseOptions = {},
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
 * Create a standardized JSON error response wrapped in a NextResponse.
 *
 * Builds an ErrorResponse with `success: false`, an `error` object (containing `code`, `message`
 * and optional `details` and `retryAfter`), a `timestamp`, and optional `requestId` and `path`.
 * Also sets response headers (including `Content-Type: application/json`) and the HTTP status.
 *
 * @param error - An Error instance or a string; the response `message` is taken from `error.message` or the string.
 * @param options.status - HTTP status code for the response (defaults to 500).
 * @param options.code - Machine-readable error code (defaults to `INTERNAL_ERROR`).
 * @param options.details - Optional structured details to include in the error payload.
 * @param options.retryAfter - If provided, included in the error payload and set as the `Retry-After` response header.
 * @param options.path - Optional request path to include in the response payload.
 * @returns A NextResponse containing the serialized ErrorResponse with the configured status and headers.
 */
export function createErrorResponse(
  error: Error | string,
  options: ApiResponseOptions & {
    code?: string;
    details?: any;
    retryAfter?: number;
    path?: string;
  } = {},
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
 * Returns a standard success response that wraps an array of items with pagination metadata.
 *
 * The response payload has the shape `{ data: T[]; pagination: PaginationInfo }` and is produced
 * via the shared success response factory so it includes the common response metadata (timestamp,
 * optional requestId, headers, and status from options).
 *
 * @param data - The page of items to return
 * @param pagination - Pagination metadata (page, limit, total, etc.)
 * @param options - Optional response metadata (status, headers, requestId, cacheControl)
 */
export function createPaginatedResponse<T>(
  data: T[],
  pagination: PaginationInfo,
  options: ApiResponseOptions = {},
): NextResponse<SuccessResponse<{ data: T[]; pagination: PaginationInfo }>> {
  return createSuccessResponse(
    { data, pagination },
    options,
  );
}

/**
 * Build a standardized success response for a bulk operation.
 *
 * Wraps an array of per-item operation results and an aggregate summary into the
 * API success envelope and returns a NextResponse with the provided response options.
 *
 * @param results - Array of individual bulk operation results (per-item status, id, message and optional data or error).
 * @param summary - Aggregate summary of the bulk operation (total, successful, failed).
 * @param options - Optional response metadata (status, headers, requestId, timestamp, cacheControl).
 * @returns A NextResponse containing a SuccessResponse with `{ results, summary }`.
 */
export function createBulkOperationResponse<T>(
  results: BulkOperationResult<T>[],
  summary: BulkOperationSummary,
  options: ApiResponseOptions = {},
): NextResponse<SuccessResponse<{ results: BulkOperationResult<T>[]; summary: BulkOperationSummary }>> {
  return createSuccessResponse(
    { results, summary },
    options,
  );
}

/**
 * Returns a 400 Validation error response with structured error details.
 *
 * Creates a standardized error payload with code `VALIDATION_ERROR`, message `"Validation failed"`,
 * and the provided `errors` attached to the error `details`. Use `options` to include metadata
 * (for example `requestId`, headers, or custom timestamp); the response status is set to 400.
 *
 * @param errors - An array of validation error objects or messages to include in the response `details`.
 * @param options - Optional response metadata (e.g., `requestId`, headers); `status` will be set to 400.
 * @returns A NextResponse containing the standardized ErrorResponse payload for a validation failure.
 */
export function createValidationErrorResponse(
  errors: any[],
  options: ApiResponseOptions & { requestId?: string } = {},
): NextResponse<ErrorResponse> {
  return createErrorResponse(
    'Validation failed',
    {
      status: 400,
      code: 'VALIDATION_ERROR',
      details: errors,
      ...options,
    },
  );
}

/**
 * Create a 401 Authentication Error API response.
 *
 * Produces a standardized error payload with `success: false`, an error `code` of `AUTHENTICATION_ERROR`,
 * and an HTTP status of 401. The `message` defaults to `"Authentication required"` when not provided.
 *
 * @param message - Optional custom error message to include in the response
 */
export function createAuthenticationErrorResponse(
  message: string = 'Authentication required',
  options: ApiResponseOptions = {},
): NextResponse<ErrorResponse> {
  return createErrorResponse(
    message,
    {
      status: 401,
      code: 'AUTHENTICATION_ERROR',
      ...options,
    },
  );
}

/**
 * Return a standardized 403 Authorization error response.
 *
 * The response will use HTTP status 403 and an error code of `AUTHORIZATION_ERROR`.
 * The optional `message` overrides the default "Insufficient permissions".
 *
 * @param message - Human-readable error message; defaults to "Insufficient permissions".
 * @returns A NextResponse containing an ErrorResponse payload (success: false, error details, timestamp, and optional requestId/path).
 */
export function createAuthorizationErrorResponse(
  message: string = 'Insufficient permissions',
  options: ApiResponseOptions = {},
): NextResponse<ErrorResponse> {
  return createErrorResponse(
    message,
    {
      status: 403,
      code: 'AUTHORIZATION_ERROR',
      ...options,
    },
  );
}

/**
 * Returns a 404 error response indicating the specified resource was not found.
 *
 * @param resource - Human-readable resource name used in the error message (default: "Resource").
 * @param options - Optional response metadata; the response `status` will be set to `404` and the error `code` to `"NOT_FOUND"`.
 * @returns A NextResponse containing a standardized ErrorResponse (`success: false`) describing the missing resource.
 */
export function createNotFoundErrorResponse(
  resource: string = 'Resource',
  options: ApiResponseOptions = {},
): NextResponse<ErrorResponse> {
  return createErrorResponse(
    `${resource} not found`,
    {
      status: 404,
      code: 'NOT_FOUND',
      ...options,
    },
  );
}

/**
 * Create a 409 Conflict error response.
 *
 * Builds a standardized error payload with `success: false`, error `code` set to `CONFLICT`, and an HTTP status of 409.
 *
 * @param message - Optional custom error message; defaults to `"Resource conflict"`.
 * @param options - Optional response metadata (headers, requestId, timestamp, cacheControl, etc.). The returned response will use status 409 and error code `CONFLICT`.
 * @returns A NextResponse containing the standardized ErrorResponse with status 409.
 */
export function createConflictErrorResponse(
  message: string = 'Resource conflict',
  options: ApiResponseOptions = {},
): NextResponse<ErrorResponse> {
  return createErrorResponse(
    message,
    {
      status: 409,
      code: 'CONFLICT',
      ...options,
    },
  );
}

/**
 * Return a standardized 429 Rate Limit error response.
 *
 * Produces an ErrorResponse with HTTP status 429 and error code `RATE_LIMIT_EXCEEDED`.
 * Sets the `Retry-After` header and includes the provided `retryAfter` value (in seconds)
 * in the error payload so clients know how long to wait before retrying.
 *
 * @param retryAfter - Number of seconds the client should wait before retrying the request.
 * @param options - Additional response metadata (status, headers, requestId, timestamp, cacheControl).
 * @returns A NextResponse containing the standardized rate-limit ErrorResponse.
 */
export function createRateLimitErrorResponse(
  retryAfter: number,
  options: ApiResponseOptions = {},
): NextResponse<ErrorResponse> {
  return createErrorResponse(
    'Too many requests. Please try again later.',
    {
      status: 429,
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter,
      ...options,
    },
  );
}

/**
 * Return a 201 Created JSON response wrapping the provided data.
 *
 * @param data - The resource payload to include in the response body.
 * @param options - Optional response metadata; the `status` field is ignored and forced to 201.
 * @returns A NextResponse containing a SuccessResponse with the provided `data`.
 */
export function createCreatedResponse<T>(
  data: T,
  options: Omit<ApiResponseOptions, 'status'> = {},
): NextResponse<SuccessResponse<T>> {
  return createSuccessResponse(data, { ...options, status: 201 });
}

/**
 * Create a 204 No Content response.
 *
 * Builds a NextResponse with a null body and HTTP status 204. Any headers supplied in
 * `options.headers` are applied. The `status` field on `options` is ignored (the response
 * will always be 204).
 *
 * @param options - Optional response metadata; `status` is omitted/ignored.
 * @returns A NextResponse with no body and status 204.
 */
export function createNoContentResponse(
  options: Omit<ApiResponseOptions, 'status'> = {},
): NextResponse {
  return new NextResponse(null, {
    status: 204,
    headers: options.headers,
  });
}

/**
 * Returns a success response with a Cache-Control header set to `public, max-age={maxAge}`.
 *
 * Use when you want to cache the JSON response for a given number of seconds.
 *
 * @param maxAge - Time-to-live for the response cache, in seconds.
 * @param options - Additional response metadata (status, headers, requestId, timestamp); `cacheControl` will be overridden.
 * @returns A NextResponse wrapping a standardized success payload containing `data`.
 */
export function createCachedResponse<T>(
  data: T,
  maxAge: number,
  options: ApiResponseOptions = {},
): NextResponse<SuccessResponse<T>> {
  return createSuccessResponse(data, {
    ...options,
    cacheControl: `public, max-age=${maxAge}`,
  });
}

/**
 * Returns a success JSON response with cache disabled (Cache-Control: no-cache, no-store, must-revalidate).
 *
 * The provided `data` is wrapped in the standard success payload. Any `cacheControl` value in `options`
 * will be overridden with the no-cache directives.
 *
 * @param data - Response payload to include in the success body.
 * @param options - Optional response metadata (status, headers, requestId, etc.); `cacheControl` will be set to disable caching.
 * @returns A NextResponse containing a SuccessResponse wrapping `data`.
 */
export function createNoCacheResponse<T>(
  data: T,
  options: ApiResponseOptions = {},
): NextResponse<SuccessResponse<T>> {
  return createSuccessResponse(data, {
    ...options,
    cacheControl: 'no-cache, no-store, must-revalidate',
  });
}

/**
 * Returns the value of the `x-request-id` header from a Request, or `undefined` if the header is not present.
 *
 * @returns The request ID string when present; otherwise `undefined`.
 */
export function extractRequestId(request: Request): string | undefined {
  return request.headers.get('x-request-id') || undefined;
}

/**
 * Build standardized ApiResponseOptions augmented with request context.
 *
 * Extracts the `x-request-id` from the provided Request and adds a current ISO timestamp,
 * then merges any supplied options. Fields in `options` override the extracted/generated values.
 *
 * @param request - The incoming Request used to extract the `x-request-id` header.
 * @param options - Partial ApiResponseOptions to merge; may override `requestId`, `timestamp`, `status`, `headers`, etc.
 * @returns An ApiResponseOptions object containing `requestId`, `timestamp`, and any merged option values.
 */
export function createResponseOptions(
  request: Request,
  options: Partial<ApiResponseOptions> = {},
): ApiResponseOptions {
  return {
    requestId: extractRequestId(request),
    timestamp: new Date().toISOString(),
    ...options,
  };
}

/**
 * Type guard that returns true when an ApiResponse represents a successful response.
 *
 * When this returns true the compiler will narrow the type to SuccessResponse<T>.
 *
 * @param response - The ApiResponse to inspect
 */
export function isSuccessResponse<T>(response: ApiResponse<T>): response is SuccessResponse<T> {
  return response.success === true;
}

/**
 * Type guard that determines whether an ApiResponse is an ErrorResponse.
 *
 * Returns true when the response has `success` set to `false`, narrowing the type to `ErrorResponse`.
 *
 * @param response - The API response to test.
 * @returns True if `response` is an `ErrorResponse` (i.e., `success === false`).
 */
export function isErrorResponse(response: any): response is ErrorResponse {
  return response?.success === false;
}
