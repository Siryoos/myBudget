import { useState, useEffect, useCallback } from 'react';

interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface UseApiOptions {
  immediate?: boolean;
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
}

export function useApi<T>(
  apiCall: () => Promise<T>,
  options: UseApiOptions = {}
) {
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const data = await apiCall();
      setState({ data, loading: false, error: null });
      options.onSuccess?.(data);
      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      setState({ data: null, loading: false, error: errorMessage });
      options.onError?.(error instanceof Error ? error : new Error(errorMessage));
      throw error;
    }
  }, [apiCall, options]);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  const refetch = useCallback(() => execute(), [execute]);

  useEffect(() => {
    if (options.immediate) {
      execute();
    }
  }, [execute, options.immediate]);

  return {
    ...state,
    execute,
    reset,
    refetch,
  };
}

// Hook for paginated data
export function usePaginatedApi<T>(
  apiCall: (page: number, limit: number) => Promise<{ data: T[]; pagination: any }>,
  initialPage: number = 1,
  initialLimit: number = 20
) {
  const [page, setPage] = useState(initialPage);
  const [limit, setLimit] = useState(initialLimit);

  const { data, loading, error, execute } = useApi(
    () => apiCall(page, limit),
    { immediate: true }
  );

  const loadMore = useCallback(() => {
    if (!loading && data?.pagination?.hasNext) {
      setPage(prev => prev + 1);
    }
  }, [loading, data?.pagination?.hasNext]);

  const changePage = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const changeLimit = useCallback((newLimit: number) => {
    setLimit(newLimit);
    setPage(1); // Reset to first page when changing limit
  }, []);

  return {
    data: data?.data || [],
    pagination: data?.pagination,
    loading,
    error,
    page,
    limit,
    loadMore,
    changePage,
    changeLimit,
  };
}

// Hook for mutation operations (create, update, delete)
export function useMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>
) {
  const [state, setState] = useState({
    loading: false,
    error: null as string | null,
    data: null as TData | null,
  });

  const mutate = useCallback(async (variables: TVariables) => {
    setState({ loading: true, error: null, data: null });

    try {
      const data = await mutationFn(variables);
      setState({ loading: false, error: null, data });
      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      setState({ loading: false, error: errorMessage, data: null });
      throw error;
    }
  }, [mutationFn]);

  const reset = useCallback(() => {
    setState({ loading: false, error: null, data: null });
  }, []);

  return {
    ...state,
    mutate,
    reset,
  };
}

// Hook for optimistic updates
export function useOptimisticMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: {
    onMutate?: (variables: TVariables) => void;
    onSuccess?: (data: TData, variables: TVariables) => void;
    onError?: (error: Error, variables: TVariables) => void;
    onSettled?: (data: TData | null, error: Error | null, variables: TVariables) => void;
  } = {}
) {
  const [state, setState] = useState({
    loading: false,
    error: null as string | null,
    data: null as TData | null,
  });

  const mutate = useCallback(async (variables: TVariables) => {
    setState({ loading: true, error: null, data: null });

    // Call onMutate for optimistic updates
    options.onMutate?.(variables);

    try {
      const data = await mutationFn(variables);
      setState({ loading: false, error: null, data });
      options.onSuccess?.(data, variables);
      options.onSettled?.(data, null, variables);
      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      setState({ loading: false, error: errorMessage, data: null });
      options.onError?.(error instanceof Error ? error : new Error(errorMessage), variables);
      options.onSettled?.(null, error instanceof Error ? error : new Error(errorMessage), variables);
      throw error;
    }
  }, [mutationFn, options]);

  return {
    ...state,
    mutate,
  };
}
