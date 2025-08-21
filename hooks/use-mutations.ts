import { useState, useCallback } from 'react';
import { api } from '@/lib/api';
import type { 
  Transaction, 
  Budget, 
  SavingsGoal,
  Notification
} from '@/types';

export interface MutationState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

export interface MutationOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  onSettled?: () => void;
  optimisticUpdate?: () => void;
  rollbackOnError?: boolean;
}

export function useMutation<TData = any, TVariables = any>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: MutationOptions<TData> = {}
): [
  (variables: TVariables) => Promise<TData | undefined>,
  MutationState<TData>
] {
  const [state, setState] = useState<MutationState<TData>>({
    data: null,
    loading: false,
    error: null,
  });

  const mutate = useCallback(async (variables: TVariables) => {
    setState({ data: null, loading: true, error: null });

    // Perform optimistic update
    if (options.optimisticUpdate) {
      options.optimisticUpdate();
    }

    try {
      const data = await mutationFn(variables);
      setState({ data, loading: false, error: null });
      options.onSuccess?.(data);
      return data;
    } catch (error) {
      const err = error as Error;
      setState({ data: null, loading: false, error: err });
      options.onError?.(err);
      
      // Rollback optimistic update on error
      if (options.rollbackOnError && options.optimisticUpdate) {
        // The component should handle rollback logic
      }
      
      throw error;
    } finally {
      options.onSettled?.();
    }
  }, [mutationFn, options]);

  return [mutate, state];
}

// Transaction mutations
export function useCreateTransaction(options?: MutationOptions<Transaction>) {
  return useMutation(
    async (data: Parameters<typeof api.transactions.create>[0]) => {
      const response = await api.transactions.create(data);
      if (!response.success) throw new Error(response.error);
      return response.data!;
    },
    {
      ...options,
      onSuccess: (data) => {
        // Invalidate transaction list cache
        api.utils.invalidateCache('transactions');
        // Invalidate dashboard cache as it shows recent transactions
        api.utils.invalidateCache('dashboard');
        options?.onSuccess?.(data);
      }
    }
  );
}

export function useUpdateTransaction(options?: MutationOptions<Transaction>) {
  return useMutation(
    async ({ id, data }: { id: string; data: Partial<Transaction> }) => {
      const response = await api.transactions.update(id, data);
      if (!response.success) throw new Error(response.error);
      return response.data!;
    },
    {
      ...options,
      onSuccess: (data) => {
        api.utils.invalidateCache('transactions');
        api.utils.invalidateCache(`transaction-${data.id}`);
        api.utils.invalidateCache('dashboard');
        options?.onSuccess?.(data);
      }
    }
  );
}

export function useDeleteTransaction(options?: MutationOptions<{ message: string }>) {
  return useMutation(
    async (id: string) => {
      const response = await api.transactions.delete(id);
      if (!response.success) throw new Error(response.error);
      return response.data!;
    },
    {
      ...options,
      onSuccess: (data) => {
        api.utils.invalidateCache('transactions');
        api.utils.invalidateCache('dashboard');
        options?.onSuccess?.(data);
      }
    }
  );
}

// Budget mutations
export function useCreateBudget(options?: MutationOptions<{ budgetId: string; message: string }>) {
  return useMutation(
    async (data: Parameters<typeof api.budgets.create>[0]) => {
      const response = await api.budgets.create(data);
      if (!response.success) throw new Error(response.error);
      return response.data!;
    },
    {
      ...options,
      onSuccess: (data) => {
        api.utils.invalidateCache('budgets');
        api.utils.invalidateCache('dashboard');
        options?.onSuccess?.(data);
      }
    }
  );
}

export function useUpdateBudget(options?: MutationOptions<{ message: string }>) {
  return useMutation(
    async ({ id, data }: { id: string; data: Partial<Budget> }) => {
      const response = await api.budgets.update(id, data);
      if (!response.success) throw new Error(response.error);
      return response.data!;
    },
    {
      ...options,
      onSuccess: (data) => {
        api.utils.invalidateCache('budgets');
        api.utils.invalidateCache('dashboard');
        options?.onSuccess?.(data);
      }
    }
  );
}

export function useDeleteBudget(options?: MutationOptions<{ message: string }>) {
  return useMutation(
    async (id: string) => {
      const response = await api.budgets.delete(id);
      if (!response.success) throw new Error(response.error);
      return response.data!;
    },
    {
      ...options,
      onSuccess: (data) => {
        api.utils.invalidateCache('budgets');
        api.utils.invalidateCache('dashboard');
        options?.onSuccess?.(data);
      }
    }
  );
}

// Goal mutations
export function useCreateGoal(options?: MutationOptions<{ goalId: string; message: string }>) {
  return useMutation(
    async (data: Parameters<typeof api.goals.create>[0]) => {
      const response = await api.goals.create(data);
      if (!response.success) throw new Error(response.error);
      return response.data!;
    },
    {
      ...options,
      onSuccess: (data) => {
        api.utils.invalidateCache('goals');
        api.utils.invalidateCache('dashboard');
        options?.onSuccess?.(data);
      }
    }
  );
}

