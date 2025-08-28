'use client';

import type { ReactNode } from 'react';
import React from 'react';

import { AuthProvider, useAuth } from './AuthContext';
import { FinanceProvider } from './FinanceContext';

interface AppProviderProps {
  children: ReactNode;
}

// Inner component that has access to auth context
function AppProviderInner({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();

  return (
    <FinanceProvider userId={isAuthenticated ? user?.id : undefined}>
      {children}
    </FinanceProvider>
  );
}

// Main app provider that combines all contexts
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
