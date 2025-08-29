'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { useI18n } from '@/lib/i18n-provider';
import { useTranslation } from '@/lib/useTranslation';

/**
 * Demo React component that showcases the app's translation system and language switching.
 *
 * Renders a loading state until translations are ready, then displays a card with:
 * - Instant language switching buttons (uses `changeLanguage` from `useI18n`)
 * - Examples of translations from `common` and `dashboard` namespaces using `t(...)`
 * - Dynamic content (current time and date, updated every second) and locale/direction info
 * - Translation readiness and current locale status, plus usage instructions
 *
 * Side effects:
 * - Starts a timer to update the displayed current time every second.
 *
 * @returns The component's JSX element.
 */
export function TranslationDemo() {
  const { t, ready } = useTranslation('dashboard');
  const { locale, changeLanguage } = useI18n();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every second to show dynamic content
  useState(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  });

  const handleLanguageChange = async (newLocale: string) => {
    try {
      await changeLanguage(newLocale);
    } catch (error) {
      console.error('Failed to change language:', error);
    }
  };

  if (!ready) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-trust-blue mx-auto mb-4"></div>
        <p className="text-neutral-gray">Loading translations...</p>
      </div>
    );
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <h3 className="text-lg font-semibold text-neutral-dark-gray">
          🌐 Translation System Demo
        </h3>
        <div className="text-sm text-neutral-gray mb-4">
          Current Language: <strong>{locale}</strong>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Language Switching */}
        <div className="bg-neutral-light-gray/50 rounded-lg p-4">
          <h4 className="font-medium text-neutral-dark-gray mb-3">Instant Language Switching</h4>
          <div className="flex flex-wrap gap-2">
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
          <p className="text-xs text-neutral-gray mt-2">
            Click any language button to instantly switch. All page elements will reload with new translations.
          </p>
        </div>

        {/* Translation Examples */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Common Translations */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h5 className="font-medium text-blue-900 mb-2">Common Translations</h5>
            <div className="space-y-1 text-sm">
              <p><strong>App Name:</strong> {t('common:app.name')}</p>
              <p><strong>Welcome:</strong> {t('common:app.welcome', { name: 'User' })}</p>
              <p><strong>Greeting:</strong> {t('common:app.greeting.morning')}</p>
              <p><strong>Search:</strong> {t('common:actions.search')}</p>
              <p><strong>Status:</strong> {t('common:status.loading')}</p>
            </div>
          </div>

          {/* Dashboard Translations */}
          <div className="bg-green-50 rounded-lg p-4">
            <h5 className="font-medium text-green-900 mb-2">Dashboard Translations</h5>
            <div className="space-y-1 text-sm">
              <p><strong>Title:</strong> {t('dashboard:insights.title')}</p>
              <p><strong>Subtitle:</strong> {t('dashboard:insights.subtitle')}</p>
              <p><strong>Quick Save:</strong> {t('dashboard:quickSave.title')}</p>
              <p><strong>Description:</strong> {t('dashboard:quickSave.description')}</p>
              <p><strong>Tip:</strong> {t('dashboard:quickSave.tip')}</p>
            </div>
          </div>
        </div>

        {/* Dynamic Content */}
        <div className="bg-yellow-50 rounded-lg p-4">
          <h5 className="font-medium text-yellow-900 mb-2">Dynamic Content</h5>
          <div className="space-y-2 text-sm">
            <p><strong>Current Time:</strong> {currentTime.toLocaleTimeString()}</p>
            <p><strong>Date:</strong> {currentTime.toLocaleDateString()}</p>
            <p><strong>Language:</strong> {locale}</p>
            <p><strong>Direction:</strong> {locale === 'ar' || locale === 'fa' ? 'RTL' : 'LTR'}</p>
          </div>
        </div>

        {/* Translation Status */}
        <div className="bg-purple-50 rounded-lg p-4">
          <h5 className="font-medium text-purple-900 mb-2">Translation Status</h5>
          <div className="space-y-1 text-sm">
            <p><strong>Ready:</strong> {ready ? '✅ Yes' : '❌ No'}</p>
            <p><strong>Current Locale:</strong> {locale}</p>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h5 className="font-medium text-gray-900 mb-2">How It Works</h5>
          <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
            <li>All text is now translatable using the <code>t()</code> function</li>
            <li>Language switching instantly reloads all page elements</li>
            <li>Translations are cached and loaded on-demand</li>
            <li>RTL languages (Arabic, Persian) automatically adjust text direction</li>
            <li>Fallback values ensure content is always displayed</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
