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
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center">
              <UserIcon className="w-5 h-5 text-primary-trust-blue mr-2" />
              <h3 className="text-lg font-semibold text-neutral-charcoal">
                {t('profile.personalInfo.title')}
              </h3>
            </div>
            {editingSection === 'personal' ? (
              <div className="flex space-x-2">
                <button
                  onClick={() => handleSave('personal')}
                  disabled={loading}
                  className="px-3 py-1 bg-primary-trust-blue text-white rounded-md hover:bg-primary-trust-blue/90 disabled:opacity-50"
                >
                  {loading ? t('common:actions.saving') : t('common:actions.save')}
                </button>
                <button
                  onClick={() => handleCancel('personal')}
                  disabled={loading}
                  className="px-3 py-1 bg-neutral-gray/10 text-neutral-charcoal rounded-md hover:bg-neutral-gray/20 disabled:opacity-50"
                >
                  {t('common:actions.cancel')}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setEditingSection('personal')}
                className="p-2 hover:bg-neutral-gray/10 rounded-lg transition-colors"
              >
                <PencilIcon className="w-4 h-4 text-neutral-gray" />
              </button>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-gray mb-1">
                {t('profile.personalInfo.name')}
              </label>
              {editingSection === 'personal' ? (
                <>
                  <input
                    type="text"
                    value={profileData.name}
                    onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-trust-blue focus:border-transparent ${
                      errors.name ? 'border-accent-coral-red' : 'border-neutral-gray/30'
                    }`}
                  />
                  {errors.name && (
                    <p className="text-sm text-accent-coral-red mt-1">{errors.name}</p>
                  )}
                </>
              ) : (
                <p className="text-neutral-charcoal">{profileData.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-gray mb-1">
                {t('profile.personalInfo.email')}
              </label>
              {editingSection === 'personal' ? (
                <>
                  <input
                    type="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-trust-blue focus:border-transparent ${
                      errors.email ? 'border-accent-coral-red' : 'border-neutral-gray/30'
                    }`}
                  />
                  {errors.email && (
                    <p className="text-sm text-accent-coral-red mt-1">{errors.email}</p>
                  )}
                </>
              ) : (
                <p className="text-neutral-charcoal">{profileData.email}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-gray mb-1">
                {t('profile.personalInfo.dateOfBirth')}
              </label>
              {editingSection === 'personal' ? (
                <input
                  type="date"
                  value={profileData.dateOfBirth}
                  onChange={(e) => setProfileData(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                  className="w-full px-3 py-2 border border-neutral-gray/30 rounded-lg focus:ring-2 focus:ring-primary-trust-blue focus:border-transparent"
                />
              ) : (
                <p className="text-neutral-charcoal">
                  {profileData.dateOfBirth || t('common:status.notSet')}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Financial Profile */}
      {financialProfile && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center">
              <CurrencyDollarIcon className="w-5 h-5 text-primary-trust-blue mr-2" />
              <h3 className="text-lg font-semibold text-neutral-charcoal">
                {t('profile.financialProfile.title')}
              </h3>
            </div>
            {editingSection === 'financial' ? (
              <div className="flex space-x-2">
                <button
                  onClick={() => handleSave('financial')}
                  disabled={loading}
                  className="px-3 py-1 bg-primary-trust-blue text-white rounded-md hover:bg-primary-trust-blue/90 disabled:opacity-50"
                >
                  {loading ? t('common:actions.saving') : t('common:actions.save')}
                </button>
                <button
                  onClick={() => handleCancel('financial')}
                  disabled={loading}
                  className="px-3 py-1 bg-neutral-gray/10 text-neutral-charcoal rounded-md hover:bg-neutral-gray/20 disabled:opacity-50"
                >
                  {t('common:actions.cancel')}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setEditingSection('financial')}
                className="p-2 hover:bg-neutral-gray/10 rounded-lg transition-colors"
              >
                <PencilIcon className="w-4 h-4 text-neutral-gray" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-gray mb-1">
                {t('profile.financialProfile.monthlyIncome')}
              </label>
              {editingSection === 'financial' ? (
                <>
                  <input
                    type="number"
                    value={profileData.monthlyIncome}
                    onChange={(e) => setProfileData(prev => ({ ...prev, monthlyIncome: parseFloat(e.target.value) || 0 }))}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-trust-blue focus:border-transparent ${
                      errors.monthlyIncome ? 'border-accent-coral-red' : 'border-neutral-gray/30'
                    }`}
                    min="0"
                    step="100"
                  />
                  {errors.monthlyIncome && (
                    <p className="text-sm text-accent-coral-red mt-1">{errors.monthlyIncome}</p>
                  )}
                </>
              ) : (
                <p className="text-neutral-charcoal">${profileData.monthlyIncome.toLocaleString()}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-gray mb-1">
                {t('profile.financialProfile.savingsRate')}
              </label>
              {editingSection === 'financial' ? (
                <>
                  <input
                    type="number"
                    value={profileData.savingsRate}
                    onChange={(e) => setProfileData(prev => ({ ...prev, savingsRate: parseFloat(e.target.value) || 0 }))}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-trust-blue focus:border-transparent ${
                      errors.savingsRate ? 'border-accent-coral-red' : 'border-neutral-gray/30'
                    }`}
                    min="0"
                    max="100"
                    step="1"
                  />
                  {errors.savingsRate && (
                    <p className="text-sm text-accent-coral-red mt-1">{errors.savingsRate}</p>
                  )}
                </>
              ) : (
                <p className="text-neutral-charcoal">{profileData.savingsRate}%</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-gray mb-1">
                {t('profile.financialProfile.riskTolerance')}
              </label>
              {editingSection === 'financial' ? (
                <select
                  value={profileData.riskTolerance}
                  onChange={(e) => setProfileData(prev => ({ ...prev, riskTolerance: e.target.value }))}
                  className="w-full px-3 py-2 border border-neutral-gray/30 rounded-lg focus:ring-2 focus:ring-primary-trust-blue focus:border-transparent"
                >
                  <option value="conservative">{t('profile.financialProfile.conservative')}</option>
                  <option value="moderate">{t('profile.financialProfile.moderate')}</option>
                  <option value="aggressive">{t('profile.financialProfile.aggressive')}</option>
                </select>
              ) : (
                <p className="text-neutral-charcoal capitalize">{profileData.riskTolerance}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-gray mb-1">
                {t('profile.financialProfile.dependents')}
              </label>
              {editingSection === 'financial' ? (
                <input
                  type="number"
                  value={profileData.dependents}
                  onChange={(e) => setProfileData(prev => ({ ...prev, dependents: parseInt(e.target.value, 10) || 0 }))}
                  className="w-full px-3 py-2 border border-neutral-gray/30 rounded-lg focus:ring-2 focus:ring-primary-trust-blue focus:border-transparent"
                  min="0"
                  max="20"
                />
              ) : (
                <p className="text-neutral-charcoal">{profileData.dependents}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Preferences */}
      {preferences && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center">
              <GlobeAltIcon className="w-5 h-5 text-primary-trust-blue mr-2" />
              <h3 className="text-lg font-semibold text-neutral-charcoal">
                {t('profile.preferences.title')}
              </h3>
            </div>
            {editingSection === 'preferences' ? (
              <div className="flex space-x-2">
                <button
                  onClick={() => handleSave('preferences')}
                  disabled={loading}
                  className="px-3 py-1 bg-primary-trust-blue text-white rounded-md hover:bg-primary-trust-blue/90 disabled:opacity-50"
                >
                  {loading ? t('common:actions.saving') : t('common:actions.save')}
                </button>
                <button
                  onClick={() => handleCancel('preferences')}
                  disabled={loading}
                  className="px-3 py-1 bg-neutral-gray/10 text-neutral-charcoal rounded-md hover:bg-neutral-gray/20 disabled:opacity-50"
                >
                  {t('common:actions.cancel')}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setEditingSection('preferences')}
                className="p-2 hover:bg-neutral-gray/10 rounded-lg transition-colors"
              >
                <PencilIcon className="w-4 h-4 text-neutral-gray" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-gray mb-1">
                {t('profile.preferences.currency')}
              </label>
              {editingSection === 'preferences' ? (
                <select
                  value={profileData.currency}
                  onChange={(e) => setProfileData(prev => ({ ...prev, currency: e.target.value }))}
                  className="w-full px-3 py-2 border border-neutral-gray/30 rounded-lg focus:ring-2 focus:ring-primary-trust-blue focus:border-transparent"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="JPY">JPY (¥)</option>
                  <option value="CAD">CAD ($)</option>
                  <option value="AUD">AUD ($)</option>
                </select>
              ) : (
                <p className="text-neutral-charcoal">{profileData.currency}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-gray mb-1">
                {t('profile.preferences.language')}
              </label>
              {editingSection === 'preferences' ? (
                <select
                  value={profileData.language}
                  onChange={(e) => setProfileData(prev => ({ ...prev, language: e.target.value }))}
                  className="w-full px-3 py-2 border border-neutral-gray/30 rounded-lg focus:ring-2 focus:ring-primary-trust-blue focus:border-transparent"
                >
                  <option value="en">English</option>
                  <option value="es">Español</option>
                  <option value="fr">Français</option>
                  <option value="de">Deutsch</option>
                  <option value="ja">日本語</option>
                  <option value="zh">中文</option>
                </select>
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
                <select
                  value={profileData.timezone}
                  onChange={(e) => setProfileData(prev => ({ ...prev, timezone: e.target.value }))}
                  className="w-full px-3 py-2 border border-neutral-gray/30 rounded-lg focus:ring-2 focus:ring-primary-trust-blue focus:border-transparent"
                >
                  <option value="America/New_York">Eastern Time</option>
                  <option value="America/Chicago">Central Time</option>
                  <option value="America/Denver">Mountain Time</option>
                  <option value="America/Los_Angeles">Pacific Time</option>
                  <option value="Europe/London">London</option>
                  <option value="Europe/Paris">Paris</option>
                  <option value="Asia/Tokyo">Tokyo</option>
                  <option value="Asia/Shanghai">Shanghai</option>
                </select>
              ) : (
                <p className="text-neutral-charcoal">{profileData.timezone}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
