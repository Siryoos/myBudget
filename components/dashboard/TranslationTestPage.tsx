'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { useI18n } from '@/lib/i18n-provider';
import { useTranslation } from '@/lib/useTranslation';

import { BudgetSummary } from './BudgetSummary';
import { InsightsPanel } from './InsightsPanel';
import { QuickSaveWidget } from './QuickSaveWidget';
import { RecentTransactions } from './RecentTransactions';
import { SavingsOverview } from './SavingsOverview';
import { WelcomeHeader } from './WelcomeHeader';

export function TranslationTestPage() {
  const { t, isReady, forceUpdate } = useTranslation(['common', 'dashboard']);
  const { locale, changeLanguage } = useI18n();
  const [showComponents, setShowComponents] = useState(true);

  const handleLanguageChange = async (newLocale: string) => {
    try {
      console.log(`Changing language to ${newLocale}...`);
      await changeLanguage(newLocale);
      console.log(`Language changed to ${newLocale}`);
    } catch (error) {
      console.error('Failed to change language:', error);
    }
  };

  if (!isReady) {
    return (
      <div className="min-h-screen bg-neutral-light-gray flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-trust-blue mx-auto mb-4"></div>
          <p className="text-neutral-gray text-lg">Loading translations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-light-gray p-6">
      {/* Language Switcher Header */}
      <Card className="mb-6">
        <CardHeader>
          <h1 className="text-2xl font-bold text-neutral-dark-gray">
            🌐 SmartSave Translation Test Page
          </h1>
          <p className="text-neutral-gray">
            {t('common:app.tagline', { defaultValue: 'Test the complete translation system' })}
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-center">
            <div>
              <p className="text-sm text-neutral-gray mb-2">
                Current Language: <strong>{locale}</strong>
              </p>
              <p className="text-sm text-neutral-gray">
                Force Update Count: <strong>{forceUpdate}</strong>
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                variant={locale === 'en' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => handleLanguageChange('en')}
              >
                🇺🇸 English
              </Button>
              <Button
                variant={locale === 'ar' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => handleLanguageChange('ar')}
              >
                🇸🇦 العربية
              </Button>
              <Button
                variant={locale === 'fa' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => handleLanguageChange('fa')}
              >
                🇮🇷 فارسی
              </Button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowComponents(!showComponents)}
            >
              {showComponents ? 'Hide' : 'Show'} Components
            </Button>
          </div>

          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-medium text-blue-900 mb-2">Instructions:</h3>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>Click any language button to instantly switch languages</li>
              <li>All components below will automatically update with new translations</li>
              <li>Watch the text direction change for Arabic and Persian (RTL)</li>
              <li>Check the browser console for language change logs</li>
              <li>Use the toggle button to show/hide components</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Component Display */}
      {showComponents && (
        <div className="space-y-6">
          {/* Welcome Header */}
          <WelcomeHeader
            showGreeting={true}
            showDate={true}
            showQuickActions={true}
          />

          {/* Main Dashboard Components */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-6">
              <QuickSaveWidget />
              <SavingsOverview />
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              <InsightsPanel />
              <BudgetSummary />
            </div>
          </div>

          {/* Full Width Components */}
          <RecentTransactions limit={6} />
        </div>
      )}

      {/* Language Status Footer */}
      <Card className="mt-6">
        <CardContent className="p-4">
          <div className="text-center text-sm text-neutral-gray">
            <p>
              {t('common:app.name', { defaultValue: 'SmartSave' })} -
              {t('common:status.success', { defaultValue: 'Translation System Active' })} |
              {t('common:time.today', { defaultValue: 'Language' })}: {locale} |
              {t('common:status.online', { defaultValue: 'Updates' })}: {forceUpdate}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
