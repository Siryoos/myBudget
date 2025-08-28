import type { NextRequest } from 'next/server';

import { RequestValidator, REQUEST_LIMITS } from '@/lib/api-validation';
import { requireAuth } from '@/lib/auth-middleware';
import {
  handleApiError,
  createSuccessResponse,
  generateRequestId,
} from '@/lib/services/error-handler';
import { GoalsService } from '@/lib/services/goals-service';
import { savingsGoalSchemas } from '@/lib/validation-schemas';
import type { AuthenticatedRequest } from '@/types/auth';

const goalsService = new GoalsService();

export const GET = requireAuth(async (request: AuthenticatedRequest, context?: { params: { id: string } }) => {
  const requestId = generateRequestId();

  try {
    if (!context?.params?.id) {
      throw new Error('Goal ID is required');
    }

    const { id } = context.params;

    // Get goal using service
    const goal = await goalsService.findById(id);

    return createSuccessResponse(goal, requestId);

  } catch (error) {
    return handleApiError(error, requestId);
  }
});

export const PUT = requireAuth(async (request: AuthenticatedRequest, context?: { params: { id: string } }) => {
  const requestId = generateRequestId();

  try {
    if (!context?.params?.id) {
      throw new Error('Goal ID is required');
    }

    const { id } = context.params;

    // Validate request size and headers
    const validator = new RequestValidator(request as unknown as NextRequest, REQUEST_LIMITS.DEFAULT_BODY_SIZE);
    await validator.validateRequestSize();
    validator.validateHeaders();

    // Parse request body
    const body = await request.json();

    // Update goal using service (validation happens inside the service)
    const goal = await goalsService.update(id, body);

    return createSuccessResponse(goal, requestId);

  } catch (error) {
    return handleApiError(error, requestId);
  }
});

export const DELETE = requireAuth(async (request: AuthenticatedRequest, context?: { params: { id: string } }) => {
  const requestId = generateRequestId();

  try {
    if (!context?.params?.id) {
      throw new Error('Goal ID is required');
    }

    const { id } = context.params;

    // Delete goal using service
    const deleted = await goalsService.delete(id);

    if (!deleted) {
      throw new Error('Goal not found or could not be deleted');
    }

    return createSuccessResponse(
      { message: 'Goal deleted successfully', requestId },
      requestId,
    );

  } catch (error) {
    return handleApiError(error, requestId);
  }
});
