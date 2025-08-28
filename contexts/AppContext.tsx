// This file has been refactored into a simpler architecture.
// The old complex AppContext has been replaced with:
// - AuthContext: Handles authentication
// - FinanceContext: Handles financial data
// - AppProvider: Combines all contexts
// - Custom hooks: Provide specific functionality

// Re-export the new architecture
export { AppProvider, useAuth, useFinance, useTransactions, useBudgets, useGoals, useFinancialSummary, useApi, usePaginatedApi, useMutation, useOptimisticMutation } from './AppProvider';

/**
 * Deprecated compatibility hook — always throws an error instructing callers to migrate.
 *
 * This legacy hook no longer provides any context and intentionally throws to force callers
 * to use the new, focused hooks such as `useAuth`, `useFinance`, `useTransactions`, `useBudgets`,
 * `useGoals`, and others exported from the updated AppProvider facade.
 *
 * @deprecated Use specific hooks like `useAuth`, `useFinance`, `useTransactions`, `useBudgets`, `useGoals`, etc.
 * @throws Error with the message: 'useApp has been deprecated. Use specific hooks like useAuth, useFinance, etc.'
 */
export function useApp() {
  throw new Error('useApp has been deprecated. Use specific hooks like useAuth, useFinance, etc.');
}

/**
 * Deprecated hook stub that always throws an error directing callers to the new API.
 *
 * Calling this will immediately throw: "useAppAuth has been deprecated. Use useAuth instead."
 *
 * @deprecated Use `useAuth` from the new AppProvider-based API.
 */
export function useAppAuth() {
  throw new Error('useAppAuth has been deprecated. Use useAuth instead.');
}

/**
 * Deprecated hook placeholder that always throws an error instructing callers to use the new theme system.
 *
 * @deprecated This hook has been removed. Use the new theme system instead — calling this will throw an `Error`.
 */
export function useTheme() {
  throw new Error('useTheme has been deprecated. Use the new theme system.');
}

/**
 * Deprecated hook placeholder for the sidebar; calling this hook always throws an Error.
 *
 * Use the application's new navigation system instead (see navigation hooks exported from AppProvider).
 *
 * @deprecated Use the new navigation system (e.g., the navigation-related hooks from AppProvider).
 * @throws Error Always thrown to indicate this hook has been removed.
 */
export function useSidebar() {
  throw new Error('useSidebar has been deprecated. Use the new navigation system.');
}

/**
 * Deprecated hook for notifications that now throws and directs callers to the new API.
 *
 * @deprecated Use `useFinance` instead.
 * @throws Error Always throws: "useNotifications has been deprecated. Use useFinance for notifications."
 */
export function useNotifications() {
  throw new Error('useNotifications has been deprecated. Use useFinance for notifications.');
}

/**
 * Deprecated hook placeholder that informs callers to migrate.
 *
 * This function no longer provides sync status. Calling it will immediately throw an Error
 * directing consumers to use the new finance hook.
 *
 * @deprecated Use `useFinance` to access synchronization status and related finance state.
 * @throws Error Always throws with a message instructing callers to use `useFinance`.
 */
export function useSyncStatus() {
  throw new Error('useSyncStatus has been deprecated. Use useFinance for sync status.');
}
