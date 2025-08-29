'use client';

import {
  GlobeAltIcon,
  CurrencyDollarIcon,
  LanguageIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline';
import { useState } from 'react';

import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Select, TextInput, Checkbox, type SelectOption } from '@/components/ui/Input';
import { useTranslation } from '@/lib/useTranslation';

interface RegionalizationSettingsProps {
  currency?: boolean
  language?: boolean
  dateFormat?: boolean
  culturalPreferences?: boolean
}

export function RegionalizationSettings({
  currency = true,
  language = true,
  dateFormat = true,
  culturalPreferences = true,
}: RegionalizationSettingsProps) {
  const { t } = useTranslation('settings');
  const [settings, setSettings] = useState({
    region: 'united-states',
    currency: 'USD',
    language: 'en',
    dateFormat: 'MM/DD/YYYY',
    culturalFeatures: {
      islamicBanking: false,
      socialSharing: 'prominent',
      customCategories: [] as string[],
    },
  });

  const regions = [
    {
      id: 'united-states',
      name: 'United States',
      currencies: ['USD'],
      languages: ['en', 'es'],
      features: ['Student Loans', '401k', 'Credit Score', 'Tax Planning'],
    },
    {
      id: 'middle-east',
      name: 'Middle East',
      currencies: ['SAR', 'AED', 'QAR'],
      languages: ['ar', 'en'],
      features: ['Islamic Banking', 'Zakat', 'Hajj Fund', 'Family Support'],
    },
    {
      id: 'europe',
      name: 'Europe',
      currencies: ['EUR', 'GBP', 'CHF'],
      languages: ['en', 'de', 'fr', 'es', 'it'],
      features: ['GDPR Compliance', 'PSD2', 'VAT Support'],
    },
  ];

  const currencies = [
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'GBP', name: 'British Pound', symbol: '£' },
    { code: 'SAR', name: 'Saudi Riyal', symbol: 'ر.س' },
    { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ' },
    { code: 'QAR', name: 'Qatari Riyal', symbol: 'ر.ق' },
    { code: 'CHF', name: 'Swiss Franc', symbol: 'Fr' },
  ];

  const languages = [
    { code: 'en', name: 'English', native: 'English' },
    { code: 'ar', name: 'Arabic', native: 'العربية' },
    { code: 'es', name: 'Spanish', native: 'Español' },
    { code: 'de', name: 'German', native: 'Deutsch' },
    { code: 'fr', name: 'French', native: 'Français' },
    { code: 'it', name: 'Italian', native: 'Italiano' },
  ];

  const dateFormats = [
    { format: 'MM/DD/YYYY', example: '12/31/2024', region: 'US' },
    { format: 'DD/MM/YYYY', example: '31/12/2024', region: 'EU/UK' },
    { format: 'YYYY-MM-DD', example: '2024-12-31', region: 'ISO' },
    { format: 'DD.MM.YYYY', example: '31.12.2024', region: 'DE' },
  ];

  const selectedRegion = regions.find(r => r.id === settings.region);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center">
          <div className="bg-primary-trust-blue/10 rounded-lg p-2 mr-3">
            <GlobeAltIcon className="h-6 w-6 text-primary-trust-blue" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-neutral-dark-gray">
              {t('regional.title', { defaultValue: 'Regional Settings' })}
            </h3>
            <p className="text-sm text-neutral-gray">
              {t('regional.subtitle', { defaultValue: 'Customize your experience for your region and preferences' })}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-6">
          {/* Region Selection */}
          <div>
            <label className="block text-sm font-medium text-neutral-dark-gray mb-3">
              {t('regional.region', { defaultValue: 'Region' })}
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {regions.map((region) => (
                <div
                  key={region.id}
                  className={`border-2 rounded-lg p-4 cursor-pointer transition-all duration-200 ${
                    settings.region === region.id
                      ? 'border-primary-trust-blue bg-primary-trust-blue/5'
                      : 'border-neutral-gray/30 hover:border-primary-trust-blue/50'
                  }`}
                  onClick={() => setSettings(prev => ({
                    ...prev,
                    region: region.id,
                    currency: region.currencies[0],
                    language: region.languages[0],
                  }))}
                >
                  <h4 className="font-medium text-neutral-dark-gray mb-2">
                    {region.name}
                  </h4>
                  <div className="text-xs text-neutral-gray space-y-1">
                    <div>{t('regional.currencies', { defaultValue: 'Currencies' })}: {region.currencies.join(', ')}</div>
                    <div>{t('regional.languagesSupported', { defaultValue: 'Languages' })}: {region.languages.length} {t('regional.supported', { defaultValue: 'supported' })}</div>
                  </div>
                </div>
              ))}
            </div>

            {selectedRegion && (
              <div className="mt-3 p-3 bg-neutral-light-gray/50 rounded-lg">
                <h5 className="font-medium text-neutral-dark-gray mb-2">
                  {t('regional.features', { defaultValue: 'Regional Features' })}
                </h5>
                <div className="flex flex-wrap gap-2">
                  {selectedRegion.features.map((feature) => (
                    <span
                      key={feature}
                      className="text-xs px-2 py-1 bg-primary-trust-blue/10 text-primary-trust-blue rounded-full"
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Currency Settings */}
          {currency && (
            <div>
              <label className="block text-sm font-medium text-neutral-dark-gray mb-2">
                <CurrencyDollarIcon className="h-4 w-4 inline mr-1" />
                {t('regional.primaryCurrency', { defaultValue: 'Primary Currency' })}
              </label>
              <Select
                value={settings.currency}
                onChange={(e) => setSettings(prev => ({ ...prev, currency: e.target.value }))}
                options={currencies.map((curr) => ({
                  value: curr.code,
                  label: `${curr.code} - ${curr.name} (${curr.symbol})`
                })) as SelectOption[]}
                placeholder="Select currency"
              />
              <p className="text-xs text-neutral-gray mt-1">
                {t('regional.currencyNote', { defaultValue: 'All amounts will be displayed in this currency' })}
              </p>
            </div>
          )}

          {/* Language Settings */}
          {language && (
            <div>
              <label className="block text-sm font-medium text-neutral-dark-gray mb-2">
                <LanguageIcon className="h-4 w-4 inline mr-1" />
                {t('regional.displayLanguage', { defaultValue: 'Display Language' })}
              </label>
              <Select
                value={settings.language}
                onChange={(e) => setSettings(prev => ({ ...prev, language: e.target.value }))}
                options={languages.map((lang) => ({
                  value: lang.code,
                  label: `${lang.native} (${lang.name})`
                })) as SelectOption[]}
                placeholder="Select language"
              />
              {settings.language === 'ar' && (
                <div className="mt-2 p-2 bg-accent-action-orange/10 rounded-lg">
                  <p className="text-xs text-accent-action-orange">
                    {t('regional.rtlNote', { defaultValue: '✨ Arabic language includes RTL (Right-to-Left) layout support' })}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Date Format */}
          {dateFormat && (
            <div>
              <label className="block text-sm font-medium text-neutral-dark-gray mb-2">
                <CalendarIcon className="h-4 w-4 inline mr-1" />
                {t('regional.dateFormat', { defaultValue: 'Date Format' })}
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {dateFormats.map((format) => (
                  <div
                    key={format.format}
                    className={`border rounded-lg p-3 cursor-pointer text-center transition-all duration-200 ${
                      settings.dateFormat === format.format
                        ? 'border-primary-trust-blue bg-primary-trust-blue/5'
                        : 'border-neutral-gray/30 hover:border-primary-trust-blue/50'
                    }`}
                    onClick={() => setSettings(prev => ({ ...prev, dateFormat: format.format }))}
                  >
                    <div className="font-medium text-sm text-neutral-dark-gray">
                      {format.example}
                    </div>
                    <div className="text-xs text-neutral-gray">
                      {format.region}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cultural Preferences */}
          {culturalPreferences && settings.region === 'middle-east' && (
            <div className="bg-secondary-growth-green/5 rounded-lg p-4 border border-secondary-growth-green/20">
              <h4 className="font-medium text-secondary-growth-green mb-3">
                {t('regional.cultural.title', { defaultValue: 'Cultural Preferences' })}
              </h4>

              <div className="space-y-3">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.culturalFeatures.islamicBanking}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      culturalFeatures: {
                        ...prev.culturalFeatures,
                        islamicBanking: e.target.checked,
                      },
                    }))}
                    className="rounded border-neutral-gray/30 text-secondary-growth-green focus:ring-secondary-growth-green mr-3"
                  />
                  <div>
                    <span className="text-sm font-medium text-neutral-dark-gray">
                      {t('regional.cultural.islamicBanking', { defaultValue: 'Islamic Banking Features' })}
                    </span>
                    <p className="text-xs text-neutral-gray">
                      {t('regional.cultural.islamicBanking_desc', { defaultValue: 'Enable Sharia-compliant financial tools and categories' })}
                    </p>
                  </div>
                </label>

                <div>
                  <label className="block text-sm font-medium text-neutral-dark-gray mb-2">
                    {t('regional.cultural.additionalCategories', { defaultValue: 'Additional Categories' })}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {['Zakat', 'Hajj Fund', 'Family Support', 'Islamic Investment'].map((category) => (
                      <span
                        key={category}
                        className="text-xs px-3 py-1 bg-secondary-growth-green/10 text-secondary-growth-green rounded-full border border-secondary-growth-green/20"
                      >
                        {category}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Social Sharing Preferences */}
          {culturalPreferences && (
            <div>
              <label className="block text-sm font-medium text-neutral-dark-gray mb-2">
                {t('regional.social.title', { defaultValue: 'Social Sharing' })}
              </label>
              <div className="flex bg-neutral-light-gray rounded-lg p-1">
                {(['prominent', 'minimal', 'none'] as const).map((option) => (
                  <button
                    key={option}
                    onClick={() => setSettings(prev => ({
                      ...prev,
                      culturalFeatures: {
                        ...prev.culturalFeatures,
                        socialSharing: option,
                      },
                    }))}
                    className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                      settings.culturalFeatures.socialSharing === option
                        ? 'bg-white text-primary-trust-blue shadow-sm'
                        : 'text-neutral-gray hover:text-neutral-dark-gray'
                    }`}
                  >
                    {option === 'prominent'
                      ? t('regional.social.prominent', { defaultValue: 'Prominent' })
                      : option === 'minimal'
                      ? t('regional.social.minimal', { defaultValue: 'Minimal' })
                      : t('regional.social.none', { defaultValue: 'None' })}
                  </button>
                ))}
              </div>
              <p className="text-xs text-neutral-gray mt-1">
                {settings.culturalFeatures.socialSharing === 'prominent' && t('regional.social.prominent_desc', { defaultValue: 'Show social sharing options prominently' })}
                {settings.culturalFeatures.socialSharing === 'minimal' && t('regional.social.minimal_desc', { defaultValue: 'Show minimal social sharing options' })}
                {settings.culturalFeatures.socialSharing === 'none' && t('regional.social.none_desc', { defaultValue: 'Hide all social sharing features' })}
              </p>
            </div>
          )}

          {/* Regional Compliance */}
          <div className="bg-neutral-light-gray/50 rounded-lg p-4">
            <h4 className="font-medium text-neutral-dark-gray mb-2">
              {t('regional.compliance.title', { defaultValue: 'Compliance & Privacy' })}
            </h4>
            <div className="text-sm text-neutral-gray space-y-1">
              {settings.region === 'europe' && (
                <>
                  <div>✓ {t('regional.compliance.eu.gdpr', { defaultValue: 'GDPR compliant data handling' })}</div>
                  <div>✓ {t('regional.compliance.eu.psd2', { defaultValue: 'PSD2 banking integration' })}</div>
                  <div>✓ {t('regional.compliance.eu.minimal', { defaultValue: 'Minimal data collection' })}</div>
                </>
              )}
              {settings.region === 'united-states' && (
                <>
                  <div>✓ {t('regional.compliance.us.ccpa', { defaultValue: 'CCPA privacy compliance' })}</div>
                  <div>✓ {t('regional.compliance.us.sox', { defaultValue: 'SOX financial reporting' })}</div>
                  <div>✓ {t('regional.compliance.us.fdic', { defaultValue: 'FDIC insured partnerships' })}</div>
                </>
              )}
              {settings.region === 'middle-east' && (
                <>
                  <div>✓ {t('regional.compliance.me.banking', { defaultValue: 'Local banking regulations' })}</div>
                  <div>✓ {t('regional.compliance.me.culture', { defaultValue: 'Cultural sensitivity' })}</div>
                  <div>✓ {t('regional.compliance.me.arabic', { defaultValue: 'Arabic language support' })}</div>
                </>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
