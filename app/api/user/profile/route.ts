import { NextRequest } from 'next/server';

import { RequestValidator, REQUEST_LIMITS } from '@/lib/api-validation';
import { requireAuth } from '@/lib/auth-middleware';
import { UserService } from '@/lib/services/user-service';
import { userSchemas } from '@/lib/validation-schemas';
import {
  handleApiError,
  createSuccessResponse,
  generateRequestId
} from '@/lib/services/error-handler';
import type { AuthenticatedRequest } from '@/types/auth';

const userService = new UserService();

export const GET = requireAuth(async (request: AuthenticatedRequest) => {
  const requestId = generateRequestId();

  try {
    // Validate request size and headers
    const validator = new RequestValidator(request as unknown as NextRequest, REQUEST_LIMITS.SEARCH_BODY_SIZE);
    await validator.validateRequestSize();
    validator.validateHeaders();

    // Get user profile using service
    const profile = await userService.getProfile(request.user.id);

    return createSuccessResponse(profile, requestId);

  } catch (error) {
    return handleApiError(error, requestId);
  }
});

export const PUT = requireAuth(async (request: AuthenticatedRequest) => {
  const requestId = generateRequestId();

  try {
    // Validate request size and headers
    const validator = new RequestValidator(request as unknown as NextRequest, REQUEST_LIMITS.DEFAULT_BODY_SIZE);
    await validator.validateRequestSize();
    validator.validateHeaders();

    // Parse and validate request body
    const body = await request.json();
    const validatedData = userService.validateData(userSchemas.update, body);

    // Update user profile using service
    const updatedProfile = await userService.update(request.user.id, validatedData);

    return createSuccessResponse({
      message: 'Profile updated successfully',
      profile: updatedProfile
    }, requestId);

  } catch (error) {
    return handleApiError(error, requestId);
  }
});

export const PATCH = requireAuth(async (request: AuthenticatedRequest) => {
  const requestId = generateRequestId();

  try {
    // Validate request size and headers
    const validator = new RequestValidator(request as unknown as NextRequest, REQUEST_LIMITS.DEFAULT_BODY_SIZE);
    await validator.validateRequestSize();
    validator.validateHeaders();

    // Parse request body
    const body = await request.json();
    const { avatar } = body;

    if (!avatar) {
      throw new Error('Avatar URL is required');
    }

    // Validate avatar URL
    try {
      new URL(avatar);
    } catch {
      throw new Error('Invalid avatar URL');
    }

    // Update user avatar using service
    const updatedProfile = await userService.update(request.user.id, { avatar });

    return createSuccessResponse({
      message: 'Avatar updated successfully',
      profile: updatedProfile
    }, requestId);

  } catch (error) {
    return handleApiError(error, requestId);
  }
});
