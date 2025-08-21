'use client';

import React, { createContext, useContext, useReducer, useEffect, useCallback, ReactNode } from 'react';
import { api } from '@/lib/api';
import type { User, Transaction, Budget, SavingsGoal, Notification } from '@/types';

interface AppState {
  // Authentication
  user: User | null;
  isAuthenticated: boolean;
  
  // UI State
  theme: 'light' | 'dark' | 'system';
  sidebarOpen: boolean;
  
  // Financial Data (for optimistic updates and offline support)
  recentTransactions: Transaction[];
  activeBudget: Budget | null;
  savingsGoals: SavingsGoal[];
  
  // Notifications
  notifications: Notification[];
  unreadNotificationCount: number;
  
  // App State
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime: Date | null;
  syncError: Error | null;
}

type AppAction =
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'SET_THEME'; payload: 'light' | 'dark' | 'system' }
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'SET_RECENT_TRANSACTIONS'; payload: Transaction[] }
  | { type: 'ADD_TRANSACTION'; payload: Transaction }
  | { type: 'UPDATE_TRANSACTION'; payload: { id: string; data: Partial<Transaction> } }
  | { type: 'DELETE_TRANSACTION'; payload: string }
  | { type: 'SET_ACTIVE_BUDGET'; payload: Budget | null }
  | { type: 'SET_SAVINGS_GOALS'; payload: SavingsGoal[] }
  | { type: 'ADD_GOAL'; payload: SavingsGoal }
  | { type: 'UPDATE_GOAL'; payload: { id: string; data: Partial<SavingsGoal> } }
  | { type: 'DELETE_GOAL'; payload: string }
  | { type: 'SET_NOTIFICATIONS'; payload: Notification[] }
  | { type: 'MARK_NOTIFICATION_READ'; payload: string }
  | { type: 'SET_ONLINE_STATUS'; payload: boolean }
  | { type: 'SET_SYNC_STATUS'; payload: { isSyncing: boolean; error?: Error } }
  | { type: 'SET_LAST_SYNC_TIME'; payload: Date };

const initialState: AppState = {
  user: null,
  isAuthenticated: false,
  theme: 'system',
  sidebarOpen: true,
  recentTransactions: [],
  activeBudget: null,
  savingsGoals: [],
  notifications: [],
  unreadNotificationCount: 0,
  isOnline: true,
  isSyncing: false,
  lastSyncTime: null,
  syncError: null,
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_USER':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: !!action.payload,
      };

    case 'SET_THEME':
      return {
        ...state,
        theme: action.payload,
      };

    case 'TOGGLE_SIDEBAR':
      return {
        ...state,
        sidebarOpen: !state.sidebarOpen,
      };

    case 'SET_RECENT_TRANSACTIONS':
      return {
        ...state,
        recentTransactions: action.payload,
      };

    case 'ADD_TRANSACTION':
      return {
        ...state,
        recentTransactions: [action.payload, ...state.recentTransactions].slice(0, 10),
      };

    case 'UPDATE_TRANSACTION':
      return {
        ...state,
        recentTransactions: state.recentTransactions.map(t =>
          t.id === action.payload.id ? { ...t, ...action.payload.data } : t
        ),
      };

    case 'DELETE_TRANSACTION':
      return {
        ...state,
        recentTransactions: state.recentTransactions.filter(t => t.id !== action.payload),
      };

    case 'SET_ACTIVE_BUDGET':
      return {
        ...state,
        activeBudget: action.payload,
      };

    case 'SET_SAVINGS_GOALS':
      return {
        ...state,
        savingsGoals: action.payload,
      };

    case 'ADD_GOAL':
      return {
        ...state,
        savingsGoals: [...state.savingsGoals, action.payload],
      };

    case 'UPDATE_GOAL':
      return {
        ...state,
        savingsGoals: state.savingsGoals.map(g =>
          g.id === action.payload.id ? { ...g, ...action.payload.data } : g
        ),
      };

    case 'DELETE_GOAL':
      return {
        ...state,
        savingsGoals: state.savingsGoals.filter(g => g.id !== action.payload),
      };

    case 'SET_NOTIFICATIONS':
      return {
        ...state,
        notifications: action.payload,
        unreadNotificationCount: action.payload.filter(n => !n.isRead).length,
      };

    case 'MARK_NOTIFICATION_READ':
      return {
        ...state,
        notifications: state.notifications.map(n =>
          n.id === action.payload ? { ...n, isRead: true } : n
        ),
        unreadNotificationCount: Math.max(0, state.unreadNotificationCount - 1),
      };

    case 'SET_ONLINE_STATUS':
      return {
        ...state,
        isOnline: action.payload,
      };

    case 'SET_SYNC_STATUS':
      return {
        ...state,
        isSyncing: action.payload.isSyncing,
        syncError: action.payload.error || null,
      };

    case 'SET_LAST_SYNC_TIME':
      return {
        ...state,
        lastSyncTime: action.payload,
      };

    default:
      return state;
  }
}

