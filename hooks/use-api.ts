import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/lib/api';

export interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  isValidating: boolean;
}

export interface UseApiOptions {
  enabled?: boolean;
  refetchOnFocus?: boolean;
  refetchOnReconnect?: boolean;
  refetchInterval?: number;
  dedupingInterval?: number;
  errorRetryCount?: number;
  errorRetryInterval?: number;
  suspense?: boolean;
  fallbackData?: any;
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
  onLoadingSlow?: (key: string, config: any) => void;
  loadingTimeout?: number;
}

const defaultOptions: UseApiOptions = {
  enabled: true,
  refetchOnFocus: true,
  refetchOnReconnect: true,
  dedupingInterval: 2000,
  errorRetryCount: 3,
  errorRetryInterval: 5000,
  loadingTimeout: 3000,
};

// Global cache for deduplication
const cache = new Map<string, { data: any; timestamp: number; promise?: Promise<any> }>();

export function useApi<T>(
  key: string | null,
  fetcher: () => Promise<T>,
  options: UseApiOptions = {}
): UseApiState<T> & {
  refetch: () => Promise<void>;
  mutate: (data: T | ((current: T | null) => T)) => void;
} {
  const opts = { ...defaultOptions, ...options };
  const [state, setState] = useState<UseApiState<T>>({
    data: opts.fallbackData || null,
    loading: opts.enabled && !!key,
    error: null,
    isValidating: false,
  });

  const mountedRef = useRef(true);
  const fetcherRef = useRef(fetcher);
  const intervalRef = useRef<NodeJS.Timeout>();
  const loadingTimeoutRef = useRef<NodeJS.Timeout>();
  
  fetcherRef.current = fetcher;

  const fetchData = useCallback(async (isValidating = false) => {
    if (!key || !opts.enabled) return;

    const cached = cache.get(key);
    const now = Date.now();

    // Return cached data if within deduping interval
    if (cached && now - cached.timestamp < opts.dedupingInterval!) {
      if (cached.promise) {
        return cached.promise;
      }
      if (!isValidating && state.data === null) {
        setState(prev => ({ ...prev, data: cached.data, loading: false }));
      }
      return;
    }

    setState(prev => ({ 
      ...prev, 
      loading: !isValidating && !prev.data,
      isValidating: isValidating,
      error: null 
    }));

    // Set loading slow timeout
    if (opts.onLoadingSlow && opts.loadingTimeout) {
      loadingTimeoutRef.current = setTimeout(() => {
        opts.onLoadingSlow!(key, opts);
      }, opts.loadingTimeout);
    }

    const promise = (async () => {
      let retries = 0;
      while (retries <= opts.errorRetryCount!) {
        try {
          const data = await fetcherRef.current();
          
          if (mountedRef.current) {
            cache.set(key, { data, timestamp: Date.now() });
            setState({ data, loading: false, error: null, isValidating: false });
            opts.onSuccess?.(data);
          }
          
          clearTimeout(loadingTimeoutRef.current);
          return data;
        } catch (error) {
          if (retries < opts.errorRetryCount!) {
            retries++;
            await new Promise(resolve => 
              setTimeout(resolve, opts.errorRetryInterval! * Math.pow(2, retries - 1))
            );
          } else {
            if (mountedRef.current) {
              const err = error as Error;
              setState({ data: null, loading: false, error: err, isValidating: false });
              opts.onError?.(err);
            }
            clearTimeout(loadingTimeoutRef.current);
            throw error;
          }
        }
      }
    })();

    cache.set(key, { ...cached, timestamp: now, promise });
    return promise;
  }, [key, opts.enabled, opts.dedupingInterval, opts.errorRetryCount, opts.errorRetryInterval, state.data]);

  const refetch = useCallback(async () => {
    await fetchData(true);
  }, [fetchData]);

  const mutate = useCallback((data: T | ((current: T | null) => T)) => {
    const newData = typeof data === 'function' ? (data as Function)(state.data) : data;
    if (key) {
      cache.set(key, { data: newData, timestamp: Date.now() });
    }
    setState(prev => ({ ...prev, data: newData }));
  }, [key, state.data]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [key]);

  // Refetch interval
  useEffect(() => {
    if (opts.refetchInterval && opts.refetchInterval > 0) {
      intervalRef.current = setInterval(() => {
        fetchData(true);
      }, opts.refetchInterval);

      return () => clearInterval(intervalRef.current);
    }
  }, [opts.refetchInterval, fetchData]);

  // Refetch on focus
  useEffect(() => {
    if (!opts.refetchOnFocus) return;

    const handleFocus = () => {
      if (document.visibilityState === 'visible') {
        fetchData(true);
      }
    };

    window.addEventListener('visibilitychange', handleFocus);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('visibilitychange', handleFocus);
      window.removeEventListener('focus', handleFocus);
    };
  }, [opts.refetchOnFocus, fetchData]);

  // Refetch on reconnect
  useEffect(() => {
    if (!opts.refetchOnReconnect) return;

    const handleOnline = () => {
      fetchData(true);
    };

    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [opts.refetchOnReconnect, fetchData]);

  // Cleanup
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      clearTimeout(loadingTimeoutRef.current);
      clearInterval(intervalRef.current);
    };
  }, []);

  return {
    ...state,
    refetch,
    mutate,
  };
}

