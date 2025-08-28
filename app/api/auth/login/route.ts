import type { NextRequest } from 'next/server';

import { RequestValidator, REQUEST_LIMITS } from '@/lib/api-validation';
import { generateToken } from '@/lib/auth';
import { generateRefreshToken } from '@/lib/jwt-wrapper';
import {
  handleApiError,
  createSuccessResponse,
  generateRequestId,
  createUnauthorizedError,
} from '@/lib/services/error-handler';
import { UserService } from '@/lib/services/user-service';
import { userSchemas } from '@/lib/validation-schemas';

const userService = new UserService();

export const POST = async (request: NextRequest) => {
  const requestId = generateRequestId();

  try {
    // Validate request size and headers
    const validator = new RequestValidator(request, REQUEST_LIMITS.AUTH_BODY_SIZE);
    await validator.validateRequestSize();
    validator.validateHeaders();

    // Validate and parse request body
    const body = await validator.validateAndParseBody(userSchemas.login);
    const { email, password } = body;

    // Check JWT secret configuration
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET environment variable is not configured');
    }

    // Authenticate user
    const user = await userService.authenticate(email, password);
    if (!user) {
      throw createUnauthorizedError('Invalid email or password');
    }

    // Generate tokens
    const accessToken = await generateToken({
      id: user.id,
      userId: user.id,
      email: user.email,
    });

    const refreshToken = generateRefreshToken({
      userId: user.id,
      email: user.email,
      type: 'refresh',
      tokenVersion: 1,
      passwordChangedAt: new Date().toISOString(),
    });

    // Prepare response data
    const data = {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      accessToken,
      refreshToken,
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
    };

    return createSuccessResponse(data, requestId);

  } catch (error) {
    return handleApiError(error, requestId);
  }
};
