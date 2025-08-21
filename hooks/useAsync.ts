import { useState, useCallback, useRef, useEffect } from 'react';
import { useErrorHandler } from './useErrorHandler';

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  isError: boolean;
  isSuccess: boolean;
}

export interface UseAsyncOptions {
  immediate?: boolean;
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
  retries?: number;
  retryDelay?: number;
}

export function useAsync<T = any, Args extends any[] = any[]>(
  asyncFunction: (...args: Args) => Promise<T>,
  options: UseAsyncOptions = {}
) {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: false,
    error: null,
    isError: false,
    isSuccess: false,
  });
  
  const { handle: handleError } = useErrorHandler();
  const mountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const retriesRef = useRef(0);
  
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      abortControllerRef.current?.abort();
    };
  }, []);
  
  const execute = useCallback(async (...args: Args) => {
    // Cancel any pending request
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
    
    setState(prev => ({
      ...prev,
      loading: true,
      error: null,
      isError: false,
    }));
    
    try {
      const result = await asyncFunction(...args);
      
      if (mountedRef.current) {
        setState({
          data: result,
          loading: false,
          error: null,
          isError: false,
          isSuccess: true,
        });
        
        options.onSuccess?.(result);
        retriesRef.current = 0;
      }
      
      return result;
    } catch (error) {
      if (mountedRef.current) {
        const errorObj = error instanceof Error ? error : new Error(String(error));
        
        // Handle retries
        if (options.retries && retriesRef.current < options.retries) {
          retriesRef.current++;
          const delay = options.retryDelay || 1000 * retriesRef.current;
          
          setTimeout(() => {
            if (mountedRef.current) {
              execute(...args);
            }
          }, delay);
          
          return;
        }
        
        setState({
          data: null,
          loading: false,
          error: errorObj,
          isError: true,
          isSuccess: false,
        });
        
        handleError(errorObj);
        options.onError?.(errorObj);
        retriesRef.current = 0;
      }
      
      throw error;
    }
  }, [asyncFunction, handleError, options]);
  
  const reset = useCallback(() => {
    setState({
      data: null,
      loading: false,
      error: null,
      isError: false,
      isSuccess: false,
    });
    retriesRef.current = 0;
  }, []);
  
  const cancel = useCallback(() => {
    abortControllerRef.current?.abort();
    setState(prev => ({ ...prev, loading: false }));
  }, []);
  
  return {
    ...state,
    execute,
    reset,
    cancel,
  };
}

// Simplified hook for immediate execution
export function useAsyncEffect<T>(
  asyncFunction: () => Promise<T>,
  deps: any[],
  options: UseAsyncOptions = {}
) {
  const async = useAsync(asyncFunction, options);
  
  useEffect(() => {
    async.execute();
    
    return () => {
      async.cancel();
    };
  }, deps);
  
  return async;
}