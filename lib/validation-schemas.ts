import { z } from 'zod';

// Common validation schemas
export const commonSchemas = {
  email: z.string()
    .email('Invalid email format')
    .regex(/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/, 'Invalid email format'),

  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number'),

  currency: z.enum([
    'USD',
'EUR',
'GBP',
'JPY',
'CAD',
'AUD',
'CHF',
'CNY',
'INR',
'BRL',
    'KRW',
'MXN',
'SGD',
'HKD',
'NOK',
'SEK',
'DKK',
'PLN',
'CZK',
'HUF',
    'RUB',
'TRY',
'ZAR',
'THB',
'MYR',
'IDR',
'PHP',
'VND',
'BDT',
'PKR',
  ]),

  language: z.enum([
    'en',
'es',
'fr',
'de',
'it',
'pt',
'ru',
'ja',
'ko',
'zh',
    'ar',
'hi',
'bn',
'ur',
'fa',
'tr',
'nl',
'sv',
'da',
'no',
    'fi',
'pl',
'cs',
'hu',
'ro',
'bg',
'hr',
'sk',
'sl',
'et',
    'lv',
'lt',
'mt',
'el',
'he',
'th',
'vi',
'id',
'ms',
'tl',
  ]),

  dateFormat: z.enum(['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD']),

  riskTolerance: z.enum(['conservative', 'moderate', 'aggressive']),

  priority: z.enum(['low', 'medium', 'high']),

  transactionType: z.enum(['income', 'expense']),

  budgetMethod: z.enum(['50-30-20', 'pay-yourself-first', 'envelope', 'zero-based', 'kakeibo']),

  budgetPeriod: z.enum(['weekly', 'monthly', 'yearly']),

  automationRuleType: z.enum(['fixed_amount', 'percentage', 'round_up']),

  automationFrequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']),

  framingType: z.enum(['gain', 'loss']),

  achievementRequirementType: z.enum(['transaction_count', 'saving_streak', 'budget_adherence', 'goal_completion']),

  positiveDecimal: z.number().positive('Must be a positive number'),

  nonNegativeDecimal: z.number().min(0, 'Must be non-negative'),

  percentage: z.number().min(0).max(100, 'Must be between 0 and 100'),

  hexColor: z.string().regex(/^#[0-9A-F]{6}$/i, 'Must be a valid hex color'),

  url: z.string().url('Must be a valid URL'),

  futureDate: z.string().refine((date) => {
    const parsedDate = new Date(date);
    return parsedDate >= new Date();
  }, 'Date must be today or in the future'),

  pastDate: z.string().refine((date) => {
    const parsedDate = new Date(date);
    return parsedDate <= new Date(Date.now() + 24 * 60 * 60 * 1000); // Allow up to 1 day in future
  }, 'Date cannot be more than 1 day in the future'),
};

// User validation schemas
export const userSchemas = {
  create: z.object({
    email: commonSchemas.email,
    name: z.string().min(2, 'Name must be at least 2 characters').max(255),
    password: commonSchemas.password,
    dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
    monthlyIncome: commonSchemas.nonNegativeDecimal.optional(),
    currency: commonSchemas.currency.optional(),
    language: commonSchemas.language.optional(),
  }),

  update: z.object({
    email: commonSchemas.email.optional(),
    name: z.string().min(2).max(255).optional(),
    avatar: z.string().url().optional().or(z.literal('')),
    currency: commonSchemas.currency.optional(),
    language: commonSchemas.language.optional(),
    dateFormat: commonSchemas.dateFormat.optional(),
    monthlyIncome: commonSchemas.nonNegativeDecimal.optional(),
    riskTolerance: commonSchemas.riskTolerance.optional(),
    savingsRate: commonSchemas.percentage.optional(),
    debtToIncomeRatio: commonSchemas.percentage.optional(),
    creditScore: z.number().min(300).max(850).optional(),
    dependents: z.number().min(0).optional(),
  }).partial(),

  login: z.object({
    email: commonSchemas.email,
    password: z.string().min(1, 'Password is required'),
  }),

  changePassword: z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: commonSchemas.password,
    confirmPassword: z.string().min(1, 'Password confirmation is required'),
  }).refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  }),
};

// Budget validation schemas
export const budgetSchemas = {
  create: z.object({
    name: z.string().min(1, 'Name is required').max(255),
    method: commonSchemas.budgetMethod,
    totalIncome: commonSchemas.positiveDecimal,
    period: commonSchemas.budgetPeriod,
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
    categories: z.array(z.object({
      name: z.string().min(1, 'Category name is required').max(255),
      allocated: commonSchemas.positiveDecimal,
      color: commonSchemas.hexColor,
      icon: z.string().optional(),
      isEssential: z.boolean().optional(),
    })).min(1, 'At least one category is required'),
  }).refine((data) => {
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);
    return endDate > startDate;
  }, {
    message: 'End date must be after start date',
    path: ['endDate'],
  }),

  update: z.object({
    name: z.string().min(1).max(255).optional(),
    method: commonSchemas.budgetMethod.optional(),
    totalIncome: commonSchemas.positiveDecimal.optional(),
    period: commonSchemas.budgetPeriod.optional(),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  }).partial(),
};

