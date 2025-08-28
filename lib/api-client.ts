/**
 * Client-side API wrapper for making requests to backend services
 * This avoids importing server-side modules like database connections
 */

import type { User, UserProfile, Budget, Transaction, SavingsGoal } from '@/types';

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
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Request failed');
    }

    return response.json();
  }

  // User/Auth methods
  async authenticate(email: string, password: string): Promise<UserProfile> {
    return this.request<UserProfile>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async register(data: any): Promise<UserProfile> {
    return this.request<UserProfile>('/auth/register', {
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

  // Budget methods
  async getBudgets(userId: string): Promise<Budget[]> {
    return this.request<Budget[]>(`/budgets?userId=${userId}`);
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

  // Transaction methods
  async getTransactions(userId: string): Promise<Transaction[]> {
    return this.request<Transaction[]>(`/transactions?userId=${userId}`);
  }

  async createTransaction(data: any): Promise<Transaction> {
    return this.request<Transaction>('/transactions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Goals methods
  async getGoals(userId: string): Promise<SavingsGoal[]> {
    return this.request<SavingsGoal[]>(`/goals?userId=${userId}`);
  }

  async createGoal(data: any): Promise<SavingsGoal> {
    return this.request<SavingsGoal>('/goals', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Settings methods
  async updateSettings(data: any): Promise<any> {
    return this.request<any>('/user/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }
}

// Singleton instance
export const apiClient = new ApiClient();