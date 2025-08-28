import type { NextRequest } from 'next/server';

import { RequestValidator, REQUEST_LIMITS } from '@/lib/api-validation';
import { requireAuth } from '@/lib/auth-middleware';
import { AchievementsService } from '@/lib/services/achievements-service';
import {
  handleApiError,
  createSuccessResponse,
  generateRequestId,
} from '@/lib/services/error-handler';
import type { AuthenticatedRequest } from '@/types/auth';

const achievementsService = new AchievementsService();

// GET - Get user's achievements and progress
export const GET = requireAuth(async (request: AuthenticatedRequest) => {
  const requestId = generateRequestId();

  try {
    // Validate request size and headers
    const validator = new RequestValidator(request as unknown as NextRequest, REQUEST_LIMITS.SEARCH_BODY_SIZE);
    await validator.validateRequestSize();
    validator.validateHeaders();

    // Get user's achievements with progress
    const userAchievements = await achievementsService.getUserAchievements(request.user.id);

    // Get user progress stats
    const progressStats = await achievementsService.getUserProgress(request.user.id);

    return createSuccessResponse({
      achievements: userAchievements,
      progress: progressStats,
    }, requestId);

  } catch (error) {
    return handleApiError(error, requestId);
  }
});

// POST - Check and unlock achievements for user
export const POST = requireAuth(async (request: AuthenticatedRequest) => {
  const requestId = generateRequestId();

  try {
    // Validate request size and headers
    const validator = new RequestValidator(request as unknown as NextRequest, REQUEST_LIMITS.DEFAULT_BODY_SIZE);
    await validator.validateRequestSize();
    validator.validateHeaders();

    // Check and unlock achievements
    const unlockedAchievements = await achievementsService.checkAndUnlockAchievements(request.user.id);

    return createSuccessResponse({
      unlockedAchievements,
      message: unlockedAchievements.length > 0
        ? `Unlocked ${unlockedAchievements.length} new achievement(s)!`
        : 'No new achievements unlocked',
    }, requestId);

  } catch (error) {
    return handleApiError(error, requestId);
  }
});
