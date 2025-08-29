import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { comparePassword, hashPassword } from '@/lib/auth';
import { requireAuth } from '@/lib/auth-middleware';
import { query } from '@/lib/database';
import type { AuthenticatedRequest } from '@/types/auth';
import { HTTP_NOT_FOUND, HTTP_BAD_REQUEST, HTTP_INTERNAL_SERVER_ERROR } from '@/lib/services/error-handler';

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Password confirmation is required'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export const PUT = requireAuth(async (request: AuthenticatedRequest) => {
  try {
    const body = await request.json();
    const { currentPassword, newPassword, confirmPassword } = changePasswordSchema.parse(body);
    const user = request.user;

    // Verify current password
    const userResult = await query(
      'SELECT password_hash FROM users WHERE id = $1',
      [user.id],
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: HTTP_NOT_FOUND },
      );
    }

    const isValidCurrentPassword = await comparePassword(currentPassword, userResult.rows[0].password_hash);
    if (!isValidCurrentPassword) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: HTTP_BAD_REQUEST },
      );
    }

    // Hash new password
    const hashedNewPassword = await hashPassword(newPassword);

    // Update password and increment token version for security
    await query(
      'UPDATE users SET password_hash = $1, token_version = token_version + 1, password_changed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [hashedNewPassword, user.id],
    );

    return NextResponse.json({
      success: true,
      data: {
        message: 'Password changed successfully',
        requiresReauth: true, // Signal to client that re-authentication is required
      },
    }, {
      headers: {
        'Set-Cookie': 'auth=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0', // Clear auth cookie
      },
    });

  } catch (error) {
    console.error('Change password error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: HTTP_BAD_REQUEST },
      );
    }

    return NextResponse.json(
      { error: 'Failed to change password' },
      { status: HTTP_INTERNAL_SERVER_ERROR },
    );
  }
});
