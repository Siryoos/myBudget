import { 
  Transaction, 
  Budget, 
  BudgetCategory, 
  SavingsGoal, 
  Milestone,
  Achievement,
  FinancialInsight,
  ApiResponse
} from '@/types';
import type { Notification } from '@/types/api';
import type { DashboardData } from '@/types';

interface RequestOptions {
  cache?: boolean;
  retry?: number;
  timeout?: number;
}

class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface PendingRequest {
  promise: Promise<any>;
  timestamp: number;
}

export class ApiClient {
  private baseUrl: string;
  private token: string | null = null;
  private refreshToken: string | null = null;
  private refreshPromise: Promise<string> | null = null;
  private requestCache = new Map<string, PendingRequest>();
  private cacheTimeout = 5000; // 5 seconds cache
  private maxRetries = 3;
  private requestTimeout = 30000; // 30 seconds

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
  }

  setToken(token: string | null, refreshToken?: string | null) {
    this.token = token;
    if (refreshToken !== undefined) {
      this.refreshToken = refreshToken;
    }
    
    if (token && typeof window !== 'undefined') {
      localStorage.setItem('authToken', token);
      if (this.refreshToken) {
        localStorage.setItem('refreshToken', this.refreshToken);
      }
    } else if (typeof window !== 'undefined') {
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      this.refreshToken = null;
    }
  }

  getToken(): string | null {
    return this.token;
  }

  private getCacheKey(url: string, options?: RequestInit): string {
    return `${options?.method || 'GET'}-${url}-${JSON.stringify(options?.body || '')}`;
  }

  private shouldRetry(error: any, attempt: number, maxRetries: number): boolean {
    if (attempt >= maxRetries) return false;
    
    // Retry on network errors or 5xx server errors
    if (!error.status) return true; // Network error
    if (error.status >= 500 && error.status < 600) return true;
    if (error.status === 429) return true; // Rate limited
    
    return false;
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async refreshToken(): Promise<string> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      try {
        // Load refresh token from storage if not in memory
        if (!this.refreshToken && typeof window !== 'undefined') {
          this.refreshToken = localStorage.getItem('refreshToken');
        }
        
        if (!this.refreshToken) {
          throw new Error('No refresh token available');
        }
        
        const response = await fetch(`${this.baseUrl}/api/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            refreshToken: this.refreshToken
          })
        });

        let data: any;
        try {
          data = await response.json();
        } catch (parseError) {
          throw new ApiError(
            'Failed to parse refresh token response',
            response.status,
            { parseError: parseError instanceof Error ? parseError.message : 'Unknown parse error' }
          );
        }

        if (!response.ok) {
          throw new ApiError(
            'Token refresh failed',
            response.status,
            data
          );
        }

        // Validate response structure
        if (!data || typeof data !== 'object') {
          throw new ApiError(
            'Invalid refresh token response format',
            response.status,
            data
          );
        }

        if (!data.data || typeof data.data !== 'object') {
          throw new ApiError(
            'Missing or invalid data property in refresh response',
            response.status,
            data
          );
        }

        // Support both old format (token) and new format (accessToken/refreshToken)
        const accessToken = data.data.accessToken || data.data.token;
        const refreshToken = data.data.refreshToken;
        
        if (!accessToken || typeof accessToken !== 'string' || accessToken.trim() === '') {
          throw new ApiError(
            'Missing or invalid access token in refresh response',
            response.status,
            data
          );
        }

        this.setToken(accessToken, refreshToken);
        return accessToken;
      } catch (error) {
        // Re-throw ApiError instances, wrap others
        if (error instanceof ApiError) {
          throw error;
        }
        
        // Wrap unexpected errors
        throw new ApiError(
          'Token refresh failed with unexpected error',
          undefined,
          { originalError: error instanceof Error ? error.message : 'Unknown error' }
        );
      } finally {
        this.refreshPromise = null;
      }
    })() as Promise<string>;

    return this.refreshPromise;
  }

  public async request<T>(
    url: string,
    options: RequestInit = {},
    requestOptions: RequestOptions = {}
  ): Promise<T> {
    const fullUrl = `${this.baseUrl}${url}`;
    const cacheKey = this.getCacheKey(fullUrl, options);
    
    // Check cache for GET requests
    if (options.method === 'GET' || !options.method) {
      const cached = this.requestCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.promise;
      }
    }

    const makeRequest = async (attempt: number = 0): Promise<T> => {
      // Create new AbortController and timeout for each attempt to ensure
      // retries don't reuse already-aborted signals or expired timers
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        requestOptions.timeout ?? this.requestTimeout
      );
      
      try {
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
          ...options.headers
        };

        if (this.token) {
          (headers as Record<string, string>)['Authorization'] = `Bearer ${this.token}`;
        }

        const response = await fetch(fullUrl, {
          ...options,
          headers,
          signal: controller.signal
        });

        // Handle 401 Unauthorized - try to refresh token once
        if (response.status === 401 && this.token && attempt === 0) {
          await this.refreshToken();
          return makeRequest(attempt + 1);
        }

        const data = await response.json();

        if (!response.ok) {
          throw new ApiError(
            data.error || 'Request failed',
            response.status,
            data.details
          );
        }

        return data;
      } catch (error: any) {
        if (error.name === 'AbortError') {
          throw new ApiError('Request timeout', 408);
        }

        if (this.shouldRetry(error, attempt, requestOptions.retry || this.maxRetries)) {
          // Exponential backoff
          await this.delay(Math.pow(2, attempt) * 1000);
          return makeRequest(attempt + 1);
        }

        throw error;
      } finally {
        clearTimeout(timeoutId);
      }
    };

    const promise = makeRequest();

    // Cache GET requests
    if (options.method === 'GET' || !options.method) {
      this.requestCache.set(cacheKey, {
        promise,
        timestamp: Date.now()
      });

      // Clean up old cache entries
      if (this.requestCache.size > 100) {
        const entries = Array.from(this.requestCache.entries());
        const now = Date.now();
        entries.forEach(([key, value]) => {
          if (now - value.timestamp > this.cacheTimeout) {
            this.requestCache.delete(key);
          }
        });
      }
    }

    return promise;
  }

  // Authentication endpoints
  async login(email: string, password: string): Promise<ApiResponse<{ user: any; token: string }>> {
    const response = await this.request<ApiResponse<{ user: any; token: string }>>(
      '/api/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ email, password })
      }
    );
    
    if (response.data?.token) {
      this.setToken(response.data.token);
    }
    
    return response;
  }

  async register(data: {
    email: string;
    password: string;
    name: string;
    dateOfBirth: string;
    monthlyIncome: number;
    currency?: string;
    language?: string;
  }): Promise<ApiResponse<{ user: any; token: string }>> {
    const response = await this.request<ApiResponse<{ user: any; token: string }>>(
      '/api/auth/register',
      {
        method: 'POST',
        body: JSON.stringify(data)
      }
    );
    
    if (response.data?.token) {
      this.setToken(response.data.token);
    }
    
    return response;
  }

  async logout(): Promise<void> {
    try {
      await this.request('/api/auth/logout', { method: 'POST' });
    } finally {
      this.setToken(null);
    }
  }

  async getProfile(): Promise<ApiResponse<any>> {
    return this.request('/api/auth/profile');
  }

  async updateProfile(data: Partial<{
    name: string;
    email: string;
    monthlyIncome: number;
    currency: string;
    language: string;
  }>): Promise<ApiResponse<any>> {
    return this.request('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  // Dashboard endpoints
  async getDashboard(): Promise<ApiResponse<DashboardData>> {
    return this.request('/api/dashboard');
  }

  // Transactions endpoints
  async getTransactions(params?: {
    page?: number;
    limit?: number;
    category?: string;
    type?: 'income' | 'expense';
    startDate?: string;
    endDate?: string;
    search?: string;
  }): Promise<ApiResponse<{ transactions: Transaction[]; total: number; pages: number }>> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });
    }
    
    return this.request(`/api/transactions?${searchParams.toString()}`);
  }

  async getTransaction(id: string): Promise<ApiResponse<Transaction>> {
    return this.request(`/api/transactions/${id}`);
  }

  async createTransaction(data: {
    type: 'income' | 'expense';
    amount: number;
    category: string;
    description?: string;
    date: string;
    isRecurring?: boolean;
    recurringFrequency?: 'daily' | 'weekly' | 'monthly' | 'yearly';
    tags?: string[];
  }): Promise<ApiResponse<Transaction>> {
    return this.request('/api/transactions', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateTransaction(id: string, data: Partial<Transaction>): Promise<ApiResponse<Transaction>> {
    return this.request('/api/transactions', {
      method: 'PUT',
      body: JSON.stringify({ id, ...data })
    });
  }

  async deleteTransaction(id: string): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/api/transactions?id=${id}`, {
      method: 'DELETE'
    });
  }

  // Budgets endpoints
  async getBudgets(): Promise<ApiResponse<Budget[]>> {
    return this.request('/api/budgets');
  }

  async getBudget(id: string): Promise<ApiResponse<Budget>> {
    return this.request(`/api/budgets/${id}`);
  }

  async createBudget(data: {
    name: string;
    method: '50-30-20' | 'pay-yourself-first' | 'envelope' | 'zero-based' | 'kakeibo';
    totalIncome: number;
    period: 'weekly' | 'monthly' | 'yearly';
    startDate: string;
    endDate: string;
    categories: Array<{
      name: string;
      allocated: number;
      color: string;
      icon?: string;
      isEssential?: boolean;
    }>;
  }): Promise<ApiResponse<{ budgetId: string; message: string }>> {
    return this.request('/api/budgets', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateBudget(id: string, data: Partial<Budget>): Promise<ApiResponse<{ message: string }>> {
    return this.request('/api/budgets', {
      method: 'PUT',
      body: JSON.stringify({ id, ...data })
    });
  }

  async deleteBudget(id: string): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/api/budgets?id=${id}`, {
      method: 'DELETE'
    });
  }

  // Goals endpoints
  async getGoals(priority?: 'low' | 'medium' | 'high'): Promise<ApiResponse<SavingsGoal[]>> {
    const searchParams = priority ? `?priority=${priority}` : '';
    return this.request(`/api/goals${searchParams}`);
  }

  async getGoal(id: string): Promise<ApiResponse<SavingsGoal>> {
    return this.request(`/api/goals/${id}`);
  }

  async createGoal(data: {
    name: string;
    description?: string;
    targetAmount: number;
    targetDate: string;
    priority: 'low' | 'medium' | 'high';
    category: string;
    icon?: string;
    color?: string;
  }): Promise<ApiResponse<{ goalId: string; message: string }>> {
    return this.request('/api/goals', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateGoal(id: string, data: Partial<SavingsGoal>): Promise<ApiResponse<{ message: string }>> {
    return this.request('/api/goals', {
      method: 'PUT',
      body: JSON.stringify({ id, ...data })
    });
  }

  async deleteGoal(id: string): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/api/goals?id=${id}`, {
      method: 'DELETE'
    });
  }

  async addGoalContribution(goalId: string, amount: number): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/api/goals/${goalId}/contribute`, {
      method: 'POST',
      body: JSON.stringify({ amount })
    });
  }

  // Milestones endpoints
  async createMilestone(goalId: string, data: {
    amount: number;
    description: string;
  }): Promise<ApiResponse<{ milestoneId: string; message: string }>> {
    return this.request(`/api/goals/${goalId}/milestones`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async completeMilestone(goalId: string, milestoneId: string): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/api/goals/${goalId}/milestones/${milestoneId}/complete`, {
      method: 'POST'
    });
  }

  // Analytics endpoints
  async getAnalytics(params?: {
    startDate?: string;
    endDate?: string;
    groupBy?: 'day' | 'week' | 'month' | 'year';
  }): Promise<ApiResponse<any>> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });
    }
    
    return this.request(`/api/analytics?${searchParams.toString()}`);
  }

  // Notifications endpoints
  async getNotifications(unreadOnly?: boolean): Promise<ApiResponse<Notification[]>> {
    const searchParams = unreadOnly ? '?unread=true' : '';
    return this.request(`/api/notifications${searchParams}`);
  }

  async markNotificationRead(id: string): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/api/notifications/${id}/read`, {
      method: 'POST'
    });
  }

  async markAllNotificationsRead(): Promise<ApiResponse<{ message: string }>> {
    return this.request('/api/notifications/read-all', {
      method: 'POST'
    });
  }

  // Achievements endpoints
  async getAchievements(): Promise<ApiResponse<Achievement[]>> {
    return this.request('/api/achievements');
  }

  // Settings endpoints
  async getSettings(): Promise<ApiResponse<any>> {
    return this.request('/api/settings');
  }

  async updateSettings(data: {
    notifications?: {
      email?: boolean;
      push?: boolean;
      budgetAlerts?: boolean;
      goalReminders?: boolean;
      achievementUnlocks?: boolean;
    };
    privacy?: {
      shareProgress?: boolean;
      publicProfile?: boolean;
    };
    preferences?: {
      theme?: 'light' | 'dark' | 'system';
      dashboardLayout?: string;
      defaultBudgetMethod?: string;
    };
  }): Promise<ApiResponse<{ message: string }>> {
    return this.request('/api/settings', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  // Utility method to clear cache
  clearCache(): void {
    this.requestCache.clear();
  }

  // Utility method to invalidate specific cache entries
  invalidateCache(pattern: string): void {
    const keys = Array.from(this.requestCache.keys());
    keys.forEach(key => {
      if (key.includes(pattern)) {
        this.requestCache.delete(key);
      }
    });
  }

  // Insights API
  async getInsights(params?: {
    type?: 'insight' | 'budget_alert' | 'achievement' | 'all';
    category?: string;
    priority?: 'low' | 'medium' | 'high';
    isRead?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<FinancialInsight[]>> {
    const searchParams = new URLSearchParams();
    if (params?.type) searchParams.append('type', params.type);
    if (params?.category) searchParams.append('category', params.category);
    if (params?.priority) searchParams.append('priority', params.priority);
    if (params?.isRead !== undefined) searchParams.append('isRead', params.isRead.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.offset) searchParams.append('offset', params.offset.toString());
    
    return this.request(`/api/insights?${searchParams.toString()}`);
  }

  async createInsight(insightData: {
    type: 'insight' | 'budget_alert' | 'achievement';
    title: string;
    message: string;
    category?: string;
    priority?: 'low' | 'medium' | 'high';
    actionUrl?: string;
    actionData?: Record<string, any>;
  }): Promise<ApiResponse<any>> {
    return this.request('/api/insights', {
      method: 'POST',
      body: JSON.stringify(insightData)
    });
  }

  // File Upload API
  async getPresignedUrl(data: {
    fileName: string;
    mimeType: string;
    fileSize: number;
    folder?: string;
  }): Promise<ApiResponse<{
    uploadUrl: string;
    publicUrl: string;
    publicId: string;
    fileKey: string;
    expiresAt: string;
  }>> {
    return this.request('/api/upload/presigned', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async completeUpload(data: {
    publicId: string;
    url: string;
    thumbnailUrl?: string;
    size: number;
    mimeType: string;
    originalName: string;
  }): Promise<ApiResponse<any>> {
    return this.request('/api/upload/complete', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
}

// Create singleton instance
export const apiClient = new ApiClient();

// Export for testing or multiple instances
export default ApiClient;
