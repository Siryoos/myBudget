// Core financial types
export interface Transaction {
  id: string
  amount: number
  description: string
  category: string
  date: Date
  type: 'income' | 'expense'
  account?: string
  tags?: string[]
  isRecurring?: boolean
}

export interface BudgetCategory {
  id: string
  name: string
  allocated: number
  spent: number
  remaining: number
  color: string
  icon?: string
  isEssential: boolean
}

export interface Budget {
  id: string
  name: string
  method: BudgetMethod
  totalIncome: number
  categories: BudgetCategory[]
  period: 'weekly' | 'monthly' | 'yearly'
  startDate: Date
  endDate: Date
}

export type BudgetMethod = '50-30-20' | 'pay-yourself-first' | 'envelope' | 'zero-based' | 'kakeibo'

export interface SavingsGoal {
  id: string
  name: string
  description?: string
  targetAmount: number
  currentAmount: number
  targetDate: Date
  category: GoalCategory
  priority: 'low' | 'medium' | 'high'
  isActive: boolean
  milestones?: Milestone[]
  automationRules?: AutomationRule[]
  // Behavioral enhancement fields
  photoUrl?: string
  framingType?: 'achievement' | 'loss-avoidance'
  lossAvoidanceDescription?: string
  achievementDescription?: string
  createdAt?: Date
  updatedAt?: Date
}

export type GoalCategory = 'emergency' | 'vacation' | 'home' | 'car' | 'wedding' | 'education' | 'retirement' | 'custom'

export interface Milestone {
  id: string
  amount: number
  description: string
  isCompleted: boolean
  completedDate?: Date
}

export interface AutomationRule {
  id: string
  type: 'fixed' | 'percentage' | 'round-up' | 'remainder'
  amount?: number
  percentage?: number
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly'
  isActive: boolean
  conditions?: RuleCondition[]
}

export interface RuleCondition {
  field: string
  operator: 'equals' | 'greater_than' | 'less_than' | 'contains'
  value: string | number
}

// Behavioral enhancement types
export interface Achievement {
  id: string
  name: string
  description: string
  category: AchievementCategory
  icon: string
  requirement: string | AchievementRequirement
  points: number
  isUnlocked: boolean
  unlockedDate?: Date
  progress?: number
  maxProgress?: number
}

export type AchievementCategory = 'savings-streak' | 'goal-achievement' | 'financial-education' | 'milestone' | 'social'

export interface AchievementRequirement {
  type: 'consecutive-days' | 'total-amount' | 'goal-completion' | 'education-modules' | 'custom'
  value: number
  timeframe?: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'all-time'
  description: string
}

export interface UserAchievement {
  id: string
  achievementId: string
  userId: string
  isUnlocked: boolean
  unlockedDate?: Date
  progress: number
  maxProgress: number
}

export interface SocialProof {
  id: string
  type: 'peer-comparison' | 'trend-data' | 'risk-awareness'
  title: string
  message: string
  data?: any
  displayFrequency: number
  lastShown?: Date
}

export interface QuickSaveData {
  id: string
  amount: number
  goalId?: string
  timestamp: Date
  source: 'manual' | 'round-up' | 'automated'
  socialProofMessage?: string
}

export interface GoalPhoto {
  id: string
  goalId: string
  photoUrl: string
  thumbnailUrl: string
  uploadedAt: Date
  fileSize: number
  mimeType: string
}

export interface FutureProjection {
  goalId: string
  currentSavings: number
  projectedValue: {
    oneYear: number
    fiveYears: number
    tenYears: number
    twentyYears: number
  }
  interestRate: number
  inflationRate: number
  lastCalculated: Date
}

// User and profile types
export interface UserProfile {
  id: string
  email: string
  name: string
  avatar?: string
  preferences: UserPreferences
  financialProfile: FinancialProfile
  createdAt: Date
  updatedAt: Date
}

export interface UserPreferences {
  currency: string
  language: string
  timezone: string
  dateFormat: string
  notifications: NotificationPreferences
  privacy: PrivacySettings
  accessibility: AccessibilitySettings
  regional: RegionalSettings
}

export interface FinancialProfile {
  monthlyIncome: number
  riskTolerance: 'conservative' | 'moderate' | 'aggressive'
  savingsRate: number
  debtToIncomeRatio?: number
  creditScore?: number
  financialGoals: string[]
  dependents: number
}

export interface NotificationPreferences {
  email: boolean
  push: boolean
  sms: boolean
  frequency: 'realtime' | 'daily' | 'weekly'
  types: {
    savings: boolean
    budget: boolean
    goals: boolean
    insights: boolean
    achievements: boolean
  }
}

export interface PrivacySettings {
  dataSharing: boolean
  analytics: boolean
  marketing: boolean
  socialFeatures: boolean
}

export interface AccessibilitySettings {
  highContrast: boolean
  reducedMotion: boolean
  screenReader: boolean
  fontSize: 'small' | 'medium' | 'large'
  keyboardNavigation: boolean
}

export interface RegionalSettings {
  region: 'middle-east' | 'united-states' | 'europe'
  culturalPreferences: {
    islamicBanking?: boolean
    customCategories?: string[]
    socialSharing?: 'prominent' | 'minimal' | 'none'
  }
}

