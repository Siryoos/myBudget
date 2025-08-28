import { NextResponse, type NextRequest } from 'next/server';
import { z, ZodError } from 'zod';

// Constants for rate limiting
const RATE_LIMIT_WINDOW_MINUTES = 15;
const RATE_LIMIT_WINDOW_MS = RATE_LIMIT_WINDOW_MINUTES * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 10;

// Token interface for type safety
interface DecodedToken {
  userId: string;
  email: string;
  type: string;
  tokenVersion?: number;
  passwordChangedAt?: string;
}

// User interface for type safety
interface User {
  id: string;
  email: string;
  token_version: number;
  password_changed_at?: Date;
}

import { generateToken } from '@/lib/auth';
import { query } from '@/lib/database';
import {
  createErrorResponse,
  createValidationError,
} from '@/lib/error-handling';
import { generateRefreshToken, verify } from '@/lib/jwt-wrapper';
import { rateLimiter } from '@/lib/redis';

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

// Helper function to check rate limiting
const checkRateLimit = async (request: NextRequest): Promise<{ allowed: boolean; message?: string }> => {
  if (!rateLimiter) {
    return { allowed: true };
  }

  const identifier = request.ip || request.headers.get('x-forwarded-for') || 'anonymous';
  const rateLimitConfig = {
    windowMs: RATE_LIMIT_WINDOW_MS,
    maxRequests: RATE_LIMIT_MAX_REQUESTS,
  };
  const rateLimitResult = await rateLimiter.checkRateLimit(identifier, rateLimitConfig);

  return {
    allowed: rateLimitResult.allowed,
    message: rateLimitResult.allowed ? undefined : 'Too many refresh attempts, please try again later',
  };
};

// Error interface for token verification
interface TokenError {
  code: string;
  message: string;
  details: string;
}

// Helper function to verify refresh token
const verifyRefreshToken = (refreshToken: string): { success: boolean; decoded?: DecodedToken; error?: TokenError } => {
  try {
    const decoded = verify(refreshToken, process.env.JWT_SECRET, {
      algorithms: ['HS256'],
      audience: 'mybudget-users',
      issuer: 'mybudget',
    });
    return { success: true, decoded };
  } catch (error) {
    if (error instanceof Error && error.message.includes('expired')) {
      return {
        success: false,
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Refresh token has expired',
          details: 'Please log in again to get a new refresh token',
        },
      };
    }
    return {
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid refresh token',
        details: 'The refresh token is invalid or malformed',
      },
    };
  }
};

// Helper function to validate token structure
const validateTokenStructure = (decoded: DecodedToken): { valid: boolean; error?: TokenError } => {
  if (!decoded.userId || !decoded.email || decoded.type !== 'refresh') {
    return {
      valid: false,
      error: {
        code: 'INVALID_TOKEN_STRUCTURE',
        message: 'Invalid token structure',
        details: 'The refresh token has an invalid structure',
      },
    };
  }
  return { valid: true };
};

// Helper function to check user existence and token version
const validateUserAndToken = async (decoded: DecodedToken): Promise<{ valid: boolean; user?: User; error?: TokenError }> => {
  const userResult = await query(
    'SELECT id, email, token_version, password_changed_at FROM users WHERE id = $1',
    [decoded.userId],
  );

  if (userResult.rows.length === 0) {
    return {
      valid: false,
      error: {
        code: 'USER_NOT_FOUND',
        message: 'User not found',
        details: 'The user associated with this token no longer exists',
      },
    };
  }

  const user = userResult.rows[0] as User;

  // Check if token version matches (for security)
  if (decoded.tokenVersion !== user.token_version) {
    return {
      valid: false,
      error: {
        code: 'TOKEN_VERSION_MISMATCH',
        message: 'Token version mismatch',
        details: 'This token has been invalidated. Please log in again.',
      },
    };
  }

  // Check if password was changed after token was issued
  if (user.password_changed_at && decoded.passwordChangedAt) {
    const tokenPasswordTime = new Date(decoded.passwordChangedAt);
    const dbPasswordTime = new Date(user.password_changed_at);

    if (dbPasswordTime > tokenPasswordTime) {
      return {
        valid: false,
        error: {
          code: 'PASSWORD_CHANGED',
          message: 'Password was changed',
          details: 'Your password was changed after this token was issued. Please log in again.',
        },
      };
    }
  }

  return { valid: true, user };
};

// Helper function to generate new tokens
const generateNewTokens = async (user: User): Promise<{ accessToken: string; refreshToken: string }> => {
  const newAccessToken = await generateToken({
    id: user.id,
    userId: user.id,
    email: user.email,
  });

  const newRefreshToken = generateRefreshToken({
    userId: user.id,
    email: user.email,
    type: 'refresh',
    tokenVersion: user.token_version,
    passwordChangedAt: user.password_changed_at?.toISOString() || new Date().toISOString(),
  });

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
};

// Helper function to create rate limit error response
const createRateLimitError = (requestId: string) => NextResponse.json(
  {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many refresh attempts',
      details: 'Please wait before trying again',
    },
    requestId,
  },
  { status: 429 },
);

// Helper function to create token error response
const createTokenErrorResponse = (error: TokenError, requestId: string, status: number) => NextResponse.json(
  {
    success: false,
    error,
    requestId,
  },
  { status },
);

// Helper function to create success response
const createSuccessResponse = (tokens: { accessToken: string; refreshToken: string }, requestId: string) => NextResponse.json({
  success: true,
  data: {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },
  requestId,
});

// Main token refresh logic
const processTokenRefresh = async (refreshToken: string, request: NextRequest, requestId: string) => {
  // Rate limiting check
  const rateLimitResult = await checkRateLimit(request);
  if (!rateLimitResult.allowed) {
    return createRateLimitError(requestId);
  }

  // Verify refresh token
  const tokenResult = verifyRefreshToken(refreshToken);
  if (!tokenResult.success) {
    return createTokenErrorResponse(tokenResult.error!, requestId, HTTP_UNAUTHORIZED);
  }

  // Validate decoded token structure
  const structureResult = validateTokenStructure(tokenResult.decoded!);
  if (!structureResult.valid) {
    return createTokenErrorResponse(structureResult.error!, requestId, HTTP_UNAUTHORIZED);
  }

  // Check user existence and token version
  const userResult = await validateUserAndToken(tokenResult.decoded!);
  if (!userResult.valid) {
    const status = userResult.error?.code === 'USER_NOT_FOUND' ? HTTP_NOT_FOUND : HTTP_UNAUTHORIZED;
    return createTokenErrorResponse(userResult.error!, requestId, status);
  }

  // Generate new tokens
  const newTokens = await generateNewTokens(userResult.user!);
  return createSuccessResponse(newTokens, requestId);
};

export const POST = async (request: NextRequest) => {
  const requestId = crypto.randomUUID();

  try {
    const body = await request.json();
    const { refreshToken } = refreshTokenSchema.parse(body);

    return await processTokenRefresh(refreshToken, request, requestId);

  } catch (error) {
    if (error instanceof ZodError) {
      const errorResponse = createValidationError(error, requestId);
      return NextResponse.json(errorResponse, { status: HTTP_BAD_REQUEST });
    }

    console.error('Token refresh error:', error);
    const errorResponse = createErrorResponse(
      new Error('Failed to refresh token'),
      requestId,
    );
    return NextResponse.json(errorResponse, { status: HTTP_INTERNAL_SERVER_ERROR });
  }
};
