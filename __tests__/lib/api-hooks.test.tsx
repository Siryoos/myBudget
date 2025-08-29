import { renderHook, waitFor, act } from '@testing-library/react';

// Extend Jest timeout for slower CI/sandbox environments
jest.setTimeout(15000);

import { apiClient } from '@/lib/api-client';
import { useGoals, useInsights, useDashboardData } from '../../lib/api-hooks';

// We spy on the real apiClient methods per-test instead of module-mocking

describe('API Hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('useGoals', () => {
    it('should fetch goals on mount', async () => {
      const mockGoals = [
        { id: '1', name: 'Goal 1', targetAmount: 1000 },
        { id: '2', name: 'Goal 2', targetAmount: 2000 },
      ];

      jest.spyOn(apiClient as any, 'getGoals').mockResolvedValue({
        success: true,
        data: mockGoals,
      });

      const { result } = renderHook(() => useGoals());

      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.goals).toEqual(mockGoals);
      expect(result.current.error).toBeNull();
    });

    it('should handle errors when fetching goals', async () => {
      jest.spyOn(apiClient as any, 'getGoals').mockRejectedValue(
        new Error('Failed to fetch'),
      );

      const { result } = renderHook(() => useGoals());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.goals).toEqual([]);
      expect(result.current.error).toBe('Failed to fetch');
    });

    it('should create a goal and refresh list', async () => {
      const newGoal = { name: 'New Goal', targetAmount: 3000 };
      const mockGoals = [{ id: '1', ...newGoal }];

      jest.spyOn(apiClient as any, 'createGoal').mockResolvedValue({
        success: true,
        data: { goalId: '1' },
      });

      jest.spyOn(apiClient as any, 'getGoals').mockResolvedValue({
        success: true,
        data: mockGoals,
      });

      const { result } = renderHook(() => useGoals());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.createGoal(newGoal);
      });

      expect(apiClient.createGoal).toHaveBeenCalledWith({
        name: 'New Goal',
        description: undefined,
        targetAmount: 3000,
        targetDate: expect.any(String),
        priority: 'medium',
        category: 'other',
        icon: undefined,
        color: undefined,
      });

      await waitFor(() => {
        expect(result.current.goals).toEqual(mockGoals);
      });
    });

    it('should filter goals by priority', async () => {
      jest.spyOn(apiClient as any, 'getGoals').mockResolvedValue({
        success: true,
        data: [],
      });

      const { result } = renderHook(() => useGoals('high'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(apiClient.getGoals).toHaveBeenCalledWith('high');
    });
  });

  describe('useInsights', () => {
    it('should transform notifications to insights', async () => {
      const mockNotifications = [
        {
          id: '1',
          type: 'insight',
          title: 'Save more',
          message: 'You can save $100 this month',
          priority: 'high',
          createdAt: '2024-01-01',
          isRead: false,
        },
      ];

      const mockClient: any = {
        getNotifications: jest.fn().mockResolvedValue({ success: true, data: mockNotifications }),
        markNotificationRead: jest.fn(),
      };

      const { result } = renderHook(() => useInsights([], mockClient));

      await waitFor(() => {
        expect(result.current.insights).toHaveLength(1);
      }, { timeout: 3000 });

      expect(result.current.insights).toHaveLength(1);
      expect(result.current.insights[0]).toMatchObject({
        id: '1',
        type: 'saving-opportunity',
        title: 'Save more',
        description: 'You can save $100 this month',
        impact: 'high',
      });
    });

    it('should dismiss insights', async () => {
      const mockInsights = [
        { id: '1', title: 'Insight 1' },
        { id: '2', title: 'Insight 2' },
      ];

      const mockClient: any = {
        getNotifications: jest.fn().mockResolvedValue({
          success: true,
          data: mockInsights.map(i => ({ ...i, type: 'insight' })),
        }),
        markNotificationRead: jest.fn().mockResolvedValue({ success: true }),
      };

      const { result } = renderHook(() => useInsights([], mockClient));

      await act(async () => {
        await result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.insights).toHaveLength(2);
      }, { timeout: 3000 });

      await act(async () => {
        await result.current.dismissInsight('1');
      });

      expect(mockClient.markNotificationRead).toHaveBeenCalledWith('1');

      // Simulate server state update on refetch
      mockClient.getNotifications.mockResolvedValueOnce({
        success: true,
        data: [{ id: '2', title: 'Insight 2', type: 'insight' }],
      });

      await act(async () => {
        await result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.insights).toHaveLength(1);
        expect(result.current.insights[0].id).toBe('2');
      }, { timeout: 3000 });
    });

    it('should use fallback data when API fails', async () => {
      const fallbackData = [{
        id: 'fallback',
        title: 'Fallback',
        type: 'saving-opportunity' as const,
        description: 'Test fallback',
        impact: 'low' as const,
        category: 'test',
        actionable: true,
        createdAt: new Date(),
        isRead: false,
      }];

      const mockClient: any = {
        getNotifications: jest.fn().mockResolvedValue({ success: false }),
        markNotificationRead: jest.fn(),
      };

      const { result } = renderHook(() => useInsights(fallbackData, mockClient));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.insights).toEqual(fallbackData);
    });
  });

  describe('useDashboardData', () => {
    it('should fetch dashboard data', async () => {
      const mockDashboard = {
        overview: {
          totalBalance: 10000,
          monthlyIncome: 5000,
          monthlyExpenses: 3000,
          savingsRate: 40,
        },
      };

      jest.spyOn(apiClient as any, 'getDashboard').mockResolvedValue({
        success: true,
        data: mockDashboard,
      });

      const { result } = renderHook(() => useDashboardData());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toEqual(mockDashboard);
      expect(result.current.error).toBeNull();
    });

    it('should handle dashboard fetch errors', async () => {
      jest.spyOn(apiClient as any, 'getDashboard').mockRejectedValue(
        new Error('Network error'),
      );

      const { result } = renderHook(() => useDashboardData());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toBeNull();
      expect(result.current.error).toBe('Network error');
    });

    it('should refetch dashboard data', async () => {
      const mockDashboard = { overview: { totalBalance: 10000 } };

      jest.spyOn(apiClient as any, 'getDashboard').mockResolvedValue({
        success: true,
        data: mockDashboard,
      });

      const { result } = renderHook(() => useDashboardData());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(apiClient.getDashboard).toHaveBeenCalledTimes(1);

      await act(async () => {
        await result.current.refetch();
      });

      expect(apiClient.getDashboard).toHaveBeenCalledTimes(2);
    });
  });
});
