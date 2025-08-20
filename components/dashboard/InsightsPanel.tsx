'use client'

import { useState } from 'react'
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
  const [dismissedInsights, setDismissedInsights] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState<'tips' | 'recommendations' | 'compare'>('tips')
  const { t } = useTranslation(['dashboard', 'common'])

  // Mock insights data
  const insights: FinancialInsight[] = [
    {
      id: '1',
      type: 'saving-opportunity',
      title: t('insights.coffeeSpending.title'),
      description: t('insights.coffeeSpending.description'),
      impact: 'medium',
      category: t('categories.food'),
      actionable: true,
      actions: [
        { id: '1', label: t('insights.coffeeSpending.actions.setBudget'), type: 'navigate', target: '/budget' },
        { id: '2', label: t('insights.coffeeSpending.actions.trackDaily'), type: 'execute', target: 'track_coffee' },
      ],
      createdAt: new Date(),
      isRead: false,
    },
    {
      id: '2',
      type: 'goal-progress',
      title: t('insights.emergencyFund.title'),
      description: t('insights.emergencyFund.description'),
      impact: 'high',
      category: t('categories.savings'),
      actionable: true,
      actions: [
        { id: '1', label: t('insights.emergencyFund.actions.viewDetails'), type: 'navigate', target: '/goals' },
      ],
      createdAt: new Date(),
      isRead: false,
    },
    {
      id: '3',
      type: 'spending-pattern',
      title: t('insights.weekendSpending.title'),
      description: t('insights.weekendSpending.description'),
      impact: 'medium',
      category: t('categories.budget'),
      actionable: true,
      actions: [
        { id: '1', label: t('insights.weekendSpending.actions.viewPatterns'), type: 'navigate', target: '/transactions' },
      ],
      createdAt: new Date(),
      isRead: false,
    },
  ]

  const savingTips = [
    {
      id: '1',
      title: t('savingTips.week52Challenge.title'),
      description: t('savingTips.week52Challenge.description'),
      icon: '💰',
      difficulty: t('difficulty.easy'),
    },
    {
      id: '2',
      title: t('savingTips.roundUpSavings.title'),
      description: t('savingTips.roundUpSavings.description'),
      icon: '🔄',
      difficulty: t('difficulty.easy'),
    },
    {
      id: '3',
      title: t('savingTips.noSpendDays.title'),
      description: t('savingTips.noSpendDays.description'),
      icon: '🚫',
      difficulty: t('difficulty.medium'),
    },
  ]

  const peerComparisons = [
    {
      metric: t('comparisons.savingsRate'),
      userValue: 18,
      peerAverage: 15,
      unit: '%',
      better: true,
    },
    {
      metric: t('comparisons.monthlySavings'),
      userValue: 680,
      peerAverage: 520,
      unit: '$',
      better: true,
    },
    {
      metric: t('comparisons.budgetAdherence'),
      userValue: 85,
      peerAverage: 78,
      unit: '%',
      better: true,
    },
  ]

  const handleDismissInsight = (insightId: string) => {
    setDismissedInsights(prev => [...prev, insightId])
  }

  const visibleInsights = insights.filter(insight => !dismissedInsights.includes(insight.id))

  const getImpactColor = (impact: string) => {
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
  }

  const TabButton = ({ 
    tab, 
    label, 
    icon: Icon 
  }: { 
    tab: 'tips' | 'recommendations' | 'compare'
    label: string
    icon: any
  }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
        activeTab === tab
          ? 'bg-primary-trust-blue text-white'
          : 'text-neutral-gray hover:text-neutral-dark-gray hover:bg-neutral-light-gray'
      }`}
    >
      <Icon className="h-4 w-4 mr-2" />
      {label}
    </button>
  )

  return (
    <Card className="h-fit">
      <CardHeader>
        <div className="flex items-center">
          <div className="bg-accent-action-orange/10 rounded-lg p-2 mr-3">
            <LightBulbIcon className="h-6 w-6 text-accent-action-orange" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-neutral-dark-gray">
              {t('insights.title')}
            </h3>
            <p className="text-sm text-neutral-gray">
              {t('insights.subtitle')}
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 mt-4 bg-neutral-light-gray rounded-lg p-1">
          {showSavingTips && (
            <TabButton tab="tips" label={t('insights.tabs.tips')} icon={LightBulbIcon} />
          )}
          {personalizedRecommendations && (
            <TabButton tab="recommendations" label={t('insights.tabs.insights')} icon={ChartBarIcon} />
          )}
          {comparePeers && (
            <TabButton tab="compare" label={t('insights.tabs.compare')} icon={UserGroupIcon} />
          )}
        </div>
      </CardHeader>

      <CardContent>
        {/* Saving Tips Tab */}
        {activeTab === 'tips' && showSavingTips && (
          <div className="space-y-4">
            {savingTips.map((tip) => (
              <div key={tip.id} className="bg-neutral-light-gray/50 rounded-lg p-4">
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
                    <Button variant="outline" size="sm">
                      {t('actions.tryThisTip')}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Personalized Recommendations Tab */}
        {activeTab === 'recommendations' && personalizedRecommendations && (
          <div className="space-y-4">
            {visibleInsights.length === 0 ? (
              <div className="text-center py-6">
                <LightBulbIcon className="h-12 w-12 text-neutral-gray mx-auto mb-4" />
                <p className="text-neutral-gray">
                  {t('insights.noInsightsAvailable')}
                </p>
              </div>
            ) : (
              visibleInsights.map((insight) => (
                <div key={insight.id} className="border border-neutral-gray/20 rounded-lg p-4 relative">
                  <button
                    onClick={() => handleDismissInsight(insight.id)}
                    className="absolute top-2 right-2 p-1 rounded-full hover:bg-neutral-light-gray text-neutral-gray hover:text-neutral-dark-gray transition-colors duration-200"
                    aria-label={t('actions.dismissInsight')}
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
                          {t(`impact.${insight.impact}`)} {t('impact.label')}
                        </span>
                      </div>
                      <p className="text-sm text-neutral-gray mb-3">
                        {insight.description}
                      </p>
                    </div>
                  </div>

                  {insight.actionable && insight.actions && (
                    <div className="flex flex-wrap gap-2">
                      {insight.actions.map((action) => (
                        <Button
                          key={action.id}
                          variant="outline"
                          size="sm"
                          onClick={() => console.log(`Action: ${action.target}`)}
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
          <div className="space-y-4">
            <div className="text-center mb-4">
              <p className="text-sm text-neutral-gray">
                {t('comparisons.description')}
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
                    {comparison.better ? t('comparisons.aboveAverage') : t('comparisons.belowAverage')}
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="text-center">
                    <div className="text-lg font-bold text-neutral-dark-gray">
                      {comparison.unit === '$' 
                        ? formatCurrency(comparison.userValue)
                        : `${comparison.userValue}${comparison.unit}`
                      }
                    </div>
                    <div className="text-xs text-neutral-gray">{t('comparisons.you')}</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-lg font-bold text-neutral-gray">
                      {comparison.unit === '$' 
                        ? formatCurrency(comparison.peerAverage)
                        : `${comparison.peerAverage}${comparison.unit}`
                      }
                    </div>
                    <div className="text-xs text-neutral-gray">{t('comparisons.average')}</div>
                  </div>
                </div>
              </div>
            ))}

            <div className="bg-primary-trust-blue/5 rounded-lg p-3 text-center">
              <p className="text-sm text-primary-trust-blue font-medium">
                {t('comparisons.encouragement')}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
