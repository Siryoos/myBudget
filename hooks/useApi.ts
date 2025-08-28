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

/**
 * Manages the lifecycle (loading, data, error) of a single asynchronous API call.
 *
 * Executes the provided `apiCall` when `execute()` is invoked (or automatically on mount if `options.immediate` is true),
 * keeps `data`, `loading`, and `error` in React state, and invokes lifecycle callbacks from `options`.
 *
 * Errors thrown by `apiCall` are stored as a string in `error` state; `options.onError` is called with an `Error` instance.
 *
 * @param apiCall - A function that performs the async request and resolves with the response of type `T`.
 * @param options - Optional behavior hooks:
 *   - `immediate` — if true, the hook calls `execute()` once on mount.
 *   - `onSuccess` — called with the response `T` after a successful call.
 *   - `onError` — called with an `Error` when the call throws.
 * @returns An object containing:
 *   - `data` — the latest successful response (`T | null`),
 *   - `loading` — whether a request is in progress,
 *   - `error` — the error message string (`string | null`),
 *   - `execute()` — triggers the API call and returns the resolved data,
 *   - `reset()` — clears `data`, `loading`, and `error` to initial values,
 *   - `refetch()` — alias for `execute()`.
 */
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

/**
 * Hook for fetching paginated data with built-in page/limit state and controls.
 *
 * Calls `apiCall(page, limit)` (expected to return `{ data: T[]; pagination: any }`) and exposes the current list, pagination info, loading/error state, current `page`/`limit`, and helpers to navigate pages.
 *
 * The hook automatically fetches on mount with the provided `initialPage` and `initialLimit`. `loadMore()` increments the page only when not loading and `pagination.hasNext` is truthy. `changeLimit()` updates the page size and resets to page 1.
 *
 * @param apiCall - Function that fetches a page of data for the given `page` and `limit`.
 * @param initialPage - Starting page number (default: 1).
 * @param initialLimit - Starting page size (default: 20).
 * @returns An object containing:
 *  - `data` - array of items for the current page,
 *  - `pagination` - pagination metadata returned by `apiCall`,
 *  - `loading` - whether the current request is in progress,
 *  - `error` - error message (if any),
 *  - `page` - current page number,
 *  - `limit` - current page size,
 *  - `loadMore()` - increments the page when possible,
 *  - `changePage(newPage)` - sets the current page,
 *  - `changeLimit(newLimit)` - sets the page size and resets to page 1.
 */
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

/**
 * Provides state and helpers for performing an asynchronous mutation (create/update/delete).
 *
 * The hook manages `loading`, `error`, and `data` state and returns a `mutate` function to execute
 * the provided `mutationFn` and a `reset` function to clear state.
 *
 * @typeParam TData - The expected shape of a successful mutation result.
 * @typeParam TVariables - The shape of the variables passed to the mutation function.
 * @param mutationFn - Async function that performs the mutation and resolves with the mutation result.
 * @returns An object containing:
 *  - `data`: the latest successful mutation result or `null`.
 *  - `loading`: `true` while the mutation is in progress.
 *  - `error`: an error message string when the last mutation failed, otherwise `null`.
 *  - `mutate(variables)`: executes the mutation; resolves with the mutation result on success.
 *    If the mutation throws, the original error is rethrown after state is updated.
 *  - `reset()`: resets `data`, `loading`, and `error` to their initial values.
 */
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

/**
 * Hook for performing mutations with optimistic update support.
 *
 * Starts a mutation with optional optimistic side effects via `onMutate`, then runs `mutationFn`.
 * On success it updates internal state, calls `onSuccess` and `onSettled`. On failure it sets an error,
 * calls `onError` and `onSettled`, and rethrows the original error.
 *
 * @param mutationFn - Async function that performs the mutation and returns the resulting data.
 * @param options - Optional lifecycle callbacks:
 *   - `onMutate(variables)` invoked immediately for optimistic updates before the mutation runs.
 *   - `onSuccess(data, variables)` invoked after a successful mutation.
 *   - `onError(error, variables)` invoked when the mutation throws.
 *   - `onSettled(dataOrNull, errorOrNull, variables)` invoked after either success or error.
 * @returns An object with:
 *   - `data` — the mutation result or `null`.
 *   - `loading` — `true` while the mutation is in progress.
 *   - `error` — an error message string or `null`.
 *   - `mutate(variables)` — function to start the mutation; returns the resolved data or rethrows the error.
 */
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
