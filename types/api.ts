import type { UserRole } from './auth';

// Base API response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  details?: unknown;
  timestamp?: string;
  requestId?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T> {
  data?: T;
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

export interface ApiError {
  code: string;
  message: string;
  field?: string;
  details?: Record<string, unknown>;
}

// Authentication types
export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  user: User;
  token: string;
  refreshToken?: string;
  expiresIn: number;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  dateOfBirth: string;
  monthlyIncome: number;
  currency?: string;
  language?: string;
}

export interface RegisterResponse {
  user: User;
  token: string;
  requiresEmailVerification?: boolean;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  token: string;
  refreshToken?: string;
  expiresIn: number;
}

// User types
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  dateOfBirth?: string;
  monthlyIncome?: number;
  currency?: string;
  language?: string;
  profilePhotoUrl?: string;
  emailVerified?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateProfileRequest {
  name?: string;
  email?: string;
  dateOfBirth?: string;
  monthlyIncome?: number;
  currency?: string;
  language?: string;
}

// Transaction types
export interface Transaction {
  id: string;
  userId: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  description?: string;
  date: string;
  isRecurring?: boolean;
  recurringFrequency?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  tags?: string[];
  attachments?: string[];
  location?: {
    lat: number;
    lng: number;
    address?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateTransactionRequest {
  type: 'income' | 'expense';
  amount: number;
  category: string;
  description?: string;
  date: string;
  isRecurring?: boolean;
  recurringFrequency?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  tags?: string[];
}

export interface TransactionFilters {
  page?: number;
  limit?: number;
  category?: string;
  type?: 'income' | 'expense';
  startDate?: string;
  endDate?: string;
  search?: string;
  tags?: string[];
  minAmount?: number;
  maxAmount?: number;
}

export interface TransactionsResponse {
  transactions: Transaction[];
  total: number;
  pages: number;
}

// Budget types
export interface Budget {
  id: string;
  userId: string;
  name: string;
  method: '50-30-20' | 'pay-yourself-first' | 'envelope' | 'zero-based' | 'kakeibo';
  totalIncome: number;
  period: 'weekly' | 'monthly' | 'yearly';
  startDate: string;
  endDate: string;
  categories: BudgetCategory[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BudgetCategory {
  id: string;
  name: string;
  allocated: number;
  spent: number;
  remaining: number;
  color: string;
  icon?: string;
  isEssential?: boolean;
  subcategories?: BudgetSubcategory[];
}

export interface BudgetSubcategory {
  id: string;
  name: string;
  allocated: number;
  spent: number;
}

export interface CreateBudgetRequest {
  name: string;
  method: Budget['method'];
  totalIncome: number;
  period: Budget['period'];
  startDate: string;
  endDate: string;
  categories: Array<{
    name: string;
    allocated: number;
    color: string;
    icon?: string;
    isEssential?: boolean;
  }>;
}

export interface CreateBudgetResponse {
  budgetId: string;
  message: string;
}

// Goals types
export interface SavingsGoal {
  id: string;
  userId: string;
  name: string;
  description?: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: Date;
  category: string;
  priority: 'low' | 'medium' | 'high';
  isActive: boolean;
  icon?: string;
  color?: string;
  photoUrl?: string;
  framingType?: 'achievement' | 'loss-avoidance';
  achievementDescription?: string;
  lossAvoidanceDescription?: string;
  milestones?: Milestone[];
  contributions?: Contribution[];
  automationRules?: AutomationRule[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Milestone {
  id: string;
  amount: number;
  description: string;
  isCompleted: boolean;
  completedDate?: Date;
}

export interface Contribution {
  id: string;
  amount: number;
  date: Date;
  note?: string;
  source?: string;
}

export interface RuleCondition {
  field: string;
  operator: 'equals' | 'greater_than' | 'less_than' | 'contains';
  value: string | number;
}

export interface AutomationRule {
  id: string;
  type: 'fixed' | 'percentage' | 'round-up' | 'remainder';
  amount?: number;
  percentage?: number;
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  isActive: boolean;
  conditions?: RuleCondition[];
}

export interface CreateGoalRequest {
  name: string;
  description?: string;
  targetAmount: number;
  targetDate: string;
  priority: SavingsGoal['priority'];
  category: string;
  icon?: string;
  color?: string;
}

export interface CreateGoalResponse {
  goalId: string;
  message: string;
}

export interface AddContributionRequest {
  amount: number;
  note?: string;
}

// Dashboard types
export interface DashboardData {
  overview: {
    totalBalance: number;
    monthlyIncome: number;
    monthlyExpenses: number;
    savingsRate: number;
    netWorth: number;
  };
  recentTransactions: Transaction[];
  budgetStatus: {
    utilized: number;
    remaining: number;
    categories: Array<{
      name: string;
      spent: number;
      allocated: number;
      percentage: number;
    }>;
  };
  goals: {
    active: number;
    completed: number;
    totalSaved: number;
    totalTarget: number;
  };
  trends: {
    savingsRate: {
      current: number;
      previous: number;
      change: number;
    };
    spending: {
      current: number;
      previous: number;
      change: number;
    };
    income: {
      current: number;
      previous: number;
      change: number;
    };
    budgetAdherence: {
      current: number;
      previous: number;
      change: number;
    };
  };
  analytics: {
    monthlyAverage: number;
    topCategories: Array<{
      category: string;
      amount: number;
      percentage: number;
    }>;
    savingStreak: number;
    totalSaved: number;
  };
}

// Notification types
export interface Notification {
  id: string;
  userId: string;
  type: 'info' | 'warning' | 'success' | 'error' | 'insight' | 'budget_alert';
  title: string;
  message: string;
  category?: string;
  priority?: 'low' | 'medium' | 'high';
  actionUrl?: string;
  actionLabel?: string;
  isRead: boolean;
  createdAt: string;
  readAt?: string;
}

// Achievement types
export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  points: number;
  category: 'savings' | 'budget' | 'streak' | 'milestone' | 'social';
  isUnlocked: boolean;
  unlockedAt?: Date;
  progress: number;
  requirement: {
    type: string;
    value: number;
    current?: number;
  };
}

// Analytics types
export interface AnalyticsRequest {
  startDate?: string;
  endDate?: string;
  groupBy?: 'day' | 'week' | 'month' | 'year';
  categories?: string[];
  metrics?: string[];
}

export interface AnalyticsResponse {
  period: {
    start: string;
    end: string;
  };
  metrics: {
    totalIncome: number;
    totalExpenses: number;
    netSavings: number;
    savingsRate: number;
    avgDailySpend: number;
    transactionCount: number;
  };
  trends: Array<{
    date: string;
    income: number;
    expenses: number;
    savings: number;
  }>;
  categoryBreakdown: Array<{
    category: string;
    amount: number;
    percentage: number;
    count: number;
  }>;
  insights: Array<{
    type: string;
    message: string;
    impact: 'low' | 'medium' | 'high';
    action?: string;
  }>;
}

// Settings types
export interface UserSettings {
  notifications: {
    email: boolean;
    push: boolean;
    budgetAlerts: boolean;
    goalReminders: boolean;
    achievementUnlocks: boolean;
  };
  privacy: {
    shareProgress: boolean;
    publicProfile: boolean;
  };
  preferences: {
    theme: 'light' | 'dark' | 'system';
    dashboardLayout: string;
    defaultBudgetMethod: string;
    timezone?: string;
    riskTolerance?: string;
    savingsRate?: number;
    dependents?: number;
  };
}

export interface UpdateSettingsRequest {
  notifications?: Partial<UserSettings['notifications']>;
  privacy?: Partial<UserSettings['privacy']>;
  preferences?: Partial<UserSettings['preferences']>;
}

// File upload types
export interface UploadRequest {
  file: File;
  folder?: string;
  generateThumbnail?: boolean;
}

export interface UploadResponse {
  url: string;
  thumbnailUrl?: string;
  publicId: string;
  size: number;
  mimeType: string;
}

export interface PresignedUrlRequest {
  fileName: string;
  mimeType: string;
  folder?: string;
}

export interface PresignedUrlResponse {
  uploadUrl: string;
  publicUrl: string;
  publicId: string;
  expiresAt: string;
}

