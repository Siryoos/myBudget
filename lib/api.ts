import { z } from 'zod';
import { UserRole } from '@/types/auth';

import type {
  Transaction,
  Budget,
  SavingsGoal,
  DashboardData,
  Notification,
  Achievement,
  User,
} from '@/types';

import { apiClient } from './api-client';


// Response validation schemas
const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  role: z.nativeEnum(UserRole),
  monthlyIncome: z.number(),
  currency: z.string(),
  language: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// Minimal auth user shape returned by login/register endpoints
const authUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
});

const transactionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  type: z.enum(['income', 'expense']),
  amount: z.number(),
  category: z.string(),
  description: z.string().optional(),
  date: z.string(),
  isRecurring: z.boolean(),
  recurringFrequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']).optional(),
  tags: z.array(z.string()).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const budgetCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  allocated: z.number(),
  spent: z.number(),
  remaining: z.number(),
  color: z.string(),
  icon: z.string().optional(),
  isEssential: z.boolean(),
});

const budgetSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  method: z.enum(['50-30-20', 'pay-yourself-first', 'envelope', 'zero-based', 'kakeibo']),
  totalIncome: z.number(),
  period: z.enum(['weekly', 'monthly', 'yearly']),
  startDate: z.string(),
  endDate: z.string(),
  categories: z.array(budgetCategorySchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const milestoneSchema = z.object({
  id: z.string(),
  amount: z.number(),
  description: z.string(),
  isCompleted: z.boolean(),
  completedDate: z.string().nullable(),
});

// API response schemas (expect strings for dates)
const savingsGoalApiSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  description: z.string().optional(),
  targetAmount: z.number(),
  currentAmount: z.number(),
  targetDate: z.string(),
  priority: z.enum(['low', 'medium', 'high']),
  category: z.string(),
  icon: z.string().optional(),
  color: z.string().optional(),
  milestones: z.array(milestoneSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
  isActive: z.boolean().optional().default(true),
});

// API response schemas
const notificationApiSchema = z.object({
  id: z.string(),
  userId: z.string(),
  type: z.string(),
  title: z.string(),
  message: z.string(),
  isRead: z.boolean(),
  data: z.record(z.any()).optional(),
  createdAt: z.string(),
});

const achievementApiSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  icon: z.string(),
  unlockedAt: z.string().nullable(),
  progress: z.number(),
  maxProgress: z.number(),
  category: z.string(),
  points: z.number(),
});

