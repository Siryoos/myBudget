import { NextRequest } from 'next/server';
import { verifyToken } from './auth';
import { query } from './database';
import type { AuthenticatedUser, AuthenticatedRequest, AuthenticatedHandler } from '@/types/auth';

export async function authenticateRequest(request: NextRequest): Promise<{
  user?: AuthenticatedUser;
  error?: string;
}> {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return { error: 'Access token required' };
    }

    // Enforce strict Bearer token format
    if (!authHeader.startsWith('Bearer ')) {
      return { error: 'Invalid authorization header format' };
    }
    const token = authHeader.slice('Bearer '.length).trim();
    if (!token) {
      return { error: 'Invalid authorization header format' };
    }

    const payload = await verifyToken(token);
    const result = await query('SELECT id, email, name, token_version, password_changed_at FROM users WHERE id = $1', [payload.userId]);
    
    if (result.rows.length === 0) {
      return { error: 'Invalid token' };
    }

    return { user: result.rows[0] };
  } catch (error) {
    return { error: 'Invalid token' };
  }
}

export function withAuth(
  handler: (request: AuthenticatedRequest) => Promise<Response>
): (request: NextRequest) => Promise<Response> {
  return async (request: NextRequest) => {
    const auth = await authenticateRequest(request);
    
    if (auth.error) {
      return Response.json(
        { error: auth.error },
        { status: 401 }
      );
    }

    // Create a properly typed request with user
    const authenticatedRequest = request as AuthenticatedRequest;
    authenticatedRequest.user = auth.user!;
    
    return handler(authenticatedRequest);
  };
}

// Direct authentication function that returns user or throws
export async function requireAuth(request: NextRequest): Promise<AuthenticatedUser> {
  const auth = await authenticateRequest(request);
  
  if (auth.error) {
    throw new Error('Unauthorized');
  }
  
  return auth.user!;
}

// Helper function for optional authentication (useful for endpoints that work with or without auth)
export function optionalAuth<T extends NextRequest | AuthenticatedRequest>(
  handler: (request: T) => Promise<Response>
): (request: NextRequest) => Promise<Response> {
  return async (request: NextRequest) => {
    const auth = await authenticateRequest(request);
    
    if (auth.user) {
      // User is authenticated, create typed request
      const authenticatedRequest = request as AuthenticatedRequest;
      authenticatedRequest.user = auth.user;
      return handler(authenticatedRequest as T);
    } else {
      // No authentication, use original request
      return handler(request as T);
    }
  };
}
