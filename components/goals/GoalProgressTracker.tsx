'use client'

import { useState } from 'react'
import { 
  TrophyIcon,
  CalendarIcon,
  BanknotesIcon,
  PlayIcon,
  PauseIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/react/24/outline'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { formatCurrency, calculateProgress, formatTimeRemaining, getGoalStatusColor, formatDate } from '@/lib/utils'
import type { SavingsGoal } from '@/types'

interface GoalProgressTrackerProps {
  visualStyles?: string[]
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
  const [selectedVisual, setSelectedVisual] = useState<'progressBar' | 'thermometer' | 'jar'>('progressBar')
  const [showCompleted, setShowCompleted] = useState(false)

  // Mock goals data
  const goals: SavingsGoal[] = [
    {
      id: '1',
      name: 'Emergency Fund',
      description: 'Build a safety net for unexpected expenses',
      targetAmount: 10000,
      currentAmount: 6800,
      targetDate: new Date(Date.now() + 4 * 30 * 24 * 60 * 60 * 1000), // 4 months from now
      category: 'emergency',
      priority: 'high',
      isActive: true,
      milestones: [
        { id: '1', amount: 2500, description: 'First milestone', isCompleted: true, completedDate: new Date('2024-01-15') },
        { id: '2', amount: 5000, description: 'Halfway there', isCompleted: true, completedDate: new Date('2024-02-20') },
        { id: '3', amount: 7500, description: 'Almost done', isCompleted: false },
        { id: '4', amount: 10000, description: 'Goal complete!', isCompleted: false },
      ],
    },
    {
      id: '2',
      name: 'Dream Vacation',
      description: 'Two weeks in Japan',
      targetAmount: 5000,
      currentAmount: 1200,
      targetDate: new Date(Date.now() + 8 * 30 * 24 * 60 * 60 * 1000), // 8 months from now
      category: 'vacation',
      priority: 'medium',
      isActive: true,
      milestones: [
        { id: '1', amount: 1250, description: 'Flight booking', isCompleted: false },
        { id: '2', amount: 2500, description: 'Accommodation', isCompleted: false },
        { id: '3', amount: 3750, description: 'Activities & food', isCompleted: false },
        { id: '4', amount: 5000, description: 'Full budget ready', isCompleted: false },
      ],
    },
    {
      id: '3',
      name: 'New Car Fund',
      description: 'Replace my old car',
      targetAmount: 25000,
      currentAmount: 25000,
      targetDate: new Date('2024-03-01'),
      category: 'car',
      priority: 'medium',
      isActive: false,
      milestones: [
        { id: '1', amount: 6250, description: 'Quarter saved', isCompleted: true, completedDate: new Date('2023-09-15') },
        { id: '2', amount: 12500, description: 'Halfway point', isCompleted: true, completedDate: new Date('2023-11-20') },
        { id: '3', amount: 18750, description: 'Three quarters', isCompleted: true, completedDate: new Date('2024-01-10') },
        { id: '4', amount: 25000, description: 'Car purchase ready!', isCompleted: true, completedDate: new Date('2024-03-01') },
      ],
    },
  ]

  const activeGoals = goals.filter(goal => goal.isActive)
  const completedGoals = goals.filter(goal => !goal.isActive && calculateProgress(goal.currentAmount, goal.targetAmount).isComplete)
  
  const displayGoals = showCompleted ? completedGoals : activeGoals

  const ProgressBarVisual = ({ goal }: { goal: SavingsGoal }) => {
    const progress = calculateProgress(goal.currentAmount, goal.targetAmount)
    
    return (
      <div className="space-y-2">
        <ProgressBar
          value={goal.currentAmount}
          max={goal.targetAmount}
          color={progress.isComplete ? 'success' : 'primary'}
          showPercentage={true}
          label={`${formatCurrency(goal.currentAmount)} of ${formatCurrency(goal.targetAmount)}`}
          animated={!progress.isComplete}
        />
        
        {goal.milestones && goal.milestones.length > 0 && (
          <div className="flex justify-between text-xs text-neutral-gray relative">
            {goal.milestones.map((milestone, index) => (
              <div key={milestone.id} className="flex flex-col items-center">
                <div 
                  className={`w-2 h-2 rounded-full ${
                    milestone.isCompleted ? 'bg-secondary-growth-green' : 'bg-neutral-gray/30'
                  }`}
                  style={{ 
                    position: 'absolute',
                    left: `${(milestone.amount / goal.targetAmount) * 100}%`,
                    top: '-4px',
                    transform: 'translateX(-50%)'
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  const ThermometerVisual = ({ goal }: { goal: SavingsGoal }) => {
    const progress = calculateProgress(goal.currentAmount, goal.targetAmount)
    
    return (
      <div className="flex items-center justify-center">
        <div className="relative">
          {/* Thermometer container */}
          <div className="w-8 h-32 bg-neutral-light-gray rounded-full relative overflow-hidden">
            {/* Progress fill */}
            <div 
              className="absolute bottom-0 w-full bg-secondary-growth-green rounded-full transition-all duration-1000 ease-out"
              style={{ height: `${progress.percentage}%` }}
            />
          </div>
          
          {/* Thermometer bulb */}
          <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-6 h-6 bg-secondary-growth-green rounded-full" />
          
          {/* Progress text */}
          <div className="absolute -right-16 top-1/2 transform -translate-y-1/2 text-center">
            <div className="text-lg font-bold text-neutral-dark-gray">
              {progress.percentage.toFixed(0)}%
            </div>
            <div className="text-xs text-neutral-gray">
              {formatCurrency(goal.currentAmount)}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const JarVisual = ({ goal }: { goal: SavingsGoal }) => {
    const progress = calculateProgress(goal.currentAmount, goal.targetAmount)
    
    return (
      <div className="flex items-center justify-center">
        <div className="relative">
          {/* Jar container */}
          <div className="w-24 h-32 border-4 border-neutral-gray rounded-b-3xl bg-neutral-light-gray/30 relative overflow-hidden">
            {/* Jar lid */}
            <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-20 h-4 bg-neutral-gray rounded-full" />
            
            {/* Money fill */}
            <div 
              className="absolute bottom-0 w-full bg-gradient-to-t from-secondary-growth-green to-secondary-growth-green-light transition-all duration-1000 ease-out"
              style={{ height: `${progress.percentage}%` }}
            />
            
            {/* Dollar signs */}
            {progress.percentage > 20 && (
              <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-xl opacity-80">
                $
              </div>
            )}
          </div>
          
          {/* Progress text */}
          <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-center">
            <div className="text-sm font-bold text-neutral-dark-gray">
              {formatCurrency(goal.currentAmount)}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const getVisualComponent = (goal: SavingsGoal) => {
    switch (selectedVisual) {
      case 'thermometer':
        return <ThermometerVisual goal={goal} />
      case 'jar':
        return <JarVisual goal={goal} />
      default:
        return <ProgressBarVisual goal={goal} />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-accent-warning-red bg-accent-warning-red/10'
      case 'medium':
        return 'text-accent-action-orange bg-accent-action-orange/10'
      case 'low':
        return 'text-secondary-growth-green bg-secondary-growth-green/10'
      default:
        return 'text-neutral-gray bg-neutral-gray/10'
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="bg-accent-action-orange/10 rounded-lg p-2 mr-3">
              <TrophyIcon className="h-6 w-6 text-accent-action-orange" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-neutral-dark-gray">
                Goal Progress
              </h3>
              <p className="text-sm text-neutral-gray">
                Track your progress towards financial freedom
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Visual style selector */}
            <div className="flex bg-neutral-light-gray rounded-lg p-1">
              {visualStyles.map((style) => (
                <button
                  key={style}
                  onClick={() => setSelectedVisual(style as any)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all duration-200 ${
                    selectedVisual === style
                      ? 'bg-white text-primary-trust-blue shadow-sm'
                      : 'text-neutral-gray hover:text-neutral-dark-gray'
                  }`}
                >
                  {style.charAt(0).toUpperCase() + style.slice(1)}
                </button>
              ))}
            </div>
            
            {/* Active/Completed toggle */}
            <div className="flex bg-neutral-light-gray rounded-lg p-1">
              <button
                onClick={() => setShowCompleted(false)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all duration-200 ${
                  !showCompleted
                    ? 'bg-white text-primary-trust-blue shadow-sm'
                    : 'text-neutral-gray hover:text-neutral-dark-gray'
                }`}
              >
                Active ({activeGoals.length})
              </button>
              <button
                onClick={() => setShowCompleted(true)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all duration-200 ${
                  showCompleted
                    ? 'bg-white text-primary-trust-blue shadow-sm'
                    : 'text-neutral-gray hover:text-neutral-dark-gray'
                }`}
              >
                Completed ({completedGoals.length})
              </button>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {displayGoals.length === 0 ? (
          <div className="text-center py-8">
            <TrophyIcon className="h-16 w-16 text-neutral-gray mx-auto mb-4" />
            <h4 className="text-lg font-medium text-neutral-dark-gray mb-2">
              {showCompleted ? 'No completed goals yet' : 'No active goals'}
            </h4>
            <p className="text-neutral-gray">
              {showCompleted 
                ? 'Complete some goals to see them here!' 
                : 'Create your first goal to start tracking progress.'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {displayGoals.map((goal) => {
              const progress = calculateProgress(goal.currentAmount, goal.targetAmount)
              const isOverdue = new Date() > goal.targetDate && !progress.isComplete
              
              return (
                <div 
                  key={goal.id} 
                  className={`bg-white border rounded-lg p-6 ${
                    progress.isComplete && celebrationAnimations 
                      ? 'border-secondary-growth-green shadow-lg animate-celebrate' 
                      : 'border-neutral-gray/20'
                  }`}
                >
                  {/* Goal Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <h4 className="text-lg font-semibold text-neutral-dark-gray mr-3">
                          {goal.name}
                        </h4>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${getPriorityColor(goal.priority)}`}>
                          {goal.priority.charAt(0).toUpperCase() + goal.priority.slice(1)}
                        </span>
                        {progress.isComplete && (
                          <span className="ml-2 text-xs px-2 py-1 bg-secondary-growth-green text-white rounded-full font-medium">
                            ✓ Complete
                          </span>
                        )}
                        {isOverdue && (
                          <span className="ml-2 text-xs px-2 py-1 bg-accent-warning-red text-white rounded-full font-medium">
                            Overdue
                          </span>
                        )}
                      </div>
                      {goal.description && (
                        <p className="text-sm text-neutral-gray mb-2">
                          {goal.description}
                        </p>
                      )}
                      
                      <div className="flex items-center space-x-4 text-sm text-neutral-gray">
                        {showTimeRemaining && (
                          <div className="flex items-center">
                            <CalendarIcon className="h-4 w-4 mr-1" />
                            {progress.isComplete 
                              ? 'Completed!' 
                              : formatTimeRemaining(goal.targetDate)
                            }
                          </div>
                        )}
                        <div className="flex items-center">
                          <BanknotesIcon className="h-4 w-4 mr-1" />
                          {formatCurrency(progress.remaining)} remaining
                        </div>
                      </div>
                    </div>
                    
                    {/* Action buttons */}
                    <div className="flex items-center space-x-2">
                      <button className="p-2 rounded-lg hover:bg-neutral-light-gray text-neutral-gray hover:text-neutral-dark-gray transition-colors duration-200">
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      {goal.isActive ? (
                        <button className="p-2 rounded-lg hover:bg-neutral-light-gray text-neutral-gray hover:text-neutral-dark-gray transition-colors duration-200">
                          <PauseIcon className="h-4 w-4" />
                        </button>
                      ) : (
                        <button className="p-2 rounded-lg hover:bg-neutral-light-gray text-neutral-gray hover:text-neutral-dark-gray transition-colors duration-200">
                          <PlayIcon className="h-4 w-4" />
                        </button>
                      )}
                      <button className="p-2 rounded-lg hover:bg-accent-warning-red/10 text-neutral-gray hover:text-accent-warning-red transition-colors duration-200">
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Progress Visualization */}
                  <div className="mb-4">
                    {getVisualComponent(goal)}
                  </div>

                  {/* Goal Statistics */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="text-center bg-neutral-light-gray/50 rounded-lg p-3">
                      <div className="text-sm text-neutral-gray">Progress</div>
                      <div className={`text-lg font-bold ${getGoalStatusColor(goal.currentAmount, goal.targetAmount)}`}>
                        {progress.percentage.toFixed(0)}%
                      </div>
                    </div>
                    <div className="text-center bg-neutral-light-gray/50 rounded-lg p-3">
                      <div className="text-sm text-neutral-gray">Saved</div>
                      <div className="text-lg font-bold text-neutral-dark-gray">
                        {formatCurrency(goal.currentAmount)}
                      </div>
                    </div>
                    <div className="text-center bg-neutral-light-gray/50 rounded-lg p-3">
                      <div className="text-sm text-neutral-gray">Target</div>
                      <div className="text-lg font-bold text-neutral-dark-gray">
                        {formatCurrency(goal.targetAmount)}
                      </div>
                    </div>
                    <div className="text-center bg-neutral-light-gray/50 rounded-lg p-3">
                      <div className="text-sm text-neutral-gray">Remaining</div>
                      <div className="text-lg font-bold text-accent-action-orange">
                        {formatCurrency(progress.remaining)}
                      </div>
                    </div>
                  </div>

                  {/* Milestones */}
                  {goal.milestones && goal.milestones.length > 0 && (
                    <div>
                      <h5 className="font-medium text-neutral-dark-gray mb-2">Milestones</h5>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {goal.milestones.map((milestone) => (
                          <div 
                            key={milestone.id} 
                            className={`text-center p-2 rounded-lg border ${
                              milestone.isCompleted 
                                ? 'bg-secondary-growth-green/10 border-secondary-growth-green/30 text-secondary-growth-green'
                                : 'bg-neutral-light-gray/50 border-neutral-gray/30 text-neutral-gray'
                            }`}
                          >
                            <div className="text-xs font-medium">
                              {formatCurrency(milestone.amount)}
                            </div>
                            <div className="text-xs mt-1">
                              {milestone.description}
                            </div>
                            {milestone.isCompleted && (
                              <div className="text-xs mt-1 opacity-75">
                                ✓ {milestone.completedDate ? formatDate(milestone.completedDate, 'MMM dd') : 'Done'}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Quick Actions */}
                  {goal.isActive && !progress.isComplete && (
                    <div className="mt-4 flex items-center space-x-2">
                      <Button variant="secondary" size="sm">
                        Add Money
                      </Button>
                      <Button variant="outline" size="sm">
                        Adjust Goal
                      </Button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