// Budget category validation schemas
export const budgetCategorySchemas = {
  create: z.object({
    budgetId: z.string().uuid('Invalid budget ID'),
    name: z.string().min(1, 'Name is required').max(255),
    allocated: commonSchemas.positiveDecimal,
    color: commonSchemas.hexColor,
    icon: z.string().optional(),
    isEssential: z.boolean().optional(),
  }),

  update: z.object({
    name: z.string().min(1).max(255).optional(),
    allocated: commonSchemas.positiveDecimal.optional(),
    color: commonSchemas.hexColor.optional(),
    icon: z.string().optional(),
    isEssential: z.boolean().optional(),
  }).partial(),
};

// Transaction validation schemas
export const transactionSchemas = {
  create: z.object({
    type: commonSchemas.transactionType,
    amount: z.number().refine((val) => val !== 0, 'Amount cannot be zero'),
    category: z.string().min(1, 'Category is required').max(100),
    description: z.string().min(1, 'Description is required').max(HTTP_INTERNAL_SERVER_ERROR),
    date: commonSchemas.pastDate,
    budgetCategoryId: z.string().uuid().optional(),
    account: z.string().max(100).optional(),
    tags: z.array(z.string().max(50)).max(10, 'Maximum 10 tags allowed').optional(),
    isRecurring: z.boolean().optional(),
    recurringFrequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']).optional(),
  }),

  update: z.object({
    type: commonSchemas.transactionType.optional(),
    amount: z.number().refine((val) => val !== 0).optional(),
    category: z.string().min(1).max(100).optional(),
    description: z.string().min(1).max(HTTP_INTERNAL_SERVER_ERROR).optional(),
    date: commonSchemas.pastDate.optional(),
    budgetCategoryId: z.string().uuid().optional(),
    account: z.string().max(100).optional(),
    tags: z.array(z.string().max(50)).max(10).optional(),
    isRecurring: z.boolean().optional(),
    recurringFrequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']).optional(),
  }).partial(),

  filter: z.object({
    page: z.number().min(1).optional(),
    limit: z.number().min(1).max(100).optional(),
    category: z.string().optional(),
    type: commonSchemas.transactionType.optional(),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    search: z.string().optional(),
    minAmount: commonSchemas.nonNegativeDecimal.optional(),
    maxAmount: commonSchemas.nonNegativeDecimal.optional(),
  }).partial(),
};

// Savings goal validation schemas
export const savingsGoalSchemas = {
  create: z.object({
    name: z.string().min(1, 'Name is required').max(255),
    description: z.string().max(1000).optional(),
    targetAmount: commonSchemas.positiveDecimal,
    targetDate: commonSchemas.futureDate,
    priority: commonSchemas.priority,
    category: z.string().min(1, 'Category is required').max(50),
    icon: z.string().optional(),
    color: commonSchemas.hexColor.optional(),
    photoUrl: commonSchemas.url.optional(),
    framingType: commonSchemas.framingType.optional(),
    lossAvoidanceDescription: z.string().max(1000).optional(),
    achievementDescription: z.string().max(1000).optional(),
  }),

  update: z.object({
    name: z.string().min(1).max(255).optional(),
    description: z.string().max(1000).optional(),
    targetAmount: commonSchemas.positiveDecimal.optional(),
    targetDate: commonSchemas.futureDate.optional(),
    priority: commonSchemas.priority.optional(),
    category: z.string().min(1).max(50).optional(),
    icon: z.string().optional(),
    color: commonSchemas.hexColor.optional(),
    photoUrl: commonSchemas.url.optional(),
    framingType: commonSchemas.framingType.optional(),
    lossAvoidanceDescription: z.string().max(1000).optional(),
    achievementDescription: z.string().max(1000).optional(),
    isActive: z.boolean().optional(),
  }).partial(),
};

// Milestone validation schemas
export const milestoneSchemas = {
  create: z.object({
    goalId: z.string().uuid('Invalid goal ID'),
    amount: commonSchemas.positiveDecimal,
    description: z.string().min(1, 'Description is required').max(HTTP_INTERNAL_SERVER_ERROR),
  }),

  update: z.object({
    amount: commonSchemas.positiveDecimal.optional(),
    description: z.string().min(1).max(HTTP_INTERNAL_SERVER_ERROR).optional(),
    isCompleted: z.boolean().optional(),
  }).partial(),
};

