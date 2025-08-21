import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { requireAuth } from '@/lib/auth-middleware';
import { z } from 'zod';

const goalSchema = z.object({
  name: z.string().min(1, 'Goal name is required'),
  description: z.string().optional(),
  targetAmount: z.number().positive('Target amount must be positive'),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Target date must be in YYYY-MM-DD format'),
  category: z.enum(['emergency', 'vacation', 'home', 'car', 'wedding', 'education', 'retirement', 'custom']),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  photoUrl: z.string().url('Photo URL must be a valid URL').optional(),
  framingType: z.enum(['achievement', 'loss-avoidance']).optional(),
  lossAvoidanceDescription: z.string().optional(),
  achievementDescription: z.string().optional(),
});

const updateGoalSchema = goalSchema.partial().extend({
  id: z.string().uuid('Invalid goal ID'),
});

const milestoneSchema = z.object({
  amount: z.number().positive('Milestone amount must be positive'),
  description: z.string().min(1, 'Milestone description is required'),
});

export const GET = requireAuth(async (request: NextRequest) => {
  try {
    const user = (request as any).user;
    const { searchParams } = new URL(request.url);
    
    const includeInactive = searchParams.get('includeInactive') === 'true';
    const category = searchParams.get('category');
    const priority = searchParams.get('priority');
    
    const conditions = ['g.user_id = $1'];
    const params = [user.id];
    let paramIndex = 2;

    if (!includeInactive) {
      conditions.push('g.is_active = true');
    }

    if (category) {
      conditions.push(`g.category = $${paramIndex}`);
      params.push(category);
      paramIndex++;
    }

    if (priority) {
      conditions.push(`g.priority = $${paramIndex}`);
      params.push(priority);
      paramIndex++;
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;
    
    const result = await query(
      `SELECT g.*, 
        COALESCE(
          json_agg(
            json_build_object(
              'id', m.id,
              'amount', m.amount,
              'description', m.description,
              'isCompleted', m.is_completed,
              'completedDate', m.completed_date
            ) ORDER BY m.amount ASC, m.created_at ASC
          ) FILTER (WHERE m.id IS NOT NULL),
          '[]'::json
        ) as milestones
      FROM savings_goals g
      LEFT JOIN milestones m ON g.id = m.goal_id
      ${whereClause}
      GROUP BY g.id
      ORDER BY g.priority DESC, g.created_at DESC`,
      params
    );

    return NextResponse.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Get goals error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch goals' },
      { status: 500 }
    );
  }
});

