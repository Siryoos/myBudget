import { errorReporter } from './error-reporting';

// Error types
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public field?: string,
    public value?: any
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends Error {
  constructor(message: string = 'Authentication required') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error {
  constructor(message: string = 'Insufficient permissions') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class NetworkError extends Error {
  constructor(message: string = 'Network error') {
    super(message);
    this.name = 'NetworkError';
  }
}

// Error handler type
export type ErrorHandler = (error: Error) => void | Promise<void>;

// Default error messages
export const ERROR_MESSAGES = {
  GENERIC: 'Something went wrong. Please try again.',
  NETWORK: 'Unable to connect. Please check your internet connection.',
  AUTH_REQUIRED: 'Please sign in to continue.',
  PERMISSION_DENIED: 'You do not have permission to perform this action.',
  VALIDATION: 'Please check your input and try again.',
  NOT_FOUND: 'The requested resource was not found.',
  SERVER_ERROR: 'Server error. Please try again later.',
  RATE_LIMIT: 'Too many requests. Please slow down.',
} as const;

// Error handling utilities
export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.status) {
      case 400:
        return error.message || ERROR_MESSAGES.VALIDATION;
      case 401:
        return ERROR_MESSAGES.AUTH_REQUIRED;
      case 403:
        return ERROR_MESSAGES.PERMISSION_DENIED;
      case 404:
        return ERROR_MESSAGES.NOT_FOUND;
      case 429:
        return ERROR_MESSAGES.RATE_LIMIT;
      case 500:
      case 502:
      case 503:
        return ERROR_MESSAGES.SERVER_ERROR;
      default:
        return error.message || ERROR_MESSAGES.GENERIC;
    }
  }
  
  if (error instanceof NetworkError) {
    return ERROR_MESSAGES.NETWORK;
  }
  
  if (error instanceof AuthenticationError) {
    return ERROR_MESSAGES.AUTH_REQUIRED;
  }
  
  if (error instanceof AuthorizationError) {
    return ERROR_MESSAGES.PERMISSION_DENIED;
  }
  
  if (error instanceof ValidationError) {
    return error.message || ERROR_MESSAGES.VALIDATION;
  }
  
  if (error instanceof Error) {
    return error.message || ERROR_MESSAGES.GENERIC;
  }
  
  return ERROR_MESSAGES.GENERIC;
}

// Error recovery strategies
export interface ErrorRecoveryStrategy {
  canRecover: (error: Error) => boolean;
  recover: (error: Error) => Promise<void>;
}

export const defaultRecoveryStrategies: ErrorRecoveryStrategy[] = [
  {
    canRecover: (error) => error instanceof AuthenticationError,
    recover: async () => {
      // Redirect to login
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    },
  },
  {
    canRecover: (error) => error instanceof NetworkError,
    recover: async () => {
      // Wait and retry
      await new Promise(resolve => setTimeout(resolve, 3000));
    },
  },
];

// Global error handler
export async function handleError(
  error: unknown,
  context?: {
    component?: string;
    action?: string;
    userId?: string;
    [key: string]: any;
  },
  strategies: ErrorRecoveryStrategy[] = defaultRecoveryStrategies
): Promise<{ recovered: boolean; message: string }> {
  // Log error
  errorReporter.captureError(
    error instanceof Error ? error : new Error(String(error)),
    context
  );
  
  // Get user-friendly message
  const message = getErrorMessage(error);
  
  // Try recovery strategies
  if (error instanceof Error) {
    for (const strategy of strategies) {
      if (strategy.canRecover(error)) {
        try {
          await strategy.recover(error);
          return { recovered: true, message };
        } catch (recoveryError) {
          errorReporter.captureError(
            recoveryError instanceof Error ? recoveryError : new Error(String(recoveryError)),
            { ...context, recoveryAttempt: true }
          );
        }
      }
    }
  }
  
  return { recovered: false, message };
}

// React error boundary fallback component
export interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
  context?: any;
}

export function ErrorFallback({ error, resetError, context }: ErrorFallbackProps) {
  const message = getErrorMessage(error);
  
  return (
    <div className="min-h-[400px] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-accent-coral-red/10 flex items-center justify-center">
          <svg className="w-8 h-8 text-accent-coral-red" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        
        <h2 className="text-xl font-semibold text-neutral-charcoal mb-2">
          Oops! Something went wrong
        </h2>
        
        <p className="text-neutral-gray mb-6">{message}</p>
        
        <div className="space-y-3">
          <button
            onClick={resetError}
            className="w-full px-4 py-2 bg-primary-trust-blue text-white rounded-lg hover:bg-primary-trust-blue/90 transition-colors"
          >
            Try Again
          </button>
          
          {context?.showDetails && (
            <details className="text-left">
              <summary className="cursor-pointer text-sm text-neutral-gray hover:text-neutral-charcoal">
                Show error details
              </summary>
              <pre className="mt-2 p-3 bg-neutral-light-gray rounded text-xs overflow-auto">
                {error.stack || error.message}
              </pre>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}