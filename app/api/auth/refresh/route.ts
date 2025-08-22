import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { generateToken } from '@/lib/auth';
import { generateRefreshToken, verify } from '@/lib/jwt-wrapper';
import { z, ZodError } from 'zod';
import { 
  createErrorResponse, 
  createValidationError 
} from '@/lib/error-handling';
import { rateLimiter } from '@/lib/redis';

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  
  try {
    const body = await request.json();
    const { refreshToken } = refreshTokenSchema.parse(body);

    // Rate limiting check
    if (rateLimiter) {
      const identifier = request.ip || request.headers.get('x-forwarded-for') || 'anonymous';
      const rateLimitResult = await rateLimiter.checkRateLimit(identifier, {
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 10,
        message: 'Too many refresh attempts, please try again later'
      });
      
      if (!rateLimitResult.allowed) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'RATE_LIMIT_EXCEEDED',
              message: 'Too many refresh attempts',
              details: 'Please wait before trying again'
            },
            requestId
          },
          { status: 429 }
        );
      }
    }

    // Verify refresh token
    let decoded: any;
    try {
      decoded = verify(refreshToken, process.env.JWT_SECRET, { 
        algorithms: ['HS256'],
        audience: 'mybudget-users',
        issuer: 'mybudget'
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('expired')) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'TOKEN_EXPIRED',
              message: 'Refresh token has expired',
              details: 'Please log in again to get a new refresh token'
            },
            requestId
          },
          { status: 401 }
        );
      } else {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_TOKEN',
              message: 'Invalid refresh token',
              details: 'The refresh token is invalid or malformed'
            },
            requestId
          },
          { status: 401 }
        );
      }
    }

    // Validate decoded token structure
    if (!decoded.userId || !decoded.email || decoded.type !== 'refresh') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_TOKEN_STRUCTURE',
            message: 'Invalid token structure',
            details: 'The refresh token has an invalid structure'
          },
          requestId
        },
        { status: 401 }
      );
    }

    // Check if user still exists
    const userResult = await query(
      'SELECT id, email, token_version, password_changed_at FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
            details: 'The user associated with this token no longer exists'
          },
          requestId
        },
        { status: 404 }
      );
    }

    const user = userResult.rows[0];

    // Check if token version matches (for security)
    if (decoded.tokenVersion !== user.token_version) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'TOKEN_VERSION_MISMATCH',
            message: 'Token version mismatch',
            details: 'This token has been invalidated. Please log in again.'
          },
          requestId
        },
        { status: 401 }
      );
    }

    // Check if password was changed after token was issued
    if (user.password_changed_at && decoded.passwordChangedAt) {
      const tokenPasswordTime = new Date(decoded.passwordChangedAt);
      const dbPasswordTime = new Date(user.password_changed_at);
      
      if (dbPasswordTime > tokenPasswordTime) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'PASSWORD_CHANGED',
              message: 'Password was changed',
              details: 'Your password was changed after this token was issued. Please log in again.'
            },
            requestId
          },
          { status: 401 }
        );
      }
    }

    // Generate new access token
    const newAccessToken = await generateToken({ 
      id: user.id, 
      userId: user.id, 
      email: user.email 
    });

    // Generate new refresh token
    const newRefreshToken = generateRefreshToken({
      userId: user.id,
      email: user.email,
      type: 'refresh',
      tokenVersion: user.token_version,
      passwordChangedAt: user.password_changed_at?.toISOString() || new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      data: { 
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d'
      },
      requestId
    });

  } catch (error) {
    if (error instanceof ZodError) {
      const errorResponse = createValidationError(error, requestId);
      return NextResponse.json(errorResponse, { status: 400 });
    }

    console.error('Token refresh error:', error);
    const errorResponse = createErrorResponse(
      new Error('Failed to refresh token'),
      requestId
    );
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
