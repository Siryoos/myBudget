import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { requireAuth } from '@/lib/auth-middleware';
import { z } from 'zod';
import type { AuthenticatedRequest } from '@/types/auth';
import { 
  commonSchemas, 
  RequestValidator, 
  createValidationErrorResponse,
  REQUEST_LIMITS,
  withRequestSizeLimit 
} from '@/lib/api-validation';

const transactionSchema = z.object({
  amount: commonSchemas.amount,
  description: commonSchemas.description,
  category: commonSchemas.category,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  type: z.enum(['income', 'expense']),
  account: z.string().max(100).optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
  isRecurring: z.boolean().optional(),
  budgetCategoryId: commonSchemas.uuid.optional(),
});

const updateTransactionSchema = transactionSchema.partial().extend({
  id: commonSchemas.uuid,
});

// Query parameter validation schema
const querySchema = z.object({
  page: commonSchemas.pagination.shape.page,
  limit: commonSchemas.pagination.shape.limit,
  category: z.string().max(100).optional(),
  type: z.enum(['income', 'expense']).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be in YYYY-MM-DD format').optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in YYYY-MM-DD format').optional(),
  budgetCategoryId: commonSchemas.uuid.optional(),
}).refine(
  (data) => {
    if (data.startDate && data.endDate) {
      return new Date(data.startDate) <= new Date(data.endDate);
    }
    return true;
  },
  { message: 'Start date must be before or equal to end date' }
);

