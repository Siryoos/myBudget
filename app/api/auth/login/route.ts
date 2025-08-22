import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { comparePassword, generateToken } from '@/lib/auth';
import { generateRefreshToken } from '@/lib/jwt-wrapper';
import { z, ZodError } from 'zod';
import { 
  createErrorResponse, 
  createValidationError, 
  createDatabaseError
} from '@/lib/error-handling';
import { 
  RequestValidator, 
  createValidationErrorResponse,
  REQUEST_LIMITS,
  commonSchemas 
} from '@/lib/api-validation';

const loginSchema = z.object({
  email: commonSchemas.email,
  password: z.string().min(1, 'Password is required'),
});

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  
  try {
    // Validate request size and headers
    const validator = new RequestValidator(request, REQUEST_LIMITS.AUTH_BODY_SIZE);
    await validator.validateRequestSize();
    validator.validateHeaders();
    
    // Validate and parse request body
    const body = await validator.validateAndParseBody(loginSchema);
    const { email, password } = body;

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

    // Generate access token
    const accessToken = await generateToken({ id: user.id, userId: user.id, email: user.email });

    // Generate refresh token
    const jwtSecret = process.env.JWT_SECRET as string;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET environment variable is not configured');
    }
    
    const refreshToken = generateRefreshToken({
      userId: user.id,
      email: user.email,
      type: 'refresh',
      tokenVersion: user.token_version || 1,
      passwordChangedAt: user.password_changed_at?.toISOString() || new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      data: { 
        user: { id: user.id, email: user.email, name: user.name },
        accessToken,
        refreshToken,
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d'
      },
      requestId
    });

  } catch (error) {
    if (error instanceof Error && error.message.includes('Validation failed')) {
      return createValidationErrorResponse(error);
    }
    
    if (error instanceof ZodError) {
      // Handle Zod validation errors
      const errorResponse = createErrorResponse(
        new Error('Validation failed'),
        requestId
      );
      
      return NextResponse.json(errorResponse, { status: 400 });
    }
    
    // Handle database errors
    if (error instanceof Error && error.message.includes('database')) {
      const errorResponse = createDatabaseError(error, requestId);
      return NextResponse.json(errorResponse, { status: 500 });
    }
    
    // Handle other errors
    const errorResponse = createErrorResponse(
      new Error('Login failed'),
      requestId
    );
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
