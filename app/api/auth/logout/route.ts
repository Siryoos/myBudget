import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { query } from '@/lib/database';
import type { AuthenticatedRequest } from '@/types/auth';
import { createErrorResponse } from '@/lib/error-handling';

export const POST = requireAuth(async (request: AuthenticatedRequest) => {
  const requestId = crypto.randomUUID();
  
  try {
    const user = request.user;

    // Increment token version to invalidate all existing tokens
    await query(
      'UPDATE users SET token_version = token_version + 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    // Clear any stored refresh tokens for this user
    await query(
      'DELETE FROM password_reset_tokens WHERE user_id = $1',
      [user.id]
    );

    // In production, you might want to add the token to a blacklist
    // await addToTokenBlacklist(token, user.id);

    return NextResponse.json({
      success: true,
      data: { 
        message: 'Logged out successfully. All sessions have been invalidated.'
      },
      requestId
    }, {
      headers: {
        // Clear auth cookies
        'Set-Cookie': [
          'auth=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0',
          'refreshToken=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0'
        ].join(', ')
      }
    });

  } catch (error) {
    console.error('Logout error:', error);
    const errorResponse = createErrorResponse(
      new Error('Failed to logout'),
      requestId
    );
    return NextResponse.json(errorResponse, { status: 500 });
  }
});
