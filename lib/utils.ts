import { clsx, type ClassValue } from 'clsx'
import { format, formatDistance, isToday, isYesterday, isThisWeek, isThisMonth } from 'date-fns'

/**
 * Utility function to combine class names
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

/**
 * Format currency based on user preferences
 */
export function formatCurrency(
  amount: number,
  currency: string = 'USD',
  locale: string = 'en-US'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * Format percentage with proper precision
 */
export function formatPercentage(
  value: number,
  precision: number = 1
): string {
  return `${value.toFixed(precision)}%`
}

/**
 * Format large numbers with abbreviations (K, M, B)
 */
export function formatCompactNumber(
  num: number,
  locale: string = 'en-US'
): string {
  return new Intl.NumberFormat(locale, {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(num)
}

/**
 * Format dates in a user-friendly way
 */
export function formatDate(
  date: Date | string,
  formatStr: string = 'MMM dd, yyyy'
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return format(dateObj, formatStr)
}

/**
 * Format relative time (e.g., "2 days ago", "in 3 hours")
 */
export function formatRelativeTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  
  if (isToday(dateObj)) {
    return 'Today'
  }
  
  if (isYesterday(dateObj)) {
    return 'Yesterday'
  }
  
  if (isThisWeek(dateObj)) {
    return format(dateObj, 'EEEE') // Day name
  }
  
  if (isThisMonth(dateObj)) {
    return format(dateObj, 'MMM dd')
  }
  
  return formatDistance(dateObj, now, { addSuffix: true })
}

/**
 * Calculate percentage of a value relative to a total
 */
export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0
  return (value / total) * 100
}

/**
 * Calculate progress towards a goal
 */
export function calculateProgress(current: number, target: number): {
  percentage: number
  remaining: number
  isComplete: boolean
} {
  const percentage = Math.min(calculatePercentage(current, target), 100)
  const remaining = Math.max(target - current, 0)
  const isComplete = current >= target
  
  return { percentage, remaining, isComplete }
}

/**
 * Debounce function to limit the rate of function calls
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

/**
 * Throttle function to limit the rate of function calls
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

/**
 * Generate a random ID
 */
export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Get color for budget category based on spending ratio
 */
export function getBudgetCategoryColor(spent: number, allocated: number): string {
  const ratio = spent / allocated
  
  if (ratio >= 1) return 'text-accent-warning-red'
  if (ratio >= 0.8) return 'text-accent-action-orange'
  if (ratio >= 0.6) return 'text-neutral-gray'
  return 'text-secondary-growth-green'
}

/**
 * Get status color for savings goals
 */
export function getGoalStatusColor(current: number, target: number): string {
  const progress = calculatePercentage(current, target)
  
  if (progress >= 100) return 'text-accent-success-emerald'
  if (progress >= 75) return 'text-secondary-growth-green'
  if (progress >= 50) return 'text-accent-action-orange'
  return 'text-primary-trust-blue'
}

/**
 * Format time remaining for goals
 */
export function formatTimeRemaining(targetDate: Date): string {
  const now = new Date()
  const timeDiff = targetDate.getTime() - now.getTime()
  
  if (timeDiff <= 0) {
    return 'Overdue'
  }
  
  const days = Math.ceil(timeDiff / (1000 * 60 * 60 * 24))
  
  if (days === 1) return '1 day left'
  if (days < 30) return `${days} days left`
  if (days < 365) {
    const months = Math.ceil(days / 30)
    return months === 1 ? '1 month left' : `${months} months left`
  }
  
  const years = Math.ceil(days / 365)
  return years === 1 ? '1 year left' : `${years} years left`
}

/**
 * Get greeting based on time of day
 */
export function getTimeBasedGreeting(): string {
  const hour = new Date().getHours()
  
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

/**
 * Sanitize and validate number input
 */
export function sanitizeNumberInput(value: string): number {
  const cleaned = value.replace(/[^0-9.-]/g, '')
  const parsed = parseFloat(cleaned)
  return isNaN(parsed) ? 0 : Math.max(0, parsed)
}

/**
 * Calculate compound interest
 */
export function calculateCompoundInterest(
  principal: number,
  rate: number,
  time: number,
  compoundingFrequency: number = 12
): number {
  return principal * Math.pow(1 + rate / compoundingFrequency, compoundingFrequency * time)
}

/**
 * Get budget method configuration
 */
export function getBudgetMethodConfig(method: string) {
  const configs = {
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
  }
  
  return configs[method as keyof typeof configs] || configs['50-30-20']
}

/**
 * Check if device supports touch
 */
export function isTouchDevice(): boolean {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0
}

/**
 * Get safe area insets for mobile devices
 */
export function getSafeAreaInsets() {
  const style = getComputedStyle(document.documentElement)
  return {
    top: style.getPropertyValue('env(safe-area-inset-top)') || '0px',
    right: style.getPropertyValue('env(safe-area-inset-right)') || '0px',
    bottom: style.getPropertyValue('env(safe-area-inset-bottom)') || '0px',
    left: style.getPropertyValue('env(safe-area-inset-left)') || '0px',
  }
}
