import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { comparePassword, generateToken } from '@/lib/auth';
import { z, ZodError } from 'zod';
import { 
  createErrorResponse, 
  createValidationError, 
  createDatabaseError,
  handleError 
} from '@/lib/error-handling';

const loginSchema = z.object({
  email: z.string().email().transform(s => s.trim().toLowerCase()),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  
  try {
    const body = await request.json();
    const { email, password } = loginSchema.parse(body);

    // Find user
    const result = await query(
      'SELECT id, email, name, password_hash FROM users WHERE lower(email) = lower($1)',
      [email]
    );

    if (result.rows.length === 0) {
      const errorResponse = createErrorResponse(
        new Error('Invalid credentials'),
        requestId
      );
      return NextResponse.json(errorResponse, { status: 401 });
    }

    const user = result.rows[0];

    // Verify password
    const isValidPassword = await comparePassword(password, user.password_hash);
    if (!isValidPassword) {
      const errorResponse = createErrorResponse(
        new Error('Invalid credentials'),
        requestId
      );
      return NextResponse.json(errorResponse, { status: 401 });
    }

    // Generate token
    const token = await generateToken({ id: user.id, userId: user.id, email: user.email });

    return NextResponse.json({
      success: true,
      data: { 
        user: { id: user.id, email: user.email, name: user.name },
        token 
      },
      requestId
    });

  } catch (error) {
    if (error instanceof ZodError) {
      // Handle Zod validation errors
      const validationErrors = error.errors.map(err => 
        createValidationError(err.path.join('.'), err.message, undefined)
      );
      
      const errorResponse = createErrorResponse(
        validationErrors[0] || new Error('Validation failed'),
        requestId
      );
      
      return NextResponse.json(errorResponse, { status: 400 });
    }
    
    // Handle database errors
    if (error instanceof Error && error.message.includes('database')) {
      await handleError(error, 'LOGIN_DATABASE_ERROR', requestId);
      const errorResponse = createErrorResponse(
        createDatabaseError('Database operation failed', 'SELECT', 'users'),
        requestId
      );
      return NextResponse.json(errorResponse, { status: 500 });
    }
    
    // Handle other errors
    await handleError(error, 'LOGIN_ERROR', requestId);
    const errorResponse = createErrorResponse(
      new Error('Login failed'),
      requestId
    );
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
