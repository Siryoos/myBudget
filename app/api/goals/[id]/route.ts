import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { requireAuth } from '@/lib/auth-middleware';
import { query, withTransaction } from '@/lib/database';
import type { SavingsGoal } from '@/types';
import type { AuthenticatedRequest } from '@/types/auth';

// Validation schema for updates
const updateGoalSchema = z.object({
  name: z.string().min(1, 'Goal name is required').max(100, 'Goal name too long').optional(),
  description: z.string().max(500, 'Description too long').optional(),
  targetAmount: z.number().positive('Target amount must be positive').optional(),
  targetDate: z.string().datetime('Invalid target date').optional(),
  category: z.enum(['emergency', 'vacation', 'home', 'car', 'wedding', 'education', 'retirement', 'custom'] as const).optional(),
  priority: z.enum(['low', 'medium', 'high'] as const).optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  framingType: z.enum(['achievement', 'loss-avoidance']).optional(),
  lossAvoidanceDescription: z.string().max(200).optional(),
  achievementDescription: z.string().max(200).optional(),
  photoUrl: z.string().url('Invalid photo URL').optional(),
  isActive: z.boolean().optional(),
});

export const GET = requireAuth(async (request: AuthenticatedRequest, context?: { params: { id: string } }) => {
  if (!context?.params) {
    return NextResponse.json(
      { success: false, error: 'Missing goal ID' },
      { status: 400 },
    );
  }
  const { params } = context;
  try {
    const user = request.user;
    const { id } = params;

    // Validate goal ID
    if (!id || !z.string().uuid().safeParse(id).success) {
      return NextResponse.json(
        { success: false, error: 'Invalid goal ID' },
        { status: 400 },
      );
    }

    // Fetch goal with milestones
    const goalSql = `
      SELECT 
        id, name, description, target_amount as "targetAmount", 
        current_amount as "currentAmount", target_date as "targetDate",
        category, priority, is_active as "isActive", 
        framing_type as "framingType", loss_avoidance_description as "lossAvoidanceDescription",
        achievement_description as "achievementDescription", photo_url as "photoUrl",
        icon, color, created_at as "createdAt", updated_at as "updatedAt"
      FROM savings_goals 
      WHERE id = $1 AND user_id = $2
    `;

    const goalResult = await query(goalSql, [id, user.id]);

    if (goalResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Goal not found' },
        { status: 404 },
      );
    }

    const goal = goalResult.rows[0];

    // Fetch milestones for this goal
    const milestonesSql = `
      SELECT 
        id, amount, description, is_completed as "isCompleted", 
        completed_date as "completedDate", created_at as "createdAt"
      FROM milestones 
      WHERE goal_id = $1 
      ORDER BY amount ASC
    `;

    const milestonesResult = await query(milestonesSql, [id]);

    // Transform and return goal with milestones
    const transformedGoal: SavingsGoal = {
      ...goal,
      targetDate: new Date(goal.targetDate),
      createdAt: new Date(goal.createdAt),
      updatedAt: new Date(goal.updatedAt),
      milestones: milestonesResult.rows.map(milestone => ({
        ...milestone,
        completedDate: milestone.completedDate ? new Date(milestone.completedDate) : undefined,
        createdAt: new Date(milestone.createdAt),
      })),
    };

    return NextResponse.json({
      success: true,
      data: transformedGoal,
    });

  } catch (error) {
    console.error('Failed to fetch goal:', error);

    return NextResponse.json(
      { success: false, error: 'Failed to fetch goal' },
      { status: 500 },
    );
  }
});

export const PUT = requireAuth(async (request: AuthenticatedRequest, context?: { params: { id: string } }) => {
  if (!context?.params) {
    return NextResponse.json(
      { success: false, error: 'Missing goal ID' },
      { status: 400 },
    );
  }
  const { params } = context;
  try {
    const user = request.user;
    const { id } = params;
    const body = await request.json();

    // Validate goal ID
    if (!id || !z.string().uuid().safeParse(id).success) {
      return NextResponse.json(
        { success: false, error: 'Invalid goal ID' },
        { status: 400 },
      );
    }

    // Validate request body
    const validatedData = updateGoalSchema.parse(body);

    // Check if goal exists and belongs to user
    const existingGoal = await query(
      'SELECT id FROM savings_goals WHERE id = $1 AND user_id = $2',
      [id, user.id],
    );

    if (existingGoal.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Goal not found' },
        { status: 404 },
      );
    }

    // Build update query dynamically
    const updateFields: string[] = [];
    const updateValues: (string | number | boolean | null)[] = [];
    let paramIndex = 1;

    Object.entries(validatedData).forEach(([key, value]) => {
      if (value !== undefined) {
        const dbKey = key === 'targetAmount' ? 'target_amount' :
                     key === 'targetDate' ? 'target_date' :
                     key === 'isActive' ? 'is_active' :
                     key === 'framingType' ? 'framing_type' :
                     key === 'lossAvoidanceDescription' ? 'loss_avoidance_description' :
                     key === 'achievementDescription' ? 'achievement_description' :
                     key === 'photoUrl' ? 'photo_url' : key;

        updateFields.push(`${dbKey} = $${paramIndex++}`);
        updateValues.push(value);
      }
    });

    if (updateFields.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No fields to update' },
        { status: 400 },
      );
    }

    // Add updated_at and WHERE clause parameters
    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    updateValues.push(id, user.id);

    const updateSql = `
      UPDATE savings_goals 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
      RETURNING 
        id, name, description, target_amount as "targetAmount",
        current_amount as "currentAmount", target_date as "targetDate",
        category, priority, is_active as "isActive",
        framing_type as "framingType", loss_avoidance_description as "lossAvoidanceDescription",
        achievement_description as "achievementDescription", photo_url as "photoUrl",
        icon, color, created_at as "createdAt", updated_at as "updatedAt"
    `;

    const result = await query(updateSql, updateValues);
    const updatedGoal = result.rows[0];

    return NextResponse.json({
      success: true,
      data: {
        ...updatedGoal,
        targetDate: new Date(updatedGoal.targetDate),
        createdAt: new Date(updatedGoal.createdAt),
        updatedAt: new Date(updatedGoal.updatedAt),
      },
      message: 'Goal updated successfully',
    });

  } catch (error) {
    console.error('Failed to update goal:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: error.errors },
        { status: 400 },
      );
    }

    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 },
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to update goal' },
      { status: 500 },
    );
  }
});

export const DELETE = requireAuth(async (request: AuthenticatedRequest, context?: { params: { id: string } }) => {
  if (!context?.params) {
    return NextResponse.json(
      { success: false, error: 'Missing goal ID' },
      { status: 400 },
    );
  }
  const { params } = context;
  try {
    const user = request.user;
    const { id } = params;

    // Validate goal ID
    if (!id || !z.string().uuid().safeParse(id).success) {
      return NextResponse.json(
        { success: false, error: 'Invalid goal ID' },
        { status: 400 },
      );
    }

    // Check if goal exists and belongs to user
    const existingGoal = await query(
      'SELECT id FROM savings_goals WHERE id = $1 AND user_id = $2',
      [id, user.id],
    );

    if (existingGoal.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Goal not found' },
        { status: 404 },
      );
    }

    // Soft delete by setting is_active to false
    await query(
      'UPDATE savings_goals SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND user_id = $2',
      [id, user.id],
    );

    return NextResponse.json({
      success: true,
      message: 'Goal deleted successfully',
    });

  } catch (error) {
    console.error('Failed to delete goal:', error);

    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 },
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to delete goal' },
      { status: 500 },
    );
  }
});
