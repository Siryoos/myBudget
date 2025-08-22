import type { FinancialInsight } from '@/types'

// Component props types
export type TabType = 'tips' | 'recommendations' | 'compare'

export interface InsightsPanelProps {
  showSavingTips?: boolean
  personalizedRecommendations?: boolean
  comparePeers?: boolean
}

export interface TabButtonProps {
  tab: TabType
  label: string
  icon: React.ComponentType<{ className?: string }>
  activeTab: TabType
  onClick: (tab: TabType) => void
}

// Data structure types
export interface SavingTip {
  id: string
  title: string
  description: string
  icon: string
  difficulty: string
}

export interface PeerComparison {
  metric: string
  userValue: number
  peerAverage: number
  unit: string
  better: boolean
}

export interface InsightAction {
  id: string
  label: string
  type: 'navigate' | 'execute' | 'external'
  target: string
  data?: Record<string, unknown>
}

// State types
export interface InsightsPanelState {
  dismissedInsights: string[]
  activeTab: TabType
  isLoading: boolean
  isInitialLoading: boolean
  error: string | null
}

// Function types
export interface ValidationFunctions {
  validateAndSanitizeInput: (input: unknown, fieldName: string) => string
  validateInsightData: (insight: unknown) => boolean
  sanitizeErrorMessage: (message: string) => string
}

export interface ActionHandlers {
  handleDismissInsight: (insightId: string) => void
  handleInsightAction: (action: InsightAction) => Promise<void>
  handleSavingTipAction: (tipId: string) => void
}

// Utility types
export interface TranslationHelpers {
  getTranslationWithFallback: (key: string, fallback: string) => string
  t: (key: string) => string
}

// Error types
export interface ValidationError extends Error {
  field: string
  value: unknown
}

export interface ActionError extends Error {
  action: string
  target: string
}

// Accessibility types
export interface AccessibilityProps {
  isRTL: boolean
  tabIndex: number
  ariaSelected: boolean
  ariaControls: string
  ariaLabel: string
}

// Loading states
export interface LoadingStates {
  isInitialLoading: boolean
  isLoading: boolean
  isDataReady: boolean
}

// Performance types
export interface MemoizedData {
  insights: FinancialInsight[]
  savingTips: SavingTip[]
  peerComparisons: PeerComparison[]
  visibleInsights: FinancialInsight[]
}
