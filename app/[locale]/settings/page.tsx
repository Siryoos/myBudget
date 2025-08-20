import { Metadata } from 'next'
import { ProfileManager } from '@/components/settings/ProfileManager'
import { NotificationSettings } from '@/components/settings/NotificationSettings'
import { SecurityPanel } from '@/components/settings/SecurityPanel'
import { RegionalizationSettings } from '@/components/settings/RegionalizationSettings'

export const metadata: Metadata = {
  title: 'Settings',
  description: 'Manage your account settings and preferences',
}

export default function SettingsPage() {
  return (
    <div className="space-y-6" id="main-content">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-neutral-dark-gray to-neutral-gray rounded-lg p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-neutral-light-gray">
          Customize your SmartSave experience and manage your account preferences
        </p>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Settings */}
        <ProfileManager 
          personalInfo={true}
          financialProfile={true}
          preferences={true}
        />

        {/* Notification Settings */}
        <NotificationSettings 
          channels={['email', 'push', 'sms']}
          frequency={['realtime', 'daily', 'weekly']}
          types={['savings', 'budget', 'goals', 'insights']}
        />

        {/* Security Settings */}
        <SecurityPanel 
          twoFactor={true}
          biometric={true}
          sessionManagement={true}
        />

        {/* Regional Settings */}
        <RegionalizationSettings 
          currency={true}
          language={true}
          dateFormat={true}
          culturalPreferences={true}
        />
      </div>
    </div>
  )
}

