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
  TruckIcon,
  BeakerIcon,
  BanknotesIcon
} from '@heroicons/react/24/outline'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { sanitizeNumberInput, formatDate } from '@/lib/utils'
import { useTranslation } from '@/lib/useTranslation'
import { useCurrency } from '@/lib/useCurrency'
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
  const { t, isReady } = useTranslation(['goals', 'common'])
  const { formatCurrency } = useCurrency()
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

  const goalTemplates: GoalTemplate[] = [
    {
      id: 'emergency',
      name: t('goals:templates.emergency.name', { defaultValue: 'Emergency Fund' }),
      icon: BanknotesIcon,
      suggestedAmount: 10000,
      suggestedTimeframe: 12,
      description: t('goals:templates.emergency.description', { defaultValue: 'Build a safety net for unexpected expenses' }),
      tips: [
        t('goals:templates.emergency.tips.amount', { defaultValue: 'Aim for 3-6 months of expenses' }),
        t('goals:templates.emergency.tips.account', { defaultValue: 'Keep in high-yield savings' }),
        t('goals:templates.emergency.tips.automate', { defaultValue: 'Automate contributions' })
      ],
    },
    {
      id: 'vacation',
      name: t('goals:templates.vacation.name', { defaultValue: 'Dream Vacation' }),
      icon: SparklesIcon,
      suggestedAmount: 3000,
      suggestedTimeframe: 8,
      description: t('goals:templates.vacation.description', { defaultValue: 'Save for your perfect getaway' }),
      tips: [
        t('goals:templates.vacation.tips.research', { defaultValue: 'Research costs early' }),
        t('goals:templates.vacation.tips.booking', { defaultValue: 'Book in advance for deals' }),
        t('goals:templates.vacation.tips.offseason', { defaultValue: 'Consider off-season travel' })
      ],
    },
    {
      id: 'home',
      name: t('goals:templates.home.name', { defaultValue: 'Home Down Payment' }),
      icon: HomeIcon,
      suggestedAmount: 50000,
      suggestedTimeframe: 36,
      description: t('goals:templates.home.description', { defaultValue: 'Save for your dream home' }),
      tips: [
        t('goals:templates.home.tips.downpayment', { defaultValue: 'Aim for 20% down payment' }),
        t('goals:templates.home.tips.closing', { defaultValue: 'Factor in closing costs' }),
        t('goals:templates.home.tips.programs', { defaultValue: 'Consider first-time buyer programs' })
      ],
    },
    {
      id: 'car',
      name: t('goals:templates.car.name', { defaultValue: 'Car Purchase' }),
      icon: TruckIcon,
      suggestedAmount: 25000,
      suggestedTimeframe: 18,
      description: t('goals:templates.car.description', { defaultValue: 'Buy your next vehicle with cash' }),
      tips: [
        t('goals:templates.car.tips.depreciation', { defaultValue: 'Research depreciation rates' }),
        t('goals:templates.car.tips.certified', { defaultValue: 'Consider certified pre-owned' }),
        t('goals:templates.car.tips.insurance', { defaultValue: 'Factor in insurance costs' })
      ],
    },
    {
      id: 'wedding',
      name: t('goals:templates.wedding.name', { defaultValue: 'Wedding' }),
      icon: HeartIcon,
      suggestedAmount: 15000,
      suggestedTimeframe: 24,
      description: t('goals:templates.wedding.description', { defaultValue: 'Your special day without financial stress' }),
      tips: [
        t('goals:templates.wedding.tips.prioritize', { defaultValue: 'Prioritize what matters most' }),
        t('goals:templates.wedding.tips.negotiate', { defaultValue: 'Negotiate with vendors' }),
        t('goals:templates.wedding.tips.alternatives', { defaultValue: 'Consider cost-effective alternatives' })
      ],
    },
    {
      id: 'education',
      name: t('goals:templates.education.name', { defaultValue: 'Education' }),
      icon: AcademicCapIcon,
      suggestedAmount: 25000,
      suggestedTimeframe: 48,
      description: t('goals:templates.education.description', { defaultValue: 'Invest in your future through learning' }),
      tips: [
        t('goals:templates.education.tips.scholarships', { defaultValue: 'Apply for scholarships and grants' }),
        t('goals:templates.education.tips.community', { defaultValue: 'Consider community college first' }),
        t('goals:templates.education.tips.workstudy', { defaultValue: 'Look into work-study programs' })
      ],
    },
    {
      id: 'retirement',
      name: t('goals:templates.retirement.name', { defaultValue: 'Retirement' }),
      icon: BeakerIcon,
      suggestedAmount: 1000000,
      suggestedTimeframe: 360,
      description: t('goals:templates.retirement.description', { defaultValue: 'Secure your golden years' }),
      tips: [
        t('goals:templates.retirement.tips.start', { defaultValue: 'Start early, compound interest is powerful' }),
        t('goals:templates.retirement.tips.employer', { defaultValue: 'Maximize employer matching' }),
        t('goals:templates.retirement.tips.diversify', { defaultValue: 'Diversify your investments' })
      ],
    },
    {
      id: 'custom',
      name: t('goals:templates.custom.name', { defaultValue: 'Custom Goal' }),
      icon: PlusIcon,
      suggestedAmount: 5000,
      suggestedTimeframe: 12,
      description: t('goals:templates.custom.description', { defaultValue: 'Create your own personalized goal' }),
      tips: [
        t('goals:templates.custom.tips.specific', { defaultValue: 'Be specific about what you want' }),
        t('goals:templates.custom.tips.realistic', { defaultValue: 'Set realistic timelines' }),
        t('goals:templates.custom.tips.flexible', { defaultValue: 'Stay flexible and adjust as needed' })
      ],
    },
  ]

  const handleTemplateSelect = (template: GoalTemplate) => {
    setSelectedTemplate(template)
    setGoalData(prev => ({
      ...prev,
      name: template.name,
      targetAmount: template.suggestedAmount.toString(),
      targetDate: new Date(Date.now() + template.suggestedTimeframe * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      description: template.description,
    }))
    setCurrentStep(2)
  }

  const handleSubmit = () => {
    // Handle goal creation
    console.log('Creating goal:', goalData)
    setShowWizard(false)
    setCurrentStep(1)
    setSelectedTemplate(null)
    setGoalData({
      name: '',
      targetAmount: '',
      targetDate: '',
      description: '',
      priority: 'medium',
    })
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    } else {
      setShowWizard(false)
      setCurrentStep(1)
      setSelectedTemplate(null)
      setGoalData({
        name: '',
        targetAmount: '',
        targetDate: '',
        description: '',
        priority: 'medium',
      })
    }
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
    <div className="space-y-6">
      {/* Create New Goal Card */}
      <Card className="relative overflow-hidden">
        <CardContent className="p-8 text-center">
          <div className="mb-6">
            <div className="bg-gradient-to-br from-primary-trust-blue/10 to-secondary-growth-green/10 rounded-full w-24 h-24 mx-auto mb-4 flex items-center justify-center">
              <div className="text-4xl">?</div>
              <div className="absolute inset-0 bg-gradient-to-br from-primary-trust-blue/20 to-secondary-growth-green/20 rounded-full animate-pulse"></div>
            </div>
            <h3 className="text-2xl font-bold text-neutral-dark-gray mb-2">
              {t('goals:wizard.createNewGoal.title', { defaultValue: 'Create New Goal' })}
            </h3>
            <p className="text-neutral-gray max-w-md mx-auto">
              {t('goals:wizard.createNewGoal.subtitle', { defaultValue: 'Ready to achieve your dreams? Create your first savings goal and start your journey to financial success.' })}
            </p>
          </div>
          
          <Button
            onClick={() => setShowWizard(true)}
            className="bg-gradient-to-r from-primary-trust-blue to-secondary-growth-green hover:from-primary-trust-blue/90 hover:to-secondary-growth-green/90 text-white px-8 py-3 text-lg font-semibold"
          >
            {t('goals:wizard.createNewGoal.getStarted', { defaultValue: 'Get Started' })}
          </Button>
        </CardContent>
      </Card>

      {/* Goal Creation Wizard Modal */}
      {showWizard && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="border-b border-neutral-gray/20">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-neutral-dark-gray">
                  {t('goals:wizard.title', { defaultValue: 'Create Your Savings Goal' })}
                </h3>
                <button
                  onClick={() => setShowWizard(false)}
                  className="text-neutral-gray hover:text-neutral-dark-gray transition-colors"
                >
                  <PlusIcon className="h-6 w-6 transform rotate-45" />
                </button>
              </div>
            </CardHeader>

            <CardContent className="p-6">
              {/* Step 1: Choose Template */}
              {currentStep === 1 && (
                <div>
                  <h4 className="text-lg font-semibold text-neutral-dark-gray mb-4 text-center">
                    {t('goals:wizard.step1.title', { defaultValue: 'What would you like to save for?' })}
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
                <div className="space-y-6">
                  <div>
                    <h4 className="text-lg font-semibold text-neutral-dark-gray mb-4">
                      {t('goals:wizard.step2.title', { defaultValue: 'Customize Your Goal' })}
                    </h4>
                    <p className="text-neutral-gray mb-4">
                      {t('goals:wizard.step2.subtitle', { defaultValue: 'Fine-tune the details to match your specific needs and timeline.' })}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-dark-gray mb-2">
                        {t('goals:wizard.step2.fields.name', { defaultValue: 'Goal Name' })}
                      </label>
                      <input
                        type="text"
                        value={goalData.name}
                        onChange={(e) => setGoalData(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-3 py-2 border border-neutral-gray/30 rounded-lg focus:ring-2 focus:ring-primary-trust-blue focus:border-transparent"
                        placeholder={t('goals:wizard.step2.fields.namePlaceholder', { defaultValue: 'Enter goal name' })}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-dark-gray mb-2">
                        {t('goals:wizard.step2.fields.targetAmount', { defaultValue: 'Target Amount' })}
                      </label>
                      <input
                        type="number"
                        value={goalData.targetAmount}
                        onChange={(e) => setGoalData(prev => ({ ...prev, targetAmount: e.target.value }))}
                        className="w-full px-3 py-2 border border-neutral-gray/30 rounded-lg focus:ring-2 focus:ring-primary-trust-blue focus:border-transparent"
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-dark-gray mb-2">
                        {t('goals:wizard.step2.fields.targetDate', { defaultValue: 'Target Date' })}
                      </label>
                      <input
                        type="date"
                        value={goalData.targetDate}
                        onChange={(e) => setGoalData(prev => ({ ...prev, targetDate: e.target.value }))}
                        className="w-full px-3 py-2 border border-neutral-gray/30 rounded-lg focus:ring-2 focus:ring-primary-trust-blue focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-dark-gray mb-2">
                        {t('goals:wizard.step2.fields.priority', { defaultValue: 'Priority' })}
                      </label>
                      <select
                        value={goalData.priority}
                        onChange={(e) => setGoalData(prev => ({ ...prev, priority: e.target.value as 'low' | 'medium' | 'high' }))}
                        className="w-full px-3 py-2 border border-neutral-gray/30 rounded-lg focus:ring-2 focus:ring-primary-trust-blue focus:border-transparent"
                      >
                        <option value="low">{t('goals:wizard.step2.priority.low', { defaultValue: 'Low' })}</option>
                        <option value="medium">{t('goals:wizard.step2.priority.medium', { defaultValue: 'Medium' })}</option>
                        <option value="high">{t('goals:wizard.step2.priority.high', { defaultValue: 'High' })}</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-dark-gray mb-2">
                      {t('goals:wizard.step2.fields.description', { defaultValue: 'Description' })}
                    </label>
                    <textarea
                      value={goalData.description}
                      onChange={(e) => setGoalData(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 border border-neutral-gray/30 rounded-lg focus:ring-2 focus:ring-primary-trust-blue focus:border-transparent"
                      placeholder={t('goals:wizard.step2.fields.descriptionPlaceholder', { defaultValue: 'Describe your goal in detail...' })}
                    />
                  </div>

                  {/* Template Tips */}
                  <div className="bg-neutral-light-gray/50 rounded-lg p-4">
                    <h5 className="font-medium text-neutral-dark-gray mb-2">
                      {t('goals:wizard.step2.tips.title', { defaultValue: 'Tips for Success' })}
                    </h5>
                    <ul className="space-y-1 text-sm text-neutral-gray">
                      {selectedTemplate.tips.map((tip, index) => (
                        <li key={index} className="flex items-start">
                          <span className="text-secondary-growth-green mr-2">•</span>
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex justify-between mt-8 pt-6 border-t border-neutral-gray/20">
                <Button
                  variant="outline"
                  onClick={handleBack}
                  className="px-6"
                >
                  {currentStep === 1 
                    ? t('common:actions.cancel', { defaultValue: 'Cancel' })
                    : t('common:actions.back', { defaultValue: 'Back' })
                  }
                </Button>

                {currentStep === 2 && (
                  <Button
                    onClick={handleSubmit}
                    className="px-8"
                    disabled={!goalData.name || !goalData.targetAmount || !goalData.targetDate}
                  >
                    {t('goals:wizard.step2.createGoal', { defaultValue: 'Create Goal' })}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
