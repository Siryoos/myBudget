import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { requireAuth } from '@/lib/auth-middleware';
import { comparePassword, hashPassword } from '@/lib/auth';
import { z } from 'zod';
import type { AuthenticatedRequest } from '@/types/auth';

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Password confirmation is required'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const PUT = requireAuth(async (request: AuthenticatedRequest) => {
  try {
    const body = await request.json();
    const { currentPassword, newPassword, confirmPassword } = changePasswordSchema.parse(body);
    const user = request.user;

    // Verify current password
    const userResult = await query(
      'SELECT password_hash FROM users WHERE id = $1',
      [user.id]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const isValidCurrentPassword = await comparePassword(currentPassword, userResult.rows[0].password_hash);
    if (!isValidCurrentPassword) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 400 }
      );
    }

    // Hash new password
    const hashedNewPassword = await hashPassword(newPassword);

    // Update password
    await query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [hashedNewPassword, user.id]
    );

    return NextResponse.json({
      success: true,
      data: { message: 'Password changed successfully' }
    });

  } catch (error) {
    console.error('Change password error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to change password' },
      { status: 500 }
    );
  }
});