// Insights and analytics types
export interface FinancialInsight {
  id: string
  type: InsightType
  title: string
  description: string
  impact: 'low' | 'medium' | 'high'
  category: string
  actionable: boolean
  actions?: InsightAction[]
  createdAt: Date
  isRead: boolean
}

export type InsightType = 'spending-pattern' | 'saving-opportunity' | 'budget-alert' | 'goal-progress' | 'market-trend'

export interface InsightAction {
  id: string
  label: string
  type: 'navigate' | 'execute' | 'external'
  target: string
  data?: Record<string, unknown>
}

// Gamification types
export interface Challenge {
  id: string
  name: string
  description: string
  type: ChallengeType
  duration: number // in days
  reward: number // points
  isActive: boolean
  progress: number
  startDate?: Date
  endDate?: Date
}

export type ChallengeType = 'no-spend' | '52-week' | 'round-up' | 'budget-control'

// Component props types
export interface ComponentProps {
  className?: string
  children?: React.ReactNode
}

export interface CardProps extends ComponentProps {
  title?: string
  subtitle?: string
  actions?: React.ReactNode
  hoverable?: boolean
}

export interface ButtonProps extends ComponentProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  disabled?: boolean
  onClick?: () => void
  type?: 'button' | 'submit' | 'reset'
}

// Chart and visualization types
export interface ChartData {
  name: string
  value: number
  color?: string
  percentage?: number
}

export interface TimeSeriesData {
  date: string
  value: number
  category?: string
}

// API response types
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T = unknown> {
  data: T[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}

// Form types
export interface FormField {
  name: string
  label: string
  type: 'text' | 'email' | 'password' | 'number' | 'select' | 'textarea' | 'checkbox' | 'radio'
  placeholder?: string
  required?: boolean
  validation?: ValidationRule[]
  options?: SelectOption[]
}

export interface ValidationRule {
  type: 'required' | 'min' | 'max' | 'pattern' | 'custom'
  value?: number | string | RegExp
  message: string
}

export interface SelectOption {
  value: string | number
  label: string
  disabled?: boolean
}

// Navigation types
export interface NavigationItem {
  id: string
  label: string
  href: string
  icon?: string
  badge?: string | number
  children?: NavigationItem[]
  isActive?: boolean
  disabled?: boolean
}

// Utility types
export type Status = 'idle' | 'loading' | 'success' | 'error'
export type Theme = 'light' | 'dark' | 'auto'
export type Currency = 'USD' | 'EUR' | 'GBP' | 'SAR' | 'AED' | 'QAR'
export type Language = 'en' | 'ar' | 'es' | 'de' | 'fr' | 'it'

// Enhanced Goal types with behavioral nudges
export interface EnhancedSavingsGoal extends SavingsGoal {
  imageUrl?: string
  lossAversionFrame?: string
  positiveFrame?: string
  behavioralNudges?: BehavioralNudge[]
  achievementProgress?: AchievementProgress
}

export interface BehavioralNudge {
  id: string
  type: 'loss-aversion' | 'future-self' | 'social-proof' | 'anchoring'
  title: string
  description: string
  isActive: boolean
  lastShown?: Date
  shownCount: number
}

export interface GoalImage {
  id: string
  goalId: string
  url: string
  thumbnailUrl: string
  uploadedAt: Date
  fileSize: number
  mimeType: string
}

export interface AchievementProgress {
  totalPoints: number
  level: number
  achievements: Achievement[]
  recentUnlocks: Achievement[]
  nextMilestone?: Achievement
}

export interface UserBehavior {
  id: string
  userId: string
  action: 'quick-save' | 'goal-creation' | 'goal-completion' | 'education-completion'
  amount?: number
  metadata?: Record<string, any>
  timestamp: Date
  sessionId: string
}

// Enhanced Quick Save Types
export interface QuickSaveDefaults {
  amounts: number[]
  source: 'user-history' | 'peer-data' | 'goal-alignment' | 'ab-test'
  lastUpdated: Date
  conversionRate: number
}

export interface SocialProofMessage {
  id: string
  type: 'peer-comparison' | 'trend-data' | 'achievement-highlight'
  message: string
  data?: Record<string, any>
  displayFrequency: number
  lastShown?: Date
}

// Future Self Projection Types
export interface FutureProjectionDetail {
  timeHorizon: number // months
  projectedAmount: number
  interestEarned: number
  inflationAdjusted: number
  monthlyContribution: number
  interestRate: number
}

export interface ProjectionScenario {
  currentSavings: number
  monthlyContribution: number
  projections: FutureProjectionDetail[]
  recommendations: string[]
}

// Enhanced Progress Tracking Types
export interface ProgressAnimation {
  type: 'thermometer' | 'jar' | 'progress-ring' | 'particle-effect'
  intensity: 'low' | 'medium' | 'high'
  duration: number
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out'
}

export interface MilestoneCelebration {
  milestoneId: string
  type: 'percentage' | 'amount' | 'streak'
  value: number
  animation: ProgressAnimation
  message: string
}
