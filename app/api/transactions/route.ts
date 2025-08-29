import type { NextRequest } from 'next/server';

import { RequestValidator, REQUEST_LIMITS } from '@/lib/api-validation';
import { requireAuth } from '@/lib/auth-middleware';
import {
  handleApiError,
  createSuccessResponse,
  createPaginatedResponse,
  generateRequestId,
  HTTP_CREATED,
} from '@/lib/services/error-handler';
import { TransactionService } from '@/lib/services/transaction-service';
import { transactionSchemas } from '@/lib/validation-schemas';
import type { AuthenticatedRequest } from '@/types/auth';

const transactionService = new TransactionService();

export const GET = requireAuth(async (request: AuthenticatedRequest) => {
  const requestId = generateRequestId();

  try {
    // Validate request size and headers
    const validator = new RequestValidator(request as unknown as NextRequest, REQUEST_LIMITS.SEARCH_BODY_SIZE);
    await validator.validateRequestSize();
    validator.validateHeaders();

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const filters = {
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20'),
      category: searchParams.get('category') || undefined,
      type: searchParams.get('type') as 'income' | 'expense' | undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      search: searchParams.get('search') || undefined,
      minAmount: searchParams.get('minAmount') ? parseFloat(searchParams.get('minAmount')!) : undefined,
      maxAmount: searchParams.get('maxAmount') ? parseFloat(searchParams.get('maxAmount')!) : undefined,
    };

    // Get transactions using service (validation happens internally)
    const result = await transactionService.findByUserId(
      request.user.id,
      filters,
      { page: filters.page || 1, limit: filters.limit || 20 },
    );

    return createPaginatedResponse(
      result.data.map(tx => ({ ...tx, requestId })),
      result.pagination,
      requestId,
    );

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
    const body = await validator.validateAndParseBody(transactionSchemas.create);

    // Create transaction using service
    const transaction = await transactionService.create(request.user.id, body);

    return createSuccessResponse({ ...transaction, requestId }, requestId, HTTP_CREATED);

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
      throw new Error('Transaction ID is required');
    }

    // Update transaction using service (validation happens internally)
    const transaction = await transactionService.update(id, updateData);

    return createSuccessResponse({ ...transaction, requestId }, requestId);

  } catch (error) {
    return handleApiError(error, requestId);
  }
});

export const DELETE = requireAuth(async (request: AuthenticatedRequest) => {
  const requestId = generateRequestId();

  try {
    const { searchParams } = new URL(request.url);
    const transactionId = searchParams.get('id');

    if (!transactionId) {
      throw new Error('Transaction ID is required');
    }

    // Delete transaction using service
    const deleted = await transactionService.delete(transactionId);

    if (!deleted) {
      throw new Error('Transaction not found or could not be deleted');
    }

    return createSuccessResponse(
      { message: 'Transaction deleted successfully', requestId },
      requestId,
    );

  } catch (error) {
    return handleApiError(error, requestId);
  }
});
