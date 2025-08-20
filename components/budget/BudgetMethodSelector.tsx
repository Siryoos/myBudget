'use client'

import { useState } from 'react'
import { 
  ChartPieIcon,
  BanknotesIcon,
  EnvelopeIcon,
  CalculatorIcon,
  BookOpenIcon,
  CheckIcon
} from '@heroicons/react/24/outline'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { getBudgetMethodConfig } from '@/lib/utils'
import { useTranslation } from '@/lib/useTranslation'
import type { BudgetMethod } from '@/types'

interface BudgetMethodOption {
  id: BudgetMethod
  name: string
  description: string
  icon: any
  difficulty: string
  timeCommitment: 'Low' | 'Medium' | 'High'
  bestFor: string[]
}

export function BudgetMethodSelector() {
  const { t, isReady } = useTranslation(['budget', 'common'])
  const [selectedMethod, setSelectedMethod] = useState<BudgetMethod | null>(null)
  const [showDetails, setShowDetails] = useState(false)

  if (!isReady) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-trust-blue mx-auto mb-4"></div>
            <p className="text-neutral-gray">{t('common:status.loading', { defaultValue: 'Loading...' })}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const budgetMethods: BudgetMethodOption[] = [
    {
      id: '50-30-20',
      name: t('budget:methods.rule503020.name', { defaultValue: '50/30/20 Rule' }),
      description: t('budget:methods.rule503020.description', { defaultValue: '50% needs, 30% wants, 20% savings' }),
      icon: ChartPieIcon,
      difficulty: t('budget:difficulty.beginner', { defaultValue: 'Beginner' }),
      timeCommitment: 'Low',
      bestFor: [
        t('budget:methods.rule503020.bestFor.newToBudgeting', { defaultValue: 'New to budgeting' }),
        t('budget:methods.rule503020.bestFor.simpleApproach', { defaultValue: 'Simple approach' }),
        t('budget:methods.rule503020.bestFor.steadyIncome', { defaultValue: 'Steady income' })
      ],
    },
    {
      id: 'pay-yourself-first',
      name: t('budget:methods.payYourselfFirst.name', { defaultValue: 'Pay Yourself First' }),
      description: t('budget:methods.payYourselfFirst.description', { defaultValue: 'Save 20% first, spend the rest' }),
      icon: BanknotesIcon,
      difficulty: t('budget:difficulty.beginner', { defaultValue: 'Beginner' }),
      timeCommitment: 'Low',
      bestFor: [
        t('budget:methods.payYourselfFirst.bestFor.buildingSavingsHabit', { defaultValue: 'Building savings habit' }),
        t('budget:methods.payYourselfFirst.bestFor.automaticSaving', { defaultValue: 'Automatic saving' }),
        t('budget:methods.payYourselfFirst.bestFor.longTermGoals', { defaultValue: 'Long-term goals' })
      ],
    },
    {
      id: 'envelope',
      name: t('budget:methods.envelope.name', { defaultValue: 'Digital Envelope System' }),
      description: t('budget:methods.envelope.description', { defaultValue: 'Allocate funds to specific categories' }),
      icon: EnvelopeIcon,
      difficulty: t('budget:difficulty.intermediate', { defaultValue: 'Intermediate' }),
      timeCommitment: 'Medium',
      bestFor: [
        t('budget:methods.envelope.bestFor.detailedTracking', { defaultValue: 'Detailed tracking' }),
        t('budget:methods.envelope.bestFor.spendingControl', { defaultValue: 'Spending control' }),
        t('budget:methods.envelope.bestFor.variableIncome', { defaultValue: 'Variable income' })
      ],
    },
    {
      id: 'zero-based',
      name: t('budget:methods.zeroBased.name', { defaultValue: 'Zero-Based Budget' }),
      description: t('budget:methods.zeroBased.description', { defaultValue: 'Every dollar has a purpose' }),
      icon: CalculatorIcon,
      difficulty: t('budget:difficulty.advanced', { defaultValue: 'Advanced' }),
      timeCommitment: 'High',
      bestFor: [
        t('budget:methods.zeroBased.bestFor.maximumControl', { defaultValue: 'Maximum control' }),
        t('budget:methods.zeroBased.bestFor.debtPayoff', { defaultValue: 'Debt payoff' }),
        t('budget:methods.zeroBased.bestFor.irregularExpenses', { defaultValue: 'Irregular expenses' })
      ],
    },
    {
      id: 'kakeibo',
      name: t('budget:methods.kakeibo.name', { defaultValue: 'Kakeibo Method' }),
      description: t('budget:methods.kakeibo.description', { defaultValue: 'Mindful spending with reflection' }),
      icon: BookOpenIcon,
      difficulty: t('budget:difficulty.intermediate', { defaultValue: 'Intermediate' }),
      timeCommitment: 'Medium',
      bestFor: [
        t('budget:methods.kakeibo.bestFor.mindfulSpending', { defaultValue: 'Mindful spending' }),
        t('budget:methods.kakeibo.bestFor.selfReflection', { defaultValue: 'Self-reflection' }),
        t('budget:methods.kakeibo.bestFor.behavioralChange', { defaultValue: 'Behavioral change' })
      ],
    },
  ]

  const handleMethodSelect = (method: BudgetMethod) => {
    setSelectedMethod(method)
    setShowDetails(true)
  }

  const handleConfirmMethod = () => {
    if (selectedMethod) {
      console.log(`Selected budget method: ${selectedMethod}`)
      // This would typically update the user's budget configuration
    }
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Beginner':
        return 'bg-secondary-growth-green/10 text-secondary-growth-green'
      case 'Intermediate':
        return 'bg-accent-action-orange/10 text-accent-action-orange'
      case 'Advanced':
        return 'bg-accent-warning-red/10 text-accent-warning-red'
      default:
        return 'bg-neutral-gray/10 text-neutral-gray'
    }
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-neutral-dark-gray mb-2">
            {t('budget:methodSelector.title', { defaultValue: 'Choose Your Budgeting Method' })}
          </h2>
          <p className="text-neutral-gray">
            {t('budget:methodSelector.subtitle', { defaultValue: 'Select the budgeting approach that best fits your lifestyle and financial goals.' })}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {budgetMethods.map((method) => {
            const IconComponent = method.icon
            const isSelected = selectedMethod === method.id
            
            return (
              <button
                key={method.id}
                onClick={() => handleMethodSelect(method.id)}
                className={`p-4 rounded-lg border-2 text-left transition-all duration-200 hover:shadow-md ${
                  isSelected
                    ? 'border-primary-trust-blue bg-primary-trust-blue/5'
                    : 'border-neutral-gray/30 hover:border-primary-trust-blue/50'
                }`}
              >
                <div className="flex items-start mb-3">
                  <div className={`p-2 rounded-lg mr-3 ${
                    isSelected 
                      ? 'bg-primary-trust-blue text-white' 
                      : 'bg-neutral-light-gray text-neutral-gray'
                  }`}>
                    <IconComponent className="h-6 w-6" />
                  </div>
                  {isSelected && (
                    <div className="ml-auto">
                      <CheckIcon className="h-5 w-5 text-primary-trust-blue" />
                    </div>
                  )}
                </div>
                
                <h3 className="font-semibold text-neutral-dark-gray mb-2">
                  {method.name}
                </h3>
                <p className="text-sm text-neutral-gray mb-3">
                  {method.description}
                </p>
                
                <div className="flex items-center justify-between">
                  <span className={`text-xs px-2 py-1 rounded-full ${getDifficultyColor(method.difficulty)}`}>
                    {method.difficulty}
                  </span>
                  <span className="text-xs text-neutral-gray">
                    {method.timeCommitment} effort
                  </span>
                </div>
              </button>
            )
          })}
        </div>

        {/* Method Details */}
        {showDetails && selectedMethod && (
          <div className="bg-neutral-light-gray/50 rounded-lg p-6 animate-slide-up">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-neutral-dark-gray mb-2">
                About {budgetMethods.find(m => m.id === selectedMethod)?.name}
              </h3>
              
              {(() => {
                const config = getBudgetMethodConfig(selectedMethod)
                const method = budgetMethods.find(m => m.id === selectedMethod)
                
                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium text-neutral-dark-gray mb-2">
                        How it works:
                      </h4>
                      <p className="text-sm text-neutral-gray mb-4">
                        {config.description}
                      </p>
                      
                      {config.categories.length > 0 && (
                        <div>
                          <h4 className="font-medium text-neutral-dark-gray mb-2">
                            Category Breakdown:
                          </h4>
                          <div className="space-y-2">
                            {config.categories.map((category, index) => (
                              <div key={index} className="flex items-center justify-between text-sm">
                                <span className="text-neutral-gray">{category.name}</span>
                                <span className="font-medium text-neutral-dark-gray">
                                  {category.percentage}%
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-neutral-dark-gray mb-2">
                        Best for:
                      </h4>
                      <ul className="space-y-1 mb-4">
                        {method?.bestFor.map((item, index) => (
                          <li key={index} className="text-sm text-neutral-gray flex items-center">
                            <CheckIcon className="h-4 w-4 text-secondary-growth-green mr-2 flex-shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                      
                      <div className="grid grid-cols-2 gap-4 text-center">
                        <div className="bg-white rounded-lg p-3">
                          <div className="text-sm font-medium text-neutral-dark-gray">
                            Difficulty
                          </div>
                          <div className={`text-xs px-2 py-1 rounded-full mt-1 ${getDifficultyColor(method?.difficulty || '')}`}>
                            {method?.difficulty}
                          </div>
                        </div>
                        <div className="bg-white rounded-lg p-3">
                          <div className="text-sm font-medium text-neutral-dark-gray">
                            Time Commitment
                          </div>
                          <div className="text-xs text-neutral-gray mt-1">
                            {method?.timeCommitment}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })()}
            </div>
            
            <div className="flex items-center justify-end space-x-3">
              <Button
                variant="ghost"
                onClick={() => {
                  setSelectedMethod(null)
                  setShowDetails(false)
                }}
              >
                Choose Different Method
              </Button>
              <Button variant="primary" onClick={handleConfirmMethod}>
                Start with This Method
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
