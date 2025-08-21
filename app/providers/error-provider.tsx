'use client';

import { useEffect } from 'react';
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
  
  // Initialize error reporting
  useEffect(() => {
    errorReporter.initialize({
      dsn: sentryDsn || process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment,
      userId: user?.id,
    });
    
    // Update user context when it changes
    if (user) {
      errorReporter.setUser(user.id, user.email);
    } else {
      errorReporter.clearUser();
    }
  }, [user, sentryDsn, environment]);
  
  // Flush errors on unmount
  useEffect(() => {
    return () => {
      errorReporter.forceFlush();
    };
  }, []);
  
  return <ErrorBoundary>{children}</ErrorBoundary>;
}
