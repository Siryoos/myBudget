import { clsx, type ClassValue } from 'clsx';
import { format, formatDistance, isToday, isYesterday, isThisWeek, isThisMonth } from 'date-fns';

/**
 * Utility function to combine class names
 */
export const cn = (...inputs: ClassValue[]): string => clsx(inputs);

/**
 * Format currency based on user preferences
 */
export const formatCurrency = (
  amount: number,
  currency = 'USD',
  locale = 'en-US',
): string => new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

/**
 * Format percentage with proper precision
 */
export const formatPercentage = (
  value: number,
  precision = 1,
): string => `${value.toFixed(precision)}%`;

/**
 * Format large numbers with abbreviations (K, M, B)
 */
export const formatCompactNumber = (
  num: number,
  locale = 'en-US',
): string => new Intl.NumberFormat(locale, {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(num);

/**
 * Format dates in a user-friendly way
 */
export const formatDate = (
  date: Date | string,
  formatStr = 'MMM dd, yyyy',
): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, formatStr);
};

/**
 * Format relative time (e.g., "2 days ago", "in 3 hours")
 */
export const formatRelativeTime = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();

  if (isToday(dateObj)) {
    return 'Today';
  }

  if (isYesterday(dateObj)) {
    return 'Yesterday';
  }

  if (isThisWeek(dateObj)) {
    return format(dateObj, 'EEEE'); // Day name
  }

  if (isThisMonth(dateObj)) {
    return format(dateObj, 'MMM dd');
  }

  return formatDistance(dateObj, now, { addSuffix: true });
};

/**
 * Calculate percentage of a value relative to a total
 */
export const calculatePercentage = (value: number, total: number): number => {
  if (total === 0) {return 0;}
  return (value / total) * 100;
};

/**
 * Calculate progress towards a goal
 */
export const calculateProgress = (current: number, target: number): {
  percentage: number
  remaining: number
  isComplete: boolean
} => {
  const percentage = Math.min(calculatePercentage(current, target), 100);
  const remaining = Math.max(target - current, 0);
  const isComplete = current >= target;

  return { percentage, remaining, isComplete };
};

/**
 * Debounce function to limit the rate of function calls
 */
