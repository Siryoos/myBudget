'use client';

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

import { apiClient } from '@/lib/api-client';
import type { Transaction, Budget, SavingsGoal } from '@/types';

interface FinanceContextType {
  // Transaction state
  transactions: Transaction[];
  transactionsLoading: boolean;
  transactionsError: string | null;

  // Budget state
  budgets: Budget[];
  budgetsLoading: boolean;
  budgetsError: string | null;
  activeBudget: Budget | null;

  // Goals state
  goals: SavingsGoal[];
  goalsLoading: boolean;
  goalsError: string | null;

  // Actions
  refreshTransactions: () => Promise<void>;
  refreshBudgets: () => Promise<void>;
  refreshGoals: () => Promise<void>;
  refreshAll: () => Promise<void>;
  setActiveBudget: (budget: Budget | null) => void;

  // Computed values
  totalIncome: number;
  totalExpenses: number;
  netIncome: number;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

// API client is used instead of direct service imports

/**
 * Provides finance-related state and actions (transactions, budgets, savings goals) to descendant components.
 *
 * Wraps children in a FinanceContext.Provider and, when a `userId` is supplied, loads and keeps in sync per-user
 * data (transactions, budgets, and goals). Exposes loading/error flags, refresh actions (per-domain and all), an
 * active budget setter, and computed aggregates (totalIncome, totalExpenses, netIncome).
 *
 * @param userId - Optional user identifier. When present the provider will automatically load and refresh the user's
 *                 transactions, budgets, and goals (initial load on mount and whenever `userId` changes).
 */
export function FinanceProvider({ children, userId }: { children: ReactNode; userId?: string }) {
  // Transaction state
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [transactionsError, setTransactionsError] = useState<string | null>(null);

  // Budget state
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [budgetsLoading, setBudgetsLoading] = useState(false);
  const [budgetsError, setBudgetsError] = useState<string | null>(null);
  const [activeBudget, setActiveBudget] = useState<Budget | null>(null);

  // Goals state
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [goalsLoading, setGoalsLoading] = useState(false);
  const [goalsError, setGoalsError] = useState<string | null>(null);

  // Load transactions
  const loadTransactions = useCallback(async () => {
    if (!userId) {return;}

    setTransactionsLoading(true);
    setTransactionsError(null);

    try {
      const transactions = await apiClient.getTransactions(userId);
      setTransactions(transactions);
    } catch (error) {
      setTransactionsError(error instanceof Error ? error.message : 'Failed to load transactions');
    } finally {
      setTransactionsLoading(false);
    }
  }, [userId]);

  // Load budgets
  const loadBudgets = useCallback(async () => {
    if (!userId) {return;}

    setBudgetsLoading(true);
    setBudgetsError(null);

    try {
      const budgetsData = await apiClient.getBudgets(userId);
      setBudgets(budgetsData as Budget[]);

      // Set the most recent budget as active if none is set
      if (budgetsData.length > 0 && !activeBudget) {
        setActiveBudget(budgetsData[0] as Budget);
      }
    } catch (error) {
      setBudgetsError(error instanceof Error ? error.message : 'Failed to load budgets');
    } finally {
      setBudgetsLoading(false);
    }
  }, [userId, activeBudget]);

  // Load goals (placeholder - would need a goal service)
  const loadGoals = useCallback(async () => {
    if (!userId) {return;}

    setGoalsLoading(true);
    setGoalsError(null);

    try {
      // This would use a goal service in a real implementation
      setGoals([]);
    } catch (error) {
      setGoalsError(error instanceof Error ? error.message : 'Failed to load goals');
    } finally {
      setGoalsLoading(false);
    }
  }, [userId]);

  // Refresh functions
  const refreshTransactions = useCallback(async () => {
    await loadTransactions();
  }, [loadTransactions]);

  const refreshBudgets = useCallback(async () => {
    await loadBudgets();
  }, [loadBudgets]);

  const refreshGoals = useCallback(async () => {
    await loadGoals();
  }, [loadGoals]);

  const refreshAll = useCallback(async () => {
    await Promise.all([
      refreshTransactions(),
      refreshBudgets(),
      refreshGoals(),
    ]);
  }, [refreshTransactions, refreshBudgets, refreshGoals]);

  // Initialize data when userId changes
  useEffect(() => {
    if (userId) {
      refreshAll();
    }
  }, [userId, refreshAll]);

  // Computed values
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const netIncome = totalIncome - totalExpenses;

  const value: FinanceContextType = {
    // Transaction state
    transactions,
    transactionsLoading,
    transactionsError,

    // Budget state
    budgets,
    budgetsLoading,
    budgetsError,
    activeBudget,

    // Goals state
    goals,
    goalsLoading,
    goalsError,

    // Actions
    refreshTransactions,
    refreshBudgets,
    refreshGoals,
    refreshAll,
    setActiveBudget,

    // Computed values
    totalIncome,
    totalExpenses,
    netIncome,
  };

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

/**
 * Returns the current finance context.
 *
 * Provides access to the finance state, actions, and derived values supplied by FinanceProvider.
 *
 * @returns The FinanceContext value.
 * @throws Error if called outside of a FinanceProvider.
 */
export function useFinance() {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinance must be used within FinanceProvider');
  }
  return context;
}

/**
 * Returns transactions slice and related state/actions from the finance context.
 *
 * @returns An object containing:
 *  - `transactions`: the current array of Transaction items for the user.
 *  - `loading`: boolean flag indicating whether transactions are being loaded.
 *  - `error`: error message string when loading transactions failed, or undefined.
 *  - `refreshTransactions`: function to re-fetch the user's transactions.
 */
export function useTransactions() {
  const { transactions, transactionsLoading, transactionsError, refreshTransactions } = useFinance();
  return { transactions, loading: transactionsLoading, error: transactionsError, refreshTransactions };
}

/**
 * Hook exposing budget state and actions from the Finance context.
 *
 * Returns the list of budgets, the active budget, loading/error flags for budgets,
 * and actions to refresh budgets or change the active budget.
 *
 * @returns An object containing:
 * - `budgets`: array of Budget
 * - `loading`: boolean — whether budgets are being loaded
 * - `error`: string | undefined — loading error message, if any
 * - `activeBudget`: Budget | undefined — the currently selected budget
 * - `refreshBudgets`: () => Promise<void> — reloads budgets for the current user
 * - `setActiveBudget`: (b: Budget | undefined) => void — sets the active budget
 */
export function useBudgets() {
  const { budgets, budgetsLoading, budgetsError, activeBudget, refreshBudgets, setActiveBudget } = useFinance();
  return { budgets, loading: budgetsLoading, error: budgetsError, activeBudget, refreshBudgets, setActiveBudget };
}

/**
 * Provides the savings goals slice from the Finance context.
 *
 * Returns the current list of goals along with loading and error flags and a function to refresh goals.
 *
 * @returns An object containing:
 * - `goals` — the array of current savings goals.
 * - `loading` — `true` when goals are being fetched.
 * - `error` — an error message if loading failed, otherwise `undefined`.
 * - `refreshGoals` — function to re-fetch the goals for the current user.
 */
export function useGoals() {
  const { goals, goalsLoading, goalsError, refreshGoals } = useFinance();
  return { goals, loading: goalsLoading, error: goalsError, refreshGoals };
}

/**
 * Returns derived financial totals from the Finance context.
 *
 * @returns An object containing `totalIncome`, `totalExpenses`, and `netIncome` (numbers).
 */
export function useFinancialSummary() {
  const { totalIncome, totalExpenses, netIncome } = useFinance();
  return { totalIncome, totalExpenses, netIncome };
}
