import { NextRequest } from 'next/server';
import { verifyToken } from './auth';
import { query } from './database';

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    id: string;
    email: string;
    name: string;
  };
}

export async function authenticateRequest(request: NextRequest): Promise<{
  user?: { id: string; email: string; name: string };
  error?: string;
}> {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return { error: 'Access token required' };
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return { error: 'Invalid authorization header format' };
    }

    const payload = verifyToken(token);
    const result = await query('SELECT id, email, name FROM users WHERE id = $1', [payload.userId]);
    
    if (result.rows.length === 0) {
      return { error: 'Invalid token' };
    }

    return { user: result.rows[0] };
  } catch (error) {
    return { error: 'Invalid token' };
  }
}

export function requireAuth(handler: Function) {
  return async (request: NextRequest) => {
    const auth = await authenticateRequest(request);
    
    if (auth.error) {
      return Response.json(
        { error: auth.error },
        { status: 401 }
      );
    }

    // Add user to request context
    (request as any).user = auth.user;
    
    return handler(request);
  };
}
