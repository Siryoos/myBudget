import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { requireAuth } from '@/lib/auth-middleware';
import { z } from 'zod';
import type { AuthenticatedRequest } from '@/types/auth';

const budgetSchema = z.object({
  name: z.string().min(1, 'Budget name is required'),
  method: z.enum(['50-30-20', 'pay-yourself-first', 'envelope', 'zero-based', 'kakeibo']),
  totalIncome: z.number().positive('Total income must be positive'),
  period: z.enum(['weekly', 'monthly', 'yearly']),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be in YYYY-MM-DD format'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in YYYY-MM-DD format'),
  categories: z.array(z.object({
    name: z.string().min(1, 'Category name is required'),
    allocated: z.number().positive('Allocated amount must be positive'),
    color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Color must be a valid hex color'),
    icon: z.string().optional(),
    isEssential: z.boolean().optional(),
  })).min(1, 'At least one category is required'),
});

const updateBudgetSchema = budgetSchema.partial().extend({
  id: z.string().uuid('Invalid budget ID'),
});

export const GET = requireAuth(async (request: AuthenticatedRequest) => {
  try {
    const user = request.user;
    
    const result = await query(
      `SELECT b.*, 
        json_agg(
          json_build_object(
            'id', bc.id,
            'name', bc.name,
            'allocated', bc.allocated,
            'spent', bc.spent,
            'remaining', bc.allocated - bc.spent,
            'color', bc.color,
            'icon', bc.icon,
            'isEssential', bc.is_essential
          )
        ) as categories
      FROM budgets b
      LEFT JOIN budget_categories bc ON b.id = bc.budget_id
      WHERE b.user_id = $1
      GROUP BY b.id
      ORDER BY b.created_at DESC`,
      [user.id]
    );

    return NextResponse.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Get budgets error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch budgets' },
      { status: 500 }
    );
  }
});

export const POST = requireAuth(async (request: AuthenticatedRequest) => {
  try {
    const body = await request.json();
    const budgetData = budgetSchema.parse(body);
    const user = request.user;

    // Validate date range
    const startDate = new Date(budgetData.startDate);
    const endDate = new Date(budgetData.endDate);
    
    if (startDate >= endDate) {
      return NextResponse.json(
        { error: 'End date must be after start date' },
        { status: 400 }
      );
    }

    // Validate total allocation matches income
    const totalAllocated = budgetData.categories.reduce((sum, cat) => sum + cat.allocated, 0);
    if (Math.abs(totalAllocated - budgetData.totalIncome) > 0.01) {
      return NextResponse.json(
        { error: 'Total allocated amount must equal total income' },
        { status: 400 }
      );
    }

    // Start transaction
    await query('BEGIN');

    try {
      // Create budget
      const budgetResult = await query(
        `INSERT INTO budgets (user_id, name, method, total_income, period, start_date, end_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [user.id, budgetData.name, budgetData.method, budgetData.totalIncome, 
         budgetData.period, budgetData.startDate, budgetData.endDate]
      );

      const budgetId = budgetResult.rows[0].id;

      // Create budget categories
      for (const category of budgetData.categories) {
        await query(
          `INSERT INTO budget_categories (budget_id, name, allocated, color, icon, is_essential)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [budgetId, category.name, category.allocated, category.color, 
           category.icon || null, category.isEssential || false]
        );
      }

      await query('COMMIT');

      return NextResponse.json({
        success: true,
        data: { budgetId, message: 'Budget created successfully' }
      });

    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Create budget error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create budget' },
      { status: 500 }
    );
  }
});

