// This file has been refactored into a simpler architecture.
// The old complex AppContext has been replaced with:
// - AuthContext: Handles authentication
// - FinanceContext: Handles financial data
// - AppProvider: Combines all contexts
// - Custom hooks: Provide specific functionality

// Re-export the new architecture
export { AppProvider, useAuth, useFinance, useTransactions, useBudgets, useGoals, useFinancialSummary, useApi, usePaginatedApi, useMutation, useOptimisticMutation } from './AppProvider';

// Legacy compatibility - these hooks now use the new architecture
export function useApp() {
  throw new Error('useApp has been deprecated. Use specific hooks like useAuth, useFinance, etc.');
}

export function useAppAuth() {
  throw new Error('useAppAuth has been deprecated. Use useAuth instead.');
}

export function useTheme() {
  throw new Error('useTheme has been deprecated. Use the new theme system.');
}

export function useSidebar() {
  throw new Error('useSidebar has been deprecated. Use the new navigation system.');
}

export function useNotifications() {
  throw new Error('useNotifications has been deprecated. Use useFinance for notifications.');
}

export function useSyncStatus() {
  throw new Error('useSyncStatus has been deprecated. Use useFinance for sync status.');
}
