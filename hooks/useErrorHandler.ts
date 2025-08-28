import { useState, useCallback, useRef } from 'react';

import { useToast } from './useToast';

export interface RecoveryStrategy {
  canRecover: (error: Error) => boolean;
  recover: (error: Error) => Promise<void> | void;
}

export interface UseErrorHandlerOptions {
  showToast?: boolean;
  context?: Record<string, any>;
  onError?: (error: Error, message: string) => void;
  strategies?: RecoveryStrategy[];
}

/**
 * React hook that centralizes error handling with optional recovery, toast notifications, and local error state.
 *
 * The returned handlers attempt configured recovery strategies first; if any strategy reports it can recover and
 * its `recover` call completes successfully, the error is considered handled and no state update or notification is made.
 * If recovery does not occur (or all strategies fail), the hook stores the Error in local state, derives an error
 * message, optionally shows a toast (enabled by default), and invokes an optional `onError` callback.
 *
 * Duplicate error occurrences (same string) within ~1 second are ignored to prevent rapid repeated handling.
 *
 * @param options - Optional configuration:
 *   - showToast?: boolean — whether to show a toast for unhandled errors (default: true).
 *   - onError?: (error: Error, message: string) => void — callback invoked when an error is ultimately handled/shown.
 *   - strategies?: RecoveryStrategy[] — ordered list of recovery strategies to attempt before showing the error.
 * @returns An object with:
 *   - error: Error | null — the last stored error (null if none).
 *   - isError: boolean — whether an error is currently stored.
 *   - errorMessage: string | null — the derived message for the stored error.
 *   - handle: (error: unknown) => Promise<void> — primary async handler that runs recovery and then handles the error.
 *   - reset: () => void — clears stored error state.
 *   - throwError: (error: Error | string) => void — convenience that wraps/forwards an Error or string to `handle`.
 */
export function useErrorHandler(options: UseErrorHandlerOptions = {}) {
  const [error, setError] = useState<Error | null>(null);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { showToast = true, strategies = [] } = options;
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

    // Try recovery strategies first
    for (const strategy of strategies) {
      if (strategy.canRecover(errorObj)) {
        try {
          await strategy.recover(errorObj);
          // If recovery succeeds, don't show error
          return;
        } catch (recoveryError) {
          // Recovery failed, continue with normal error handling
          console.warn('Recovery strategy failed:', recoveryError);
        }
      }
    }

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
  }, [options, showToast, toast, strategies]);

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