export const POST = requireAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const goalData = goalSchema.parse(body);
    const user = (request as any).user;

    // Validate target date is in the future
    const targetDate = new Date(goalData.targetDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (targetDate <= today) {
      return NextResponse.json(
        { error: 'Target date must be in the future' },
        { status: 400 }
      );
    }

    const result = await query(
      `INSERT INTO savings_goals (user_id, name, description, target_amount, target_date, category, priority, photo_url, framing_type, loss_avoidance_description, achievement_description)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [user.id, goalData.name, goalData.description || null, goalData.targetAmount,
       goalData.targetDate, goalData.category, goalData.priority || 'medium',
       goalData.photoUrl || null, goalData.framingType || null,
       goalData.lossAvoidanceDescription || null, goalData.achievementDescription || null]
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Create goal error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create goal' },
      { status: 500 }
    );
  }
});

export const PUT = requireAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const updateData = updateGoalSchema.parse(body);
    const user = (request as any).user;

    // Check if goal exists and belongs to user
    const existingGoal = await query(
      'SELECT id FROM savings_goals WHERE id = $1 AND user_id = $2',
      [updateData.id, user.id]
    );

    if (existingGoal.rows.length === 0) {
      return NextResponse.json(
        { error: 'Goal not found' },
        { status: 404 }
      );
    }

    // Validate target date if being updated
    if (updateData.targetDate) {
      const targetDate = new Date(updateData.targetDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (targetDate <= today) {
        return NextResponse.json(
          { error: 'Target date must be in the future' },
          { status: 400 }
        );
      }
    }

    // Update goal fields
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    if (updateData.name) {
      updateFields.push(`name = $${paramIndex++}`);
      updateValues.push(updateData.name);
    }
    if (updateData.description !== undefined) {
      updateFields.push(`description = $${paramIndex++}`);
      updateValues.push(updateData.description);
    }
    if (updateData.targetAmount) {
      updateFields.push(`target_amount = $${paramIndex++}`);
      updateValues.push(updateData.targetAmount);
    }
    if (updateData.targetDate) {
      updateFields.push(`target_date = $${paramIndex++}`);
      updateValues.push(updateData.targetDate);
    }
    if (updateData.category) {
      updateFields.push(`category = $${paramIndex++}`);
      updateValues.push(updateData.category);
    }
    if (updateData.priority) {
      updateFields.push(`priority = $${paramIndex++}`);
      updateValues.push(updateData.priority);
    }
    if (updateData.photoUrl !== undefined) {
      updateFields.push(`photo_url = $${paramIndex++}`);
      updateValues.push(updateData.photoUrl);
    }
    if (updateData.framingType !== undefined) {
      updateFields.push(`framing_type = $${paramIndex++}`);
      updateValues.push(updateData.framingType);
    }
    if (updateData.lossAvoidanceDescription !== undefined) {
      updateFields.push(`loss_avoidance_description = $${paramIndex++}`);
      updateValues.push(updateData.lossAvoidanceDescription);
    }
    if (updateData.achievementDescription !== undefined) {
      updateFields.push(`achievement_description = $${paramIndex++}`);
      updateValues.push(updateData.achievementDescription);
    }

    if (updateFields.length > 0) {
      updateValues.push(updateData.id, user.id);
      await query(
        `UPDATE savings_goals 
         SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}`,
        updateValues
      );
    }

    return NextResponse.json({
      success: true,
      data: { message: 'Goal updated successfully' }
    });

  } catch (error) {
    console.error('Update goal error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update goal' },
      { status: 500 }
    );
  }
});

export const DELETE = requireAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const goalId = searchParams.get('id');
    const user = (request as any).user;

    if (!goalId) {
      return NextResponse.json(
        { error: 'Goal ID is required' },
        { status: 400 }
      );
    }

    // Check if goal exists and belongs to user
    const existingGoal = await query(
      'SELECT id FROM savings_goals WHERE id = $1 AND user_id = $2',
      [goalId, user.id]
    );

    if (existingGoal.rows.length === 0) {
      return NextResponse.json(
        { error: 'Goal not found' },
        { status: 404 }
      );
    }

    // Soft delete by setting is_active to false
    await query(
      'UPDATE savings_goals SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND user_id = $2',
      [goalId, user.id]
    );

    return NextResponse.json({
      success: true,
      data: { message: 'Goal deleted successfully' }
    });

  } catch (error) {
    console.error('Delete goal error:', error);
    return NextResponse.json(
      { error: 'Failed to delete goal' },
      { status: 500 }
    );
  }
});

// Add milestone to a goal
export const PATCH = requireAuth(async (request: NextRequest) => {
  try {
    const body = await request.json() as { goalId: string; milestone: any };
    const { goalId, milestone } = body;
    
    if (!goalId || !milestone) {
      return NextResponse.json(
        { error: 'Goal ID and milestone data are required' },
        { status: 400 }
      );
    }

    const user = (request as any).user;

    // Validate milestone data
    const milestoneData = milestoneSchema.parse(milestone);

    // Atomically: (1) cap-check + update goal; (2) insert milestone only if (1) succeeded.
    const result = await query(
      `WITH updated AS (
         UPDATE savings_goals
            SET current_amount = current_amount + $2,
                updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
            AND user_id = $3
            AND (current_amount + $2) <= target_amount
          RETURNING id
       )
       INSERT INTO milestones (goal_id, amount, description)
       SELECT $1, $2, $4
         FROM updated
       RETURNING *`,
      [goalId, milestoneData.amount, user.id, milestoneData.description]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Goal not found or milestone amount would exceed target amount' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Add milestone error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to add milestone' },
      { status: 500 }
    );
  }
});