export const GET = requireAuth(async (request: AuthenticatedRequest) => {
  try {
    // Validate request size and headers
    const validator = new RequestValidator(request as unknown as NextRequest, REQUEST_LIMITS.SEARCH_BODY_SIZE);
    await validator.validateRequestSize();
    validator.validateHeaders();
    
    // Validate and sanitize query parameters
    const queryParams = validator.validateQueryParams(querySchema);
    
    const user = request.user;
    const { page = 1, limit = 20, category, type, startDate, endDate, budgetCategoryId } = queryParams;
    const offset = (page - 1) * limit;

    const conditions = ['t.user_id = $1'];
    const params = [user.id];
    let paramIndex = 2;

    if (category) {
      conditions.push(`t.category = $${paramIndex}`);
      params.push(category);
      paramIndex++;
    }

    if (type) {
      conditions.push(`t.type = $${paramIndex}`);
      params.push(type);
      paramIndex++;
    }

    if (startDate) {
      conditions.push(`t.date >= $${paramIndex}`);
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      conditions.push(`t.date <= $${paramIndex}`);
      params.push(endDate);
      paramIndex++;
    }

    if (budgetCategoryId) {
      conditions.push(`t.budget_category_id = $${paramIndex}`);
      params.push(budgetCategoryId);
      paramIndex++;
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) FROM transactions t ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // Get transactions
    const result = await query(
      `SELECT t.*, bc.name as budget_category_name, bc.color as budget_category_color
       FROM transactions t
       LEFT JOIN budget_categories bc ON t.budget_category_id = bc.id
       ${whereClause}
       ORDER BY t.date DESC, t.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    return NextResponse.json({
      success: true,
      data: {
        transactions: result.rows,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    if (error instanceof Error && error.message.includes('Validation failed')) {
      return createValidationErrorResponse(error);
    }
    
    console.error('Error fetching transactions:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch transactions',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
});

export const POST = requireAuth(async (request: AuthenticatedRequest) => {
  try {
    // Validate request size and headers
    const validator = new RequestValidator(request as unknown as NextRequest, REQUEST_LIMITS.DEFAULT_BODY_SIZE);
    await validator.validateRequestSize();
    validator.validateHeaders();
    
    // Validate and parse request body
    const body = await validator.validateAndParseBody(transactionSchema);
    
    const user = request.user;
    const { amount, description, category, date, type, account, tags, isRecurring, budgetCategoryId } = body;

    // Validate budget category exists if provided
    if (budgetCategoryId) {
      const budgetCategoryResult = await query(
        'SELECT id FROM budget_categories WHERE id = $1 AND user_id = $2',
        [budgetCategoryId, user.id]
      );
      
      if (budgetCategoryResult.rows.length === 0) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Invalid budget category' 
          },
          { status: 400 }
        );
      }
    }

    // Insert transaction
    const result = await query(
      `INSERT INTO transactions (
        user_id, amount, description, category, date, type, 
        account, tags, is_recurring, budget_category_id, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
      RETURNING *`,
      [user.id, amount, description, category, date, type, account, tags, isRecurring, budgetCategoryId]
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    }, { status: 201 });

  } catch (error) {
    if (error instanceof Error && error.message.includes('Validation failed')) {
      return createValidationErrorResponse(error);
    }
    
    console.error('Error creating transaction:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create transaction',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
});

export const PUT = requireAuth(async (request: AuthenticatedRequest) => {
  try {
    const body = await request.json();
    const updateData = updateTransactionSchema.parse(body);
    const user = request.user;

    // Check if transaction exists and belongs to user
    const existingTransaction = await query(
      'SELECT id, amount, type, budget_category_id FROM transactions WHERE id = $1 AND user_id = $2',
      [updateData.id, user.id]
    );

    if (existingTransaction.rows.length === 0) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    const oldTransaction = existingTransaction.rows[0];

    // Start transaction
    await query('BEGIN');

    try {
      // Update transaction fields
      const updateFields = [];
      const updateValues = [];
      let paramIndex = 1;

      if (updateData.amount !== undefined) {
        updateFields.push(`amount = $${paramIndex++}`);
        updateValues.push(updateData.amount);
      }
      if (updateData.description) {
        updateFields.push(`description = $${paramIndex++}`);
        updateValues.push(updateData.description);
      }
      if (updateData.category) {
        updateFields.push(`category = $${paramIndex++}`);
        updateValues.push(updateData.category);
      }
      if (updateData.date) {
        updateFields.push(`date = $${paramIndex++}`);
        updateValues.push(updateData.date);
      }
      if (updateData.type) {
        updateFields.push(`type = $${paramIndex++}`);
        updateValues.push(updateData.type);
      }
      if (updateData.account !== undefined) {
        updateFields.push(`account = $${paramIndex++}`);
        updateValues.push(updateData.account);
      }
      if (updateData.tags !== undefined) {
        updateFields.push(`tags = $${paramIndex++}`);
        updateValues.push(updateData.tags);
      }
      if (updateData.isRecurring !== undefined) {
        updateFields.push(`is_recurring = $${paramIndex++}`);
        updateValues.push(updateData.isRecurring);
      }
      if (updateData.budgetCategoryId !== undefined) {
        updateFields.push(`budget_category_id = $${paramIndex++}`);
        updateValues.push(updateData.budgetCategoryId);
      }

      if (updateFields.length > 0) {
        updateValues.push(updateData.id);
        await query(
          `UPDATE transactions SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramIndex}`,
          updateValues
        );
      }

      // Handle budget category updates
      if (updateData.amount !== undefined || updateData.type !== undefined || updateData.budgetCategoryId !== undefined) {
        // Revert old budget category spent amount
        if (oldTransaction.type === 'expense' && oldTransaction.budget_category_id) {
          await query(
            `UPDATE budget_categories 
             SET spent = spent - $1 
             WHERE id = $2`,
            [oldTransaction.amount, oldTransaction.budget_category_id]
          );
        }

        // Apply new budget category spent amount
        const newAmount = updateData.amount !== undefined ? updateData.amount : oldTransaction.amount;
        const newType = updateData.type !== undefined ? updateData.type : oldTransaction.type;
        const newBudgetCategoryId = updateData.budgetCategoryId !== undefined ? updateData.budgetCategoryId : oldTransaction.budget_category_id;

        if (newType === 'expense' && newBudgetCategoryId) {
          await query(
            `UPDATE budget_categories 
             SET spent = spent + $1 
             WHERE id = $2`,
            [newAmount, newBudgetCategoryId]
          );
        }
      }

      await query('COMMIT');

      return NextResponse.json({
        success: true,
        data: { message: 'Transaction updated successfully' }
      });

    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Update transaction error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update transaction' },
      { status: 500 }
    );
  }
});

export const DELETE = requireAuth(async (request: AuthenticatedRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const transactionId = searchParams.get('id');
    const user = request.user;

    if (!transactionId) {
      return NextResponse.json(
        { error: 'Transaction ID is required' },
        { status: 400 }
      );
    }

    // Check if transaction exists and belongs to user
    const existingTransaction = await query(
      'SELECT id, amount, type, budget_category_id FROM transactions WHERE id = $1 AND user_id = $2',
      [transactionId, user.id]
    );

    if (existingTransaction.rows.length === 0) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    const transaction = existingTransaction.rows[0];

    // Start transaction
    await query('BEGIN');

    try {
      // Revert budget category spent amount if it's an expense
      if (transaction.type === 'expense' && transaction.budget_category_id) {
        await query(
          `UPDATE budget_categories 
           SET spent = spent - $1 
           WHERE id = $2`,
          [transaction.amount, transaction.budget_category_id]
        );
      }

      // Delete transaction
      await query('DELETE FROM transactions WHERE id = $1', [transactionId]);

      await query('COMMIT');

      return NextResponse.json({
        success: true,
        data: { message: 'Transaction deleted successfully' }
      });

    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Delete transaction error:', error);
    return NextResponse.json(
      { error: 'Failed to delete transaction' },
      { status: 500 }
    );
  }
});
