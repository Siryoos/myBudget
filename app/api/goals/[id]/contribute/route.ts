import { NextRequest } from 'next/server';

import { RequestValidator, REQUEST_LIMITS } from '@/lib/api-validation';
import { requireAuth } from '@/lib/auth-middleware';
import { GoalsService } from '@/lib/services/goals-service';
import { z } from 'zod';
import {
  handleApiError,
  createSuccessResponse,
  generateRequestId
} from '@/lib/services/error-handler';
import type { AuthenticatedRequest } from '@/types/auth';

const goalsService = new GoalsService();

// Validation schema for contributions
const contributeSchema = z.object({
  amount: z.number().positive('Contribution amount must be positive'),
});

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
    const body = await validator.validateAndParseBody(contributeSchema);

    // Add contribution using service
    const updatedGoal = await goalsService.contribute(id, body.amount);

    return createSuccessResponse({
      ...updatedGoal,
      message: `Successfully contributed $${body.amount} to goal`
    }, requestId);

  } catch (error) {
    return handleApiError(error, requestId);
  }
});
