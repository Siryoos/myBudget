'use client';

import {
  UserIcon,
  CurrencyDollarIcon,
  GlobeAltIcon,
  CheckIcon,
  PencilIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import React, { useState, useEffect } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api-client';
import { useTranslation } from '@/lib/useTranslation';
import { TextInput, NumberInput, Select, type SelectOption } from '@/components/ui/Input';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface ProfileManagerProps {
  personalInfo?: boolean
  financialProfile?: boolean
  preferences?: boolean
}

/**
 * Renders a three-section profile editor (Personal Information, Financial Profile, Preferences)
 * that allows viewing and inline editing of the current user's profile and preferences.
 *
 * The component initializes form state from the authenticated user, validates inputs per-section
 * (basic email and required checks for "personal"; non-negative income and 0–100 savings rate for "financial"),
 * and persists changes via the auth context's `updateProfile`. Preferences saving may also invoke
 * the settings API (timezone support is limited by the current preferences schema).
 *
 * On successful save the section exits edit mode and a transient success banner is shown; validation
 * errors are stored per-field and displayed next to inputs, and a general error banner is shown on save failure.
 *
 * @param personalInfo - If true (default), render the Personal Information section.
 * @param financialProfile - If true (default), render the Financial Profile section.
 * @param preferences - If true (default), render the Preferences section.
 * @returns A JSX element containing the profile manager UI.
 */
export function ProfileManager({
  personalInfo = true,
  financialProfile = true,
  preferences = true,
}: ProfileManagerProps) {
  const { t } = useTranslation('settings');
  const { user, updateProfile } = useAuth();
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    dateOfBirth: user?.dateOfBirth || '',
    monthlyIncome: user?.monthlyIncome || 0,
    riskTolerance: 'moderate',
    savingsRate: 20,
    dependents: 0,
    currency: user?.currency || 'USD',
    language: user?.language || 'en',
    timezone: 'America/New_York',
  });

  // Sync with user data when it changes
  useEffect(() => {
    if (user) {
      setProfileData(prev => ({
        ...prev,
        name: user.name || prev.name,
        email: user.email || prev.email,
        dateOfBirth: user.dateOfBirth || prev.dateOfBirth,
        monthlyIncome: user.monthlyIncome || prev.monthlyIncome,
        currency: user.currency || prev.currency,
        language: user.language || prev.language,
      }));
    }
  }, [user]);

  const validateSection = (section: string): boolean => {
    const newErrors: Record<string, string> = {};

    switch (section) {
      case 'personal':
        if (!profileData.name.trim()) {
          newErrors.name = t('errors.nameRequired');
        }
        if (!profileData.email.trim()) {
          newErrors.email = t('errors.emailRequired');
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileData.email)) {
          newErrors.email = t('errors.emailInvalid');
        }
        break;

      case 'financial':
        if (profileData.monthlyIncome < 0) {
          newErrors.monthlyIncome = t('errors.incomeInvalid');
        }
        if (profileData.savingsRate < 0 || profileData.savingsRate > 100) {
          newErrors.savingsRate = t('errors.savingsRateInvalid');
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async (section: string) => {
    if (!validateSection(section)) {
      return;
    }

    setLoading(true);
    setSuccessMessage(null);

    try {
      let updateData: any = {};

      switch (section) {
        case 'personal':
          updateData = {
            name: profileData.name,
            email: profileData.email,
            dateOfBirth: profileData.dateOfBirth,
          };
          break;

        case 'financial':
          updateData = {
            monthlyIncome: profileData.monthlyIncome,
          };

          // Note: savingsRate and dependents are part of FinancialProfile, not UserPreferences
          // These would need to be saved to a separate financial profile endpoint
          break;

        case 'preferences':
          updateData = {
            currency: profileData.currency,
            language: profileData.language,
          };

          // Save timezone to settings
          await apiClient.updateSettings({
            preferences: {
              // timezone: profileData.timezone, // Not supported in current preferences schema
            },
          });
          break;
      }

      // Update profile via auth context
      await updateProfile(updateData);

      setEditingSection(null);
      setSuccessMessage(t('messages.profileUpdated'));

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Failed to save profile:', error);
      setErrors({ general: t('errors.saveFailed') });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = (section: string) => {
    // Reset to original user data
    if (user) {
      setProfileData(prev => ({
        ...prev,
        name: user.name || prev.name,
        email: user.email || prev.email,
        dateOfBirth: user.dateOfBirth || prev.dateOfBirth,
        monthlyIncome: user.monthlyIncome || prev.monthlyIncome,
        currency: user.currency || prev.currency,
        language: user.language || prev.language,
      }));
    }
    setEditingSection(null);
    setErrors({});
  };

  return (
    <div className="space-y-6">
      {successMessage && (
        <div className="bg-secondary-growth-green/10 border border-secondary-growth-green/30 rounded-lg p-4 flex items-center">
          <CheckIcon className="w-5 h-5 text-secondary-growth-green mr-2" />
          <span className="text-sm text-secondary-growth-green">{successMessage}</span>
        </div>
      )}

      {errors.general && (
        <div className="bg-accent-coral-red/10 border border-accent-coral-red/30 rounded-lg p-4">
          <span className="text-sm text-accent-coral-red">{errors.general}</span>
        </div>
      )}

      {/* Personal Information */}
      {personalInfo && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
            <div className="flex items-center">
              <UserIcon className="w-5 h-5 text-primary-trust-blue mr-2" />
              <h3 className="text-lg font-semibold text-neutral-charcoal">
                {t('profile.personalInfo.title')}
              </h3>
            </div>
            {editingSection === 'personal' ? (
              <div className="flex space-x-2">
                <Button
                  onClick={() => handleSave('personal')}
                  disabled={loading}
                  variant="primary"
                  size="sm"
                >
                  <CheckIcon className="h-4 w-4 mr-2" />
                  {loading ? t('common:actions.saving') : t('common:actions.save')}
                </Button>
                <Button
                  onClick={() => handleCancel('personal')}
                  disabled={loading}
                  variant="ghost"
                  size="sm"
                >
                  <XMarkIcon className="h-4 w-4 mr-2" />
                  {t('common:actions.cancel')}
                </Button>
              </div>
            ) : (
              <Button
                onClick={() => setEditingSection('personal')}
                variant="ghost"
                size="sm"
                className="p-2"
              >
                <PencilIcon className="w-4 h-4" />
              </Button>
            )}
          </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-gray mb-1">
                {t('profile.personalInfo.name')}
              </label>
              {editingSection === 'personal' ? (
                <TextInput
                  value={profileData.name}
                  onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                  error={errors.name}
                  placeholder="Enter your full name"
                  required
                />
              ) : (
                <p className="text-neutral-charcoal">{profileData.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-gray mb-1">
                {t('profile.personalInfo.email')}
              </label>
              {editingSection === 'personal' ? (
                <TextInput
                  type="email"
                  value={profileData.email}
                  onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                  error={errors.email}
                  placeholder="Enter your email address"
                  required
                />
              ) : (
                <p className="text-neutral-charcoal">{profileData.email}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-gray mb-1">
                {t('profile.personalInfo.dateOfBirth')}
              </label>
              {editingSection === 'personal' ? (
                <TextInput
                  type="date"
                  value={profileData.dateOfBirth}
                  onChange={(e) => setProfileData(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                  placeholder="Select your date of birth"
                />
              ) : (
                <p className="text-neutral-charcoal">
                  {profileData.dateOfBirth || t('common:status.notSet')}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Financial Profile */}
      {financialProfile && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
            <div className="flex items-center">
              <CurrencyDollarIcon className="w-5 h-5 text-primary-trust-blue mr-2" />
              <h3 className="text-lg font-semibold text-neutral-charcoal">
                {t('profile.financialProfile.title')}
              </h3>
            </div>
            {editingSection === 'financial' ? (
              <div className="flex space-x-2">
                <Button
                  onClick={() => handleSave('financial')}
                  disabled={loading}
                  variant="primary"
                  size="sm"
                >
                  <CheckIcon className="h-4 w-4 mr-2" />
                  {loading ? t('common:actions.saving') : t('common:actions.save')}
                </Button>
                <Button
                  onClick={() => handleCancel('financial')}
                  disabled={loading}
                  variant="ghost"
                  size="sm"
                >
                  <XMarkIcon className="h-4 w-4 mr-2" />
                  {t('common:actions.cancel')}
                </Button>
              </div>
            ) : (
              <Button
                onClick={() => setEditingSection('financial')}
                variant="ghost"
                size="sm"
                className="p-2"
              >
                <PencilIcon className="w-4 h-4" />
              </Button>
            )}
          </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-gray mb-1">
                {t('profile.financialProfile.monthlyIncome')}
              </label>
              {editingSection === 'financial' ? (
                <NumberInput
                  value={profileData.monthlyIncome.toString()}
                  onChange={(e) => setProfileData(prev => ({ ...prev, monthlyIncome: parseFloat(e.target.value) || 0 }))}
                  error={errors.monthlyIncome}
                  min={0}
                  leftAdornment={<span className="text-neutral-gray">$</span>}
                  placeholder="Enter monthly income"
                  required
                />
              ) : (
                <p className="text-neutral-charcoal">${profileData.monthlyIncome.toLocaleString()}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-gray mb-1">
                {t('profile.financialProfile.savingsRate')}
              </label>
              {editingSection === 'financial' ? (
                <NumberInput
                  value={profileData.savingsRate.toString()}
                  onChange={(e) => setProfileData(prev => ({ ...prev, savingsRate: parseFloat(e.target.value) || 0 }))}
                  error={errors.savingsRate}
                  min={0}
                  max={100}
                  rightAdornment={<span className="text-neutral-gray">%</span>}
                  placeholder="Enter savings rate"
                  required
                />
              ) : (
                <p className="text-neutral-charcoal">{profileData.savingsRate}%</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-gray mb-1">
                {t('profile.financialProfile.riskTolerance')}
              </label>
              {editingSection === 'financial' ? (
                <Select
                  value={profileData.riskTolerance}
                  onChange={(e) => setProfileData(prev => ({ ...prev, riskTolerance: e.target.value }))}
                  options={[
                    { value: 'conservative', label: t('profile.financialProfile.conservative') },
                    { value: 'moderate', label: t('profile.financialProfile.moderate') },
                    { value: 'aggressive', label: t('profile.financialProfile.aggressive') }
                  ] as SelectOption[]}
                  placeholder="Select risk tolerance"
                />
              ) : (
                <p className="text-neutral-charcoal capitalize">{profileData.riskTolerance}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-gray mb-1">
                {t('profile.financialProfile.dependents')}
              </label>
              {editingSection === 'financial' ? (
                <NumberInput
                  value={profileData.dependents.toString()}
                  onChange={(e) => setProfileData(prev => ({ ...prev, dependents: parseInt(e.target.value, 10) || 0 }))}
                  min={0}
                  max={20}
                  placeholder="Enter number of dependents"
                />
              ) : (
                <p className="text-neutral-charcoal">{profileData.dependents}</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preferences */}
      {preferences && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
            <div className="flex items-center">
              <GlobeAltIcon className="w-5 h-5 text-primary-trust-blue mr-2" />
              <h3 className="text-lg font-semibold text-neutral-charcoal">
                {t('profile.preferences.title')}
              </h3>
            </div>
            {editingSection === 'preferences' ? (
              <div className="flex space-x-2">
                <Button
                  onClick={() => handleSave('preferences')}
                  disabled={loading}
                  variant="primary"
                  size="sm"
                >
                  <CheckIcon className="h-4 w-4 mr-2" />
                  {loading ? t('common:actions.saving') : t('common:actions.save')}
                </Button>
                <Button
                  onClick={() => handleCancel('preferences')}
                  disabled={loading}
                  variant="ghost"
                  size="sm"
                >
                  <XMarkIcon className="h-4 w-4 mr-2" />
                  {t('common:actions.cancel')}
                </Button>
              </div>
            ) : (
              <Button
                onClick={() => setEditingSection('preferences')}
                variant="ghost"
                size="sm"
                className="p-2"
              >
                <PencilIcon className="w-4 h-4" />
              </Button>
            )}
          </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-gray mb-1">
                {t('profile.preferences.currency')}
              </label>
              {editingSection === 'preferences' ? (
                <Select
                  value={profileData.currency}
                  onChange={(e) => setProfileData(prev => ({ ...prev, currency: e.target.value }))}
                  options={[
                    { value: 'USD', label: 'USD ($)' },
                    { value: 'EUR', label: 'EUR (€)' },
                    { value: 'GBP', label: 'GBP (£)' },
                    { value: 'JPY', label: 'JPY (¥)' },
                    { value: 'CAD', label: 'CAD ($)' },
                    { value: 'AUD', label: 'AUD ($)' }
                  ] as SelectOption[]}
                  placeholder="Select currency"
                />
              ) : (
                <p className="text-neutral-charcoal">{profileData.currency}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-gray mb-1">
                {t('profile.preferences.language')}
              </label>
              {editingSection === 'preferences' ? (
                <Select
                  value={profileData.language}
                  onChange={(e) => setProfileData(prev => ({ ...prev, language: e.target.value }))}
                  options={[
                    { value: 'en', label: 'English' },
                    { value: 'es', label: 'Español' },
                    { value: 'fr', label: 'Français' },
                    { value: 'de', label: 'Deutsch' },
                    { value: 'ja', label: '日本語' },
                    { value: 'zh', label: '中文' }
                  ] as SelectOption[]}
                  placeholder="Select language"
                />
              ) : (
                <p className="text-neutral-charcoal">
                  {profileData.language === 'en' ? 'English' :
                   profileData.language === 'es' ? 'Español' :
                   profileData.language === 'fr' ? 'Français' :
                   profileData.language === 'de' ? 'Deutsch' :
                   profileData.language === 'ja' ? '日本語' :
                   profileData.language === 'zh' ? '中文' : profileData.language}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-gray mb-1">
                {t('profile.preferences.timezone')}
              </label>
              {editingSection === 'preferences' ? (
                <Select
                  value={profileData.timezone}
                  onChange={(e) => setProfileData(prev => ({ ...prev, timezone: e.target.value }))}
                  options={[
                    { value: 'America/New_York', label: 'Eastern Time' },
                    { value: 'America/Chicago', label: 'Central Time' },
                    { value: 'America/Denver', label: 'Mountain Time' },
                    { value: 'America/Los_Angeles', label: 'Pacific Time' },
                    { value: 'Europe/London', label: 'London' },
                    { value: 'Europe/Paris', label: 'Paris' },
                    { value: 'Asia/Tokyo', label: 'Tokyo' },
                    { value: 'Asia/Shanghai', label: 'Shanghai' }
                  ] as SelectOption[]}
                  placeholder="Select timezone"
                />
              ) : (
                <p className="text-neutral-charcoal">{profileData.timezone}</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
