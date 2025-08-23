import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { hashPassword } from '@/lib/auth';
import { query } from '@/lib/database';
import { createErrorResponse, createValidationError } from '@/lib/error-handling';
import { rateLimiter } from '@/lib/redis';

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Password confirmation is required'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    // Rate limiting for password reset attempts
    const identifier = request.ip || request.headers.get('x-forwarded-for') || 'anonymous';
    const rateLimitResult = await rateLimiter.checkRateLimit(identifier, {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 5, // Maximum 5 password reset attempts per hour
      message: 'Too many password reset attempts, please try again later',
    });

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many password reset attempts, please try again later',
            retryAfter: rateLimitResult.retryAfter,
          },
          requestId,
        },
        {
          status: 429,
          headers: {
            'Retry-After': rateLimitResult.retryAfter?.toString() || '3600',
            'X-RateLimit-Limit': '5',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString(),
          },
        },
      );
    }

    const body = await request.json();
    const { token, newPassword, confirmPassword } = resetPasswordSchema.parse(body);

    // Hash the provided token to compare with stored hash
    const resetTokenHash = await import('crypto').then(crypto =>
      crypto.createHash('sha256').update(token).digest('hex'),
    );

    // Find valid reset token
    const tokenResult = await query(
      `SELECT prt.user_id, prt.expires_at, u.email 
       FROM password_reset_tokens prt 
       JOIN users u ON prt.user_id = u.id 
       WHERE prt.token_hash = $1 AND prt.expires_at > NOW()`,
      [resetTokenHash],
    );

    if (tokenResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_OR_EXPIRED_TOKEN',
            message: 'Invalid or expired reset token',
            details: 'The password reset token is invalid or has expired. Please request a new one.',
          },
          requestId,
        },
        { status: 400 },
      );
    }

    const resetToken = tokenResult.rows[0];

    // Hash the new password
    const hashedNewPassword = await hashPassword(newPassword);

    // Update user password and invalidate all existing tokens
    await query(
      `UPDATE users 
       SET password_hash = $1, 
           token_version = token_version + 1, 
           password_changed_at = CURRENT_TIMESTAMP, 
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2`,
      [hashedNewPassword, resetToken.user_id],
    );

    // Remove the used reset token
    await query(
      'DELETE FROM password_reset_tokens WHERE user_id = $1',
      [resetToken.user_id],
    );

    // In production, send confirmation email
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEV] Password reset successful for ${resetToken.email}`);
    }

    return NextResponse.json({
      success: true,
      data: {
        message: 'Password has been reset successfully. You can now log in with your new password.',
        email: resetToken.email,
      },
      requestId,
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorResponse = createValidationError(error, requestId);
      return NextResponse.json(errorResponse, { status: 400 });
    }

    console.error('Reset password error:', error);
    const errorResponse = createErrorResponse(
      new Error('Failed to reset password'),
      requestId,
    );
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
