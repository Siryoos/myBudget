import { BehavioralDashboard } from '@/components/goals/BehavioralDashboard'
import { SkeletonDemo } from '@/components/ui/SkeletonDemo'

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

        {/* Skeleton Component Demo */}
        <div className="mt-16">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Enhanced Skeleton Components
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Showcasing improved wave animation with gradient backgrounds and accessibility features.
            </p>
          </div>
          <SkeletonDemo />
        </div>
      </div>
    </div>
  )
}
