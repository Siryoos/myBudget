import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { query } from '@/lib/database';
import { emailService } from '@/lib/email-service';
import { createErrorResponse, createValidationError } from '@/lib/error-handling';
import { HTTP_BAD_REQUEST, HTTP_INTERNAL_SERVER_ERROR } from '@/lib/services/error-handler';
import { rateLimiter } from '@/lib/redis';

const forgotPasswordSchema = z.object({
  email: z.string().email().transform(s => s.trim().toLowerCase()),
});

/**
 * Handles POST requests for initiating a password-reset (forgot password) flow.
 *
 * Validates the request body, enforces per-client rate limits, and if the supplied
 * email corresponds to a user, generates a one-hour password reset token (stored as
 * a SHA-256 hash) and attempts to send a password-reset email. For security, the
 * endpoint always returns a generic success response when an email is supplied,
 * whether or not a matching user exists.
 *
 * Behavior and side effects:
 * - Enforces a 1-hour window rate limit (max 3 requests per identifier) and returns
 *   429 with rate-limit headers when exceeded.
 * - Validates input against `forgotPasswordSchema`; returns a HTTP_BAD_REQUEST JSON response on validation failure.
 * - If a user exists for the provided email, stores a hashed reset token with a 1-hour expiry
 *   in `password_reset_tokens` (upsert by user_id) and calls `emailService.sendPasswordReset`.
 * - If email sending fails in development, logs the token and reset URL for debugging.
 * - Returns a JSON response with a `requestId` for tracing; on unexpected errors returns a HTTP_INTERNAL_SERVER_ERROR JSON response.
 *
 * @returns A NextResponse JSON body indicating success or error, appropriate HTTP status,
 *          and traceable `requestId`. (Responses include HTTP_OK for accepted requests, HTTP_BAD_REQUEST for validation errors,
 *          429 for rate-limit violations, and HTTP_INTERNAL_SERVER_ERROR for internal errors.)
 */
export async function POST(request: NextRequest) {
  // Skip execution during build time
  if (process.env.SKIP_DB_VALIDATION === 'true') {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'BUILD_TIME_ERROR',
          message: 'API not available during build time',
        },
        requestId: 'build-time',
      },
      { status: 503 }
    );
  }

  const requestId = crypto.randomUUID();

  try {
    // Rate limiting for password reset requests
    // Ensure rate limiter is available (especially during certain builds/tests)
    if (!rateLimiter) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'Rate limiting service is unavailable',
          },
          requestId,
        },
        { status: 503 },
      );
    }

    const identifier = request.ip || request.headers.get('x-forwarded-for') || 'anonymous';
    const rateLimitResult = await rateLimiter.checkRateLimit(identifier, {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 3, // Maximum 3 password reset requests per hour
      message: 'Too many password reset requests, please try again later',
    });

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many password reset requests, please try again later',
            retryAfter: rateLimitResult.retryAfter,
          },
          requestId,
        },
        {
          status: 429,
          headers: {
            'Retry-After': rateLimitResult.retryAfter?.toString() || '3600',
            'X-RateLimit-Limit': '3',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString(),
          },
        },
      );
    }

    const body = await request.json();
    const { email } = forgotPasswordSchema.parse(body);

    // Check if user exists
    const result = await query(
      'SELECT id, email, name FROM users WHERE lower(email) = lower($1)',
      [email],
    );

    if (result.rows.length === 0) {
      // Don't reveal if user exists or not (security best practice)
      // Return success even if user doesn't exist
      return NextResponse.json({
        success: true,
        data: {
          message: 'If an account with that email exists, a password reset link has been sent',
          emailSent: true, // Always true for security
        },
        requestId,
      });
    }

    const user = result.rows[0];

    // Generate secure reset token
    const resetToken = crypto.randomUUID();
    const resetTokenHash = await import('crypto').then(crypto =>
      crypto.createHash('sha256').update(resetToken).digest('hex'),
    );

    // Store reset token with expiration (1 hour)
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await query(
      'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3) ON CONFLICT (user_id) DO UPDATE SET token_hash = $2, expires_at = $3',
      [user.id, resetTokenHash, expiresAt],
    );

    // Send password reset email
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

    const emailSent = await emailService.sendPasswordReset({
      email: user.email,
      name: user.name,
      resetToken,
      resetUrl,
    });

    // Log for development if email fails
    if (!emailSent && process.env.NODE_ENV === 'development') {
      console.log(`[DEV] Failed to send email, but here's the reset token for ${email}: ${resetToken}`);
      console.log(`[DEV] Reset URL: ${resetUrl}`);
    }

    return NextResponse.json({
      success: true,
      data: {
        message: 'If an account with that email exists, a password reset link has been sent',
        emailSent: true,
      },
      requestId,
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorResponse = createValidationError(error, requestId);
      return NextResponse.json(errorResponse, { status: HTTP_BAD_REQUEST });
    }

    console.error('Forgot password error:', error);
    const errorResponse = createErrorResponse(
      new Error('Failed to process password reset request'),
      requestId,
    );
    return NextResponse.json(errorResponse, { status: HTTP_INTERNAL_SERVER_ERROR });
  }
}
