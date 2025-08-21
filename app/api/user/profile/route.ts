import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { requireAuth } from '@/lib/auth-middleware';
import { z } from 'zod';
import type { AuthenticatedRequest } from '@/types/auth';

const profileUpdateSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  currency: z.string().length(3, 'Currency must be 3 characters').optional(),
  language: z.string().length(2, 'Language must be 2 characters').optional(),
  timezone: z.string().optional(),
  dateFormat: z.string().optional(),
  monthlyIncome: z.number().positive('Monthly income must be positive').optional(),
  riskTolerance: z.enum(['conservative', 'moderate', 'aggressive']).optional(),
  savingsRate: z.number().min(0, 'Savings rate must be non-negative').max(100, 'Savings rate cannot exceed 100%').optional(),
  debtToIncomeRatio: z.number().min(0, 'Debt to income ratio must be non-negative').optional(),
  creditScore: z.number().min(300, 'Credit score must be at least 300').max(850, 'Credit score cannot exceed 850').optional(),
  dependents: z.number().min(0, 'Dependents must be non-negative').optional(),
});

export const GET = requireAuth(async (request: AuthenticatedRequest) => {
  try {
    const user = request.user;
    
    const result = await query(
      `SELECT 
        id, email, name, avatar, currency, language, timezone, date_format,
        monthly_income, risk_tolerance, savings_rate, debt_to_income_ratio, 
        credit_score, dependents, created_at, updated_at
      FROM users 
      WHERE id = $1`,
      [user.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Get profile error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
});

export const PUT = requireAuth(async (request: AuthenticatedRequest) => {
  try {
    const body = await request.json();
    const updateData = profileUpdateSchema.parse(body);
    const user = request.user;

    // Build update query dynamically
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    if (updateData.name) {
      updateFields.push(`name = $${paramIndex++}`);
      updateValues.push(updateData.name);
    }
    if (updateData.currency) {
      updateFields.push(`currency = $${paramIndex++}`);
      updateValues.push(updateData.currency);
    }
    if (updateData.language) {
      updateFields.push(`language = $${paramIndex++}`);
      updateValues.push(updateData.language);
    }
    if (updateData.timezone) {
      updateFields.push(`timezone = $${paramIndex++}`);
      updateValues.push(updateData.timezone);
    }
    if (updateData.dateFormat) {
      updateFields.push(`date_format = $${paramIndex++}`);
      updateValues.push(updateData.dateFormat);
    }
    if (updateData.monthlyIncome !== undefined) {
      updateFields.push(`monthly_income = $${paramIndex++}`);
      updateValues.push(updateData.monthlyIncome);
    }
    if (updateData.riskTolerance) {
      updateFields.push(`risk_tolerance = $${paramIndex++}`);
      updateValues.push(updateData.riskTolerance);
    }
    if (updateData.savingsRate !== undefined) {
      updateFields.push(`savings_rate = $${paramIndex++}`);
      updateValues.push(updateData.savingsRate);
    }
    if (updateData.debtToIncomeRatio !== undefined) {
      updateFields.push(`debt_to_income_ratio = $${paramIndex++}`);
      updateValues.push(updateData.debtToIncomeRatio);
    }
    if (updateData.creditScore !== undefined) {
      updateFields.push(`credit_score = $${paramIndex++}`);
      updateValues.push(updateData.creditScore);
    }
    if (updateData.dependents !== undefined) {
      updateFields.push(`dependents = $${paramIndex++}`);
      updateValues.push(updateData.dependents);
    }

    if (updateFields.length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    // Add user ID to update values
    updateValues.push(user.id);

    // Update user profile
    await query(
      `UPDATE users SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramIndex}`,
      updateValues
    );

    // Fetch updated profile
    const result = await query(
      `SELECT 
        id, email, name, avatar, currency, language, timezone, date_format,
        monthly_income, risk_tolerance, savings_rate, debt_to_income_ratio, 
        credit_score, dependents, created_at, updated_at
      FROM users 
      WHERE id = $1`,
      [user.id]
    );

    return NextResponse.json({
      success: true,
      data: {
        message: 'Profile updated successfully',
        profile: result.rows[0]
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
});

export const PATCH = requireAuth(async (request: AuthenticatedRequest) => {
  try {
    const body = await request.json() as { avatar: string };
    const { avatar } = body;
    const user = request.user;

    if (!avatar) {
      return NextResponse.json(
        { error: 'Avatar URL is required' },
        { status: 400 }
      );
    }

    // Validate avatar URL
    try {
      new URL(avatar);
    } catch {
      return NextResponse.json(
        { error: 'Invalid avatar URL' },
        { status: 400 }
      );
    }

    // Update avatar
    await query(
      'UPDATE users SET avatar = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [avatar, user.id]
    );

    return NextResponse.json({
      success: true,
      data: { message: 'Avatar updated successfully' }
    });

  } catch (error) {
    console.error('Update avatar error:', error);
    return NextResponse.json(
      { error: 'Failed to update avatar' },
      { status: 500 }
    );
  }
});
