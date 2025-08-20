'use client'

import { useState } from 'react'
import { 
  ChartBarIcon,
  FireIcon,
  BanknotesIcon,
  CheckCircleIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  PlusIcon,
  MinusIcon
} from '@heroicons/react/24/outline'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { formatDate, calculateProgress } from '@/lib/utils'
import { useTranslation } from '@/lib/useTranslation'
import { useCurrency } from '@/lib/useCurrency'
import type { SavingsGoal } from '@/types'

interface GoalProgressTrackerProps {
  visualStyles?: ('progressBar' | 'thermometer' | 'jar')[]
  showTimeRemaining?: boolean
  showProjectedCompletion?: boolean
  celebrationAnimations?: boolean
}

export function GoalProgressTracker({
  visualStyles = ['progressBar', 'thermometer', 'jar'],
  showTimeRemaining = true,
  showProjectedCompletion = true,
  celebrationAnimations = true,
}: GoalProgressTrackerProps) {
  const { t, isReady } = useTranslation(['goals', 'common'])
  const { formatCurrency } = useCurrency()
  const [selectedVisual, setSelectedVisual] = useState<'progressBar' | 'thermometer' | 'jar'>('progressBar')
  const [showCompleted, setShowCompleted] = useState(false)

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

  // Mock goals data
  const goals: SavingsGoal[] = [
    {
      id: '1',
      name: t('goals:examples.emergency.name', { defaultValue: 'High Emergency Fund' }),
      description: t('goals:examples.emergency.description', { defaultValue: 'Build a safety net for unexpected expenses' }),
      targetAmount: 10000,
      currentAmount: 6800,
      targetDate: new Date(Date.now() + 4 * 30 * 24 * 60 * 60 * 1000), // 4 months from now
      category: 'emergency',
      priority: 'high',
      isActive: true,
      milestones: [
        { id: '1', amount: 2500, description: t('goals:examples.emergency.milestones.first', { defaultValue: 'First milestone' }), isCompleted: true, completedDate: new Date('2024-01-15') },
        { id: '2', amount: 5000, description: t('goals:examples.emergency.milestones.halfway', { defaultValue: 'Halfway there' }), isCompleted: true, completedDate: new Date('2024-02-20') },
        { id: '3', amount: 7500, description: t('goals:examples.emergency.milestones.almost', { defaultValue: 'Almost done' }), isCompleted: false },
        { id: '4', amount: 10000, description: t('goals:examples.emergency.milestones.complete', { defaultValue: 'Goal complete!' }), isCompleted: false },
      ],
    },
    {
      id: '2',
      name: t('goals:examples.vacation.name', { defaultValue: 'Dream Vacation' }),
      description: t('goals:examples.vacation.description', { defaultValue: 'Two weeks in Japan' }),
      targetAmount: 5000,
      currentAmount: 1200,
      targetDate: new Date(Date.now() + 8 * 30 * 24 * 60 * 60 * 1000), // 8 months from now
      category: 'vacation',
      priority: 'medium',
      isActive: true,
      milestones: [
        { id: '1', amount: 1250, description: t('goals:examples.vacation.milestones.flight', { defaultValue: 'Flight booking' }), isCompleted: false },
        { id: '2', amount: 2500, description: t('goals:examples.vacation.milestones.accommodation', { defaultValue: 'Accommodation' }), isCompleted: false },
        { id: '3', amount: 3750, description: t('goals:examples.vacation.milestones.activities', { defaultValue: 'Activities & food' }), isCompleted: false },
        { id: '4', amount: 5000, description: t('goals:examples.vacation.milestones.fullBudget', { defaultValue: 'Full budget ready' }), isCompleted: false },
      ],
    },
    {
      id: '3',
      name: t('goals:examples.car.name', { defaultValue: 'New Car Fund' }),
      description: t('goals:examples.car.description', { defaultValue: 'Replace my old car' }),
      targetAmount: 25000,
      currentAmount: 25000,
      targetDate: new Date('2024-03-01'),
      category: 'car',
      priority: 'medium',
      isActive: false,
      milestones: [
        { id: '1', amount: 6250, description: t('goals:examples.car.milestones.quarter', { defaultValue: 'Quarter saved' }), isCompleted: true, completedDate: new Date('2023-09-15') },
        { id: '2', amount: 12500, description: t('goals:examples.car.milestones.halfway', { defaultValue: 'Halfway point' }), isCompleted: true, completedDate: new Date('2023-11-20') },
        { id: '3', amount: 18750, description: t('goals:examples.car.milestones.threeQuarters', { defaultValue: 'Three quarters' }), isCompleted: true, completedDate: new Date('2024-01-10') },
        { id: '4', amount: 25000, description: t('goals:examples.car.milestones.complete', { defaultValue: 'Car purchase ready!' }), isCompleted: true, completedDate: new Date('2024-03-01') },
      ],
    },
  ]

  const activeGoals = goals.filter(goal => goal.isActive)
  const completedGoals = goals.filter(goal => !goal.isActive && calculateProgress(goal.currentAmount, goal.targetAmount).isComplete)
  
  const displayGoals = showCompleted ? completedGoals : activeGoals

  const ProgressBarVisual = ({ goal }: { goal: SavingsGoal }) => {
    const progress = calculateProgress(goal.currentAmount, goal.targetAmount)
    const monthsRemaining = Math.ceil((goal.targetDate.getTime() - new Date().getTime()) / (30 * 24 * 60 * 60 * 1000))
    
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold text-neutral-dark-gray">{goal.name}</h4>
            <p className="text-sm text-neutral-gray">{goal.description}</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-neutral-gray">
              {t('goals:progress.remaining', { 
                amount: formatCurrency(progress.remaining),
                defaultValue: `${formatCurrency(progress.remaining)} remaining`
              })}
            </div>
            <div className="text-xs text-neutral-gray">
              {t('goals:progress.monthsLeft', { 
                months: monthsRemaining,
                defaultValue: `${monthsRemaining} months left`
              })}
            </div>
          </div>
        </div>
        
        <ProgressBar
          value={goal.currentAmount}
          max={goal.targetAmount}
          color="secondary"
          className="h-3"
        />
        
        <div className="grid grid-cols-4 gap-4 text-center text-sm">
          <div>
            <div className="text-neutral-gray">{t('goals:progress.remaining', { defaultValue: 'Remaining' })}</div>
            <div className="font-semibold text-neutral-dark-gray">{formatCurrency(progress.remaining)}</div>
          </div>
          <div>
            <div className="text-neutral-gray">{t('goals:progress.target', { defaultValue: 'Target' })}</div>
            <div className="font-semibold text-neutral-dark-gray">{formatCurrency(goal.targetAmount)}</div>
          </div>
          <div>
            <div className="text-neutral-gray">{t('goals:progress.saved', { defaultValue: 'Saved' })}</div>
            <div className="font-semibold text-secondary-growth-green">{formatCurrency(goal.currentAmount)}</div>
          </div>
          <div>
            <div className="text-neutral-gray">{t('goals:progress.percentage', { defaultValue: 'Progress' })}</div>
            <div className="font-semibold text-primary-trust-blue">{progress.percentage}%</div>
          </div>
        </div>

        {/* Milestones */}
        {goal.milestones && goal.milestones.length > 0 && (
          <div className="space-y-3">
            <h5 className="font-medium text-neutral-dark-gray">{t('goals:progress.milestones.title', { defaultValue: 'Milestones' })}</h5>
            <div className="space-y-2">
              {goal.milestones.map((milestone) => (
                <div key={milestone.id} className="flex items-center justify-between p-3 bg-neutral-light-gray/50 rounded-lg">
                  <div className="flex items-center">
                    {milestone.isCompleted ? (
                      <CheckCircleIcon className="h-5 w-5 text-secondary-growth-green mr-2" />
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-neutral-gray mr-2" />
                    )}
                    <div>
                      <div className="font-medium text-neutral-dark-gray">
                        {formatCurrency(milestone.amount)}
                      </div>
                      <div className="text-sm text-neutral-gray">{milestone.description}</div>
                    </div>
                  </div>
                  {milestone.isCompleted && milestone.completedDate && (
                    <div className="text-xs text-secondary-growth-green">
                      {formatDate(milestone.completedDate, 'MMM dd')} ✓
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1">
            {t('goals:actions.adjustGoal', { defaultValue: 'Adjust Goal' })}
          </Button>
          <Button variant="secondary" size="sm" className="flex-1">
            {t('goals:actions.addMoney', { defaultValue: 'Add Money' })}
          </Button>
        </div>
      </div>
    )
  }

  const ThermometerVisual = ({ goal }: { goal: SavingsGoal }) => {
    const progress = calculateProgress(goal.currentAmount, goal.targetAmount)
    const height = 200
    const fillHeight = (goal.currentAmount / goal.targetAmount) * height
    
    return (
      <div className="text-center space-y-4">
        <div className="relative mx-auto w-16 h-52">
          {/* Thermometer outline */}
          <div className="absolute inset-0 border-4 border-neutral-gray/30 rounded-full"></div>
          
          {/* Fill */}
          <div 
            className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-secondary-growth-green to-secondary-growth-green/80 rounded-full transition-all duration-1000"
            style={{ height: `${fillHeight}px` }}
          ></div>
          
          {/* Bulb */}
          <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-20 h-20 border-4 border-neutral-gray/30 rounded-full bg-white"></div>
          <div 
            className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-20 h-20 rounded-full bg-gradient-to-t from-secondary-growth-green to-secondary-growth-green/80 transition-all duration-1000"
            style={{ 
              height: `${Math.min(fillHeight, 80)}px`,
              bottom: '-8px'
            }}
          ></div>
          
          {/* Progress text */}
          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-lg font-bold text-neutral-dark-gray">
            {progress.percentage}%
          </div>
        </div>
        
        <div>
          <h4 className="font-semibold text-neutral-dark-gray">{goal.name}</h4>
          <p className="text-sm text-neutral-gray">{goal.description}</p>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-neutral-gray">{t('goals:progress.saved', { defaultValue: 'Saved' })}</div>
            <div className="font-semibold text-secondary-growth-green">{formatCurrency(goal.currentAmount)}</div>
          </div>
          <div>
            <div className="text-neutral-gray">{t('goals:progress.target', { defaultValue: 'Target' })}</div>
            <div className="font-semibold text-neutral-dark-gray">{formatCurrency(goal.targetAmount)}</div>
          </div>
        </div>
      </div>
    )
  }

  const JarVisual = ({ goal }: { goal: SavingsGoal }) => {
    const progress = calculateProgress(goal.currentAmount, goal.targetAmount)
    const coins = Math.floor((goal.currentAmount / goal.targetAmount) * 50) // Show up to 50 coins
    
    return (
      <div className="text-center space-y-4">
        <div className="relative mx-auto w-32 h-40">
          {/* Jar outline */}
          <div className="absolute inset-0 border-4 border-neutral-gray/30 rounded-full"></div>
          
          {/* Coins */}
          <div className="absolute inset-2 overflow-hidden">
            {Array.from({ length: coins }, (_, i) => (
              <div
                key={i}
                className="absolute w-3 h-3 bg-yellow-400 rounded-full animate-bounce"
                style={{
                  left: `${Math.random() * 80}%`,
                  top: `${Math.random() * 80}%`,
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${1 + Math.random()}s`
                }}
              />
            ))}
          </div>
          
          {/* Progress text */}
          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-lg font-bold text-neutral-dark-gray">
            {progress.percentage}%
          </div>
        </div>
        
        <div>
          <h4 className="font-semibold text-neutral-dark-gray">{goal.name}</h4>
          <p className="text-sm text-neutral-gray">{goal.description}</p>
        </div>
        
        <div className="text-sm">
          <div className="text-neutral-gray">{t('goals:progress.coinsCollected', { defaultValue: 'Coins collected' })}</div>
          <div className="font-semibold text-yellow-500">{coins} / 50</div>
        </div>
      </div>
    )
  }

  const visualComponents = {
    progressBar: ProgressBarVisual,
    thermometer: ThermometerVisual,
    jar: JarVisual,
  }

  const visualLabels = {
    progressBar: t('goals:visuals.progressBar', { defaultValue: 'ProgressBar' }),
    thermometer: t('goals:visuals.thermometer', { defaultValue: 'Thermometer' }),
    jar: t('goals:visuals.jar', { defaultValue: 'Jar' }),
  }

  const ActiveVisualComponent = visualComponents[selectedVisual]

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="bg-secondary-growth-green/10 rounded-lg p-2 mr-3">
              <ChartBarIcon className="h-6 w-6 text-secondary-growth-green" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-neutral-dark-gray">
                {t('goals:progress.title', { defaultValue: 'Goal Progress' })}
              </h3>
              <p className="text-sm text-neutral-gray">
                {t('goals:progress.subtitle', { defaultValue: 'Track your progress towards financial freedom' })}
              </p>
            </div>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCompleted(!showCompleted)}
          >
            {showCompleted 
              ? t('goals:progress.showActive', { defaultValue: 'Show Active' })
              : t('goals:progress.showCompleted', { defaultValue: 'Show Completed' })
            }
          </Button>
        </div>

        {/* Visual Style Tabs */}
        <div className="flex space-x-2 mt-4">
          {visualStyles.map((style) => (
            <button
              key={style}
              onClick={() => setSelectedVisual(style)}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                selectedVisual === style
                  ? 'bg-primary-trust-blue text-white'
                  : 'text-neutral-gray hover:text-neutral-dark-gray hover:bg-neutral-light-gray'
              }`}
            >
              {visualLabels[style]}
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent>
        {displayGoals.length === 0 ? (
          <div className="text-center py-8">
            <ChartBarIcon className="h-16 w-16 text-neutral-gray mx-auto mb-4" />
            <h4 className="text-lg font-medium text-neutral-dark-gray mb-2">
              {showCompleted 
                ? t('goals:progress.noCompleted', { defaultValue: 'No completed goals yet' })
                : t('goals:progress.noActive', { defaultValue: 'No active goals yet' })
              }
            </h4>
            <p className="text-neutral-gray mb-4">
              {showCompleted 
                ? t('goals:progress.noCompletedSubtitle', { defaultValue: 'Complete your first goal to see it here!' })
                : t('goals:progress.noActiveSubtitle', { defaultValue: 'Create your first savings goal to get started!' })
              }
            </p>
            {!showCompleted && (
              <Button variant="primary">
                <PlusIcon className="h-4 w-4 mr-2" />
                {t('goals:actions.createGoal', { defaultValue: 'Create Goal' })}
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {displayGoals.map((goal) => (
              <div key={goal.id} className="border border-neutral-gray/20 rounded-lg p-6">
                <ActiveVisualComponent goal={goal} />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
