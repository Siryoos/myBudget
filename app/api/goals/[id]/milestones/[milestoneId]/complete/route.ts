import { NextRequest } from 'next/server';

import { RequestValidator, REQUEST_LIMITS } from '@/lib/api-validation';
import { requireAuth } from '@/lib/auth-middleware';
import { GoalsService } from '@/lib/services/goals-service';
import {
  handleApiError,
  createSuccessResponse,
  generateRequestId
} from '@/lib/services/error-handler';
import type { AuthenticatedRequest } from '@/types/auth';

const goalsService = new GoalsService();

export const POST = requireAuth(async (
  request: AuthenticatedRequest,
  context?: { params: { id: string; milestoneId: string } }
) => {
  const requestId = generateRequestId();

  try {
    if (!context?.params?.id || !context?.params?.milestoneId) {
      throw new Error('Goal ID and Milestone ID are required');
    }

    const { id: goalId, milestoneId } = context.params;

    // Validate request size and headers
    const validator = new RequestValidator(request as unknown as NextRequest, REQUEST_LIMITS.DEFAULT_BODY_SIZE);
    await validator.validateRequestSize();
    validator.validateHeaders();

    // Complete milestone using service
    const milestone = await goalsService.completeMilestone(goalId, milestoneId);

    return createSuccessResponse({
      ...milestone,
      message: 'Milestone completed successfully'
    }, requestId);

  } catch (error) {
    return handleApiError(error, requestId);
  }
});
