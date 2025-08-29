'use client';

import { Suspense } from 'react';
import { 
  LazyNotificationSettings, 
  LazyProfileManager, 
  LazyRegionalizationSettings, 
  LazySecurityPanel 
} from '@/components/lazy';
import { CardLoading } from '@/components/ui/Card';
import { useTranslation } from '@/lib/useTranslation';

export default function SettingsPage() {
  const { t } = useTranslation('settings');
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-neutral-dark-gray to-neutral-gray rounded-lg p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">{t('title', { defaultValue: 'Settings' })}</h1>
        <p className="text-neutral-light-gray">{t('subtitle', { defaultValue: 'Customize your SmartSave experience and manage your account preferences' })}</p>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Settings */}
        <Suspense fallback={<CardLoading />}>
          <LazyProfileManager
            personalInfo={true}
            financialProfile={true}
            preferences={true}
          />
        </Suspense>

        {/* Notification Settings */}
        <Suspense fallback={<CardLoading />}>
          <LazyNotificationSettings
            channels={['email', 'push', 'sms']}
            frequency={['realtime', 'daily', 'weekly']}
            types={['savings', 'budget', 'goals', 'insights']}
          />
        </Suspense>

        {/* Security Settings */}
        <Suspense fallback={<CardLoading />}>
          <LazySecurityPanel
            twoFactor={true}
            biometric={true}
            sessionManagement={true}
          />
        </Suspense>

        {/* Regional Settings */}
        <Suspense fallback={<CardLoading />}>
          <LazyRegionalizationSettings
            currency={true}
            language={true}
            dateFormat={true}
            culturalPreferences={true}
          />
        </Suspense>
      </div>
    </div>
  );
}