export const PUT = requireAuth(async (request: AuthenticatedRequest) => {
  try {
    const body = await request.json();
    const updateData = updateBudgetSchema.parse(body);
    const user = request.user;

    // Check if budget exists and belongs to user
    const existingBudget = await query(
      'SELECT id FROM budgets WHERE id = $1 AND user_id = $2',
      [updateData.id, user.id]
    );

    if (existingBudget.rows.length === 0) {
      return NextResponse.json(
        { error: 'Budget not found' },
        { status: 404 }
      );
    }

    // Start transaction
    await query('BEGIN');

    try {
      // Update budget fields
      const updateFields = [];
      const updateValues = [];
      let paramIndex = 1;

      if (updateData.name) {
        updateFields.push(`name = $${paramIndex++}`);
        updateValues.push(updateData.name);
      }
      if (updateData.method) {
        updateFields.push(`method = $${paramIndex++}`);
        updateValues.push(updateData.method);
      }
      if (updateData.totalIncome) {
        updateFields.push(`total_income = $${paramIndex++}`);
        updateValues.push(updateData.totalIncome);
      }
      if (updateData.period) {
        updateFields.push(`period = $${paramIndex++}`);
        updateValues.push(updateData.period);
      }
      if (updateData.startDate) {
        updateFields.push(`start_date = $${paramIndex++}`);
        updateValues.push(updateData.startDate);
      }
      if (updateData.endDate) {
        updateFields.push(`end_date = $${paramIndex++}`);
        updateValues.push(updateData.endDate);
      }

      if (updateFields.length > 0) {
        updateValues.push(updateData.id);
        await query(
          `UPDATE budgets SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramIndex}`,
          updateValues
        );
      }

      // Update categories if provided
      if (updateData.categories) {
        // Get existing categories to preserve spent amounts
        const existingCategories = await query(
          'SELECT id, name, spent FROM budget_categories WHERE budget_id = $1',
          [updateData.id]
        );
        
        const existingByName = existingCategories.rows.reduce((acc, cat) => {
          acc[cat.name] = cat;
          return acc;
        }, {} as Record<string, { id: string; name: string; spent: number }>);
        
        // Update or insert categories
        for (const category of updateData.categories) {
          const existing = existingByName[category.name];
          if (existing) {
            // Update existing category, preserving spent amount
            await query(
              `UPDATE budget_categories 
               SET allocated = $1, color = $2, icon = $3, is_essential = $4
               WHERE id = $5`,
              [category.allocated, category.color, 
               category.icon || null, category.isEssential || false, existing.id]
            );
            delete existingByName[category.name];
          } else {
            // Insert new category
            await query(
              `INSERT INTO budget_categories (budget_id, name, allocated, color, icon, is_essential)
               VALUES ($1, $2, $3, $4, $5, $6)`,
              [updateData.id, category.name, category.allocated, category.color, 
               category.icon || null, category.isEssential || false]
            );
          }
        }
        
        // Delete categories that are no longer in the update
        const remainingIds = Object.values(existingByName).map((cat: any) => cat.id);
        if (remainingIds.length > 0) {
          await query(
            `DELETE FROM budget_categories WHERE id = ANY($1::uuid[])`,
            [remainingIds]
          );
        }
      }

      await query('COMMIT');

      return NextResponse.json({
        success: true,
        data: { message: 'Budget updated successfully' }
      });

    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Update budget error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update budget' },
      { status: 500 }
    );
  }
});

export const DELETE = requireAuth(async (request: AuthenticatedRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const budgetId = searchParams.get('id');
    const user = request.user;

    if (!budgetId) {
      return NextResponse.json(
        { error: 'Budget ID is required' },
        { status: 400 }
      );
    }

    // Check if budget exists and belongs to user
    const existingBudget = await query(
      'SELECT id FROM budgets WHERE id = $1 AND user_id = $2',
      [budgetId, user.id]
    );

    if (existingBudget.rows.length === 0) {
      return NextResponse.json(
        { error: 'Budget not found' },
        { status: 404 }
      );
    }

    // Delete budget (cascade will handle categories)
    await query('DELETE FROM budgets WHERE id = $1', [budgetId]);

    return NextResponse.json({
      success: true,
      data: { message: 'Budget deleted successfully' }
    });

  } catch (error) {
    console.error('Delete budget error:', error);
    return NextResponse.json(
      { error: 'Failed to delete budget' },
      { status: 500 }
    );
  }
});
