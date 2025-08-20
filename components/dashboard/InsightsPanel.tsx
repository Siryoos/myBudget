'use client'

import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { 
  LightBulbIcon,
  ChartBarIcon,
  UserGroupIcon,
  ArrowRightIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { formatCurrency } from '@/lib/utils'
import { useTranslation } from '@/lib/useTranslation'
import type { FinancialInsight } from '@/types'
import { getMockInsights, getMockSavingTips, getMockPeerComparisons } from './insights-data'
import { ErrorBoundary } from './ErrorBoundary'
import type { 
  TabType, 
  InsightsPanelProps, 
  TabButtonProps, 
  InsightAction,
  ValidationError,
  ActionError 
} from './InsightsPanel.types'

const TabButton = React.memo(({ 
  tab, 
  label, 
  icon: Icon,
  activeTab,
  onClick
}: TabButtonProps) => {
  const isRTL = typeof window !== 'undefined' && document.documentElement.dir === 'rtl'
  
  return (
    <button
      id={`${tab}-tab`}
      role="tab"
      aria-selected={activeTab === tab}
      aria-controls={`${tab}-panel`}
      tabIndex={activeTab === tab ? 0 : -1}
      onClick={() => onClick(tab)}
      className={`flex items-center justify-center sm:justify-start px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all duration-200 flex-1 sm:flex-none min-w-0 min-h-[44px] touch-manipulation ${
        activeTab === tab
          ? 'bg-primary-trust-blue text-white'
          : 'text-neutral-gray hover:text-neutral-dark-gray hover:bg-neutral-light-gray'
      }`}
    >
      <Icon className={`h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0 ${isRTL ? 'ml-1 sm:ml-2' : 'mr-1 sm:mr-2'}`} />
      <span className="truncate text-xs sm:text-sm">{label}</span>
    </button>
  )
})

function InsightsPanelContent({
  showSavingTips = true,
  personalizedRecommendations = true,
  comparePeers = true,
}: InsightsPanelProps) {
  const [dismissedInsights, setDismissedInsights] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState<TabType>('tips')
  const [isLoading, setIsLoading] = useState(false)
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { t, isReady } = useTranslation(['dashboard', 'common'])

  // Mock data - in a real app, these would come from API calls
  // Memoize expensive data transformations
  const insights = useMemo(() => getMockInsights(t), [t])
  const savingTips = useMemo(() => getMockSavingTips(t), [t])
  const peerComparisons = useMemo(() => getMockPeerComparisons(t), [t])

  // Enhanced error reporting and logging system
  const logError = useCallback((error: unknown, context: string, severity: 'low' | 'medium' | 'high' = 'medium') => {
    const errorInfo = {
      timestamp: new Date().toISOString(),
      context,
      severity,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown'
    }
    
    // In production, this would be sent to an error reporting service
    if (process.env.NODE_ENV === 'development') {
      console.group(`🚨 ${severity.toUpperCase()} Error in ${context}`)
      console.error('Error Details:', errorInfo)
      console.groupEnd()
    }
    
    // For production, you might want to send to a service like Sentry, LogRocket, etc.
    // if (process.env.NODE_ENV === 'production') {
    //   errorReportingService.captureException(error, errorInfo)
    // }
  }, [])

  // Sanitize error messages to prevent XSS - memoized for performance
  const sanitizeErrorMessage = useCallback((message: string): string => {
    if (typeof message !== 'string') return 'An error occurred'
    
    // Remove HTML tags and dangerous characters
    return message
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocols
      .replace(/on\w+=/gi, '') // Remove event handlers
      .trim()
      .substring(0, 200) // Limit length
  }, [])

  // Comprehensive input validation and sanitization
  const validateAndSanitizeInput = useCallback((input: unknown, fieldName: string): string => {
    if (!input || typeof input !== 'string') {
      throw new Error(`${fieldName} must be a valid string`)
    }
    
    const sanitized = input
      .trim()
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocols
      .replace(/on\w+=/gi, '') // Remove event handlers
      .replace(/[<>\"'&]/g, '') // Remove dangerous characters
    
    if (sanitized.length === 0) {
      throw new Error(`${fieldName} cannot be empty`)
    }
    
    if (sanitized.length > 500) {
      throw new Error(`${fieldName} is too long (max 500 characters)`)
    }
    
    return sanitized
  }, [])

  // Validate insight data structure
  const validateInsightData = useCallback((insight: unknown): boolean => {
    if (!insight || typeof insight !== 'object') return false
    
    const insightObj = insight as Record<string, unknown>
    const requiredFields = ['id', 'type', 'title', 'description', 'impact', 'category']
    
    return requiredFields.every(field => 
      insightObj[field] && typeof insightObj[field] === 'string'
    )
  }, [])

  const handleDismissInsight = useCallback((insightId: string) => {
    try {
      // Validate and sanitize insight ID
      const sanitizedId = validateAndSanitizeInput(insightId, 'Insight ID')
      
      // Check if insight exists
      const insightExists = insights.some(insight => insight.id === sanitizedId)
      if (!insightExists) {
        setError(sanitizeErrorMessage(`Insight with ID '${sanitizedId}' not found`))
        return
      }
      
      setDismissedInsights(prev => [...prev, sanitizedId])
    } catch (error) {
      logError(error, 'handleDismissInsight', 'medium')
      setError(sanitizeErrorMessage(error instanceof Error ? error.message : 'Invalid insight ID'))
    }
  }, [insights, validateAndSanitizeInput, sanitizeErrorMessage, logError])

  const handleInsightAction = useCallback(async (action: InsightAction) => {
    // Validate action object
    if (!action || typeof action !== 'object') {
      setError(sanitizeErrorMessage('Invalid action object provided'))
      return
    }
    
    const { id, type, target } = action
    
    // Validate required fields
    if (!id || !type || !target) {
      setError(sanitizeErrorMessage('Action object missing required fields'))
      return
    }
    
    if (typeof id !== 'string' || typeof type !== 'string' || typeof target !== 'string') {
      setError(sanitizeErrorMessage('Action fields must be strings'))
      return
    }

    setIsLoading(true)
    setError(null)
    
    try {
      switch (type) {
        case 'navigate':
          // Validate internal navigation target
          if (!target.startsWith('/')) {
            throw new Error('Navigation target must be a valid internal path')
          }
          // In a real app, you'd use Next.js router or similar
          if (typeof window !== 'undefined') {
            window.location.href = target
          }
          break
        case 'execute':
          // Validate execute target (should be a valid action identifier)
          if (target.trim().length === 0) {
            throw new Error('Execute target cannot be empty')
          }
          // Simulate async operation
          await new Promise(resolve => setTimeout(resolve, 1000))
          // Custom action not implemented - this would be handled by the application
          break
        case 'external':
          // Validate external URL
          try {
            new URL(target)
          } catch {
            throw new Error('External target must be a valid URL')
          }
          // Handle external links
          if (typeof window !== 'undefined') {
            window.open(target, '_blank', 'noopener,noreferrer')
          }
          break
        default:
          throw new Error(`Unknown action type: ${type}`)
      }
    } catch (error) {
      logError(error, 'handleInsightAction', 'high')
      setError(sanitizeErrorMessage(error instanceof Error ? error.message : 'An error occurred'))
      // In production, this would be logged to a proper logging service
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Memoize filtered insights to avoid recalculation on every render
  const visibleInsights = useMemo(() => 
    insights.filter(insight => !dismissedInsights.includes(insight.id)),
    [insights, dismissedInsights]
  )

  // Memoize impact color calculation
  const getImpactColor = useCallback((impact: string) => {
    switch (impact) {
      case 'high':
        return 'text-secondary-growth-green bg-secondary-growth-green/10'
      case 'medium':
        return 'text-accent-action-orange bg-accent-action-orange/10'
      case 'low':
        return 'text-neutral-gray bg-neutral-gray/10'
      default:
        return 'text-neutral-gray bg-neutral-gray/10'
    }
  }, [])

  // Helper function for translation fallbacks - memoized to avoid recalculation
  const getTranslationWithFallback = useCallback((key: string, fallback: string): string => {
    const translation = t(key)
    return translation === key ? fallback : translation
  }, [t])

  // Handle saving tip action
  const handleSavingTipAction = useCallback((tipId: string) => {
    try {
      // In a real app, this would navigate to a detailed tip page or start a challenge
      setError(null) // Clear any existing errors
      
      // Show success feedback
      const tipElement = document.querySelector(`[data-tip-id="${tipId}"]`)
      if (tipElement) {
        tipElement.classList.add('animate-pulse', 'bg-green-50', 'border-green-200')
        setTimeout(() => {
          tipElement.classList.remove('animate-pulse', 'bg-green-50', 'border-green-200')
        }, 2000)
      }
      
      // Announce success to screen readers
      setAnnouncement('Tip action completed successfully')
      
      // For now, just show a success message or navigate
      // This would typically integrate with the app's routing system
    } catch (error) {
      logError(error, 'handleSavingTipAction', 'low')
    }
  }, [logError])

  // Handle initial loading state
  useEffect(() => {
    // Simulate initial data loading
    const loadInitialData = async () => {
      try {
        // Wait for translations to be ready
        if (isReady) {
          // Simulate API call delay
          await new Promise(resolve => setTimeout(resolve, 500))
          setIsInitialLoading(false)
        }
      } catch (error) {
        setError(sanitizeErrorMessage('Failed to load initial data'))
        setIsInitialLoading(false)
      }
    }

    loadInitialData()
  }, [isReady])

  // Announce tab changes to screen readers
  useEffect(() => {
    const tabLabels = {
      tips: getTranslationWithFallback('insights.tabs.tips', 'Tips'),
      recommendations: getTranslationWithFallback('insights.tabs.insights', 'Insights'),
      compare: getTranslationWithFallback('insights.tabs.compare', 'Compare')
    }
    
    if (!isInitialLoading) {
      setAnnouncement(`${tabLabels[activeTab]} tab selected`)
    }
  }, [activeTab, isInitialLoading, getTranslationWithFallback])

  // Cleanup effect for component unmount
  useEffect(() => {
    return () => {
      // Clear any pending async operations
      setIsLoading(false)
      setError(null)
      
      // In a real app with i18n resources, you might want to cleanup here
      // This would depend on your i18n implementation
    }
  }, [])



  // Show loading state while initializing
  if (isInitialLoading) {
    return (
      <Card className="h-fit">
        <CardHeader>
          <div className="flex items-center">
            <div className="bg-accent-action-orange/10 rounded-lg p-2 mr-3">
              <LightBulbIcon className="h-6 w-6 text-accent-action-orange animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-neutral-dark-gray">
                {getTranslationWithFallback('insights.title', 'Financial Insights')}
              </h3>
              <p className="text-sm text-neutral-gray">
                {getTranslationWithFallback('insights.loading', 'Loading your personalized insights...')}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-trust-blue"></div>
            <span className="ml-3 text-neutral-gray">
              {getTranslationWithFallback('common.loading', 'Loading...')}
            </span>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Detect RTL language support
  const isRTL = typeof window !== 'undefined' && document.documentElement.dir === 'rtl'
  
  // Accessibility enhancements
  const [announcement, setAnnouncement] = useState<string>('')
  
  // Announce changes to screen readers
  useEffect(() => {
    if (announcement) {
      const timeout = setTimeout(() => setAnnouncement(''), 1000)
      return () => clearTimeout(timeout)
    }
  }, [announcement])
  
  return (
    <>
      {/* Screen reader announcements */}
      <div 
        aria-live="polite" 
        aria-atomic="true" 
        className="sr-only"
      >
        {announcement}
      </div>
      
      <Card className="h-fit">
        <CardHeader>
        <div className={`flex items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className={`bg-accent-action-orange/10 rounded-lg p-2 ${isRTL ? 'ml-3' : 'mr-3'}`}>
            <LightBulbIcon className="h-6 w-6 text-accent-action-orange" />
          </div>
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <h3 className="text-lg font-semibold text-neutral-dark-gray">
              {getTranslationWithFallback('insights.title', 'Financial Insights')}
            </h3>
            <p className="text-sm text-neutral-gray">
              {getTranslationWithFallback('insights.subtitle', 'Personalized recommendations to improve your finances')}
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div 
          role="tablist" 
          aria-label={getTranslationWithFallback('insights.title', 'Financial Insights')}
          className={`flex flex-col sm:flex-row gap-1 sm:space-x-1 mt-4 bg-neutral-light-gray rounded-lg p-1 overflow-hidden ${isRTL ? 'sm:flex-row-reverse' : ''}`}
        >
          {showSavingTips && (
            <TabButton 
              tab="tips" 
              label={getTranslationWithFallback('insights.tabs.tips', 'Tips')} 
              icon={LightBulbIcon}
              activeTab={activeTab}
              onClick={setActiveTab}
            />
          )}
          {personalizedRecommendations && (
            <TabButton 
              tab="recommendations" 
              label={getTranslationWithFallback('insights.tabs.insights', 'Insights')} 
              icon={ChartBarIcon}
              activeTab={activeTab}
              onClick={setActiveTab}
            />
          )}
          {comparePeers && (
            <TabButton 
              tab="compare" 
              label={getTranslationWithFallback('insights.tabs.compare', 'Compare')} 
              icon={UserGroupIcon}
              activeTab={activeTab}
              onClick={setActiveTab}
            />
          )}
        </div>
      </CardHeader>

      <CardContent>
        {/* Error Display */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{sanitizeErrorMessage(error)}</p>
            <button
              onClick={() => setError(null)}
              className="text-xs text-red-500 hover:text-red-700 underline mt-1 p-2 min-h-[44px] touch-manipulation"
            >
              {getTranslationWithFallback('actions.dismiss', 'Dismiss')}
            </button>
          </div>
        )}
        {/* Saving Tips Tab */}
        {activeTab === 'tips' && showSavingTips && (
          <div 
            role="tabpanel" 
            id="tips-panel" 
            aria-labelledby="tips-tab"
            className="space-y-4 animate-fade-in"
          >
            {savingTips.map((tip) => (
              <div key={tip.id} data-tip-id={tip.id} className="bg-neutral-light-gray/50 rounded-lg p-4 transition-all duration-300 hover:shadow-md">
                <div className="flex items-start">
                  <div className="text-2xl mr-3">{tip.icon}</div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-neutral-dark-gray">
                        {tip.title}
                      </h4>
                      <span className="text-xs px-2 py-1 bg-primary-trust-blue/10 text-primary-trust-blue rounded-full">
                        {tip.difficulty}
                      </span>
                    </div>
                    <p className="text-sm text-neutral-gray mb-3">
                      {tip.description}
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleSavingTipAction(tip.id)}
                    >
                      {getTranslationWithFallback('actions.tryThisTip', 'Try This Tip')}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Personalized Recommendations Tab */}
        {activeTab === 'recommendations' && personalizedRecommendations && (
          <div 
            role="tabpanel" 
            id="recommendations-panel" 
            aria-labelledby="recommendations-tab"
            className="space-y-4 animate-fade-in"
          >
            {visibleInsights.length === 0 ? (
              <div className="text-center py-6">
                <LightBulbIcon className="h-12 w-12 text-neutral-gray mx-auto mb-4" />
                <p className="text-neutral-gray">
                  {getTranslationWithFallback('insights.noInsightsAvailable', 'No insights available at this time')}
                </p>
              </div>
            ) : (
              visibleInsights.map((insight) => (
                <div key={insight.id} className="border border-neutral-gray/20 rounded-lg p-4 relative">
                  <button
                    onClick={() => handleDismissInsight(insight.id)}
                    className="absolute top-2 right-2 p-2 rounded-full hover:bg-neutral-light-gray text-neutral-gray hover:text-neutral-dark-gray transition-colors duration-200 min-h-[44px] min-w-[44px] touch-manipulation flex items-center justify-center"
                    aria-label={getTranslationWithFallback('actions.dismissInsight', 'Dismiss insight')}
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>

                  <div className="flex items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <h4 className="font-medium text-neutral-dark-gray mr-2">
                          {insight.title}
                        </h4>
                        <span className={`text-xs px-2 py-1 rounded-full ${getImpactColor(insight.impact)}`}>
                          {getTranslationWithFallback(`impact.${insight.impact}`, insight.impact)} {getTranslationWithFallback('impact.label', 'impact')}
                        </span>
                      </div>
                      <p className="text-sm text-neutral-gray mb-3">
                        {insight.description}
                      </p>
                    </div>
                  </div>

                  {insight.actionable && insight.actions && (
                    <div className="flex flex-col sm:flex-row flex-wrap gap-2">
                      {insight.actions.map((action) => (
                        <Button
                          key={action.id}
                          variant="outline"
                          size="sm"
                          loading={isLoading}
                          disabled={isLoading}
                          onClick={() => handleInsightAction(action)}
                        >
                          {action.label}
                          <ArrowRightIcon className="h-3 w-3 ml-1" />
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Peer Comparison Tab */}
        {activeTab === 'compare' && comparePeers && (
          <div 
            role="tabpanel" 
            id="compare-panel" 
            aria-labelledby="compare-tab"
            className="space-y-4 animate-fade-in"
          >
            <div className="text-center mb-4">
              <p className="text-sm text-neutral-gray">
                {getTranslationWithFallback('comparisons.description', 'See how your financial habits compare to similar users')}
              </p>
            </div>

            {peerComparisons.map((comparison, index) => (
              <div key={index} className="bg-neutral-light-gray/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-neutral-dark-gray">
                    {comparison.metric}
                  </h4>
                  <div className={`text-sm px-2 py-1 rounded-full ${
                    comparison.better 
                      ? 'bg-secondary-growth-green/10 text-secondary-growth-green'
                      : 'bg-accent-action-orange/10 text-accent-action-orange'
                  }`}>
                    {comparison.better ? getTranslationWithFallback('comparisons.aboveAverage', 'Above Average') : getTranslationWithFallback('comparisons.belowAverage', 'Below Average')}
                  </div>
                </div>
                
                <div className="flex items-center justify-between gap-4">
                  <div className="text-center flex-1">
                    <div className="text-base sm:text-lg font-bold text-neutral-dark-gray">
                      {comparison.unit === '$' 
                        ? formatCurrency(comparison.userValue)
                        : `${comparison.userValue}${comparison.unit}`
                      }
                    </div>
                    <div className="text-xs text-neutral-gray">{getTranslationWithFallback('comparisons.you', 'You')}</div>
                  </div>
                  
                  <div className="text-center flex-1">
                    <div className="text-base sm:text-lg font-bold text-neutral-gray">
                      {comparison.unit === '$' 
                        ? formatCurrency(comparison.peerAverage)
                        : `${comparison.peerAverage}${comparison.unit}`
                      }
                    </div>
                    <div className="text-xs text-neutral-gray">{getTranslationWithFallback('comparisons.average', 'Average')}</div>
                  </div>
                </div>
              </div>
            ))}

            <div className="bg-primary-trust-blue/5 rounded-lg p-3 text-center">
              <p className="text-sm text-primary-trust-blue font-medium">
                {getTranslationWithFallback('comparisons.encouragement', 'Keep up the great work! You\'re doing better than most users.')}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
    </>
  )
}

export function InsightsPanel(props: InsightsPanelProps) {
  return (
    <ErrorBoundary>
      <InsightsPanelContent {...props} />
    </ErrorBoundary>
  )
}
