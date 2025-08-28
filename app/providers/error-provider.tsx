'use client';

import React, { useEffect, useRef } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { errorReporter } from '@/lib/error-reporting';

interface ErrorProviderProps {
  children: React.ReactNode;
  sentryDsn?: string;
  environment?: string;
}

export function ErrorProvider({
  children,
  sentryDsn,
  environment = process.env.NODE_ENV,
}: ErrorProviderProps) {
  const { user } = useAuth();
  const isInitialized = useRef(false);

  // Initialize error reporting only once when DSN/environment become available
  useEffect(() => {
    if (!isInitialized.current && (sentryDsn || process.env.NEXT_PUBLIC_SENTRY_DSN)) {
      errorReporter.initialize({
        dsn: sentryDsn || process.env.NEXT_PUBLIC_SENTRY_DSN,
        environment,
        userId: user?.id,
      });
      isInitialized.current = true;
    }
  }, [sentryDsn, environment]); // Remove user dependency from initialization

  // Separate effect for user context updates - runs only when user changes
  useEffect(() => {
    if (isInitialized.current) {
      if (user) {
        errorReporter.setUser(user.id, user.email);
      } else {
        errorReporter.clearUser();
      }
    }
  }, [user]); // Only depend on user changes

  // Flush errors on unmount
  useEffect(() => () => {
      errorReporter.forceFlush();
    }, []);

  return <ErrorBoundary>{children}</ErrorBoundary>;
}

// Error Boundary component
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    errorReporter.captureException(error, {
      extra: {
        componentStack: errorInfo.componentStack,
      },
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md mx-auto text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Something went wrong
            </h2>
            <p className="text-gray-600 mb-4">
              We've been notified about this error and will fix it soon.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-primary-trust-blue hover:bg-primary-trust-blue/90 text-white px-4 py-2 rounded"
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
