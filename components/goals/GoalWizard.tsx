'use client'

import { useState } from 'react'
import { 
  PlusIcon,
  SparklesIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  HomeIcon,
  AcademicCapIcon,
  HeartIcon,
  CarIcon,
  BeakerIcon,
  BanknotesIcon
} from '@heroicons/react/24/outline'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { formatCurrency, sanitizeNumberInput, formatDate } from '@/lib/utils'
import type { SavingsGoal, GoalCategory } from '@/types'

interface GoalTemplate {
  id: GoalCategory
  name: string
  icon: any
  suggestedAmount: number
  suggestedTimeframe: number // months
  description: string
  tips: string[]
}

interface GoalWizardProps {
  templates?: string[]
  visualGoalSetting?: boolean
  milestoneBreakdown?: boolean
}

export function GoalWizard({
  templates = ['Emergency Fund', 'Vacation', 'Home Down Payment', 'Car Purchase', 'Wedding', 'Education', 'Retirement', 'Custom'],
  visualGoalSetting = true,
  milestoneBreakdown = true,
}: GoalWizardProps) {
  const [showWizard, setShowWizard] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [selectedTemplate, setSelectedTemplate] = useState<GoalTemplate | null>(null)
  const [goalData, setGoalData] = useState({
    name: '',
    targetAmount: '',
    targetDate: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
  })

  const goalTemplates: GoalTemplate[] = [
    {
      id: 'emergency',
      name: 'Emergency Fund',
      icon: BanknotesIcon,
      suggestedAmount: 10000,
      suggestedTimeframe: 12,
      description: 'Build a safety net for unexpected expenses',
      tips: ['Aim for 3-6 months of expenses', 'Keep in high-yield savings', 'Automate contributions'],
    },
    {
      id: 'vacation',
      name: 'Dream Vacation',
      icon: SparklesIcon,
      suggestedAmount: 3000,
      suggestedTimeframe: 8,
      description: 'Save for your perfect getaway',
      tips: ['Research costs early', 'Book in advance for deals', 'Consider off-season travel'],
    },
    {
      id: 'home',
      name: 'Home Down Payment',
      icon: HomeIcon,
      suggestedAmount: 50000,
      suggestedTimeframe: 36,
      description: 'Save for your dream home',
      tips: ['Aim for 20% down payment', 'Factor in closing costs', 'Consider first-time buyer programs'],
    },
    {
      id: 'car',
      name: 'Car Purchase',
      icon: CarIcon,
      suggestedAmount: 25000,
      suggestedTimeframe: 18,
      description: 'Buy your next vehicle with cash',
      tips: ['Research depreciation rates', 'Consider certified pre-owned', 'Factor in insurance costs'],
    },
    {
      id: 'wedding',
      name: 'Wedding',
      icon: HeartIcon,
      suggestedAmount: 15000,
      suggestedTimeframe: 24,
      description: 'Plan your special day without debt',
      tips: ['Set priorities early', 'Consider off-peak dates', 'Track expenses carefully'],
    },
    {
      id: 'education',
      name: 'Education Fund',
      icon: AcademicCapIcon,
      suggestedAmount: 20000,
      suggestedTimeframe: 48,
      description: 'Invest in learning and growth',
      tips: ['Research program costs', 'Look for scholarships', 'Consider employer assistance'],
    },
    {
      id: 'retirement',
      name: 'Retirement Boost',
      icon: BanknotesIcon,
      suggestedAmount: 100000,
      suggestedTimeframe: 120,
      description: 'Supercharge your retirement savings',
      tips: ['Maximize employer match', 'Consider Roth IRA', 'Increase contributions annually'],
    },
    {
      id: 'custom',
      name: 'Custom Goal',
      icon: BeakerIcon,
      suggestedAmount: 5000,
      suggestedTimeframe: 12,
      description: 'Create your own savings goal',
      tips: ['Be specific about your target', 'Set realistic timeframes', 'Track progress regularly'],
    },
  ]

  const handleTemplateSelect = (template: GoalTemplate) => {
    setSelectedTemplate(template)
    setGoalData(prev => ({
      ...prev,
      name: template.name,
      targetAmount: template.suggestedAmount.toString(),
      targetDate: new Date(Date.now() + template.suggestedTimeframe * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    }))
    setCurrentStep(2)
  }

  const handleCreateGoal = () => {
    const newGoal: Partial<SavingsGoal> = {
      name: goalData.name,
      targetAmount: sanitizeNumberInput(goalData.targetAmount),
      targetDate: new Date(goalData.targetDate),
      description: goalData.description,
      priority: goalData.priority,
      category: selectedTemplate?.id || 'custom',
      currentAmount: 0,
      isActive: true,
    }

    console.log('Creating goal:', newGoal)
    
    // Reset wizard
    setShowWizard(false)
    setCurrentStep(1)
    setSelectedTemplate(null)
    setGoalData({ name: '', targetAmount: '', targetDate: '', description: '', priority: 'medium' })
  }

  const calculateMonthlyTarget = () => {
    if (!goalData.targetAmount || !goalData.targetDate) return 0
    
    const target = sanitizeNumberInput(goalData.targetAmount)
    const targetDate = new Date(goalData.targetDate)
    const now = new Date()
    const monthsRemaining = Math.max(1, Math.ceil((targetDate.getTime() - now.getTime()) / (30 * 24 * 60 * 60 * 1000)))
    
    return target / monthsRemaining
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-accent-warning-red/10 text-accent-warning-red border-accent-warning-red/30'
      case 'medium':
        return 'bg-accent-action-orange/10 text-accent-action-orange border-accent-action-orange/30'
      case 'low':
        return 'bg-secondary-growth-green/10 text-secondary-growth-green border-secondary-growth-green/30'
      default:
        return 'bg-neutral-gray/10 text-neutral-gray border-neutral-gray/30'
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="bg-secondary-growth-green/10 rounded-lg p-2 mr-3">
              <SparklesIcon className="h-6 w-6 text-secondary-growth-green" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-neutral-dark-gray">
                Create New Goal
              </h3>
              <p className="text-sm text-neutral-gray">
                Turn your dreams into actionable savings plans
              </p>
            </div>
          </div>
          
          {!showWizard && (
            <Button
              variant="primary"
              onClick={() => setShowWizard(true)}
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              New Goal
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {!showWizard ? (
          <div className="text-center py-8">
            <SparklesIcon className="h-16 w-16 text-neutral-gray mx-auto mb-4" />
            <h4 className="text-lg font-medium text-neutral-dark-gray mb-2">
              Ready to achieve your dreams?
            </h4>
            <p className="text-neutral-gray mb-4">
              Create your first savings goal and start your journey to financial success.
            </p>
            <Button variant="primary" onClick={() => setShowWizard(true)}>
              Get Started
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Progress Steps */}
            <div className="flex items-center justify-center space-x-4 mb-6">
              {[1, 2, 3].map((step) => (
                <div key={step} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step <= currentStep
                      ? 'bg-secondary-growth-green text-white'
                      : 'bg-neutral-light-gray text-neutral-gray'
                  }`}>
                    {step}
                  </div>
                  {step < 3 && (
                    <div className={`w-8 h-1 mx-2 ${
                      step < currentStep ? 'bg-secondary-growth-green' : 'bg-neutral-light-gray'
                    }`} />
                  )}
                </div>
              ))}
            </div>

            {/* Step 1: Choose Template */}
            {currentStep === 1 && (
              <div>
                <h4 className="text-lg font-semibold text-neutral-dark-gray mb-4 text-center">
                  What would you like to save for?
                </h4>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {goalTemplates.filter(template => 
                    templates.includes(template.name) || templates.includes('Custom')
                  ).map((template) => {
                    const IconComponent = template.icon
                    
                    return (
                      <button
                        key={template.id}
                        onClick={() => handleTemplateSelect(template)}
                        className="p-4 rounded-lg border-2 border-neutral-gray/30 hover:border-secondary-growth-green/50 transition-all duration-200 text-center group hover:shadow-md"
                      >
                        <div className="bg-neutral-light-gray group-hover:bg-secondary-growth-green/10 rounded-lg p-3 mb-2 mx-auto w-fit transition-colors duration-200">
                          <IconComponent className="h-6 w-6 text-neutral-gray group-hover:text-secondary-growth-green transition-colors duration-200" />
                        </div>
                        <div className="text-sm font-medium text-neutral-dark-gray">
                          {template.name}
                        </div>
                        <div className="text-xs text-neutral-gray mt-1">
                          {formatCurrency(template.suggestedAmount)}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Step 2: Goal Details */}
            {currentStep === 2 && selectedTemplate && (
              <div className="space-y-4">
                <div className="text-center mb-6">
                  <div className="bg-secondary-growth-green/10 rounded-lg p-3 w-fit mx-auto mb-2">
                    <selectedTemplate.icon className="h-8 w-8 text-secondary-growth-green" />
                  </div>
                  <h4 className="text-lg font-semibold text-neutral-dark-gray">
                    {selectedTemplate.name}
                  </h4>
                  <p className="text-sm text-neutral-gray">
                    {selectedTemplate.description}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="goal-name" className="block text-sm font-medium text-neutral-dark-gray mb-1">
                      Goal Name
                    </label>
                    <input
                      id="goal-name"
                      type="text"
                      value={goalData.name}
                      onChange={(e) => setGoalData(prev => ({ ...prev, name: e.target.value }))}
                      className="input-field"
                      placeholder="My savings goal"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="target-amount" className="block text-sm font-medium text-neutral-dark-gray mb-1">
                      Target Amount
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <CurrencyDollarIcon className="h-5 w-5 text-neutral-gray" />
                      </div>
                      <input
                        id="target-amount"
                        type="number"
                        min="0"
                        step="100"
                        value={goalData.targetAmount}
                        onChange={(e) => setGoalData(prev => ({ ...prev, targetAmount: e.target.value }))}
                        className="input-field pl-10"
                        placeholder="5000"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="target-date" className="block text-sm font-medium text-neutral-dark-gray mb-1">
                      Target Date
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <CalendarIcon className="h-5 w-5 text-neutral-gray" />
                      </div>
                      <input
                        id="target-date"
                        type="date"
                        value={goalData.targetDate}
                        onChange={(e) => setGoalData(prev => ({ ...prev, targetDate: e.target.value }))}
                        className="input-field pl-10"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="priority" className="block text-sm font-medium text-neutral-dark-gray mb-1">
                      Priority
                    </label>
                    <select
                      id="priority"
                      value={goalData.priority}
                      onChange={(e) => setGoalData(prev => ({ ...prev, priority: e.target.value as any }))}
                      className="input-field"
                    >
                      <option value="low">Low Priority</option>
                      <option value="medium">Medium Priority</option>
                      <option value="high">High Priority</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-neutral-dark-gray mb-1">
                    Description (Optional)
                  </label>
                  <textarea
                    id="description"
                    rows={3}
                    value={goalData.description}
                    onChange={(e) => setGoalData(prev => ({ ...prev, description: e.target.value }))}
                    className="input-field resize-none"
                    placeholder="Add more details about your goal..."
                  />
                </div>

                {/* Goal Summary */}
                {goalData.targetAmount && goalData.targetDate && (
                  <div className="bg-neutral-light-gray/50 rounded-lg p-4">
                    <h5 className="font-medium text-neutral-dark-gray mb-2">Goal Summary</h5>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-neutral-gray">Monthly target:</span>
                        <div className="font-semibold text-secondary-growth-green">
                          {formatCurrency(calculateMonthlyTarget())}
                        </div>
                      </div>
                      <div>
                        <span className="text-neutral-gray">Priority:</span>
                        <div className={`inline-block px-2 py-1 rounded-full text-xs font-medium ml-2 ${getPriorityColor(goalData.priority)}`}>
                          {goalData.priority.charAt(0).toUpperCase() + goalData.priority.slice(1)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <Button
                    variant="ghost"
                    onClick={() => setCurrentStep(1)}
                  >
                    Back
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => setCurrentStep(3)}
                    disabled={!goalData.name || !goalData.targetAmount || !goalData.targetDate}
                  >
                    Continue
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Confirmation */}
            {currentStep === 3 && selectedTemplate && (
              <div className="space-y-4">
                <div className="text-center mb-6">
                  <h4 className="text-lg font-semibold text-neutral-dark-gray mb-2">
                    Review Your Goal
                  </h4>
                  <p className="text-neutral-gray">
                    Make sure everything looks correct before creating your goal.
                  </p>
                </div>

                <div className="bg-white border border-neutral-gray/20 rounded-lg p-6">
                  <div className="flex items-start mb-4">
                    <div className="bg-secondary-growth-green/10 rounded-lg p-3 mr-4">
                      <selectedTemplate.icon className="h-8 w-8 text-secondary-growth-green" />
                    </div>
                    <div className="flex-1">
                      <h5 className="text-lg font-semibold text-neutral-dark-gray">
                        {goalData.name}
                      </h5>
                      {goalData.description && (
                        <p className="text-sm text-neutral-gray mt-1">
                          {goalData.description}
                        </p>
                      )}
                    </div>
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(goalData.priority)}`}>
                      {goalData.priority.charAt(0).toUpperCase() + goalData.priority.slice(1)}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div className="bg-neutral-light-gray/50 rounded-lg p-3">
                      <div className="text-sm text-neutral-gray">Target Amount</div>
                      <div className="text-lg font-bold text-neutral-dark-gray">
                        {formatCurrency(sanitizeNumberInput(goalData.targetAmount))}
                      </div>
                    </div>
                    <div className="bg-neutral-light-gray/50 rounded-lg p-3">
                      <div className="text-sm text-neutral-gray">Target Date</div>
                      <div className="text-lg font-bold text-neutral-dark-gray">
                        {formatDate(new Date(goalData.targetDate), 'MMM yyyy')}
                      </div>
                    </div>
                    <div className="bg-neutral-light-gray/50 rounded-lg p-3">
                      <div className="text-sm text-neutral-gray">Monthly Target</div>
                      <div className="text-lg font-bold text-secondary-growth-green">
                        {formatCurrency(calculateMonthlyTarget())}
                      </div>
                    </div>
                    <div className="bg-neutral-light-gray/50 rounded-lg p-3">
                      <div className="text-sm text-neutral-gray">Time Remaining</div>
                      <div className="text-lg font-bold text-accent-action-orange">
                        {Math.ceil((new Date(goalData.targetDate).getTime() - new Date().getTime()) / (30 * 24 * 60 * 60 * 1000))} months
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tips */}
                <div className="bg-primary-trust-blue/5 rounded-lg p-4">
                  <h5 className="font-medium text-primary-trust-blue mb-2">
                    💡 Tips for {selectedTemplate.name}
                  </h5>
                  <ul className="text-sm text-neutral-gray space-y-1">
                    {selectedTemplate.tips.map((tip, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-primary-trust-blue mr-2">•</span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex items-center justify-between">
                  <Button
                    variant="ghost"
                    onClick={() => setCurrentStep(2)}
                  >
                    Back
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleCreateGoal}
                  >
                    Create Goal
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