// API wrapper functions with validation
export const api = {
  // Authentication
  auth: {
    async login(email: string, password: string) {
      const response = await apiClient.login(email, password);
      if (response.success && response.data) {
        response.data.user = authUserSchema.parse(response.data.user) as unknown as User;
      }
      return response;
    },

    async register(data: {
      email: string;
      password: string;
      name: string;
      dateOfBirth: string;
      monthlyIncome: number;
      currency?: string;
      language?: string;
    }) {
      // Validate input
      const validatedData = z.object({
        email: z.string().email(),
        password: z.string().min(8),
        name: z.string().min(1),
        dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        monthlyIncome: z.number().positive(),
        currency: z.string().optional(),
        language: z.string().optional(),
      }).parse(data);

      const response = await apiClient.register(validatedData);
      if (response.success && response.data) {
        response.data.user = authUserSchema.parse(response.data.user) as unknown as User;
      }
      return response;
    },

    logout: () => apiClient.logout(),

    async getProfile() {
      const response = await apiClient.getProfile();
      if (response.success && response.data) {
        response.data = userSchema.parse(response.data);
      }
      return response;
    },

    async updateProfile(data: Partial<User>) {
      const response = await apiClient.updateProfile(data);
      if (response.success && response.data) {
        response.data = userSchema.parse(response.data);
      }
      return response;
    },
  },

  // Dashboard
  dashboard: {
    async get() {
      const response = await apiClient.getDashboard();
      // Dashboard data is complex, so we'll trust the type system here
      // In production, you'd want to validate this thoroughly
      return response;
    },
  },

  // Transactions
  transactions: {
    async list(params?: {
      page?: number;
      limit?: number;
      category?: string;
      type?: 'income' | 'expense';
      startDate?: string;
      endDate?: string;
      search?: string;
    }) {
      const response = await apiClient.getTransactions(params);
      if (response.success && response.data) {
        // First parse with API schema (expects strings)
        const parsedTransactions = z.array(transactionSchema).parse(response.data.transactions);
        // Then convert to frontend format (with Date objects)
        response.data.transactions = parsedTransactions.map(t => ({
          ...t,
          date: new Date(t.date),
        }));
      }
      return response;
    },

    async get(id: string) {
      const response = await apiClient.getTransaction(id);
      if (response.success && response.data) {
        // First parse with API schema (expects strings)
        const parsedTransaction = transactionSchema.parse(response.data);
        // Then convert to frontend format (with Date objects)
        response.data = {
          ...parsedTransaction,
          date: new Date(parsedTransaction.date),
        };
      }
      return response;
    },

    async create(data: {
      type: 'income' | 'expense';
      amount: number;
      category: string;
      description?: string;
      date: string;
      isRecurring?: boolean;
      recurringFrequency?: 'daily' | 'weekly' | 'monthly' | 'yearly';
      tags?: string[];
    }) {
      // Validate input
      const validatedData = z.object({
        type: z.enum(['income', 'expense']),
        amount: z.number().positive(),
        category: z.string().min(1),
        description: z.string().optional(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        isRecurring: z.boolean().optional(),
        recurringFrequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']).optional(),
        tags: z.array(z.string()).optional(),
      }).parse(data);

      const response = await apiClient.createTransaction(validatedData);
      if (response.success && response.data) {
        // First parse with API schema (expects strings)
        const parsedTransaction = transactionSchema.parse(response.data);
        // Then convert to frontend format (with Date objects)
        response.data = {
          ...parsedTransaction,
          date: new Date(parsedTransaction.date),
        };
      }
      return response;
    },

    async update(id: string, data: Partial<Transaction>) {
      const response = await apiClient.updateTransaction(id, data);
      if (response.success && response.data) {
        // First parse with API schema (expects strings)
        const parsedTransaction = transactionSchema.parse(response.data);
        // Then convert to frontend format (with Date objects)
        response.data = {
          ...parsedTransaction,
          date: new Date(parsedTransaction.date),
        };
      }
      return response;
    },

    delete: (id: string) => apiClient.deleteTransaction(id),
  },

  // Budgets
  budgets: {
    async list() {
      const response = await apiClient.getBudgets();
      if (response.success && response.data) {
        response.data = z.array(budgetSchema).parse(response.data.map(b => ({
          ...b,
          startDate: new Date(b.startDate),
          endDate: new Date(b.endDate),
        })));
      }
      return response;
    },

    async get(id: string) {
      const response = await apiClient.getBudget(id);
      if (response.success && response.data) {
        response.data = budgetSchema.parse({
          ...response.data,
          startDate: new Date(response.data.startDate),
          endDate: new Date(response.data.endDate),
        });
      }
      return response;
    },

    async create(data: {
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
    }) {
      // Validate input
      const validatedData = z.object({
        name: z.string().min(1),
        method: z.enum(['50-30-20', 'pay-yourself-first', 'envelope', 'zero-based', 'kakeibo']),
        totalIncome: z.number().positive(),
        period: z.enum(['weekly', 'monthly', 'yearly']),
        startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        categories: z.array(z.object({
          name: z.string().min(1),
          allocated: z.number().positive(),
          color: z.string().regex(/^#[0-9A-F]{6}$/i),
          icon: z.string().optional(),
          isEssential: z.boolean().optional(),
        })).min(1),
      }).parse(data);

      return apiClient.createBudget(validatedData);
    },

    update: (id: string, data: Partial<Budget>) => apiClient.updateBudget(id, data),
    delete: (id: string) => apiClient.deleteBudget(id),
  },

  // Goals
  goals: {
    async list(priority?: 'low' | 'medium' | 'high') {
      const response = await apiClient.getGoals(priority);
      if (response.success && response.data) {
        // First parse with API schema
        const parsedGoals = z.array(savingsGoalApiSchema).parse(response.data);
        // Then convert to frontend format
        response.data = parsedGoals.map(goal => ({
          ...goal,
          targetDate: new Date(goal.targetDate),
          createdAt: goal.createdAt ? new Date(goal.createdAt) : undefined,
          updatedAt: goal.updatedAt ? new Date(goal.updatedAt) : undefined,
          isActive: goal.isActive ?? true,
          milestones: goal.milestones?.map(milestone => ({
            ...milestone,
            completedDate: milestone.completedDate ? new Date(milestone.completedDate) : undefined,
          })) || [],
        }));
      }
      return response;
    },

    async get(id: string) {
      const response = await apiClient.getGoal(id);
      if (response.success && response.data) {
        // First parse with API schema
        const parsedGoal = savingsGoalApiSchema.parse(response.data);
        // Then convert to frontend format
        response.data = {
          ...parsedGoal,
          targetDate: new Date(parsedGoal.targetDate),
          createdAt: parsedGoal.createdAt ? new Date(parsedGoal.createdAt) : undefined,
          updatedAt: parsedGoal.updatedAt ? new Date(parsedGoal.updatedAt) : undefined,
          isActive: parsedGoal.isActive ?? true,
          milestones: parsedGoal.milestones?.map(milestone => ({
            ...milestone,
            completedDate: milestone.completedDate ? new Date(milestone.completedDate) : undefined,
          })) || [],
        };
      }
      return response;
    },

    async create(data: {
      name: string;
      description?: string;
      targetAmount: number;
      targetDate: string;
      priority: 'low' | 'medium' | 'high';
      category: string;
      icon?: string;
      color?: string;
    }) {
      // Validate input
      const validatedData = z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        targetAmount: z.number().positive(),
        targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        priority: z.enum(['low', 'medium', 'high']),
        category: z.string().min(1),
        icon: z.string().optional(),
        color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
      }).parse(data);

      return apiClient.createGoal(validatedData);
    },

    update: (id: string, data: Partial<SavingsGoal>) => apiClient.updateGoal(id, data),
    delete: (id: string) => apiClient.deleteGoal(id),
    contribute: (goalId: string, amount: number) => apiClient.addGoalContribution(goalId, amount),

    milestones: {
      create: (goalId: string, data: { amount: number; description: string }) =>
        apiClient.createMilestone(goalId, data),
      complete: (goalId: string, milestoneId: string) =>
        apiClient.completeMilestone(goalId, milestoneId),
    },
  },

  // Analytics
  analytics: {
    get: (params?: {
      startDate?: string;
      endDate?: string;
      groupBy?: 'day' | 'week' | 'month' | 'year';
    }) => apiClient.getAnalytics(params),
  },

  // Notifications
  notifications: {
    async list(unreadOnly?: boolean) {
      const response = await apiClient.getNotifications(unreadOnly);
      if (response.success && response.data) {
        // First parse with API schema
        const parsedNotifications = z.array(notificationApiSchema).parse(response.data);
        // Then convert to frontend format
        response.data = parsedNotifications.map(notification => ({
          ...notification,
          type: notification.type as 'info' | 'warning' | 'success' | 'error' | 'insight' | 'budget_alert',
          createdAt: notification.createdAt, // Keep as string for now to match expected type
        }));
      }
      return response;
    },

    markRead: (id: string) => apiClient.markNotificationRead(id),
    markAllRead: () => apiClient.markAllNotificationsRead(),
  },

  // Achievements
  achievements: {
    async list() {
      const response = await apiClient.getAchievements();
      if (response.success && response.data) {
        // First parse with API schema
        const parsedAchievements = z.array(achievementApiSchema).parse(response.data);
        // Then convert to frontend format
        response.data = parsedAchievements.map(achievement => ({
          ...achievement,
          requirement: 'Custom achievement', // Add default requirement
          isUnlocked: Boolean(achievement.unlockedAt),
          unlockedDate: achievement.unlockedAt ? new Date(achievement.unlockedAt) : undefined,
          unlockedAt: achievement.unlockedAt || undefined, // Convert null to undefined
        }));
      }
      return response;
    },
  },

  // Settings
  settings: {
    get: () => apiClient.getSettings(),
    update: (data: Parameters<typeof apiClient.updateSettings>[0]) =>
      apiClient.updateSettings(data),
  },

  // Utility functions
  utils: {
    clearCache: () => apiClient.clearCache(),
    invalidateCache: (pattern: string) => apiClient.invalidateCache(pattern),
    setToken: (token: string | null) => apiClient.setToken(token),
    getToken: () => apiClient.getToken(),
  },
};

// Export types for convenience
export type { Transaction, Budget, SavingsGoal, DashboardData, Notification, Achievement, User };
