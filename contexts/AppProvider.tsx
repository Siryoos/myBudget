'use client';

import type { ReactNode } from 'react';
import React from 'react';

import { AuthProvider, useAuth } from './AuthContext';
import { FinanceProvider } from './FinanceContext';

interface AppProviderProps {
  children: ReactNode;
}

/**
 * Provides a FinanceProvider configured with the current authenticated user's ID and renders children.
 *
 * When the user is authenticated, passes `user.id` to FinanceProvider as `userId`; otherwise passes `undefined`.
 *
 * @param children - React nodes to be rendered inside the FinanceProvider.
 * @returns The children wrapped with FinanceProvider.
 */
function AppProviderInner({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();

  return (
    <FinanceProvider userId={isAuthenticated ? user?.id : undefined}>
      {children}
    </FinanceProvider>
  );
}

/**
 * Wraps children with the application context providers (authentication + finance).
 *
 * Provides a combined context environment so descendants can access auth and finance hooks.
 *
 * @param children - The React node(s) to render inside the providers.
 * @returns The children wrapped with the necessary context providers.
 */
export function AppProvider({ children }: AppProviderProps) {
  return (
    <AuthProvider>
      <AppProviderInner>
        {children}
      </AppProviderInner>
    </AuthProvider>
  );
}

// Re-export hooks for convenience
export { useAuth } from './AuthContext';
export { useFinance, useTransactions, useBudgets, useGoals, useFinancialSummary } from './FinanceContext';
export { useApi, usePaginatedApi, useMutation, useOptimisticMutation } from '../hooks/useApi';
