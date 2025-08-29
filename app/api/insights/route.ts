import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { requireAuth } from '@/lib/auth-middleware';
import { query } from '@/lib/database';
import type { FinancialInsight, Notification } from '@/types';
import type { AuthenticatedRequest } from '@/types/auth';
import { HTTP_BAD_REQUEST, HTTP_INTERNAL_SERVER_ERROR, HTTP_UNAUTHORIZED, HTTP_OK } from '@/lib/services/error-handler';

// Validation schema for query parameters
const insightsQuerySchema = z.object({
  type: z.enum(['insight', 'budget_alert', 'achievement', 'all']).optional().default('all'),
  category: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  isRead: z.boolean().optional(),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
  offset: z.coerce.number().min(0).optional().default(0),
});

export const GET = requireAuth(async (request: AuthenticatedRequest) => {
  try {
    const user = request.user;
    const { searchParams } = new URL(request.url);

    // Parse and validate query parameters
    const queryParams = insightsQuerySchema.parse(Object.fromEntries(searchParams));

    // Build the base query
    let sql = `
      SELECT 
        id, type, title, message, category, priority, is_read as "isRead",
        action_url as "actionUrl", action_data as "actionData",
        created_at as "createdAt", updated_at as "updatedAt"
      FROM notifications 
      WHERE user_id = $1
    `;

    const params: (string | boolean | number)[] = [user.id];
    let paramIndex = 2;

    // Add type filter
    if (queryParams.type !== 'all') {
      sql += ` AND type = $${paramIndex}`;
      params.push(queryParams.type);
      paramIndex++;
    }

    // Add category filter
    if (queryParams.category) {
      sql += ` AND category = $${paramIndex}`;
      params.push(queryParams.category);
      paramIndex++;
    }

    // Add priority filter
    if (queryParams.priority) {
      sql += ` AND priority = $${paramIndex}`;
      params.push(queryParams.priority);
      paramIndex++;
    }

    // Add read status filter
    if (queryParams.isRead !== undefined) {
      sql += ` AND is_read = $${paramIndex}`;
      params.push(queryParams.isRead);
      paramIndex++;
    }

    // Add ordering and pagination
    sql += ` ORDER BY 
      CASE priority 
        WHEN 'high' THEN 3 
        WHEN 'medium' THEN 2 
        WHEN 'low' THEN 1 
        ELSE 0 
      END DESC, 
      created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(queryParams.limit, queryParams.offset);

    // Execute query
    const result = await query(sql, params);

    // Transform notifications to insights format
    const insights: FinancialInsight[] = result.rows.map(row => ({
      id: row.id,
      type: row.type === 'budget_alert' ? 'budget-warning' : 'saving-opportunity',
      title: row.title,
      description: row.message,
      impact: (row.priority || 'medium') as 'low' | 'medium' | 'high',
      category: row.category || 'General',
      actionable: Boolean(row.actionUrl),
      actions: row.actionUrl ? [{
        id: '1',
        label: 'View Details',
        type: 'navigate' as const,
        target: row.actionUrl,
      }] : [],
      createdAt: new Date(row.createdAt),
      isRead: row.isRead,
      actionData: row.actionData ? JSON.parse(row.actionData) : undefined,
    }));

    // Get total count for pagination
    let countSql = `
      SELECT COUNT(*) as total
      FROM notifications 
      WHERE user_id = $1
    `;

    const countParams = [user.id];

    if (queryParams.type !== 'all') {
      countSql += ' AND type = $2';
      countParams.push(queryParams.type);
    }

    if (queryParams.category) {
      countSql += ` AND category = $${countParams.length + 1}`;
      countParams.push(queryParams.category);
    }

    if (queryParams.priority) {
      countSql += ` AND priority = $${countParams.length + 1}`;
      countParams.push(queryParams.priority);
    }

    if (queryParams.isRead !== undefined) {
      countSql += ` AND is_read = $${countParams.length + 1}`;
      countParams.push(queryParams.isRead.toString());
    }

    const countResult = await query(countSql, countParams);
    const total = parseInt(countResult.rows[0].total);

    return NextResponse.json({
      success: true,
      data: insights,
      pagination: {
        total,
        limit: queryParams.limit,
        offset: queryParams.offset,
        hasMore: queryParams.offset + queryParams.limit < total,
        totalPages: Math.ceil(total / queryParams.limit),
        currentPage: Math.floor(queryParams.offset / queryParams.limit) + 1,
      },
    });

  } catch (error) {
    console.error('Failed to fetch insights:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid query parameters', details: error.errors },
        { status: HTTP_BAD_REQUEST },
      );
    }

    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: HTTP_UNAUTHORIZED },
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to fetch insights' },
      { status: HTTP_INTERNAL_SERVER_ERROR },
    );
  }
});

export const POST = requireAuth(async (request: AuthenticatedRequest) => {
  try {
    const user = request.user;
    const body = await request.json();

    // Validate request body
    const createInsightSchema = z.object({
      type: z.enum(['insight', 'budget_alert', 'achievement']),
      title: z.string().min(1, 'Title is required').max(HTTP_OK, 'Title too long'),
      message: z.string().min(1, 'Message is required').max(1000, 'Message too long'),
      category: z.string().max(100, 'Category too long').optional(),
      priority: z.enum(['low', 'medium', 'high']).default('medium'),
      actionUrl: z.string().url('Invalid action URL').optional(),
      actionData: z.record(z.unknown()).optional(),
    });

    const validatedData = createInsightSchema.parse(body);

    // Insert new insight/notification
    const sql = `
      INSERT INTO notifications (
        user_id, type, title, message, category, priority, 
        action_url, action_data, is_read
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false)
      RETURNING 
        id, type, title, message, category, priority, is_read as "isRead",
        action_url as "actionUrl", action_data as "actionData",
        created_at as "createdAt", updated_at as "updatedAt"
    `;

    const values = [
      user.id,
      validatedData.type,
      validatedData.title,
      validatedData.message,
      validatedData.category || null,
      validatedData.priority,
      validatedData.actionUrl || null,
      validatedData.actionData ? JSON.stringify(validatedData.actionData) : null,
    ];

    const result = await query(sql, values);
    const insight = result.rows[0];

    return NextResponse.json({
      success: true,
      data: {
        ...insight,
        createdAt: new Date(insight.createdAt),
        updatedAt: new Date(insight.updatedAt),
      },
      message: 'Insight created successfully',
    });

  } catch (error) {
    console.error('Failed to create insight:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: error.errors },
        { status: HTTP_BAD_REQUEST },
      );
    }

    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: HTTP_UNAUTHORIZED },
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create insight' },
      { status: HTTP_INTERNAL_SERVER_ERROR },
    );
  }
});