// Automation rule validation schemas
export const automationRuleSchemas = {
  create: z.object({
    goalId: z.string().uuid('Invalid goal ID'),
    type: commonSchemas.automationRuleType,
    amount: commonSchemas.positiveDecimal.optional(),
    percentage: commonSchemas.percentage.optional(),
    frequency: commonSchemas.automationFrequency,
    isActive: z.boolean().optional(),
  }).refine((data) => {
    if (data.type === 'fixed_amount') {
      return data.amount !== undefined && data.percentage === undefined;
    } else if (data.type === 'percentage') {
      return data.percentage !== undefined && data.amount === undefined;
    } else if (data.type === 'round_up') {
      return data.amount === undefined && data.percentage === undefined;
    }
    return true;
  }, {
    message: 'Invalid automation rule configuration',
  }),

  update: z.object({
    type: commonSchemas.automationRuleType.optional(),
    amount: commonSchemas.positiveDecimal.optional(),
    percentage: commonSchemas.percentage.optional(),
    frequency: commonSchemas.automationFrequency.optional(),
    isActive: z.boolean().optional(),
  }).partial(),
};

// Achievement validation schemas
export const achievementSchemas = {
  create: z.object({
    name: z.string().min(1, 'Name is required').max(255),
    description: z.string().min(1, 'Description is required'),
    category: z.string().min(1, 'Category is required').max(50),
    icon: z.string().min(1, 'Icon is required').max(100),
    requirementType: commonSchemas.achievementRequirementType,
    requirementValue: z.number().int().positive('Requirement value must be positive'),
    requirementTimeframe: z.enum(['daily', 'weekly', 'monthly', 'yearly']).optional(),
    requirementDescription: z.string().optional(),
    points: z.number().int().positive('Points must be positive'),
  }),

  update: z.object({
    name: z.string().min(1).max(255).optional(),
    description: z.string().min(1).optional(),
    category: z.string().min(1).max(50).optional(),
    icon: z.string().min(1).max(100).optional(),
    requirementType: commonSchemas.achievementRequirementType.optional(),
    requirementValue: z.number().int().positive().optional(),
    requirementTimeframe: z.enum(['daily', 'weekly', 'monthly', 'yearly']).optional(),
    requirementDescription: z.string().optional(),
    points: z.number().int().positive().optional(),
  }).partial(),
};

// User achievement validation schemas
export const userAchievementSchemas = {
  update: z.object({
    progress: z.number().int().min(0).optional(),
    isUnlocked: z.boolean().optional(),
  }).partial(),
};

// Settings validation schemas
export const settingsSchemas = {
  update: z.object({
    notifications: z.object({
      email: z.boolean().optional(),
      push: z.boolean().optional(),
      sms: z.boolean().optional(),
      budgetAlerts: z.boolean().optional(),
      goalReminders: z.boolean().optional(),
      weeklyReports: z.boolean().optional(),
      monthlyReports: z.boolean().optional(),
    }).optional(),
    privacy: z.object({
      profileVisibility: z.enum(['public', 'private', 'friends']).optional(),
      dataSharing: z.boolean().optional(),
      analytics: z.boolean().optional(),
    }).optional(),
    security: z.object({
      twoFactorEnabled: z.boolean().optional(),
      loginAlerts: z.boolean().optional(),
      sessionTimeout: z.number().min(5).max(480).optional(), // 5 minutes to 8 hours
    }).optional(),
  }).partial(),
};

// Type exports for use in API routes
export type UserCreate = z.infer<typeof userSchemas.create>;
export type UserUpdate = z.infer<typeof userSchemas.update>;
export type UserLogin = z.infer<typeof userSchemas.login>;
export type UserChangePassword = z.infer<typeof userSchemas.changePassword>;

export type BudgetCreate = z.infer<typeof budgetSchemas.create>;
export type BudgetUpdate = z.infer<typeof budgetSchemas.update>;

export type BudgetCategoryCreate = z.infer<typeof budgetCategorySchemas.create>;
export type BudgetCategoryUpdate = z.infer<typeof budgetCategorySchemas.update>;

export type TransactionCreate = z.infer<typeof transactionSchemas.create>;
export type TransactionUpdate = z.infer<typeof transactionSchemas.update>;
export type TransactionFilter = z.infer<typeof transactionSchemas.filter>;

export type SavingsGoalCreate = z.infer<typeof savingsGoalSchemas.create>;
export type SavingsGoalUpdate = z.infer<typeof savingsGoalSchemas.update>;

export type MilestoneCreate = z.infer<typeof milestoneSchemas.create>;
export type MilestoneUpdate = z.infer<typeof milestoneSchemas.update>;

export type AutomationRuleCreate = z.infer<typeof automationRuleSchemas.create>;
export type AutomationRuleUpdate = z.infer<typeof automationRuleSchemas.update>;

export type AchievementCreate = z.infer<typeof achievementSchemas.create>;
export type AchievementUpdate = z.infer<typeof achievementSchemas.update>;

export type UserAchievementUpdate = z.infer<typeof userAchievementSchemas.update>;

export type SettingsUpdate = z.infer<typeof settingsSchemas.update>;
