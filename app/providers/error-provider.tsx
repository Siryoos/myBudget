'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { errorReporter, ErrorBoundary } from '@/lib/error-reporting';

interface ErrorProviderProps {
  children: React.ReactNode;
  sentryDsn?: string;
  environment?: string;
}

export function ErrorProvider({ 
  children, 
  sentryDsn,
  environment = process.env.NODE_ENV 
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
  useEffect(() => {
    return () => {
      errorReporter.forceFlush();
    };
  }, []);
  
  return <ErrorBoundary>{children}</ErrorBoundary>;
}
