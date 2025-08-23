import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { query } from '@/lib/database';
import { createErrorResponse, createValidationError } from '@/lib/error-handling';
import { rateLimiter } from '@/lib/redis';

const forgotPasswordSchema = z.object({
  email: z.string().email().transform(s => s.trim().toLowerCase()),
});

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    // Rate limiting for password reset requests
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

    // In production, send email here
    // For development, we'll just log the token
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEV] Password reset token for ${email}: ${resetToken}`);
    }

    // TODO: Implement email sending service
    // await emailService.sendPasswordReset(user.email, resetToken);

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
      return NextResponse.json(errorResponse, { status: 400 });
    }

    console.error('Forgot password error:', error);
    const errorResponse = createErrorResponse(
      new Error('Failed to process password reset request'),
      requestId,
    );
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
