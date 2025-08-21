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
import { useInsights, useDashboardData } from '@/lib/api-hooks'
import { useRouter } from 'next/navigation'
import type { FinancialInsight } from '@/types'
import { getMockInsights, getMockSavingTips, getMockPeerComparisons } from './insights-data'

type TabType = 'tips' | 'recommendations' | 'peers'

interface InsightsPanelProps {
  showSavingTips?: boolean
  personalizedRecommendations?: boolean
  comparePeers?: boolean
}

export function InsightsPanel({
  showSavingTips = true,
  personalizedRecommendations = true,
  comparePeers = true,
}: InsightsPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('tips')
  const { t, isReady } = useTranslation(['dashboard', 'common'])
  const router = useRouter()
  
  // Use API hooks with fallback data
  const mockInsights = useMemo(() => getMockInsights(t), [t])
  const { insights, loading: insightsLoading, dismissInsight } = useInsights(mockInsights)
  const { data: dashboardData, loading: dashboardLoading } = useDashboardData()
  
  // Generate dynamic tips and comparisons from dashboard data
  const savingTips = useMemo(() => {
    if (!dashboardData?.analytics) return getMockSavingTips(t)
    
    const tips = []
    const { topCategories, monthlyAverage } = dashboardData.analytics
    
    // Generate tips based on spending patterns
    if (topCategories?.[0]?.percentage > 30) {
      tips.push({
        id: 'cat-1',
        title: t('savingTips.reduceCategory', { 
          category: topCategories[0].category,
          defaultValue: `Reduce ${topCategories[0].category} Spending`
        }),
        description: t('savingTips.categoryHighSpending', { 
          percentage: topCategories[0].percentage,
          defaultValue: `${topCategories[0].percentage}% of your budget goes to ${topCategories[0].category}`
        }),
        icon: '📊',
        difficulty: t('difficulty.medium', { defaultValue: 'Medium' })
      })
    }
    
    if (monthlyAverage && monthlyAverage < 500) {
      tips.push({
        id: 'save-more',
        title: t('savingTips.increaseSavings', { defaultValue: 'Boost Your Savings' }),
        description: t('savingTips.lowSavingsRate', { 
          defaultValue: 'Try the 52-week challenge to build momentum'
        }),
        icon: '💰',
        difficulty: t('difficulty.easy', { defaultValue: 'Easy' })
      })
    }
    
    return tips.length > 0 ? tips : getMockSavingTips(t)
  }, [dashboardData, t])
  
  const peerComparisons = useMemo(() => {
    if (!dashboardData?.trends) return getMockPeerComparisons(t)
    
    const { savingsRate, budgetAdherence } = dashboardData.trends
    
    return [
      {
        metric: t('comparisons.savingsRate', { defaultValue: 'Savings Rate' }),
        userValue: savingsRate?.current || 0,
        peerAverage: 15, // This would come from backend
        unit: '%',
        better: (savingsRate?.current || 0) > 15
      },
      {
        metric: t('comparisons.budgetAdherence', { defaultValue: 'Budget Adherence' }),
        userValue: budgetAdherence?.current || 0,
        peerAverage: 78, // This would come from backend
        unit: '%',
        better: (budgetAdherence?.current || 0) > 78
      }
    ]
  }, [dashboardData, t])
  
  const handleInsightAction = useCallback((action: any) => {
    switch (action.type) {
      case 'navigate':
        router.push(action.target)
        break
      case 'execute':
        // Handle custom actions
        console.log('Executing action:', action.target)
        break
      case 'external':
        window.open(action.target, '_blank', 'noopener,noreferrer')
        break
    }
  }, [router])
  
  const renderContent = () => {
    if (!isReady || insightsLoading || dashboardLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-trust-blue mx-auto mb-4"></div>
            <p className="text-neutral-gray">{t('common:status.loading')}</p>
          </div>
        </div>
      )
    }
    
    switch (activeTab) {
      case 'tips':
        return (
          <div className="space-y-4">
            {savingTips.map((tip) => (
              <div key={tip.id} className="p-4 bg-neutral-light-gray/50 rounded-lg">
                <div className="flex items-start space-x-3">
                  <span className="text-2xl">{tip.icon}</span>
                  <div className="flex-1">
                    <h4 className="font-medium text-neutral-charcoal mb-1">
                      {tip.title}
                    </h4>
                    <p className="text-sm text-neutral-gray mb-2">
                      {tip.description}
                    </p>
                    <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                      tip.difficulty === t('difficulty.easy') 
                        ? 'bg-secondary-growth-green/10 text-secondary-growth-green'
                        : tip.difficulty === t('difficulty.medium')
                        ? 'bg-accent-warm-orange/10 text-accent-warm-orange'
                        : 'bg-accent-coral-red/10 text-accent-coral-red'
                    }`}>
                      {tip.difficulty}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
        
      case 'recommendations':
        return (
          <div className="space-y-4">
            {insights.map((insight) => (
              <div key={insight.id} className="p-4 bg-white rounded-lg shadow-sm border border-neutral-gray/10">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-neutral-charcoal mb-1">
                      {insight.title}
                    </h4>
                    <p className="text-sm text-neutral-gray mb-3">
                      {insight.description}
                    </p>
                    <div className="flex items-center gap-2">
                      {insight.actions?.map((action) => (
                        <Button
                          key={action.id}
                          variant="outline"
                          size="small"
                          onClick={() => handleInsightAction(action)}
                          className="text-xs"
                        >
                          {action.label}
                          <ArrowRightIcon className="w-3 h-3 ml-1" />
                        </Button>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => dismissInsight(insight.id)}
                    className="ml-4 text-neutral-gray/50 hover:text-neutral-gray"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
        
      case 'peers':
        return (
          <div className="space-y-4">
            {peerComparisons.map((comparison, index) => (
              <div key={index} className="p-4 bg-white rounded-lg shadow-sm border border-neutral-gray/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-neutral-charcoal">
                    {comparison.metric}
                  </span>
                  <span className={`text-sm font-medium ${
                    comparison.better ? 'text-secondary-growth-green' : 'text-accent-coral-red'
                  }`}>
                    {comparison.better ? '↑' : '↓'} {comparison.userValue}{comparison.unit}
                  </span>
                </div>
                <div className="relative h-2 bg-neutral-gray/10 rounded-full overflow-hidden">
                  <div 
                    className="absolute top-0 left-0 h-full bg-primary-trust-blue rounded-full"
                    style={{ width: `${(comparison.userValue / (comparison.peerAverage * 2)) * 100}%` }}
                  />
                  <div 
                    className="absolute top-0 h-full w-0.5 bg-neutral-charcoal"
                    style={{ left: '50%' }}
                  />
                </div>
                <p className="text-xs text-neutral-gray mt-2">
                  {t('comparisons.peerAverage')}: {comparison.peerAverage}{comparison.unit}
                </p>
              </div>
            ))}
          </div>
        )
    }
  }
  
  return (
    <Card className="h-full">
      <CardHeader>
        <h3 className="text-lg font-semibold text-neutral-charcoal">
          {t('insights.title')}
        </h3>
        <div className="flex space-x-2 mt-4">
          {showSavingTips && (
            <button
              onClick={() => setActiveTab('tips')}
              className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'tips'
                  ? 'bg-primary-trust-blue text-white'
                  : 'bg-neutral-light-gray text-neutral-gray hover:bg-neutral-gray/20'
              }`}
            >
              <LightBulbIcon className="w-4 h-4 mr-2" />
              {t('insights.tabs.tips')}
            </button>
          )}
          {personalizedRecommendations && (
            <button
              onClick={() => setActiveTab('recommendations')}
              className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'recommendations'
                  ? 'bg-primary-trust-blue text-white'
                  : 'bg-neutral-light-gray text-neutral-gray hover:bg-neutral-gray/20'
              }`}
            >
              <ChartBarIcon className="w-4 h-4 mr-2" />
              {t('insights.tabs.recommendations')}
            </button>
          )}
          {comparePeers && (
            <button
              onClick={() => setActiveTab('peers')}
              className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'peers'
                  ? 'bg-primary-trust-blue text-white'
                  : 'bg-neutral-light-gray text-neutral-gray hover:bg-neutral-gray/20'
              }`}
            >
              <UserGroupIcon className="w-4 h-4 mr-2" />
              {t('insights.tabs.peers')}
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {renderContent()}
      </CardContent>
    </Card>
  )
}