export const debounce = <T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void => {
  let timeout: ReturnType<typeof setTimeout>;

  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

/**
 * Throttle function to limit the rate of function calls
 */
export const throttle = <T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number,
): (...args: Parameters<T>) => void => {
  let inThrottle: boolean;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

// Constants for ID generation
const ID_BASE = 36;
const ID_START_INDEX = 2;

/**
 * Generate a random ID
 */
export const generateId = (): string =>
  Math.random().toString(ID_BASE).substring(ID_START_INDEX) +
  Date.now().toString(ID_BASE);

/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Budget category thresholds
const BUDGET_CRITICAL_THRESHOLD = 1.0;
const BUDGET_WARNING_THRESHOLD = 0.8;
const BUDGET_CAUTION_THRESHOLD = 0.6;

/**
 * Get color for budget category based on spending ratio
 */
export const getBudgetCategoryColor = (spent: number, allocated: number): string => {
  const ratio = spent / allocated;

  if (ratio >= BUDGET_CRITICAL_THRESHOLD) {return 'text-accent-warning-red';}
  if (ratio >= BUDGET_WARNING_THRESHOLD) {return 'text-accent-action-orange';}
  if (ratio >= BUDGET_CAUTION_THRESHOLD) {return 'text-neutral-gray';}
  return 'text-secondary-growth-green';
};

// Goal progress thresholds
const GOAL_COMPLETE_THRESHOLD = 100;
const GOAL_NEAR_COMPLETE_THRESHOLD = 75;
const GOAL_HALFWAY_THRESHOLD = 50;

/**
 * Get status color for savings goals
 */
export const getGoalStatusColor = (current: number, target: number): string => {
  const progress = calculatePercentage(current, target);

  if (progress >= GOAL_COMPLETE_THRESHOLD) {return 'text-accent-success-emerald';}
  if (progress >= GOAL_NEAR_COMPLETE_THRESHOLD) {return 'text-secondary-growth-green';}
  if (progress >= GOAL_HALFWAY_THRESHOLD) {return 'text-accent-action-orange';}
  return 'text-primary-trust-blue';
};

/**
 * Format time remaining for goals
 */
export const formatTimeRemaining = (targetDate: Date): string => {
  const now = new Date();
  const timeDiff = targetDate.getTime() - now.getTime();

  if (timeDiff <= 0) {
    return 'Overdue';
  }

  const MS_IN_SECOND = 1000;
  const SECONDS_IN_MINUTE = 60;
  const MINUTES_IN_HOUR = 60;
  const HOURS_IN_DAY = 24;
  const MS_IN_DAY = MS_IN_SECOND * SECONDS_IN_MINUTE * MINUTES_IN_HOUR * HOURS_IN_DAY;
  const days = Math.ceil(timeDiff / MS_IN_DAY);

  if (days === 1) {return '1 day left';}
  const DAYS_IN_MONTH = 30;
  const DAYS_IN_YEAR = 365;
  if (days < DAYS_IN_MONTH) {return `${days} days left`;}
  if (days < DAYS_IN_YEAR) {
    const months = Math.ceil(days / DAYS_IN_MONTH);
    return months === 1 ? '1 month left' : `${months} months left`;
  }

  const years = Math.ceil(days / DAYS_IN_YEAR);
  return years === 1 ? '1 year left' : `${years} years left`;
};

/**
 * Get greeting based on time of day
 */
export const getTimeBasedGreeting = (): string => {
  const hour = new Date().getHours();

  const NOON = 12;
  const EVENING_START = 17;
  if (hour < NOON) {return 'Good morning';}
  if (hour < EVENING_START) {return 'Good afternoon';}
  return 'Good evening';
};

/**
 * Sanitize and validate number input
 */
export const sanitizeNumberInput = (value: string): number => {
  const cleaned = value.replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : Math.max(0, parsed);
};

/**
 * Calculate compound interest
 */
export const calculateCompoundInterest = (
  principal: number,
  rate: number,
  time: number,
  compoundingFrequency = 12,
): number => principal * Math.pow(1 + rate / compoundingFrequency, compoundingFrequency * time);

/**
 * Budget method configurations
 */
const BUDGET_METHOD_CONFIGS = {
  '50-30-20': {
    name: '50/30/20 Rule',
    description: '50% needs, 30% wants, 20% savings',
    categories: [
      { name: 'Needs', percentage: 50, essential: true },
      { name: 'Wants', percentage: 30, essential: false },
      { name: 'Savings', percentage: 20, essential: true },
    ],
  },
  'pay-yourself-first': {
    name: 'Pay Yourself First',
    description: 'Save 20% first, spend the rest',
    categories: [
      { name: 'Savings', percentage: 20, essential: true },
      { name: 'Living Expenses', percentage: 80, essential: true },
    ],
  },
  envelope: {
    name: 'Digital Envelope System',
    description: 'Allocate funds to specific categories',
    categories: [
      { name: 'Housing', percentage: 25, essential: true },
      { name: 'Transportation', percentage: 15, essential: true },
      { name: 'Food', percentage: 12, essential: true },
      { name: 'Utilities', percentage: 8, essential: true },
      { name: 'Savings', percentage: 20, essential: true },
      { name: 'Entertainment', percentage: 10, essential: false },
      { name: 'Other', percentage: 10, essential: false },
    ],
  },
  'zero-based': {
    name: 'Zero-Based Budget',
    description: 'Every dollar has a purpose',
    categories: [], // User defines all categories
  },
  kakeibo: {
    name: 'Kakeibo Method',
    description: 'Mindful spending with reflection',
    categories: [
      { name: 'Survival', percentage: 40, essential: true },
      { name: 'Optional', percentage: 30, essential: false },
      { name: 'Culture', percentage: 15, essential: false },
      { name: 'Unexpected', percentage: 15, essential: true },
    ],
  },
} as const;

/**
 * Get budget method configuration
 */
export const getBudgetMethodConfig = (method: string) => BUDGET_METHOD_CONFIGS[method as keyof typeof BUDGET_METHOD_CONFIGS] || BUDGET_METHOD_CONFIGS['50-30-20'];

/**
 * Check if device supports touch
 */
export const isTouchDevice = (): boolean => 'ontouchstart' in window || navigator.maxTouchPoints > 0;

/**
 * Get safe area insets for mobile devices
 */
export const getSafeAreaInsets = () => {
  const style = getComputedStyle(document.documentElement);
  return {
    top: style.getPropertyValue('env(safe-area-inset-top)') || '0px',
    right: style.getPropertyValue('env(safe-area-inset-right)') || '0px',
    bottom: style.getPropertyValue('env(safe-area-inset-bottom)') || '0px',
    left: style.getPropertyValue('env(safe-area-inset-left)') || '0px',
  };
};