// Specific hooks for each data type
export function useTransactions(params?: Parameters<typeof api.transactions.list>[0], options?: UseApiOptions) {
  const key = params ? `transactions-${JSON.stringify(params)}` : 'transactions';
  return useApi(
    key,
    () => api.transactions.list(params).then(res => res.data),
    options
  );
}

export function useTransaction(id: string | null, options?: UseApiOptions) {
  return useApi(
    id ? `transaction-${id}` : null,
    () => api.transactions.get(id!).then(res => res.data),
    options
  );
}

export function useBudgets(options?: UseApiOptions) {
  return useApi(
    'budgets',
    () => api.budgets.list().then(res => res.data),
    options
  );
}

export function useBudget(id: string | null, options?: UseApiOptions) {
  return useApi(
    id ? `budget-${id}` : null,
    () => api.budgets.get(id!).then(res => res.data),
    options
  );
}

export function useGoals(priority?: Parameters<typeof api.goals.list>[0], options?: UseApiOptions) {
  const key = priority ? `goals-${priority}` : 'goals';
  return useApi(
    key,
    () => api.goals.list(priority).then(res => res.data),
    options
  );
}

export function useGoal(id: string | null, options?: UseApiOptions) {
  return useApi(
    id ? `goal-${id}` : null,
    () => api.goals.get(id!).then(res => res.data),
    options
  );
}

export function useDashboard(options?: UseApiOptions) {
  return useApi(
    'dashboard',
    () => api.dashboard.get().then(res => res.data),
    options
  );
}

export function useNotifications(unreadOnly?: boolean, options?: UseApiOptions) {
  const key = `notifications-${unreadOnly ? 'unread' : 'all'}`;
  return useApi(
    key,
    () => api.notifications.list(unreadOnly).then(res => res.data),
    options
  );
}

export function useAchievements(options?: UseApiOptions) {
  return useApi(
    'achievements',
    () => api.achievements.list().then(res => res.data),
    options
  );
}

export function useProfile(options?: UseApiOptions) {
  return useApi(
    'profile',
    () => api.auth.getProfile().then(res => res.data),
    options
  );
}

export function useSettings(options?: UseApiOptions) {
  return useApi(
    'settings',
    () => api.settings.get().then(res => res.data),
    options
  );
}

export function useAnalytics(
  params?: Parameters<typeof api.analytics.get>[0], 
  options?: UseApiOptions
) {
  const key = params ? `analytics-${JSON.stringify(params)}` : 'analytics';
  return useApi(
    key,
    () => api.analytics.get(params).then(res => res.data),
    options
  );
}
