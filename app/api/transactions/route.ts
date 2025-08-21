import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { requireAuth } from '@/lib/auth-middleware';
import { z } from 'zod';

const transactionSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  description: z.string().min(1, 'Description is required'),
  category: z.string().min(1, 'Category is required'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  type: z.enum(['income', 'expense']),
  account: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isRecurring: z.boolean().optional(),
  budgetCategoryId: z.string().uuid('Invalid budget category ID').optional(),
});

const updateTransactionSchema = transactionSchema.partial().extend({
  id: z.string().uuid('Invalid transaction ID'),
});

export const GET = requireAuth(async (request: NextRequest) => {
  try {
    const user = (request as any).user;
    const { searchParams } = new URL(request.url);
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;
    
    const category = searchParams.get('category');
    const type = searchParams.get('type');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const budgetCategoryId = searchParams.get('budgetCategoryId');

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
    console.error('Get transactions error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
});

export const POST = requireAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const transactionData = transactionSchema.parse(body);
    const user = (request as any).user;

    // Validate date is not in the future
    const transactionDate = new Date(transactionData.date);
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today
    
    if (transactionDate > today) {
      return NextResponse.json(
        { error: 'Transaction date cannot be in the future' },
        { status: 400 }
      );
    }

    // Validate budget category belongs to user if provided
    if (transactionData.budgetCategoryId) {
      const budgetCategory = await query(
        `SELECT bc.id FROM budget_categories bc
         JOIN budgets b ON bc.budget_id = b.id
         WHERE bc.id = $1 AND b.user_id = $2`,
        [transactionData.budgetCategoryId, user.id]
      );
      
      if (budgetCategory.rows.length === 0) {
        return NextResponse.json(
          { error: 'Invalid budget category' },
          { status: 400 }
        );
      }
    }

    // Start transaction
    await query('BEGIN');

    try {
      const result = await query(
        `INSERT INTO transactions (user_id, budget_category_id, amount, description, category, date, type, account, tags, is_recurring)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
        [user.id, transactionData.budgetCategoryId || null, transactionData.amount, 
         transactionData.description, transactionData.category, transactionData.date,
         transactionData.type, transactionData.account || null, 
         transactionData.tags || [], transactionData.isRecurring || false]
      );

      // Update budget category spent amount if it's an expense
      if (transactionData.type === 'expense' && transactionData.budgetCategoryId) {
        await query(
          `UPDATE budget_categories 
           SET spent = spent + $1 
           WHERE id = $2`,
          [transactionData.amount, transactionData.budgetCategoryId]
        );
      }

      await query('COMMIT');

      return NextResponse.json({
        success: true,
        data: result.rows[0]
      });

    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Create transaction error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create transaction' },
      { status: 500 }
    );
  }
});

export const PUT = requireAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const updateData = updateTransactionSchema.parse(body);
    const user = (request as any).user;

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

export const DELETE = requireAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const transactionId = searchParams.get('id');
    const user = (request as any).user;

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
