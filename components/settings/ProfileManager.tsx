'use client';

import {
  UserCircleIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { TextInput, NumberInput, Select, type SelectOption } from '@/components/ui/Input';
import { useTranslation } from '@/lib/useTranslation';
import { useToast } from '@/hooks/useToast';

interface ProfileManagerProps {
  personalInfo?: boolean
  financialProfile?: boolean
  preferences?: boolean
}

export function ProfileManager({
  personalInfo = true,
  financialProfile = true,
  preferences = true,
}: ProfileManagerProps) {
  const { t } = useTranslation('settings');
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const [profileData, setProfileData] = useState({
    name: 'Alex Johnson',
    email: 'alex.johnson@email.com',
    phone: '+1 (555) 123-4567',
    monthlyIncome: 4500,
    riskTolerance: 'moderate',
    savingsRate: 20,
    dependents: 0,
    currency: 'USD',
    language: 'English',
    timezone: 'America/New_York',
  });

  const handleSave = async (section: string) => {
    setSaving(true);
    try {
      // Simulate async save
      await new Promise((r) => setTimeout(r, 600));
      toast({
        title: 'Saved',
        description: `${section.charAt(0).toUpperCase() + section.slice(1)} updated successfully`,
        variant: 'success',
      });
      setEditingSection(null);
    } catch (e) {
      toast({ title: 'Save failed', description: 'Please try again', variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = (section: string) => {
    setEditingSection(null);
    toast({ title: 'Canceled', description: `Edits to ${section} discarded`, variant: 'info', duration: 3000 });
  };

  return (
    <div className="space-y-6">
      {/* Personal Information */}
      {personalInfo && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="bg-primary-trust-blue/10 rounded-lg p-2 mr-3">
                  <UserCircleIcon className="h-6 w-6 text-primary-trust-blue" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-neutral-dark-gray">
                    {t('profile.personal.title', { defaultValue: 'Personal Information' })}
                  </h3>
                  <p className="text-sm text-neutral-gray">
                    {t('profile.personal.subtitle', { defaultValue: 'Update your personal details' })}
                  </p>
                </div>
              </div>

              {editingSection !== 'personal' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingSection('personal')}
                >
                  <PencilIcon className="h-4 w-4 mr-2" />
                  {t('actions.edit', { defaultValue: 'Edit' })}
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-dark-gray mb-1">
                    {t('profile.personal.fullName', { defaultValue: 'Full Name' })}
                  </label>
                  {editingSection === 'personal' ? (
                    <TextInput
                      required
                      value={profileData.name}
                      onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter your full name"
                    />
                  ) : (
                    <div className="py-2 text-neutral-dark-gray">{profileData.name}</div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-dark-gray mb-1">
                    {t('profile.personal.email', { defaultValue: 'Email Address' })}
                  </label>
                  {editingSection === 'personal' ? (
                    <TextInput
                      type="email"
                      required
                      value={profileData.email}
                      onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="Enter your email address"
                    />
                  ) : (
                    <div className="py-2 text-neutral-dark-gray">{profileData.email}</div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-dark-gray mb-1">
                    {t('profile.personal.phone', { defaultValue: 'Phone Number' })}
                  </label>
                  {editingSection === 'personal' ? (
                    <TextInput
                      type="tel"
                      value={profileData.phone}
                      onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="Enter your phone number"
                    />
                  ) : (
                    <div className="py-2 text-neutral-dark-gray">{profileData.phone}</div>
                  )}
                </div>
              </div>

              {editingSection === 'personal' && (
                <div className="flex items-center justify-end space-x-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCancel('personal')}
                  >
                    <XMarkIcon className="h-4 w-4 mr-2" />
                    {t('actions.cancel', { defaultValue: 'Cancel' })}
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={saving}
                    onClick={() => handleSave('personal')}
                  >
                    <CheckIcon className="h-4 w-4 mr-2" />
                    {saving ? t('status.saving', { defaultValue: 'Saving...' }) : t('actions.saveChanges', { defaultValue: 'Save Changes' })}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Financial Profile */}
      {financialProfile && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-neutral-dark-gray">
                  Financial Profile
                </h3>
                <p className="text-sm text-neutral-gray">
                  Help us personalize your experience
                </p>
              </div>

              {editingSection !== 'financial' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingSection('financial')}
                >
                  <PencilIcon className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-dark-gray mb-1">
                    Monthly Income
                  </label>
                  {editingSection === 'financial' ? (
                    <NumberInput
                      min={0}
                      required
                      value={profileData.monthlyIncome.toString()}
                      onChange={(e) => setProfileData(prev => ({ ...prev, monthlyIncome: parseInt(e.target.value) || 0 }))}
                      leftAdornment={<span className="text-neutral-gray">$</span>}
                      placeholder="Enter monthly income"
                    />
                  ) : (
                    <div className="py-2 text-neutral-dark-gray">${profileData.monthlyIncome.toLocaleString()}</div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-dark-gray mb-1">
                    Risk Tolerance
                  </label>
                  {editingSection === 'financial' ? (
                    <Select
                      value={profileData.riskTolerance}
                      onChange={(e) => setProfileData(prev => ({ ...prev, riskTolerance: e.target.value }))}
                      options={[
                        { value: 'conservative', label: 'Conservative' },
                        { value: 'moderate', label: 'Moderate' },
                        { value: 'aggressive', label: 'Aggressive' }
                      ] as SelectOption[]}
                      placeholder="Select risk tolerance"
                    />
                  ) : (
                    <div className="py-2 text-neutral-dark-gray capitalize">{profileData.riskTolerance}</div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-dark-gray mb-1">
                    Target Savings Rate (%)
                  </label>
                  {editingSection === 'financial' ? (
                    <NumberInput
                      min={0}
                      max={100}
                      required
                      value={profileData.savingsRate.toString()}
                      onChange={(e) => setProfileData(prev => ({ ...prev, savingsRate: parseInt(e.target.value) || 0 }))}
                      rightAdornment={<span className="text-neutral-gray">%</span>}
                      placeholder="Enter savings rate"
                    />
                  ) : (
                    <div className="py-2 text-neutral-dark-gray">{profileData.savingsRate}%</div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-dark-gray mb-1">
                    Number of Dependents
                  </label>
                  {editingSection === 'financial' ? (
                    <NumberInput
                      min={0}
                      value={profileData.dependents.toString()}
                      onChange={(e) => setProfileData(prev => ({ ...prev, dependents: parseInt(e.target.value) || 0 }))}
                      placeholder="Enter number of dependents"
                    />
                  ) : (
                    <div className="py-2 text-neutral-dark-gray">{profileData.dependents}</div>
                  )}
                </div>
              </div>

              {editingSection === 'financial' && (
                <div className="flex items-center justify-end space-x-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCancel('financial')}
                  >
                    <XMarkIcon className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleSave('financial')}
                  >
                    <CheckIcon className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* General Preferences */}
      {preferences && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-neutral-dark-gray">
                  Preferences
                </h3>
                <p className="text-sm text-neutral-gray">
                  Customize your app experience
                </p>
              </div>

              {editingSection !== 'preferences' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingSection('preferences')}
                >
                  <PencilIcon className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-dark-gray mb-1">
                    Currency
                  </label>
                  {editingSection === 'preferences' ? (
                    <Select
                      value={profileData.currency}
                      onChange={(e) => setProfileData(prev => ({ ...prev, currency: e.target.value }))}
                      options={[
                        { value: 'USD', label: 'USD - US Dollar' },
                        { value: 'EUR', label: 'EUR - Euro' },
                        { value: 'GBP', label: 'GBP - British Pound' },
                        { value: 'SAR', label: 'SAR - Saudi Riyal' },
                        { value: 'AED', label: 'AED - UAE Dirham' },
                        { value: 'QAR', label: 'QAR - Qatari Riyal' }
                      ] as SelectOption[]}
                      placeholder="Select currency"
                    />
                  ) : (
                    <div className="py-2 text-neutral-dark-gray">{profileData.currency}</div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-dark-gray mb-1">
                    Language
                  </label>
                  {editingSection === 'preferences' ? (
                    <Select
                      value={profileData.language}
                      onChange={(e) => setProfileData(prev => ({ ...prev, language: e.target.value }))}
                      options={[
                        { value: 'English', label: 'English' },
                        { value: 'Arabic', label: 'العربية (Arabic)' },
                        { value: 'Spanish', label: 'Español (Spanish)' },
                        { value: 'French', label: 'Français (French)' },
                        { value: 'German', label: 'Deutsch (German)' }
                      ] as SelectOption[]}
                      placeholder="Select language"
                    />
                  ) : (
                    <div className="py-2 text-neutral-dark-gray">{profileData.language}</div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-dark-gray mb-1">
                    Timezone
                  </label>
                  {editingSection === 'preferences' ? (
                    <Select
                      value={profileData.timezone}
                      onChange={(e) => setProfileData(prev => ({ ...prev, timezone: e.target.value }))}
                      options={[
                        { value: 'America/New_York', label: 'Eastern Time (US)' },
                        { value: 'America/Chicago', label: 'Central Time (US)' },
                        { value: 'America/Denver', label: 'Mountain Time (US)' },
                        { value: 'America/Los_Angeles', label: 'Pacific Time (US)' },
                        { value: 'Europe/London', label: 'London' },
                        { value: 'Europe/Paris', label: 'Paris' },
                        { value: 'Asia/Riyadh', label: 'Riyadh' },
                        { value: 'Asia/Dubai', label: 'Dubai' }
                      ] as SelectOption[]}
                      placeholder="Select timezone"
                    />
                  ) : (
                    <div className="py-2 text-neutral-dark-gray">{profileData.timezone.replace('_', ' ')}</div>
                  )}
                </div>
              </div>

              {editingSection === 'preferences' && (
                <div className="flex items-center justify-end space-x-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCancel('preferences')}
                  >
                    <XMarkIcon className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleSave('preferences')}
                  >
                    <CheckIcon className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
