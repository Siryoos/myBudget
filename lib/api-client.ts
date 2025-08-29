/**
 * Client-side API wrapper for making requests to backend services
 * This avoids importing server-side modules like database connections
 */

import type { User, UserProfile, Budget, Transaction, SavingsGoal, ApiResponse } from '@/types';
import type { RegisterResponse } from '@/types/api';

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl;
  }

  getToken(): string | null {
    // Try different storage mechanisms
    if (typeof window !== 'undefined') {
      return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    }
    return null;
  }

  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getToken();

    // Merge headers and attach Authorization if available
    const mergedHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers instanceof Headers
        ? Object.fromEntries(options.headers.entries())
        : (options.headers as Record<string, string> | undefined) || {}),
    };
    if (token && !mergedHeaders.Authorization) {
      mergedHeaders.Authorization = `Bearer ${token}`;
    }

    // Apply a default timeout (10s) unless a signal is provided
    let controller: AbortController | null = null;
    let timeoutId: NodeJS.Timeout | null = null;
    const signal = options.signal;
    if (!signal) {
      controller = new AbortController();
      timeoutId = setTimeout(() => controller?.abort(), 10000);
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: mergedHeaders,
      signal: signal || controller?.signal,
    }).finally(() => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Request failed');
    }

    return response.json();
  }

  // User/Auth methods
  async login(email: string, password: string): Promise<ApiResponse<any>> {
    return this.request<ApiResponse<any>>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async register(data: any): Promise<ApiResponse<RegisterResponse>> {
    return this.request<ApiResponse<RegisterResponse>>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getUserProfile(userId: string): Promise<UserProfile> {
    return this.request<UserProfile>(`/users/${userId}`);
  }

  async updateUserProfile(userId: string, data: any): Promise<UserProfile> {
    return this.request<UserProfile>(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async logout(): Promise<void> {
    return this.request<void>('/auth/logout', {
      method: 'POST',
    });
  }

  async getProfile(): Promise<ApiResponse<User>> {
    return this.request<ApiResponse<User>>('/auth/profile');
  }

  async updateProfile(data: Partial<User>): Promise<ApiResponse<User>> {
    return this.request<ApiResponse<User>>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Budget methods
  async getBudgets(userId: string): Promise<Budget[]>;
  async getBudgets(): Promise<ApiResponse<Budget[]>>;
  async getBudgets(userId?: string): Promise<Budget[] | ApiResponse<Budget[]>> {
    if (typeof userId === 'string') {
      const res = await this.request<any>(`/budgets?userId=${encodeURIComponent(userId)}`);
      return res?.data ?? res;
    }
    return this.request<ApiResponse<Budget[]>>('/budgets');
  }

  async createBudget(data: any): Promise<Budget> {
    return this.request<Budget>('/budgets', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateBudget(id: string, data: any): Promise<Budget> {
    return this.request<Budget>(`/budgets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async getBudget(id: string): Promise<ApiResponse<Budget>> {
    return this.request<ApiResponse<Budget>>(`/budgets/${id}`);
  }

  async deleteBudget(id: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<ApiResponse<{ message: string }>>(`/budgets/${id}`, {
      method: 'DELETE',
    });
  }

  // Transaction methods
  async getTransactions(userId: string): Promise<Transaction[]>;
  async getTransactions(params?: any): Promise<ApiResponse<{ transactions: Transaction[]; total?: number; pages?: number }>>;
  async getTransactions(arg?: any): Promise<any> {
    if (typeof arg === 'string') {
      const res = await this.request<any>(`/transactions?userId=${encodeURIComponent(arg)}`);
      return res?.data ?? res;
    }
    const search = arg
      ? `?${new URLSearchParams(Object.entries(arg).reduce((acc, [k, v]) => {
          if (v !== undefined && v !== null) acc[String(k)] = String(v);
          return acc;
        }, {} as Record<string, string>)).toString()}`
      : '';
    return this.request<ApiResponse<{ transactions: Transaction[]; total?: number; pages?: number }>>(`/transactions${search}`);
  }

  async createTransaction(data: any): Promise<ApiResponse<Transaction>> {
    return this.request<ApiResponse<Transaction>>('/transactions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getTransaction(id: string): Promise<ApiResponse<Transaction>> {
    return this.request<ApiResponse<Transaction>>(`/transactions/${id}`);
  }

  async updateTransaction(id: string, data: any): Promise<ApiResponse<Transaction>> {
    return this.request<ApiResponse<Transaction>>(`/transactions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteTransaction(id: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<ApiResponse<{ message: string }>>(`/transactions/${id}`, {
      method: 'DELETE',
    });
  }

  // Goals methods
  async getGoals(priority?: 'low' | 'medium' | 'high'): Promise<ApiResponse<SavingsGoal[]>> {
    const search = priority ? `?priority=${encodeURIComponent(priority)}` : '';
    return this.request<ApiResponse<SavingsGoal[]>>(`/goals${search}`);
  }

  async getGoal(id: string): Promise<ApiResponse<SavingsGoal>> {
    return this.request<ApiResponse<SavingsGoal>>(`/goals/${id}`);
  }

  async createGoal(data: any): Promise<ApiResponse<SavingsGoal>> {
    return this.request<ApiResponse<SavingsGoal>>('/goals', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateGoal(id: string, data: any): Promise<ApiResponse<SavingsGoal>> {
    return this.request<ApiResponse<SavingsGoal>>(`/goals/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteGoal(id: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<ApiResponse<{ message: string }>>(`/goals/${id}`, {
      method: 'DELETE',
    });
  }

  async addGoalContribution(goalId: string, amount: number): Promise<ApiResponse<{ message: string }>> {
    return this.request<ApiResponse<{ message: string }>>(`/goals/${goalId}/contributions`, {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
  }

  async createMilestone(goalId: string, data: { amount: number; description: string }): Promise<ApiResponse<any>> {
    return this.request<ApiResponse<any>>(`/goals/${goalId}/milestones`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async completeMilestone(goalId: string, milestoneId: string): Promise<ApiResponse<any>> {
    return this.request<ApiResponse<any>>(`/goals/${goalId}/milestones/${milestoneId}/complete`, {
      method: 'POST',
    });
  }

  // Settings methods
  async getSettings(): Promise<ApiResponse<any>> {
    return this.request<ApiResponse<any>>('/user/settings');
  }
  async updateSettings(data: any): Promise<any> {
    return this.request<any>('/user/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Notifications
  async getNotifications(unreadOnly?: boolean): Promise<ApiResponse<any>> {
    const search = unreadOnly ? '?unreadOnly=true' : '';
    return this.request<ApiResponse<any>>(`/notifications${search}`);
  }

  async markNotificationRead(id: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<ApiResponse<{ message: string }>>(`/notifications/${id}/read`, {
      method: 'POST',
    });
  }

  async markAllNotificationsRead(): Promise<ApiResponse<{ message: string }>> {
    return this.request<ApiResponse<{ message: string }>>('/notifications/read-all', {
      method: 'POST',
    });
  }

  // Dashboard
  async getDashboard(): Promise<ApiResponse<any>> {
    return this.request<ApiResponse<any>>('/dashboard');
  }

  // Achievements
  async getAchievements(): Promise<ApiResponse<any>> {
    return this.request<ApiResponse<any>>('/achievements');
  }

  // Analytics
  async getAnalytics(params?: any): Promise<ApiResponse<any>> {
    const search = params
      ? `?${new URLSearchParams(Object.entries(params).reduce((acc, [k, v]) => {
          if (v !== undefined && v !== null) acc[String(k)] = String(v);
          return acc;
        }, {} as Record<string, string>)).toString()}`
      : '';
    return this.request<ApiResponse<any>>(`/analytics${search}`);
  }

  // Utils
  setToken(token: string | null): void {
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('authToken', token);
      } else {
        localStorage.removeItem('authToken');
      }
    }
  }

  clearCache(): void {}
  invalidateCache(_pattern: string): void {}
}

// Singleton instance
export const apiClient = new ApiClient();