interface AppContextValue extends AppState {
  dispatch: React.Dispatch<AppAction>;
  syncData: () => Promise<void>;
  clearUserData: () => void;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Load persisted state from localStorage
  useEffect(() => {
    const loadPersistedState = () => {
      try {
        const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | 'system';
        if (savedTheme) {
          dispatch({ type: 'SET_THEME', payload: savedTheme });
        }

        const savedSidebarState = localStorage.getItem('sidebarOpen');
        if (savedSidebarState === 'false') {
          dispatch({ type: 'TOGGLE_SIDEBAR' });
        }

        // Check for saved auth token
        const token = localStorage.getItem('authToken');
        if (token) {
          api.utils.setToken(token);
          // Verify token is still valid by fetching profile
          api.auth.getProfile()
            .then(response => {
              if (response.success && response.data) {
                dispatch({ type: 'SET_USER', payload: response.data });
              } else {
                localStorage.removeItem('authToken');
              }
            })
            .catch(() => {
              localStorage.removeItem('authToken');
            });
        }

        // Load cached data for offline support
        const cachedTransactions = localStorage.getItem('cachedTransactions');
        if (cachedTransactions) {
          dispatch({ type: 'SET_RECENT_TRANSACTIONS', payload: JSON.parse(cachedTransactions) });
        }

        const cachedGoals = localStorage.getItem('cachedGoals');
        if (cachedGoals) {
          dispatch({ type: 'SET_SAVINGS_GOALS', payload: JSON.parse(cachedGoals) });
        }
      } catch (error) {
        console.error('Error loading persisted state:', error);
      }
    };

    loadPersistedState();
  }, []);

  // Persist state changes
  useEffect(() => {
    localStorage.setItem('theme', state.theme);
  }, [state.theme]);

  useEffect(() => {
    localStorage.setItem('sidebarOpen', state.sidebarOpen.toString());
  }, [state.sidebarOpen]);

  useEffect(() => {
    if (state.recentTransactions.length > 0) {
      localStorage.setItem('cachedTransactions', JSON.stringify(state.recentTransactions));
    }
  }, [state.recentTransactions]);

  useEffect(() => {
    if (state.savingsGoals.length > 0) {
      localStorage.setItem('cachedGoals', JSON.stringify(state.savingsGoals));
    }
  }, [state.savingsGoals]);

