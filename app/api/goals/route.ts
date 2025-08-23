import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { requireAuth } from '@/lib/auth-middleware';
import { query, withTransaction } from '@/lib/database';
import type { SavingsGoal, GoalCategory } from '@/types';
import type { AuthenticatedRequest } from '@/types/auth';

// Validation schemas
const createGoalSchema = z.object({
  name: z.string().min(1, 'Goal name is required').max(100, 'Goal name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  targetAmount: z.number().positive('Target amount must be positive'),
  targetDate: z.string().datetime('Invalid target date'),
  category: z.enum(['emergency', 'vacation', 'home', 'car', 'wedding', 'education', 'retirement', 'custom'] as const),
  priority: z.enum(['low', 'medium', 'high'] as const).default('medium'),
  icon: z.string().optional(),
  color: z.string().optional(),
  framingType: z.enum(['achievement', 'loss-avoidance']).optional(),
  lossAvoidanceDescription: z.string().max(200).optional(),
  achievementDescription: z.string().max(200).optional(),
  photoUrl: z.string().url('Invalid photo URL').optional(),
});

const updateGoalSchema = createGoalSchema.partial();

const goalQuerySchema = z.object({
  priority: z.enum(['low', 'medium', 'high']).optional(),
  category: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const GET = requireAuth(async (request: AuthenticatedRequest) => {
  try {
    const user = request.user;
    const { searchParams } = new URL(request.url);

    // Parse and validate query parameters
    const queryParams = goalQuerySchema.parse(Object.fromEntries(searchParams));

    let sql = `
      SELECT 
        id, name, description, target_amount as "targetAmount", 
        current_amount as "currentAmount", target_date as "targetDate",
        category, priority, is_active as "isActive", 
        framing_type as "framingType", loss_avoidance_description as "lossAvoidanceDescription",
        achievement_description as "achievementDescription", photo_url as "photoUrl",
        icon, color, created_at as "createdAt", updated_at as "updatedAt"
      FROM savings_goals 
      WHERE user_id = $1
    `;

    const params: (string | boolean | number)[] = [user.id];
    let paramIndex = 2;

    if (queryParams.priority) {
      sql += ` AND priority = $${paramIndex}`;
      params.push(queryParams.priority);
      paramIndex++;
    }

    if (queryParams.category) {
      sql += ` AND category = $${paramIndex}`;
      params.push(queryParams.category);
      paramIndex++;
    }

    if (queryParams.isActive !== undefined) {
      sql += ` AND is_active = $${paramIndex}`;
      params.push(queryParams.isActive);
      paramIndex++;
    }

    sql += ' ORDER BY priority DESC, created_at DESC';

    const result = await query(sql, params);

    // Parse dates and transform data
    const goals: SavingsGoal[] = result.rows.map(row => ({
      ...row,
      targetDate: new Date(row.targetDate),
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
      milestones: [], // Will be populated separately if needed
    }));

    return NextResponse.json({
      success: true,
      data: goals,
      count: goals.length,
    });

  } catch (error) {
    console.error('Failed to fetch goals:', error);

    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 },
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to fetch goals' },
      { status: 500 },
    );
  }
});

export const POST = requireAuth(async (request: AuthenticatedRequest) => {
  try {
    const user = request.user;
    const body = await request.json();

    // Validate request body
    const validatedData = createGoalSchema.parse(body);

    // Create goal with transaction
    const result = await withTransaction(async (client) => {
      const sql = `
        INSERT INTO savings_goals (
          user_id, name, description, target_amount, target_date, 
          category, priority, is_active, icon, color, framing_type,
          loss_avoidance_description, achievement_description, photo_url
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING 
          id, name, description, target_amount as "targetAmount",
          current_amount as "currentAmount", target_date as "targetDate",
          category, priority, is_active as "isActive",
          framing_type as "framingType", loss_avoidance_description as "lossAvoidanceDescription",
          achievement_description as "achievementDescription", photo_url as "photoUrl",
          icon, color, created_at as "createdAt", updated_at as "updatedAt"
      `;

      const values = [
        user.id,
        validatedData.name,
        validatedData.description || null,
        validatedData.targetAmount,
        validatedData.targetDate,
        validatedData.category,
        validatedData.priority,
        true, // isActive
        validatedData.icon || null,
        validatedData.color || null,
        validatedData.framingType || null,
        validatedData.lossAvoidanceDescription || null,
        validatedData.achievementDescription || null,
        validatedData.photoUrl || null,
      ];

      const result = await client.query(sql, values);
      const goal = result.rows[0];

      // Create default milestones
      const milestoneSql = `
        INSERT INTO milestones (goal_id, amount, description, is_completed)
        VALUES ($1, $2, $3, false), ($1, $4, $5, false), ($1, $6, $7, false), ($1, $8, $9, false)
      `;

      const milestoneValues = [
        goal.id,
        Math.round(validatedData.targetAmount * 0.25),
        '25% of goal',
        Math.round(validatedData.targetAmount * 0.5),
        '50% of goal',
        Math.round(validatedData.targetAmount * 0.75),
        '75% of goal',
        validatedData.targetAmount,
        '100% of goal',
      ];

      await client.query(milestoneSql, milestoneValues);

      return {
        ...goal,
        targetDate: new Date(goal.targetDate),
        createdAt: new Date(goal.createdAt),
        updatedAt: new Date(goal.updatedAt),
        milestones: [], // Will be populated separately if needed
      };
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Goal created successfully',
    });

  } catch (error) {
    console.error('Failed to create goal:', error);

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
      { success: false, error: 'Failed to create goal' },
      { status: 500 },
    );
  }
});
