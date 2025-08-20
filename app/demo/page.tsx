import { BehavioralDashboard } from '@/components/goals/BehavioralDashboard'

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            SmartSave Behavioral Psychology Demo
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Experience how behavioral psychology can transform personal finance. 
            This demo showcases loss aversion, social proof, gamification, and other proven techniques.
          </p>
        </div>
        
        <BehavioralDashboard
          showAllFeatures={true}
          enableAbtesting={true}
          showSocialProof={true}
          enableNotifications={true}
        />
      </div>
    </div>
  )
}
