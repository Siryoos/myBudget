import { Metadata } from 'next'
import { EducationHub } from '@/components/education/EducationHub'
import { TipsFeed } from '@/components/education/TipsFeed'

export const metadata: Metadata = {
  title: 'Financial Education',
  description: 'Learn and improve your financial knowledge with interactive modules and tips',
}

export default function LearnPage() {
  return (
    <div className="space-y-6" id="main-content">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-primary-trust-blue to-primary-trust-blue-light rounded-lg p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">Financial Education</h1>
        <p className="text-primary-trust-blue-light">
          Build your financial knowledge with interactive lessons and personalized tips
        </p>
      </div>

      {/* Education Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Education Hub */}
        <div className="lg:col-span-2">
          <EducationHub 
            topics={[
              'Budgeting Basics',
              'Emergency Funds',
              'Debt Management',
              'Investment Introduction',
              'Credit Score',
              'Tax Planning'
            ]}
            interactiveContent={true}
            progressTracking={true}
            quizzes={true}
          />
        </div>

        {/* Tips Feed Sidebar */}
        <div>
          <TipsFeed 
            personalized={true}
            dailyTips={true}
            contextual={true}
          />
        </div>
      </div>
    </div>
  )
}