  // Apply theme
  useEffect(() => {
    const applyTheme = (theme: 'light' | 'dark' | 'system') => {
      const root = document.documentElement;
      
      if (theme === 'system') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        root.classList.toggle('dark', prefersDark);
      } else {
        root.classList.toggle('dark', theme === 'dark');
      }
    };

    applyTheme(state.theme);

    if (state.theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => applyTheme('system');
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [state.theme]);

  // Sync data function - memoized to prevent unnecessary re-renders
  const syncData = useCallback(async () => {
    if (!state.isOnline || !state.isAuthenticated) return;

    dispatch({ type: 'SET_SYNC_STATUS', payload: { isSyncing: true } });

    try {
      // Fetch latest data from server
      const [transactionsRes, budgetsRes, goalsRes, notificationsRes] = await Promise.all([
        api.transactions.list({ limit: 10 }),
        api.budgets.list(),
        api.goals.list(),
        api.notifications.list(true), // unread only
      ]);

      if (transactionsRes.success && transactionsRes.data) {
        dispatch({ type: 'SET_RECENT_TRANSACTIONS', payload: transactionsRes.data.transactions });
      }

      if (budgetsRes.success && budgetsRes.data && budgetsRes.data.length > 0) {
        // Set the most recent budget as active
        dispatch({ type: 'SET_ACTIVE_BUDGET', payload: budgetsRes.data[0] });
      }

      if (goalsRes.success && goalsRes.data) {
        dispatch({ type: 'SET_SAVINGS_GOALS', payload: goalsRes.data });
      }

      if (notificationsRes.success && notificationsRes.data) {
        dispatch({ type: 'SET_NOTIFICATIONS', payload: notificationsRes.data });
      }

      dispatch({ type: 'SET_LAST_SYNC_TIME', payload: new Date() });
      dispatch({ type: 'SET_SYNC_STATUS', payload: { isSyncing: false } });
    } catch (error) {
      dispatch({ type: 'SET_SYNC_STATUS', payload: { isSyncing: false, error: error as Error } });
    }
  }, [state.isOnline, state.isAuthenticated, dispatch]);

  // Monitor online status - moved after syncData function to avoid stale closure
  useEffect(() => {
    const handleOnline = () => {
      dispatch({ type: 'SET_ONLINE_STATUS', payload: true });
      // Sync data when coming back online (checks are inside syncData)
      syncData();
    };

    const handleOffline = () => {
      dispatch({ type: 'SET_ONLINE_STATUS', payload: false });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Set initial online status
    dispatch({ type: 'SET_ONLINE_STATUS', payload: navigator.onLine });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncData, dispatch]);

  // Clear user data on logout
  const clearUserData = () => {
    dispatch({ type: 'SET_USER', payload: null });
    dispatch({ type: 'SET_RECENT_TRANSACTIONS', payload: [] });
    dispatch({ type: 'SET_ACTIVE_BUDGET', payload: null });
    dispatch({ type: 'SET_SAVINGS_GOALS', payload: [] });
    dispatch({ type: 'SET_NOTIFICATIONS', payload: [] });
    localStorage.removeItem('authToken');
    localStorage.removeItem('cachedTransactions');
    localStorage.removeItem('cachedGoals');
    api.utils.clearCache();
    api.utils.setToken(null);
  };

  const value: AppContextValue = {
    ...state,
    dispatch,
    syncData,
    clearUserData,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}

// Convenience hooks for specific state slices
export function useAppAuth() {
  const { user, isAuthenticated } = useApp();
  return { user, isAuthenticated };
}

export function useTheme() {
  const { theme, dispatch } = useApp();
  const setTheme = (newTheme: 'light' | 'dark' | 'system') => {
    dispatch({ type: 'SET_THEME', payload: newTheme });
  };
  return { theme, setTheme };
}

export function useSidebar() {
  const { sidebarOpen, dispatch } = useApp();
  const toggleSidebar = () => dispatch({ type: 'TOGGLE_SIDEBAR' });
  return { sidebarOpen, toggleSidebar };
}

export function useNotifications() {
  const { notifications, unreadNotificationCount, dispatch } = useApp();
  const markAsRead = (id: string) => {
    dispatch({ type: 'MARK_NOTIFICATION_READ', payload: id });
  };
  return { notifications, unreadNotificationCount, markAsRead };
}

export function useSyncStatus() {
  const { isOnline, isSyncing, lastSyncTime, syncError, syncData } = useApp();
  return { isOnline, isSyncing, lastSyncTime, syncError, syncData };
}
