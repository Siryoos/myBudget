import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Request size limits configuration
export const REQUEST_LIMITS = {
  // General API limits
  DEFAULT_BODY_SIZE: 1024 * 1024, // 1MB
  UPLOAD_BODY_SIZE: 10 * 1024 * 1024, // 10MB
  AUTH_BODY_SIZE: 512 * 1024, // 512KB
  SEARCH_BODY_SIZE: 256 * 1024, // 256KB

  // Query parameter limits
  MAX_QUERY_PARAMS: 50,
  MAX_QUERY_VALUE_LENGTH: 1000,

  // Header limits
  MAX_HEADER_SIZE: 8192, // 8KB
  MAX_HEADERS_COUNT: 100,
} as const;

// Common validation schemas
export const commonSchemas = {
  // Pagination
  pagination: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  }),

  // Date range
  dateRange: z.object({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be in YYYY-MM-DD format'),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in YYYY-MM-DD format'),
  }).refine(
    (data) => new Date(data.startDate) <= new Date(data.endDate),
    { message: 'Start date must be before or equal to end date' },
  ),

  // Search parameters
  search: z.object({
    query: z.string().min(1).max(200).optional(),
    category: z.string().max(100).optional(),
    tags: z.array(z.string().max(50)).max(10).optional(),
  }),

  // UUID validation
  uuid: z.string().uuid('Invalid UUID format'),

  // Email validation
  email: z.string().email('Invalid email format').transform(s => s.trim().toLowerCase()),

  // Password validation
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be less than 128 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number'),

  // Amount validation
  amount: z.number()
    .positive('Amount must be positive')
    .max(999999999.99, 'Amount cannot exceed 999,999,999.99'),

  // Description validation
  description: z.string()
    .min(1, 'Description is required')
    .max(500, 'Description cannot exceed 500 characters')
    .transform(s => s.trim()),

  // Category validation
  category: z.string()
    .min(1, 'Category is required')
    .max(100, 'Category cannot exceed 100 characters')
    .transform(s => s.trim()),
};

// Input sanitization utilities
export const sanitizers = {
  // Remove potentially dangerous characters
  sanitizeString: (input: string): string => input
      .replace(/[<>]/g, '') // Remove < and > to prevent HTML injection
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/data:/gi, '') // Remove data: protocol
      .trim(),

  // Sanitize object recursively
  sanitizeObject: <T extends Record<string, any>>(obj: T): T => {
    const sanitized: any = {};

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        sanitized[key] = sanitizers.sanitizeString(value);
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        sanitized[key] = sanitizers.sanitizeObject(value);
      } else if (Array.isArray(value)) {
        sanitized[key] = value.map(item =>
          (typeof item === 'string' ? sanitizers.sanitizeString(item) : item),
        );
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized as T;
  },

  // Validate and sanitize query parameters
  sanitizeQueryParams: (searchParams: URLSearchParams): Record<string, string> => {
    const sanitized: Record<string, string> = {};

    // Check parameter count limit
    if (searchParams.size > REQUEST_LIMITS.MAX_QUERY_PARAMS) {
      throw new Error(`Too many query parameters. Maximum allowed: ${REQUEST_LIMITS.MAX_QUERY_PARAMS}`);
    }

    // Use Array.from for better compatibility
    const entries = Array.from(searchParams.entries());
    for (const [key, value] of entries) {
      // Check value length limit
      if (value.length > REQUEST_LIMITS.MAX_QUERY_VALUE_LENGTH) {
        throw new Error(`Query parameter value too long: ${key}`);
      }

      // Sanitize the value
      sanitized[key] = sanitizers.sanitizeString(value);
    }

    return sanitized;
  },
};

// Request validation middleware
export class RequestValidator {
  private request: NextRequest;
  private bodySizeLimit: number;

  constructor(request: NextRequest, bodySizeLimit: number = REQUEST_LIMITS.DEFAULT_BODY_SIZE) {
    this.request = request;
    this.bodySizeLimit = bodySizeLimit;
  }

