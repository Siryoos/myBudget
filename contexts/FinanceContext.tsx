'use client';

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

import { TransactionService } from '@/lib/services/transaction-service';
import { BudgetService } from '@/lib/services/budget-service';
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

const transactionService = new TransactionService();
const budgetService = new BudgetService();

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
    if (!userId) return;

    setTransactionsLoading(true);
    setTransactionsError(null);

    try {
      const result = await transactionService.findByUserId(userId, {}, { page: 1, limit: 50 });
      setTransactions(result.data);
    } catch (error) {
      setTransactionsError(error instanceof Error ? error.message : 'Failed to load transactions');
    } finally {
      setTransactionsLoading(false);
    }
  }, [userId]);

  // Load budgets
  const loadBudgets = useCallback(async () => {
    if (!userId) return;

    setBudgetsLoading(true);
    setBudgetsError(null);

    try {
      const budgetsData = await budgetService.findByUserId(userId);
      setBudgets(budgetsData);

      // Set the most recent budget as active if none is set
      if (budgetsData.length > 0 && !activeBudget) {
        setActiveBudget(budgetsData[0]);
      }
    } catch (error) {
      setBudgetsError(error instanceof Error ? error.message : 'Failed to load budgets');
    } finally {
      setBudgetsLoading(false);
    }
  }, [userId, activeBudget]);

  // Load goals (placeholder - would need a goal service)
  const loadGoals = useCallback(async () => {
    if (!userId) return;

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

export function useFinance() {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinance must be used within FinanceProvider');
  }
  return context;
}

// Convenience hooks for specific data
export function useTransactions() {
  const { transactions, transactionsLoading, transactionsError, refreshTransactions } = useFinance();
  return { transactions, loading: transactionsLoading, error: transactionsError, refreshTransactions };
}

export function useBudgets() {
  const { budgets, budgetsLoading, budgetsError, activeBudget, refreshBudgets, setActiveBudget } = useFinance();
  return { budgets, loading: budgetsLoading, error: budgetsError, activeBudget, refreshBudgets, setActiveBudget };
}

export function useGoals() {
  const { goals, goalsLoading, goalsError, refreshGoals } = useFinance();
  return { goals, loading: goalsLoading, error: goalsError, refreshGoals };
}

export function useFinancialSummary() {
  const { totalIncome, totalExpenses, netIncome } = useFinance();
  return { totalIncome, totalExpenses, netIncome };
}
