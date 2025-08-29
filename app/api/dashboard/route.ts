import { NextRequest, NextResponse } from 'next/server';

import { requireAuth } from '@/lib/auth-middleware';
import { query } from '@/lib/database';
import type { DashboardData } from '@/types';
import type { AuthenticatedRequest } from '@/types/auth';
import { HTTP_UNAUTHORIZED, HTTP_INTERNAL_SERVER_ERROR } from '@/lib/services/error-handler';

export const GET = requireAuth(async (request: AuthenticatedRequest) => {
  try {
    const user = request.user;

    // Fetch comprehensive dashboard data in parallel
    const [
      goalsResult,
      budgetsResult,
      achievementsResult,
      insightsResult,
      quickSaveResult,
    ] = await Promise.all([
      // Get active goals with progress
      query(`
        SELECT 
          id, name, target_amount as "targetAmount", current_amount as "currentAmount",
          target_date as "targetDate", category, priority, is_active as "isActive"
        FROM savings_goals 
        WHERE user_id = $1 AND is_active = true
        ORDER BY priority DESC, created_at DESC
        LIMIT 5
      `, [user.id]),

      // Get budget summary
      query(`
        SELECT 
          id, name, total_income as "totalIncome", period,
          start_date as "startDate", end_date as "endDate"
        FROM budgets 
        WHERE user_id = $1 AND is_active = true
        ORDER BY created_at DESC
        LIMIT 1
      `, [user.id]),

      // Get recent achievements
      query(`
        SELECT 
          id, name, description, category, points, unlocked_date as "unlockedDate"
        FROM achievements 
        WHERE user_id = $1 AND is_unlocked = true
        ORDER BY unlocked_date DESC
        LIMIT 3
      `, [user.id]),

      // Get unread insights
      query(`
        SELECT 
          id, type, title, message, category, priority, created_at as "createdAt"
        FROM notifications 
        WHERE user_id = $1 AND is_read = false
        ORDER BY 
          CASE priority 
            WHEN 'high' THEN 3 
            WHEN 'medium' THEN 2 
            WHEN 'low' THEN 1 
            ELSE 0 
          END DESC, 
          created_at DESC
        LIMIT 5
      `, [user.id]),

      // Get recent quick saves
      query(`
        SELECT 
          id, amount, source, timestamp, goal_id as "goalId"
        FROM quick_saves 
        WHERE user_id = $1
        ORDER BY timestamp DESC
        LIMIT 10
      `, [user.id]),
    ]);

    // Calculate goal progress and statistics
    const goals = goalsResult.rows.map(goal => ({
      ...goal,
      targetDate: new Date(goal.targetDate),
      progress: goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0,
      remaining: Math.max(0, goal.targetAmount - goal.currentAmount),
      daysRemaining: Math.ceil((new Date(goal.targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
    }));

    // Calculate overall savings statistics
    const totalTargetAmount = goals.reduce((sum, goal) => sum + goal.targetAmount, 0);
    const totalCurrentAmount = goals.reduce((sum, goal) => sum + goal.currentAmount, 0);
    const overallProgress = totalTargetAmount > 0 ? (totalCurrentAmount / totalTargetAmount) * 100 : 0;

    // Transform insights
    const insights = insightsResult.rows.map(insight => ({
      ...insight,
      createdAt: new Date(insight.createdAt),
      type: insight.type === 'budget_alert' ? 'budget-warning' : 'saving-opportunity',
      impact: (insight.priority || 'medium') as 'low' | 'medium' | 'high',
    }));

    // Transform achievements
    const achievements = achievementsResult.rows.map(achievement => ({
      ...achievement,
      unlockedDate: new Date(achievement.unlockedDate),
    }));

    // Transform quick saves
    const quickSaves = quickSaveResult.rows.map(quickSave => ({
      ...quickSave,
      timestamp: new Date(quickSave.timestamp),
    }));

    // Calculate quick save statistics
    const totalQuickSaved = quickSaves.reduce((sum, qs) => sum + qs.amount, 0);
    const averageQuickSave = quickSaves.length > 0 ? totalQuickSaved / quickSaves.length : 0;

    // Get budget categories if budget exists
    interface BudgetCategory {
      id: number;
      name: string;
      allocated: number;
      spent: number;
      color: string;
      icon: string;
      remaining: number;
      utilization: number;
    }

    let budgetCategories: BudgetCategory[] = [];
    if (budgetsResult.rows.length > 0) {
      const budget = budgetsResult.rows[0];
      const categoriesResult = await query(`
        SELECT 
          id, name, allocated, spent, color, icon
        FROM budget_categories 
        WHERE budget_id = $1
        ORDER BY allocated DESC
      `, [budget.id]);

      budgetCategories = categoriesResult.rows.map(cat => ({
        id: cat.id,
        name: cat.name,
        allocated: cat.allocated,
        spent: cat.spent,
        color: cat.color,
        icon: cat.icon,
        remaining: cat.allocated - cat.spent,
        utilization: cat.allocated > 0 ? (cat.spent / cat.allocated) * 100 : 0,
      }));
    }

    // Calculate monthly budget from current budget
    const monthlyBudget = budgetsResult.rows.length > 0 ?
      budgetsResult.rows[0].totalAllocated || 0 : 0;

    // Calculate current month savings (from quick saves and goals)
    const currentMonth = new Date();
    const currentMonthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const currentMonthQuickSaves = quickSaves.filter(qs =>
      new Date(qs.timestamp) >= currentMonthStart,
    );
    const currentMonthSavings = currentMonthQuickSaves.reduce((sum, qs) => sum + qs.amount, 0);

    // Calculate previous month savings
    const previousMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
    const previousMonthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 0);
    const previousMonthQuickSaves = quickSaves.filter(qs => {
      const qsDate = new Date(qs.timestamp);
      return qsDate >= previousMonth && qsDate <= previousMonthEnd;
    });
    const previousMonthSavings = previousMonthQuickSaves.reduce((sum, qs) => sum + qs.amount, 0);

    // Calculate savings growth rate
    const savingsGrowthRate = previousMonthSavings > 0 ?
      ((currentMonthSavings - previousMonthSavings) / previousMonthSavings) * 100 : 0;

    // Get recent transactions (last 5)
    const recentTransactions = quickSaves.slice(0, 5).map(qs => ({
      id: qs.id,
      amount: qs.amount,
      timestamp: qs.timestamp,
      type: 'income' as const,
      category: 'savings',
      date: new Date(qs.timestamp),
    }));

    // Build dashboard data object
    const dashboardData: DashboardData = {
      totalSavings: totalCurrentAmount,
      monthlyBudget,
      currentMonthSavings,
      previousMonthSavings,
      annualSavingsGoal: totalTargetAmount,
      savingsGrowthRate: Math.round(savingsGrowthRate * 100) / 100, // Round to 2 decimal places
      recentTransactions,
      budgetProgress: budgetCategories.map(cat => ({
        category: cat.name,
        spent: cat.spent,
        budget: cat.allocated,
        percentage: cat.utilization,
      })),
      goals: goals.slice(0, 3),
      insights: insights.slice(0, 3),
    };

    return NextResponse.json({
      success: true,
      data: dashboardData,
    });

  } catch (error) {
    console.error('Failed to fetch dashboard data:', error);

    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: HTTP_UNAUTHORIZED },
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard data' },
      { status: HTTP_INTERNAL_SERVER_ERROR },
    );
  }
});
