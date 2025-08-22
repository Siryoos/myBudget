import { useRouter, usePathname } from 'next/navigation';
import { useCallback } from 'react';
import { actionHandler } from '@/lib/action-handler';
import type { InsightAction } from '@/types';

export interface NavigationOptions {
  replace?: boolean;
  scroll?: boolean;
  shallow?: boolean;
}

export function useNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  
  /**
   * Navigate to a path with options
   */
  const navigate = useCallback((path: string, options?: NavigationOptions) => {
    if (options?.replace) {
      router.replace(path, { scroll: options.scroll });
    } else {
      router.push(path, { scroll: options?.scroll });
    }
  }, [router]);
  
  /**
   * Navigate back in history
   */
  const goBack = useCallback(() => {
    router.back();
  }, [router]);
  
  /**
   * Navigate forward in history
   */
  const goForward = useCallback(() => {
    router.forward();
  }, [router]);
  
  /**
   * Refresh the current route
   */
  const refresh = useCallback(() => {
    router.refresh();
  }, [router]);
  
  /**
   * Prefetch a route for faster navigation
   */
  const prefetch = useCallback((path: string) => {
    router.prefetch(path);
  }, [router]);
  
  /**
   * Handle insight action navigation
   */
  const handleInsightAction = useCallback(async (action: InsightAction, context?: any) => {
    const result = await actionHandler.executeAction(action, context);
    
    if (result.success && result.redirectUrl) {
      navigate(result.redirectUrl);
    }
    
    return result;
  }, [navigate]);
  
  /**
   * Check if a path is active
   */
  const isActive = useCallback((path: string, exact: boolean = false): boolean => {
    if (exact) {
      return pathname === path;
    }
    return pathname.startsWith(path);
  }, [pathname]);
  
  /**
   * Get breadcrumb items from current path
   */
  const getBreadcrumbs = useCallback(() => {
    const paths = pathname.split('/').filter(Boolean);
    const breadcrumbs: Array<{ label: string; path: string }> = [
      { label: 'Home', path: '/' }
    ];
    
    let currentPath = '';
    paths.forEach((segment) => {
      currentPath += `/${segment}`;
      const label = segment
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      breadcrumbs.push({ label, path: currentPath });
    });
    
    return breadcrumbs;
  }, [pathname]);
  
  /**
   * Navigate with confirmation
   */
  const navigateWithConfirmation = useCallback(
    async (
      path: string,
      confirmMessage: string = 'Are you sure you want to leave this page?'
    ): Promise<boolean> => {
      if (typeof window !== 'undefined' && window.confirm(confirmMessage)) {
        navigate(path);
        return true;
      }
      return false;
    },
    [navigate]
  );
  
  /**
   * Navigate to dashboard with specific tab
   */
  const navigateToDashboard = useCallback((tab?: string) => {
    const path = tab ? `/dashboard?tab=${tab}` : '/dashboard';
    navigate(path);
  }, [navigate]);
  
  /**
   * Navigate to goal with specific section
   */
  const navigateToGoal = useCallback((goalId: string, section?: string) => {
    const path = section ? `/goals/${goalId}/${section}` : `/goals/${goalId}`;
    navigate(path);
  }, [navigate]);
  
  /**
   * Navigate to budget with filters
   */
  const navigateToBudget = useCallback((filters?: {
    method?: string;
    category?: string;
    period?: string;
  }) => {
    const params = new URLSearchParams();
    if (filters?.method) params.append('method', filters.method);
    if (filters?.category) params.append('category', filters.category);
    if (filters?.period) params.append('period', filters.period);
    
    const path = params.toString() ? `/budget?${params.toString()}` : '/budget';
    navigate(path);
  }, [navigate]);
  
  /**
   * Navigate to transactions with filters
   */
  const navigateToTransactions = useCallback((filters?: {
    type?: 'income' | 'expense';
    category?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
  }) => {
    const params = new URLSearchParams();
    if (filters?.type) params.append('type', filters.type);
    if (filters?.category) params.append('category', filters.category);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.search) params.append('search', filters.search);
    
    const path = params.toString() ? `/transactions?${params.toString()}` : '/transactions';
    navigate(path);
  }, [navigate]);
  
  return {
    navigate,
    goBack,
    goForward,
    refresh,
    prefetch,
    handleInsightAction,
    isActive,
    getBreadcrumbs,
    navigateWithConfirmation,
    navigateToDashboard,
    navigateToGoal,
    navigateToBudget,
    navigateToTransactions,
    currentPath: pathname,
  };
}
