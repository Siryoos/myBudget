import { useState, useEffect, useCallback } from 'react';

import type {
  FinancialInsight,
  SavingsGoal,
  DashboardData,
  Notification,
  ApiResponse,
} from '@/types';

import { apiClient } from './api-client';

// Hook for fetching insights with fallback
export function useInsights(fallbackData: FinancialInsight[] = []) {
  const [insights, setInsights] = useState<FinancialInsight[]>(fallbackData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch notifications as insights
      const response = await apiClient.getNotifications(true);

      if (response.success && response.data) {
        const apiInsights: FinancialInsight[] = response.data
          .filter(notif => notif.type === 'insight' || notif.type === 'budget_alert')
          .map(notif => ({
            id: notif.id,
            type: notif.type === 'budget_alert' ? 'budget-warning' : 'saving-opportunity',
            title: notif.title,
            description: notif.message,
            impact: (notif.priority || 'medium'),
            category: notif.category || 'General',
            actionable: Boolean(notif.actionUrl),
            actions: notif.actionUrl ? [{
              id: '1',
              label: 'View Details',
              type: 'navigate' as const,
              target: notif.actionUrl,
            }] : [],
            createdAt: new Date(notif.createdAt),
            isRead: notif.isRead,
          }));

        setInsights(apiInsights.length > 0 ? apiInsights : fallbackData);
      } else {
        setInsights(fallbackData);
      }
    } catch (err) {
      console.error('Failed to fetch insights:', err);
      setError(err instanceof Error ? err.message : 'Failed to load insights');
      setInsights(fallbackData);
    } finally {
      setLoading(false);
    }
  }, [fallbackData]);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  const dismissInsight = async (insightId: string) => {
    try {
      if (insightId.match(/^\d+$/)) {
        await apiClient.markNotificationRead(insightId);
        setInsights(prev => prev.filter(i => i.id !== insightId));
      }
    } catch (err) {
      console.error('Failed to dismiss insight:', err);
    }
  };

  return { insights, loading, error, refetch: fetchInsights, dismissInsight };
}

// Hook for fetching dashboard data
export function useDashboardData() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.getDashboard();

      if (response.success && response.data) {
        setData({
          ...response.data,
          totalSavings: response.data.totalSavings || 0,
          monthlyBudget: response.data.monthlyBudget || 0,
          currentMonthSavings: response.data.currentMonthSavings || 0,
          previousMonthSavings: response.data.previousMonthSavings || 0,
          annualSavingsGoal: response.data.annualSavingsGoal || 0,
          savingsGrowthRate: response.data.savingsGrowthRate || 0,
          recentTransactions: response.data.recentTransactions || [],
          budgetProgress: response.data.budgetProgress || [],
          goals: response.data.goals || [],
          insights: response.data.insights || [],
        });
      } else {
        throw new Error('Failed to load dashboard data');
      }
    } catch (err) {
      console.error('Failed to fetch dashboard:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  return { data, loading, error, refetch: fetchDashboard };
}

// Hook for fetching goals
export function useGoals(priority?: 'low' | 'medium' | 'high') {
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGoals = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.getGoals(priority);

      if (response.success && response.data) {
        setGoals(response.data);
      } else {
        throw new Error('Failed to load goals');
      }
    } catch (err) {
      console.error('Failed to fetch goals:', err);
      setError(err instanceof Error ? err.message : 'Failed to load goals');
    } finally {
      setLoading(false);
    }
  }, [priority]);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  const createGoal = async (goalData: Partial<SavingsGoal>) => {
    try {
      const response = await apiClient.createGoal({
        name: goalData.name || '',
        description: goalData.description,
        targetAmount: goalData.targetAmount || 0,
        targetDate: goalData.targetDate instanceof Date ? goalData.targetDate.toISOString() : goalData.targetDate || new Date().toISOString(),
        priority: goalData.priority || 'medium',
        category: goalData.category || 'other',
        icon: goalData.icon,
        color: goalData.color,
      });

      if (response.success) {
        await fetchGoals(); // Refresh goals list
        return response.data;
      }
        throw new Error(response.error || 'Failed to create goal');

    } catch (err) {
      console.error('Failed to create goal:', err);
      throw err;
    }
  };

  const updateGoal = async (id: string, updates: Partial<SavingsGoal>) => {
    try {
      const response = await apiClient.updateGoal(id, updates);

      if (response.success) {
        await fetchGoals(); // Refresh goals list
      } else {
        throw new Error(response.error || 'Failed to update goal');
      }
    } catch (err) {
      console.error('Failed to update goal:', err);
      throw err;
    }
  };

  const deleteGoal = async (id: string) => {
    try {
      const response = await apiClient.deleteGoal(id);

      if (response.success) {
        setGoals(prev => prev.filter(g => g.id !== id));
      } else {
        throw new Error(response.error || 'Failed to delete goal');
      }
    } catch (err) {
      console.error('Failed to delete goal:', err);
      throw err;
    }
  };

  const addContribution = async (goalId: string, amount: number) => {
    try {
      const response = await apiClient.addGoalContribution(goalId, amount);

      if (response.success) {
        await fetchGoals(); // Refresh to get updated amounts
      } else {
        throw new Error(response.error || 'Failed to add contribution');
      }
    } catch (err) {
      console.error('Failed to add contribution:', err);
      throw err;
    }
  };

  return {
    goals,
    loading,
    error,
    refetch: fetchGoals,
    createGoal,
    updateGoal,
    deleteGoal,
    addContribution,
  };
}

// Hook for analytics data
export function useAnalytics(startDate?: string, endDate?: string) {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.getAnalytics({
        startDate,
        endDate,
        groupBy: 'month',
      });

      if (response.success && response.data) {
        setAnalytics(response.data);
      } else {
        throw new Error('Failed to load analytics');
      }
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return { analytics, loading, error, refetch: fetchAnalytics };
}

// Generic API hook for reusable data fetching
export function useApiData<T>(
  fetchFn: () => Promise<ApiResponse<T>>,
  deps: any[] = [],
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetchFn();

      if (response.success && response.data) {
        setData(response.data);
      } else {
        throw new Error(response.error || 'Failed to load data');
      }
    } catch (err) {
      console.error('API fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, deps);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}
