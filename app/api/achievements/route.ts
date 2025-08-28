import type { NextRequest } from 'next/server';

import { RequestValidator, REQUEST_LIMITS } from '@/lib/api-validation';
import { requireAuth } from '@/lib/auth-middleware';
import { AchievementsService } from '@/lib/services/achievements-service';
import {
  handleApiError,
  createSuccessResponse,
  generateRequestId,
} from '@/lib/services/error-handler';
import { achievementSchemas } from '@/lib/validation-schemas';
import type { AuthenticatedRequest } from '@/types/auth';

const achievementsService = new AchievementsService();

// GET - List all achievements
export const GET = requireAuth(async (request: AuthenticatedRequest) => {
  const requestId = generateRequestId();

  try {
    // Validate request size and headers
    const validator = new RequestValidator(request as unknown as NextRequest, REQUEST_LIMITS.SEARCH_BODY_SIZE);
    await validator.validateRequestSize();
    validator.validateHeaders();

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || undefined;

    // Get achievements using service
    const achievements = category
      ? await achievementsService.findByCategory(category)
      : await achievementsService.findAll();

    return createSuccessResponse(achievements, requestId);

  } catch (error) {
    return handleApiError(error, requestId);
  }
});

// POST - Create new achievement (admin only)
export const POST = requireAuth(async (request: AuthenticatedRequest) => {
  const requestId = generateRequestId();

  try {
    // TODO: Add admin role check here
    // if (!request.user.roles?.includes('admin')) {
    //   throw createForbiddenError('Admin access required');
    // }

    // Validate request size and headers
    const validator = new RequestValidator(request as unknown as NextRequest, REQUEST_LIMITS.DEFAULT_BODY_SIZE);
    await validator.validateRequestSize();
    validator.validateHeaders();

    // Validate and parse request body
    const body = await validator.validateAndParseBody(achievementSchemas.create);

    // Create achievement using service
    const achievement = await achievementsService.create(body);

    return createSuccessResponse(achievement, requestId, HTTP_CREATED);

  } catch (error) {
    return handleApiError(error, requestId);
  }
});