  // Validate request size
  async validateRequestSize(): Promise<void> {
    const contentLength = this.request.headers.get('content-length');

    if (contentLength) {
      const size = parseInt(contentLength);
      if (isNaN(size) || size > this.bodySizeLimit) {
        throw new Error(`Request body too large. Maximum allowed: ${this.bodySizeLimit / 1024 / 1024}MB`);
      }
    }

    // For requests without content-length, check the actual body
    if (this.request.method !== 'GET' && this.request.method !== 'HEAD') {
      const body = await this.request.text();
      if (body.length > this.bodySizeLimit) {
        throw new Error(`Request body too large. Maximum allowed: ${this.bodySizeLimit / 1024 / 1024}MB`);
      }
      // Reconstruct the request with the body
      this.request = new NextRequest(this.request.url, {
        method: this.request.method,
        headers: this.request.headers,
        body,
      });
    }
  }

  // Validate headers
  validateHeaders(): void {
    const headers = this.request.headers;

    // Check header count - use Array.from for compatibility
    const headerEntries = Array.from(headers.entries());
    if (headerEntries.length > REQUEST_LIMITS.MAX_HEADERS_COUNT) {
      throw new Error(`Too many headers. Maximum allowed: ${REQUEST_LIMITS.MAX_HEADERS_COUNT}`);
    }

    // Check individual header sizes
    for (const [key, value] of headerEntries) {
      const headerSize = key.length + (value?.length || 0);
      if (headerSize > REQUEST_LIMITS.MAX_HEADER_SIZE) {
        throw new Error(`Header too large: ${key}`);
      }
    }
  }

  // Validate and parse JSON body
  async validateAndParseBody<T>(schema: z.ZodSchema<T>): Promise<T> {
    try {
      const body = await this.request.json();
      const sanitizedBody = sanitizers.sanitizeObject(body);
      return schema.parse(sanitizedBody);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Validation failed: ${error.errors.map(e => e.message).join(', ')}`);
      }
      throw new Error('Invalid JSON body');
    }
  }

  // Validate query parameters
  validateQueryParams<T>(schema: z.ZodSchema<T>): T {
    const searchParams = this.request.nextUrl.searchParams;
    const sanitizedParams = sanitizers.sanitizeQueryParams(searchParams);

    // Convert to object for schema validation
    const paramsObj = Object.fromEntries(
      Object.entries(sanitizedParams).map(([key, value]) => [key, value]),
    );

    try {
      return schema.parse(paramsObj);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Query validation failed: ${error.errors.map(e => e.message).join(', ')}`);
      }
      throw error;
    }
  }

  // Get the validated request
  getRequest(): NextRequest {
    return this.request;
  }
}

// Error response helper
export function createValidationErrorResponse(error: Error, status: number = 400): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: 'Validation failed',
      message: error.message,
      timestamp: new Date().toISOString(),
    },
    { status },
  );
}

// Rate limiting helper
export function createRateLimitResponse(retryAfter: number): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: 'Too many requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter,
      timestamp: new Date().toISOString(),
    },
    {
      status: 429,
      headers: {
        'Retry-After': retryAfter.toString(),
        'X-RateLimit-Reset': new Date(Date.now() + retryAfter * 1000).toISOString(),
      },
    },
  );
}

// Request size limit middleware factory
export function withRequestSizeLimit(limit: number) {
  return function<T extends any[], R>(
    target: (...args: T) => Promise<R>,
  ): (...args: T) => Promise<R> {
    return async (...args: T): Promise<R> => {
      const request = args[0] as NextRequest;
      if (request) {
        const validator = new RequestValidator(request, limit);
        await validator.validateRequestSize();
        validator.validateHeaders();

        // Replace the request with the validated one
        args[0] = validator.getRequest() as any;
      }

      return target(...args);
    };
  };
}

// Note: Decorators have been removed due to 'this' context compatibility issues
// Use the RequestValidator class directly for validation instead