export function useUpdateGoal(options?: MutationOptions<{ message: string }>) {
  return useMutation(
    async ({ id, data }: { id: string; data: Partial<SavingsGoal> }) => {
      const response = await api.goals.update(id, data);
      if (!response.success) throw new Error(response.error);
      return response.data!;
    },
    {
      ...options,
      onSuccess: (data) => {
        api.utils.invalidateCache('goals');
        api.utils.invalidateCache('dashboard');
        options?.onSuccess?.(data);
      }
    }
  );
}

export function useDeleteGoal(options?: MutationOptions<{ message: string }>) {
  return useMutation(
    async (id: string) => {
      const response = await api.goals.delete(id);
      if (!response.success) throw new Error(response.error);
      return response.data!;
    },
    {
      ...options,
      onSuccess: (data) => {
        api.utils.invalidateCache('goals');
        api.utils.invalidateCache('dashboard');
        options?.onSuccess?.(data);
      }
    }
  );
}

export function useContributeToGoal(options?: MutationOptions<{ message: string }>) {
  return useMutation(
    async ({ goalId, amount }: { goalId: string; amount: number }) => {
      const response = await api.goals.contribute(goalId, amount);
      if (!response.success) throw new Error(response.error);
      return response.data!;
    },
    {
      ...options,
      onSuccess: (data) => {
        api.utils.invalidateCache('goals');
        api.utils.invalidateCache('dashboard');
        options?.onSuccess?.(data);
      }
    }
  );
}

// Milestone mutations
export function useCreateMilestone(options?: MutationOptions<{ milestoneId: string; message: string }>) {
  return useMutation(
    async ({ goalId, data }: { goalId: string; data: { amount: number; description: string } }) => {
      const response = await api.goals.milestones.create(goalId, data);
      if (!response.success) throw new Error(response.error);
      return response.data!;
    },
    {
      ...options,
      onSuccess: (data) => {
        api.utils.invalidateCache('goals');
        options?.onSuccess?.(data);
      }
    }
  );
}

export function useCompleteMilestone(options?: MutationOptions<{ message: string }>) {
  return useMutation(
    async ({ goalId, milestoneId }: { goalId: string; milestoneId: string }) => {
      const response = await api.goals.milestones.complete(goalId, milestoneId);
      if (!response.success) throw new Error(response.error);
      return response.data!;
    },
    {
      ...options,
      onSuccess: (data) => {
        api.utils.invalidateCache('goals');
        api.utils.invalidateCache('dashboard');
        options?.onSuccess?.(data);
      }
    }
  );
}

// Notification mutations
export function useMarkNotificationRead(options?: MutationOptions<{ message: string }>) {
  return useMutation(
    async (id: string) => {
      const response = await api.notifications.markRead(id);
      if (!response.success) throw new Error(response.error);
      return response.data!;
    },
    {
      ...options,
      onSuccess: (data) => {
        api.utils.invalidateCache('notifications');
        options?.onSuccess?.(data);
      }
    }
  );
}

export function useMarkAllNotificationsRead(options?: MutationOptions<{ message: string }>) {
  return useMutation(
    async () => {
      const response = await api.notifications.markAllRead();
      if (!response.success) throw new Error(response.error);
      return response.data!;
    },
    {
      ...options,
      onSuccess: (data) => {
        api.utils.invalidateCache('notifications');
        options?.onSuccess?.(data);
      }
    }
  );
}

// Settings mutations
export function useUpdateSettings(options?: MutationOptions<{ message: string }>) {
  return useMutation(
    async (data: Parameters<typeof api.settings.update>[0]) => {
      const response = await api.settings.update(data);
      if (!response.success) throw new Error(response.error);
      return response.data!;
    },
    {
      ...options,
      onSuccess: (data) => {
        api.utils.invalidateCache('settings');
        options?.onSuccess?.(data);
      }
    }
  );
}

// Profile mutations
export function useUpdateProfile(options?: MutationOptions<any>) {
  return useMutation(
    async (data: Parameters<typeof api.auth.updateProfile>[0]) => {
      const response = await api.auth.updateProfile(data);
      if (!response.success) throw new Error(response.error);
      return response.data!;
    },
    {
      ...options,
      onSuccess: (data) => {
        api.utils.invalidateCache('profile');
        options?.onSuccess?.(data);
      }
    }
  );
}

// Auth mutations
export function useLogin(options?: MutationOptions<{ user: any; token: string }>) {
  return useMutation(
    async ({ email, password }: { email: string; password: string }) => {
      const response = await api.auth.login(email, password);
      if (!response.success) throw new Error(response.error);
      return response.data!;
    },
    options
  );
}

export function useRegister(options?: MutationOptions<{ user: any; token: string }>) {
  return useMutation(
    async (data: Parameters<typeof api.auth.register>[0]) => {
      const response = await api.auth.register(data);
      if (!response.success) throw new Error(response.error);
      return response.data!;
    },
    options
  );
}

export function useLogout(options?: MutationOptions<void>) {
  return useMutation(
    async () => {
      await api.auth.logout();
    },
    {
      ...options,
      onSuccess: () => {
        // Clear all cache
        api.utils.clearCache();
        options?.onSuccess?.();
      }
    }
  );
}