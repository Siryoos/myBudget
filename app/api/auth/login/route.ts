import { NextResponse, type NextRequest } from 'next/server';
import { z, ZodError } from 'zod';

import {
  RequestValidator,
  createValidationErrorResponse,
  REQUEST_LIMITS,
  commonSchemas,
} from '@/lib/api-validation';
import { comparePassword, generateToken } from '@/lib/auth';
import { query } from '@/lib/database';
import {
  createErrorResponse,
  createDatabaseError,
} from '@/lib/error-handling';
import { generateRefreshToken } from '@/lib/jwt-wrapper';

const loginSchema = z.object({
  email: commonSchemas.email,
  password: z.string().min(1, 'Password is required'),
});

// User interface for type safety
interface User {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  token_version?: number;
  password_changed_at?: Date;
}

// Helper function to find user by email
const findUserByEmail = async (email: string): Promise<User | null> => {
  const result = await query(
    'SELECT id, email, name, password_hash, token_version, password_changed_at FROM users WHERE lower(email) = lower($1)',
    [email],
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0] as User;
};

// Helper function to create invalid credentials error
const createInvalidCredentialsError = (requestId: string) => NextResponse.json(
  createErrorResponse(new Error('Invalid credentials'), requestId),
  { status: 401 },
);

// Helper function to generate refresh token
const generateRefreshTokenForUser = (user: User) => generateRefreshToken({
  userId: user.id,
  email: user.email,
  type: 'refresh',
  tokenVersion: user.token_version || 1,
  passwordChangedAt: user.password_changed_at?.toISOString() || new Date().toISOString(),
});

// Helper function to generate tokens
const generateTokens = async (user: User) => {
  const accessToken = await generateToken({ id: user.id, userId: user.id, email: user.email });
  const refreshToken = generateRefreshTokenForUser(user);
  return { accessToken, refreshToken };
};

// Helper function to create success response
const createLoginSuccessResponse = (
  user: User,
  tokens: { accessToken: string; refreshToken: string },
  requestId: string,
) => {
  const userData = { id: user.id, email: user.email, name: user.name };
  const data = {
    user: userData,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  };
  return NextResponse.json({ success: true, data, requestId });
};

// Main login logic
const processLogin = async (email: string, password: string, requestId: string) => {
  const user = await findUserByEmail(email);
  if (!user) {return createInvalidCredentialsError(requestId);}

  const isValidPassword = await comparePassword(password, user.password_hash);
  if (!isValidPassword) {return createInvalidCredentialsError(requestId);}

  const tokens = await generateTokens(user);
  return createLoginSuccessResponse(user, tokens, requestId);
};

export const POST = async (request: NextRequest) => {
  const requestId = crypto.randomUUID();

  try {
    // Validate request size and headers
    const validator = new RequestValidator(request, REQUEST_LIMITS.AUTH_BODY_SIZE);
    await validator.validateRequestSize();
    validator.validateHeaders();

    // Validate and parse request body
    const body = await validator.validateAndParseBody(loginSchema);
    const { email, password } = body;

    // Check JWT secret configuration
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET environment variable is not configured');
    }

    return await processLogin(email, password, requestId);

  } catch (error) {
    if (error instanceof Error && error.message.includes('Validation failed')) {
      return createValidationErrorResponse(error);
    }

    if (error instanceof ZodError) {
      const errorResponse = createErrorResponse(
        new Error('Validation failed'),
        requestId,
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
      requestId,
    );
    return NextResponse.json(errorResponse, { status: 500 });
  }
};
