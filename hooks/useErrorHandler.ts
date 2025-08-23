import { useState, useCallback, useRef } from 'react';

import { useToast } from './useToast';

export interface UseErrorHandlerOptions {
  showToast?: boolean;
  context?: Record<string, any>;
  onError?: (error: Error, message: string) => void;
}

export function useErrorHandler(options: UseErrorHandlerOptions = {}) {
  const [error, setError] = useState<Error | null>(null);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { showToast = true } = options;
  const { toast } = useToast();
  const errorCountRef = useRef(0);
  const lastErrorRef = useRef<string>('');

  const handle = useCallback(async (error: unknown) => {
    // Prevent duplicate error handling
    const errorStr = String(error);
    if (lastErrorRef.current === errorStr && Date.now() - errorCountRef.current < 1000) {
      return;
    }
    lastErrorRef.current = errorStr;
    errorCountRef.current = Date.now();

    const errorObj = error instanceof Error ? error : new Error(String(error));
    setError(errorObj);
    setIsError(true);

    // Get error message
    const message = errorObj.message || 'An unexpected error occurred';
    setErrorMessage(message);

    if (showToast) {
      toast({
        title: 'Error',
        description: message,
        variant: 'error',
      });
    }

    options.onError?.(errorObj, message);
  }, [options, showToast, toast]);

  const reset = useCallback(() => {
    setError(null);
    setIsError(false);
    setErrorMessage(null);
  }, []);

  const throwError = useCallback((error: Error | string) => {
    const errorObj = error instanceof Error ? error : new Error(error);
    handle(errorObj);
  }, [handle]);

  return {
    error,
    isError,
    errorMessage,
    handle,
    reset,
    throwError,
  };
}

// Specialized hook for async operations
export function useAsyncError() {
  const { handle } = useErrorHandler();

  return useCallback((error: unknown) => {
    handle(error);
  }, [handle]);
}
