'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import type { ProtectedRouteProps } from '@/types/auth';

export function ProtectedRoute({
  children,
  requiredRoles,
  requiredPermissions,
  fallback,
  redirectTo = '/unauthorized',
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, canAccess } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // Check if we're already on the login page to prevent redirect loops
      if (window.location.pathname !== '/login') {
        router.replace('/login');
      }
      return;
    }

    if (!isLoading && isAuthenticated) {
      const hasAccess = canAccess(requiredRoles, requiredPermissions);
      if (!hasAccess) {
        // Check if we're already on the redirect target to prevent loops
        if (window.location.pathname !== redirectTo) {
          router.replace(redirectTo);
        }

      }
    }
  }, [isLoading, isAuthenticated, canAccess, requiredRoles, requiredPermissions, redirectTo, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-trust-blue"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const hasAccess = canAccess(requiredRoles, requiredPermissions);
  if (!hasAccess) {
    return fallback ? <>{fallback}</> : null;
  }

  return <>{children}</>;
}
