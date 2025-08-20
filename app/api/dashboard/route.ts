import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { requireAuth } from '@/lib/auth-middleware';

export const GET = requireAuth(async (request: NextRequest) => {
  try {
    const user = (request as any).user;
    const { searchParams } = new URL(request.url);
    
    // Get date range from query params or default to current month
    const startDate = searchParams.get('startDate') || new Date().toISOString().slice(0, 7) + '-01';
    const endDate = searchParams.get('endDate') || new Date().toISOString().slice(0, 10);
    
    // Get current month's data
    const currentDate = new Date();
    const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    // Get budget summary for current month
    const budgetResult = await query(
      `SELECT 
        COALESCE(SUM(bc.allocated), 0) as total_allocated,
        COALESCE(SUM(bc.spent), 0) as total_spent,
        COALESCE(SUM(bc.allocated - bc.spent), 0) as total_remaining,
        COUNT(DISTINCT b.id) as active_budgets
      FROM budgets b
      LEFT JOIN budget_categories bc ON b.id = bc.budget_id
      WHERE b.user_id = $1 AND b.start_date <= $2 AND b.end_date >= $3`,
      [user.id, monthEnd.toISOString().split('T')[0], monthStart.toISOString().split('T')[0]]
    );

    // Get monthly transactions summary
    const transactionsResult = await query(
      `SELECT 
        type,
        SUM(amount) as total_amount,
        COUNT(*) as count
      FROM transactions 
      WHERE user_id = $1 AND date >= $2 AND date <= $3
      GROUP BY type`,
      [user.id, monthStart.toISOString().split('T')[0], monthEnd.toISOString().split('T')[0]]
    );

    // Get active goals summary
    const goalsResult = await query(
      `SELECT 
        COUNT(*) as total_goals,
        SUM(CASE WHEN current_amount >= target_amount THEN 1 ELSE 0 END) as completed_goals,
        SUM(target_amount - current_amount) as remaining_amount,
        AVG(CASE WHEN is_active THEN (current_amount / target_amount) * 100 ELSE 0 END) as avg_progress
      FROM savings_goals 
      WHERE user_id = $1 AND is_active = true`,
      [user.id]
    );

    // Get recent transactions
    const recentTransactionsResult = await query(
      `SELECT t.*, bc.name as budget_category_name, bc.color as budget_category_color
       FROM transactions t
       LEFT JOIN budget_categories bc ON t.budget_category_id = bc.id
       WHERE t.user_id = $1
       ORDER BY t.date DESC, t.created_at DESC
       LIMIT 5`,
      [user.id]
    );

    // Get spending by category for current month
    const categorySpendingResult = await query(
      `SELECT 
        category,
        SUM(amount) as total_amount,
        COUNT(*) as count,
        AVG(amount) as avg_amount
      FROM transactions 
      WHERE user_id = $1 AND type = 'expense' AND date >= $2 AND date <= $3
      GROUP BY category
      ORDER BY total_amount DESC
      LIMIT 10`,
      [user.id, monthStart.toISOString().split('T')[0], monthEnd.toISOString().split('T')[0]]
    );

    // Get budget vs actual spending
    const budgetVsActualResult = await query(
      `SELECT 
        bc.name as category_name,
        bc.allocated,
        bc.spent,
        bc.allocated - bc.spent as remaining,
        CASE 
          WHEN bc.allocated > 0 THEN (bc.spent / bc.allocated) * 100 
          ELSE 0 
        END as percentage_used,
        bc.color
      FROM budget_categories bc
      JOIN budgets b ON bc.budget_id = b.id
      WHERE b.user_id = $1 AND b.start_date <= $2 AND b.end_date >= $3
      ORDER BY bc.allocated DESC`,
      [user.id, monthEnd.toISOString().split('T')[0], monthStart.toISOString().split('T')[0]]
    );

    // Get savings trend (last 6 months)
    const savingsTrendResult = await query(
      `SELECT 
        DATE_TRUNC('month', date) as month,
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expenses,
        SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END) as savings
      FROM transactions 
      WHERE user_id = $1 AND date >= $2
      GROUP BY DATE_TRUNC('month', date)
      ORDER BY month DESC
      LIMIT 6`,
      [user.id, new Date(currentDate.getFullYear(), currentDate.getMonth() - 5, 1).toISOString().split('T')[0]]
    );

    // Get upcoming goals (target date within next 3 months)
    const upcomingGoalsResult = await query(
      `SELECT 
        name,
        target_amount,
        current_amount,
        target_date,
        (target_amount - current_amount) as remaining,
        CASE 
          WHEN target_amount > 0 THEN (current_amount / target_amount) * 100 
          ELSE 0 
        END as progress
      FROM savings_goals 
      WHERE user_id = $1 AND is_active = true AND target_date <= $2
      ORDER BY target_date ASC
      LIMIT 5`,
      [user.id, new Date(currentDate.getFullYear(), currentDate.getMonth() + 3, 0).toISOString().split('T')[0]]
    );

    const dashboardData = {
      budget: budgetResult.rows[0] || { 
        total_allocated: 0, 
        total_spent: 0, 
        total_remaining: 0, 
        active_budgets: 0 
      },
      transactions: {
        income: transactionsResult.rows.find(r => r.type === 'income') || { total_amount: 0, count: 0 },
        expense: transactionsResult.rows.find(r => r.type === 'expense') || { total_amount: 0, count: 0 }
      },
      goals: goalsResult.rows[0] || { 
        total_goals: 0, 
        completed_goals: 0, 
        remaining_amount: 0, 
        avg_progress: 0 
      },
      recentTransactions: recentTransactionsResult.rows,
      categorySpending: categorySpendingResult.rows,
      budgetVsActual: budgetVsActualResult.rows,
      savingsTrend: savingsTrendResult.rows,
      upcomingGoals: upcomingGoalsResult.rows,
      dateRange: {
        start: monthStart.toISOString().split('T')[0],
        end: monthEnd.toISOString().split('T')[0]
      }
    };

    return NextResponse.json({
      success: true,
      data: dashboardData
    });

  } catch (error) {
    console.error('Dashboard error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
});
