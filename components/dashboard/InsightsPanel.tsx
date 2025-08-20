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

  // Mock insights data
  const insights: FinancialInsight[] = [
    {
      id: '1',
      type: 'saving-opportunity',
      title: 'Reduce Coffee Spending',
      description: 'You spent $45 on coffee this week. Making coffee at home could save you $35 weekly.',
      impact: 'medium',
      category: 'Food',
      actionable: true,
      actions: [
        { id: '1', label: 'Set Coffee Budget', type: 'navigate', target: '/budget' },
        { id: '2', label: 'Track Daily Coffee', type: 'execute', target: 'track_coffee' },
      ],
      createdAt: new Date(),
      isRead: false,
    },
    {
      id: '2',
      type: 'goal-progress',
      title: 'Emergency Fund Update',
      description: 'Great progress! You\'re 68% towards your emergency fund goal. Keep it up!',
      impact: 'high',
      category: 'Savings',
      actionable: true,
      actions: [
        { id: '1', label: 'View Goal Details', type: 'navigate', target: '/goals' },
      ],
      createdAt: new Date(),
      isRead: false,
    },
    {
      id: '3',
      type: 'spending-pattern',
      title: 'Weekend Spending Alert',
      description: 'Your weekend spending is 40% higher than weekdays. Consider planning weekend budgets.',
      impact: 'medium',
      category: 'Budget',
      actionable: true,
      actions: [
        { id: '1', label: 'View Spending Patterns', type: 'navigate', target: '/transactions' },
      ],
      createdAt: new Date(),
      isRead: false,
    },
  ]

  const savingTips = [
    {
      id: '1',
      title: '52-Week Challenge',
      description: 'Save $1 in week 1, $2 in week 2, and so on. You\'ll have $1,378 by year-end!',
      icon: '💰',
      difficulty: 'Easy',
    },
    {
      id: '2',
      title: 'Round-Up Savings',
      description: 'Round up purchases to the nearest dollar and save the difference automatically.',
      icon: '🔄',
      difficulty: 'Easy',
    },
    {
      id: '3',
      title: 'No-Spend Days',
      description: 'Challenge yourself to have 2-3 no-spend days per week to boost savings.',
      icon: '🚫',
      difficulty: 'Medium',
    },
  ]

  const peerComparisons = [
    {
      metric: 'Savings Rate',
      userValue: 18,
      peerAverage: 15,
      unit: '%',
      better: true,
    },
    {
      metric: 'Monthly Savings',
      userValue: 680,
      peerAverage: 520,
      unit: '$',
      better: true,
    },
    {
      metric: 'Budget Adherence',
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
              Financial Insights
            </h3>
            <p className="text-sm text-neutral-gray">
              Personalized tips and recommendations
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 mt-4 bg-neutral-light-gray rounded-lg p-1">
          {showSavingTips && (
            <TabButton tab="tips" label="Tips" icon={LightBulbIcon} />
          )}
          {personalizedRecommendations && (
            <TabButton tab="recommendations" label="Insights" icon={ChartBarIcon} />
          )}
          {comparePeers && (
            <TabButton tab="compare" label="Compare" icon={UserGroupIcon} />
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
                      Try This Tip
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
                  No new insights available. Check back later!
                </p>
              </div>
            ) : (
              visibleInsights.map((insight) => (
                <div key={insight.id} className="border border-neutral-gray/20 rounded-lg p-4 relative">
                  <button
                    onClick={() => handleDismissInsight(insight.id)}
                    className="absolute top-2 right-2 p-1 rounded-full hover:bg-neutral-light-gray text-neutral-gray hover:text-neutral-dark-gray transition-colors duration-200"
                    aria-label="Dismiss insight"
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
                          {insight.impact} impact
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
                Compare your financial habits with similar users
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
                    {comparison.better ? 'Above Average' : 'Below Average'}
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
                    <div className="text-xs text-neutral-gray">You</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-lg font-bold text-neutral-gray">
                      {comparison.unit === '$' 
                        ? formatCurrency(comparison.peerAverage)
                        : `${comparison.peerAverage}${comparison.unit}`
                      }
                    </div>
                    <div className="text-xs text-neutral-gray">Average</div>
                  </div>
                </div>
              </div>
            ))}

            <div className="bg-primary-trust-blue/5 rounded-lg p-3 text-center">
              <p className="text-sm text-primary-trust-blue font-medium">
                🎉 You're doing great! Keep up the good work!
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
