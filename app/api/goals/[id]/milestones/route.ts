import type { NextRequest } from 'next/server';

import { RequestValidator, REQUEST_LIMITS } from '@/lib/api-validation';
import { requireAuth } from '@/lib/auth-middleware';
import {
  handleApiError,
  createSuccessResponse,
  createPaginatedResponse,
  generateRequestId,
} from '@/lib/services/error-handler';
import { GoalsService } from '@/lib/services/goals-service';
import { milestoneSchemas } from '@/lib/validation-schemas';
import type { AuthenticatedRequest } from '@/types/auth';

const goalsService = new GoalsService();

// GET - List milestones for a goal
export const GET = requireAuth(async (request: AuthenticatedRequest, context?: { params: { id: string } }) => {
  const requestId = generateRequestId();

  try {
    if (!context?.params?.id) {
      throw new Error('Goal ID is required');
    }

    const { id } = context.params;

    // Get goal to verify it exists and get milestones
    const goal = await goalsService.findById(id);

    if (!goal) {
      throw new Error(`Goal not found: ${id}`);
    }

    return createSuccessResponse(goal.milestones || [], requestId);

  } catch (error) {
    return handleApiError(error, requestId);
  }
});

// POST - Create new milestone for a goal
export const POST = requireAuth(async (request: AuthenticatedRequest, context?: { params: { id: string } }) => {
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

    // Validate and parse request body
    const body = await validator.validateAndParseBody(milestoneSchemas.create);

    // Create milestone using service
    const milestone = await goalsService.createMilestone(id, body);

    return createSuccessResponse(milestone, requestId, HTTP_CREATED);

  } catch (error) {
    return handleApiError(error, requestId);
  }
});
