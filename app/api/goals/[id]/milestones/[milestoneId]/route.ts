import type { NextRequest } from 'next/server';

import { RequestValidator, REQUEST_LIMITS } from '@/lib/api-validation';
import { requireAuth } from '@/lib/auth-middleware';
import {
  handleApiError,
  createSuccessResponse,
  generateRequestId,
} from '@/lib/services/error-handler';
import { GoalsService } from '@/lib/services/goals-service';
import { milestoneSchemas } from '@/lib/validation-schemas';
import type { AuthenticatedRequest } from '@/types/auth';

const goalsService = new GoalsService();

// PUT - Update milestone
export const PUT = requireAuth(async (
  request: AuthenticatedRequest,
  context?: { params: { id: string; milestoneId: string } },
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

    // Parse request body
    const body = await request.json();

    // Update milestone using service (validation happens inside the service)
    const milestone = await goalsService.updateMilestone(goalId, milestoneId, body);

    return createSuccessResponse(milestone, requestId);

  } catch (error) {
    return handleApiError(error, requestId);
  }
});

// DELETE - Delete milestone
export const DELETE = requireAuth(async (
  request: AuthenticatedRequest,
  context?: { params: { id: string; milestoneId: string } },
) => {
  const requestId = generateRequestId();

  try {
    if (!context?.params?.id || !context?.params?.milestoneId) {
      throw new Error('Goal ID and Milestone ID are required');
    }

    const { id: goalId, milestoneId } = context.params;

    // Delete milestone using service
    const deleted = await goalsService.deleteMilestone(goalId, milestoneId);

    if (!deleted) {
      throw new Error('Milestone not found or could not be deleted');
    }

    return createSuccessResponse(
      { message: 'Milestone deleted successfully', requestId },
      requestId,
    );

  } catch (error) {
    return handleApiError(error, requestId);
  }
});
