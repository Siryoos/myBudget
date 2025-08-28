import type { NextRequest } from 'next/server';

import { RequestValidator, REQUEST_LIMITS } from '@/lib/api-validation';
import { requireAuth } from '@/lib/auth-middleware';
import { BudgetService } from '@/lib/services/budget-service';
import {
  handleApiError,
  createSuccessResponse,
  createPaginatedResponse,
  generateRequestId,
} from '@/lib/services/error-handler';
import { budgetSchemas } from '@/lib/validation-schemas';
import type { AuthenticatedRequest } from '@/types/auth';

const budgetService = new BudgetService();

export const GET = requireAuth(async (request: AuthenticatedRequest) => {
  const requestId = generateRequestId();

  try {
    // Validate request size and headers
    const validator = new RequestValidator(request as unknown as NextRequest, REQUEST_LIMITS.SEARCH_BODY_SIZE);
    await validator.validateRequestSize();
    validator.validateHeaders();

    // Get budgets using service
    const budgets = await budgetService.findByUserId(request.user.id);

    return createSuccessResponse(budgets, requestId);

  } catch (error) {
    return handleApiError(error, requestId);
  }
});

export const POST = requireAuth(async (request: AuthenticatedRequest) => {
  const requestId = generateRequestId();

  try {
    // Validate request size and headers
    const validator = new RequestValidator(request as unknown as NextRequest, REQUEST_LIMITS.DEFAULT_BODY_SIZE);
    await validator.validateRequestSize();
    validator.validateHeaders();

    // Validate and parse request body
    const body = await validator.validateAndParseBody(budgetSchemas.create);

    // Create budget using service
    const budget = await budgetService.create(request.user.id, body);

    return createSuccessResponse(budget, requestId, 201);

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
    const { id, ...updateData } = body;

    if (!id) {
      throw new Error('Budget ID is required');
    }

    // Validate update data
    const validatedData = budgetService.validateData(budgetSchemas.update, updateData);

    // Update budget using service
    const budget = await budgetService.update(id, validatedData);

    return createSuccessResponse(budget, requestId);

  } catch (error) {
    return handleApiError(error, requestId);
  }
});

export const DELETE = requireAuth(async (request: AuthenticatedRequest) => {
  const requestId = generateRequestId();

  try {
    const { searchParams } = new URL(request.url);
    const budgetId = searchParams.get('id');

    if (!budgetId) {
      throw new Error('Budget ID is required');
    }

    // Delete budget using service
    const deleted = await budgetService.delete(budgetId);

    if (!deleted) {
      throw new Error('Budget not found or could not be deleted');
    }

    return createSuccessResponse(
      { message: 'Budget deleted successfully', requestId },
      requestId,
    );

  } catch (error) {
    return handleApiError(error, requestId);
  }
});
