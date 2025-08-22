import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { query } from '@/lib/database';
import { generateToken, verifyToken } from '@/lib/auth';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response';
import { logger } from '@/lib/logger';
import { validateJWTSecret } from '@/lib/validate-env';

// Validation schema for refresh token request
const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required')
});

// Refresh token specific payload
interface RefreshTokenPayload {
  userId: string;
  type: 'refresh';
  tokenVersion?: number;
  iat?: number;
  exp?: number;
}

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const requestLogger = logger.child({ requestId, endpoint: '/api/auth/refresh' });
  
  try {
    // Validate JWT secret
    validateJWTSecret();
    
    // Parse and validate request body
    const body = await request.json();
    const { refreshToken } = refreshTokenSchema.parse(body);
    
    requestLogger.info('Processing refresh token request');
    
    // Decode token to get user ID without verification first
    const decoded = jwt.decode(refreshToken) as RefreshTokenPayload | null;
    
    if (!decoded || decoded.type !== 'refresh') {
      requestLogger.warn('Invalid refresh token format');
      return NextResponse.json(
        createErrorResponse('Invalid refresh token', 'INVALID_TOKEN', requestId),
        { status: 401 }
      );
    }
    
    // Get user and check token version
    const userResult = await query(
      `SELECT id, email, name, created_at, token_version, is_active 
       FROM users 
       WHERE id = $1`,
      [decoded.userId]
    );
    
    if (userResult.rows.length === 0) {
      requestLogger.warn('User not found for refresh token', { userId: decoded.userId });
      return NextResponse.json(
        createErrorResponse('Invalid refresh token', 'USER_NOT_FOUND', requestId),
        { status: 401 }
      );
    }
    
    const user = userResult.rows[0];
    
    // Check if user is active
    if (!user.is_active) {
      requestLogger.warn('Inactive user attempted to refresh token', { userId: user.id });
      return NextResponse.json(
        createErrorResponse('Account is disabled', 'ACCOUNT_DISABLED', requestId),
        { status: 403 }
      );
    }
    
    // Now verify the token with secret
    try {
      const verifiedPayload = jwt.verify(refreshToken, process.env.JWT_SECRET!, {
        algorithms: ['HS256']
      }) as RefreshTokenPayload;
      
      // Check token version if present
      if (decoded.tokenVersion !== undefined && decoded.tokenVersion !== user.token_version) {
        requestLogger.warn('Token version mismatch', { 
          tokenVersion: decoded.tokenVersion, 
          userVersion: user.token_version 
        });
        return NextResponse.json(
          createErrorResponse('Refresh token has been revoked', 'TOKEN_REVOKED', requestId),
          { status: 401 }
        );
      }
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        requestLogger.info('Refresh token expired');
        return NextResponse.json(
          createErrorResponse('Refresh token expired', 'TOKEN_EXPIRED', requestId),
          { status: 401 }
        );
      } else if (error instanceof jwt.JsonWebTokenError) {
        requestLogger.warn('Invalid refresh token signature');
        return NextResponse.json(
          createErrorResponse('Invalid refresh token', 'INVALID_TOKEN', requestId),
          { status: 401 }
        );
      }
      throw error;
    }
    
    // Generate new access token and refresh token
    const newAccessToken = await generateToken({
      userId: user.id,
      email: user.email,
      name: user.name
    });
    
    // Generate new refresh token with extended expiration
    const newRefreshToken = jwt.sign(
      {
        userId: user.id,
        type: 'refresh',
        tokenVersion: user.token_version || 1
      },
      process.env.JWT_SECRET!,
      {
        algorithm: 'HS256',
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d'
      }
    );
    
    // Log successful refresh
    requestLogger.audit('Token refreshed', user.id, { 
      email: user.email,
      tokenVersion: user.token_version 
    });
    
    // Return new tokens
    return NextResponse.json(
      createSuccessResponse({
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          createdAt: user.created_at
        }
      }, requestId)
    );
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      requestLogger.warn('Validation error in refresh request', { errors: error.errors });
      return NextResponse.json(
        createErrorResponse(
          'Validation failed',
          'VALIDATION_ERROR',
          requestId,
          error.errors
        ),
        { status: 400 }
      );
    }
    
    requestLogger.error('Error refreshing token', error as Error);
    return NextResponse.json(
      createErrorResponse('Failed to refresh token', 'INTERNAL_ERROR', requestId),
      { status: 500 }
    );
  }
}