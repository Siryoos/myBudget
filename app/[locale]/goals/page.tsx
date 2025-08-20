'use client'

import { GoalWizard } from '@/components/goals/GoalWizard'
import { GoalProgressTracker } from '@/components/goals/GoalProgressTracker'
import { AutomationSettings } from '@/components/goals/AutomationSettings'
import { useTranslation } from '@/lib/useTranslation'

export default function GoalsPage() {
  const { t, isReady } = useTranslation(['goals', 'common'])

  if (!isReady) {
    return (
      <div className="min-h-screen bg-neutral-light-gray flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-trust-blue mx-auto mb-4"></div>
          <p className="text-neutral-gray">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6" id="main-content">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-secondary-growth-green to-secondary-growth-green-light rounded-lg p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">
          {t('goals:page.title', { defaultValue: 'Savings Goals' })}
        </h1>
        <p className="text-secondary-growth-green-light">
          {t('goals:page.subtitle', { defaultValue: 'Turn your dreams into achievable financial goals with smart tracking and automation' })}
        </p>
      </div>

      {/* Goals Overview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Goal Creation */}
        <div className="lg:col-span-2 space-y-6">
          <GoalWizard 
            templates={[
              'Emergency Fund',
              'Vacation',
              'Home Down Payment',
              'Car Purchase',
              'Wedding',
              'Education',
              'Retirement',
              'Custom'
            ]}
            visualGoalSetting={true}
            milestoneBreakdown={true}
          />
          
          <GoalProgressTracker 
            visualStyles={['progressBar', 'thermometer', 'jar']}
            showTimeRemaining={true}
            showProjectedCompletion={true}
            celebrationAnimations={true}
          />
        </div>

        {/* Right Column - Automation */}
        <div>
          <AutomationSettings 
            autoTransfer={true}
            roundUpSavings={true}
            ruleBasedSaving={true}
            customRules={true}
          />
        </div>
      </div>
    </div>
  )
}

