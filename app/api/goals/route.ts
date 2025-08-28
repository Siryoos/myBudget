import { NextRequest } from 'next/server';

import { RequestValidator, REQUEST_LIMITS } from '@/lib/api-validation';
import { requireAuth } from '@/lib/auth-middleware';
import { GoalsService } from '@/lib/services/goals-service';
import { savingsGoalSchemas } from '@/lib/validation-schemas';
import {
  handleApiError,
  createSuccessResponse,
  generateRequestId
} from '@/lib/services/error-handler';
import { withFullOptimization, OptimizedRequest } from '@/lib/middleware/performance';
import type { AuthenticatedRequest } from '@/types/auth';

const goalsService = new GoalsService();

const getGoalsHandler = async (request: AuthenticatedRequest) => {
  const requestId = generateRequestId();

  try {
    // Validate request size and headers
    const validator = new RequestValidator(request as unknown as NextRequest, REQUEST_LIMITS.SEARCH_BODY_SIZE);
    await validator.validateRequestSize();
    validator.validateHeaders();

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const priority = searchParams.get('priority') as 'low' | 'medium' | 'high' | undefined;

    // Get goals using service
    const goals = await goalsService.findByUserId(request.user.id, priority);

    return createSuccessResponse(goals, requestId);

  } catch (error) {
    return handleApiError(error, requestId);
  }
};

export const GET = withFullOptimization(
  (request: OptimizedRequest) => `${request.url}-user-${(request as any).user?.id}`,
  'get-goals'
)(requireAuth(getGoalsHandler));

export const POST = requireAuth(async (request: AuthenticatedRequest) => {
  const requestId = generateRequestId();

  try {
    // Validate request size and headers
    const validator = new RequestValidator(request as unknown as NextRequest, REQUEST_LIMITS.DEFAULT_BODY_SIZE);
    await validator.validateRequestSize();
    validator.validateHeaders();

    // Validate and parse request body
    const body = await validator.validateAndParseBody(savingsGoalSchemas.create);

    // Create goal using service
    const goal = await goalsService.create(request.user.id, body);

    return createSuccessResponse(goal, requestId, 201);

  } catch (error) {
    return handleApiError(error, requestId);
  }
});
