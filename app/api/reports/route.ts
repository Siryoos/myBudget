import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { requireAuth } from '@/lib/auth-middleware';
import type { AuthenticatedRequest } from '@/types/auth';

export const GET = requireAuth(async (request: AuthenticatedRequest) => {
  try {
    const user = request.user;
    const { searchParams } = new URL(request.url);
    
    const reportType = searchParams.get('type') || 'monthly';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Start date and end date are required' },
        { status: 400 }
      );
    }

    let reportData: any = {};

    switch (reportType) {
      case 'monthly':
        reportData = await generateMonthlyReport(user.id, startDate, endDate);
        break;
      case 'category':
        reportData = await generateCategoryReport(user.id, startDate, endDate);
        break;
      case 'trends':
        reportData = await generateTrendsReport(user.id, startDate, endDate);
        break;
      case 'budget':
        reportData = await generateBudgetReport(user.id, startDate, endDate);
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid report type. Supported types: monthly, category, trends, budget' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: {
        reportType,
        dateRange: { startDate, endDate },
        ...reportData
      }
    });

  } catch (error) {
    console.error('Generate report error:', error);
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
});

async function generateMonthlyReport(userId: string, startDate: string, endDate: string) {
  // Monthly income vs expenses
  const monthlyResult = await query(
    `SELECT 
      DATE_TRUNC('month', date) as month,
      SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
      SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expenses,
      SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END) as net_savings,
      COUNT(*) as transaction_count
    FROM transactions 
    WHERE user_id = $1 AND date >= $2 AND date <= $3
    GROUP BY DATE_TRUNC('month', date)
    ORDER BY month`,
    [userId, startDate, endDate]
  );

  // Top spending categories
  const topCategoriesResult = await query(
    `SELECT 
      category,
      SUM(amount) as total_spent,
      COUNT(*) as transaction_count,
      AVG(amount) as avg_amount
    FROM transactions 
    WHERE user_id = $1 AND type = 'expense' AND date >= $2 AND date <= $3
    GROUP BY category
    ORDER BY total_spent DESC
    LIMIT 10`,
    [userId, startDate, endDate]
  );

  return {
    monthlyData: monthlyResult.rows,
    topCategories: topCategoriesResult.rows
  };
}

async function generateCategoryReport(userId: string, startDate: string, endDate: string) {
  // Spending by category with budget comparison
  const categoryResult = await query(
    `SELECT 
      t.category,
      SUM(t.amount) as actual_spent,
      COUNT(t.id) as transaction_count,
      AVG(t.amount) as avg_amount,
      MAX(t.date) as last_transaction,
      MIN(t.date) as first_transaction
    FROM transactions t
    WHERE t.user_id = $1 AND t.type = 'expense' AND t.date >= $2 AND t.date <= $3
    GROUP BY t.category
    ORDER BY actual_spent DESC`,
    [userId, startDate, endDate]
  );

  // Category spending trends
  const trendsResult = await query(
    `SELECT 
      category,
      DATE_TRUNC('month', date) as month,
      SUM(amount) as monthly_spent
    FROM transactions 
    WHERE user_id = $1 AND type = 'expense' AND date >= $2 AND date <= $3
    GROUP BY category, DATE_TRUNC('month', date)
    ORDER BY category, month`,
    [userId, startDate, endDate]
  );

  return {
    categoryBreakdown: categoryResult.rows,
    categoryTrends: trendsResult.rows
  };
}

async function generateTrendsReport(userId: string, startDate: string, endDate: string) {
  // Daily spending trends
  const dailyTrendsResult = await query(
    `SELECT 
      date,
      SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as daily_income,
      SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as daily_expenses,
      SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END) as daily_savings
    FROM transactions 
    WHERE user_id = $1 AND date >= $2 AND date <= $3
    GROUP BY date
    ORDER BY date`,
    [userId, startDate, endDate]
  );

  // Weekly averages
  const weeklyAveragesResult = await query(
    `SELECT 
      DATE_TRUNC('week', date) as week_start,
      AVG(daily_income) as avg_weekly_income,
      AVG(daily_expenses) as avg_weekly_expenses,
      AVG(daily_savings) as avg_weekly_savings
    FROM (
      SELECT 
        date,
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as daily_income,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as daily_expenses,
        SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END) as daily_savings
      FROM transactions 
      WHERE user_id = $1 AND date >= $2 AND date <= $3
      GROUP BY date
    ) daily_totals
    GROUP BY DATE_TRUNC('week', date)
    ORDER BY week_start`,
    [userId, startDate, endDate]
  );

  return {
    dailyTrends: dailyTrendsResult.rows,
    weeklyAverages: weeklyAveragesResult.rows
  };
}

async function generateBudgetReport(userId: string, startDate: string, endDate: string) {
  // Budget vs actual spending
  const budgetVsActualResult = await query(
    `SELECT 
      b.name as budget_name,
      bc.name as category_name,
      bc.allocated,
      COALESCE(SUM(t.amount), 0) as actual_spent,
      bc.allocated - COALESCE(SUM(t.amount), 0) as remaining,
      CASE 
        WHEN bc.allocated > 0 THEN (COALESCE(SUM(t.amount), 0) / bc.allocated) * 100 
        ELSE 0 
      END as percentage_used,
      bc.color
    FROM budgets b
    JOIN budget_categories bc ON b.id = bc.budget_id
    LEFT JOIN transactions t ON bc.id = t.budget_category_id AND t.type = 'expense' AND t.date >= $2 AND t.date <= $3
    WHERE b.user_id = $1 AND b.start_date <= $3 AND b.end_date >= $2
    GROUP BY b.id, b.name, bc.id, bc.name, bc.allocated, bc.color
    ORDER BY b.name, bc.allocated DESC`,
    [userId, startDate, endDate]
  );

  // Budget performance summary
  const budgetSummaryResult = await query(
    `SELECT 
      b.name as budget_name,
      SUM(bc.allocated) as total_allocated,
      COALESCE(SUM(t.amount), 0) as total_spent,
      SUM(bc.allocated) - COALESCE(SUM(t.amount), 0) as total_remaining,
      CASE 
        WHEN SUM(bc.allocated) > 0 THEN (COALESCE(SUM(t.amount), 0) / SUM(bc.allocated)) * 100 
        ELSE 0 
      END as overall_percentage_used
    FROM budgets b
    JOIN budget_categories bc ON b.id = bc.budget_id
    LEFT JOIN transactions t ON bc.id = t.budget_category_id AND t.type = 'expense' AND t.date >= $2 AND t.date <= $3
    WHERE b.user_id = $1 AND b.start_date <= $3 AND b.end_date >= $2
    GROUP BY b.id, b.name
    ORDER BY total_allocated DESC`,
    [userId, startDate, endDate]
  );

  return {
    budgetVsActual: budgetVsActualResult.rows,
    budgetSummary: budgetSummaryResult.rows
  };
}
