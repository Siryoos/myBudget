import { NextRequest } from 'next/server';

import { RequestValidator, REQUEST_LIMITS } from '@/lib/api-validation';
import { requireAuth } from '@/lib/auth-middleware';
import { GoalsService } from '@/lib/services/goals-service';
import { automationRuleSchemas } from '@/lib/validation-schemas';
import {
  handleApiError,
  createSuccessResponse,
  createPaginatedResponse,
  generateRequestId
} from '@/lib/services/error-handler';
import type { AuthenticatedRequest } from '@/types/auth';

const goalsService = new GoalsService();

// GET - List automation rules for a goal
export const GET = requireAuth(async (request: AuthenticatedRequest, context?: { params: { id: string } }) => {
  const requestId = generateRequestId();

  try {
    if (!context?.params?.id) {
      throw new Error('Goal ID is required');
    }

    const { id } = context.params;

    // Get goal to verify it exists and get automation rules
    const goal = await goalsService.findById(id);

    return createSuccessResponse(goal.automationRules, requestId);

  } catch (error) {
    return handleApiError(error, requestId);
  }
});

// POST - Create new automation rule for a goal
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
    const body = await validator.validateAndParseBody(automationRuleSchemas.create);

    // Create automation rule using service
    const automationRule = await goalsService.createAutomationRule(id, body);

    return createSuccessResponse(automationRule, requestId, 201);

  } catch (error) {
    return handleApiError(error, requestId);
  }
});
