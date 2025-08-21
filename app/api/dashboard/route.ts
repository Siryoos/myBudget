import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { requireAuth } from '@/lib/auth-middleware';
import type { DashboardData } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    
    // Fetch comprehensive dashboard data in parallel
    const [
      goalsResult,
      budgetsResult,
      achievementsResult,
      insightsResult,
      quickSaveResult
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
      `, [user.id])
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
    let budgetCategories: any[] = [];
    if (budgetsResult.rows.length > 0) {
      const budget = budgetsResult.rows[0];
      const categoriesResult = await query(`
        SELECT 
          name, allocated, spent, color, icon
        FROM budget_categories 
        WHERE budget_id = $1
        ORDER BY allocated DESC
      `, [budget.id]);
      
      budgetCategories = categoriesResult.rows.map(cat => ({
        ...cat,
        remaining: cat.allocated - cat.spent,
        utilization: cat.allocated > 0 ? (cat.spent / cat.allocated) * 100 : 0,
      }));
    }
    
    // Build dashboard data object
    const dashboardData: DashboardData = {
      goals: {
        active: goals.length,
        total: goals.length, // Could add inactive count if needed
        progress: overallProgress,
        totalTarget: totalTargetAmount,
        totalCurrent: totalCurrentAmount,
        recent: goals.slice(0, 3),
        byPriority: {
          high: goals.filter(g => g.priority === 'high').length,
          medium: goals.filter(g => g.priority === 'medium').length,
          low: goals.filter(g => g.priority === 'low').length,
        },
        byCategory: goals.reduce((acc, goal) => {
          acc[goal.category] = (acc[goal.category] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      },
      budget: budgetsResult.rows.length > 0 ? {
        ...budgetsResult.rows[0],
        startDate: new Date(budgetsResult.rows[0].startDate),
        endDate: new Date(budgetsResult.rows[0].endDate),
        categories: budgetCategories,
        totalAllocated: budgetCategories.reduce((sum, cat) => sum + cat.allocated, 0),
        totalSpent: budgetCategories.reduce((sum, cat) => sum + cat.spent, 0),
        totalRemaining: budgetCategories.reduce((sum, cat) => sum + cat.remaining, 0),
      } : null,
      achievements: {
        total: achievements.length,
        recent: achievements.slice(0, 3),
        totalPoints: achievements.reduce((sum, ach) => sum + ach.points, 0),
        byCategory: achievements.reduce((acc, achievement) => {
          acc[achievement.category] = (acc[achievement.category] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      },
      insights: {
        unread: insights.length,
        recent: insights.slice(0, 3),
        byPriority: {
          high: insights.filter(i => i.priority === 'high').length,
          medium: insights.filter(i => i.priority === 'medium').length,
          low: insights.filter(i => i.priority === 'low').length,
        },
        byCategory: insights.reduce((acc, insight) => {
          acc[insight.category || 'General'] = (acc[insight.category || 'General'] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      },
      quickSave: {
        total: totalQuickSaved,
        average: averageQuickSave,
        recent: quickSaves.slice(0, 5),
        bySource: quickSaves.reduce((acc, qs) => {
          acc[qs.source] = (acc[qs.source] || 0) + qs.amount;
          return acc;
        }, {} as Record<string, number>),
        byGoal: quickSaves.reduce((acc, qs) => {
          if (qs.goalId) {
            acc[qs.goalId] = (acc[qs.goalId] || 0) + qs.amount;
          }
          return acc;
        }, {} as Record<string, number>),
      },
      summary: {
        totalSavings: totalCurrentAmount,
        monthlyProgress: overallProgress,
        activeGoals: goals.length,
        unreadInsights: insights.length,
        recentAchievements: achievements.length,
        quickSaveTotal: totalQuickSaved,
      }
    };
    
    return NextResponse.json({
      success: true,
      data: dashboardData
    });
    
  } catch (error) {
    console.error('Failed to fetch dashboard data:', error);
    
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
