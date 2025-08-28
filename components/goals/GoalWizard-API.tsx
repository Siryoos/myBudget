'use client';

import {
  CameraIcon,
  XMarkIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import React, { useState, useEffect, useCallback } from 'react';

import { apiClient } from '@/lib/api-client';
import { useTranslation } from '@/lib/useTranslation';
import type { SavingsGoal, GoalPhoto, GoalCategory } from '@/types';

// Date handling helper functions
function isValidDate(date: any): date is Date {
  return date instanceof Date && !isNaN(date.getTime());
}

function formatDateInput(date: Date | undefined): string {
  if (!isValidDate(date)) {return '';}
  // Format date as YYYY-MM-DD for input[type="date"] without UTC shifting
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateInput(value: string): Date | undefined {
  if (!value) {return undefined;}
  const date = new Date(value);
  return isValidDate(date) ? date : undefined;
}

interface GoalWizardProps {
  onGoalCreated: (goal: Partial<SavingsGoal>) => void
  onClose: () => void
  enableLossAversion?: boolean
  showPhotoUpload?: boolean
}

interface UploadProgress {
  loaded: number
  total: number
  percentage: number
}

const GOAL_TEMPLATES = [
  {
    id: 'emergency',
    name: 'Emergency Fund',
    icon: '🛡️',
    category: 'emergency',
    suggestedAmount: 10000,
    suggestedMonths: 12,
    lossAversionFraming: 'Avoid financial crisis and high-interest debt',
    achievementFraming: 'Build a safety net for peace of mind',
  },
  {
    id: 'vacation',
    name: 'Dream Vacation',
    icon: '✈️',
    category: 'vacation',
    suggestedAmount: 5000,
    suggestedMonths: 8,
    lossAversionFraming: 'Don\'t miss out on creating lifelong memories',
    achievementFraming: 'Create unforgettable experiences',
  },
  {
    id: 'home',
    name: 'Home Down Payment',
    icon: '🏠',
    category: 'home',
    suggestedAmount: 50000,
    suggestedMonths: 36,
    lossAversionFraming: 'Stop losing money on rent',
    achievementFraming: 'Own your dream home',
  },
  {
    id: 'education',
    name: 'Education Fund',
    icon: '🎓',
    category: 'education',
    suggestedAmount: 20000,
    suggestedMonths: 24,
    lossAversionFraming: 'Don\'t let debt limit your future',
    achievementFraming: 'Invest in your future',
  },
];

/**
 * Interactive four-step wizard UI for creating a savings goal.
 *
 * Guides the user through: (1) selecting a goal template, (2) choosing motivation framing
 * (loss-avoidance vs. achievement) when enabled, (3) customizing goal details (name, description,
 * target amount/date), and (4) optionally uploading a goal photo. Steps that are disabled via
 * props are automatically skipped. On completion the component assembles a Partial<SavingsGoal>
 * (including framingType, optional lossAvoidanceDescription/achievementDescription from the chosen
 * template, optional photoUrl, and generated milestones at 25/50/75/100%) and passes it to the
 * onGoalCreated callback.
 *
 * @param onGoalCreated - Callback invoked with the assembled Partial<SavingsGoal> when the user
 *   finishes the wizard.
 * @param onClose - Callback invoked to close the wizard (e.g., when the user clicks the close button).
 * @param enableLossAversion - If false, the framing step (step 2) is omitted and framing defaults to 'achievement'.
 * @param showPhotoUpload - If false, the photo upload step (step 4) is omitted.
 */
export function GoalWizard({
  onGoalCreated,
  onClose,
  enableLossAversion = true,
  showPhotoUpload = true,
}: GoalWizardProps) {
  const { t } = useTranslation('goals');
  const [step, setStep] = useState(1);
  const [selectedTemplate, setSelectedTemplate] = useState<typeof GOAL_TEMPLATES[0] | null>(null);
  const [framingType, setFramingType] = useState<'loss-avoidance' | 'achievement'>('achievement');
  const [goalData, setGoalData] = useState<Partial<SavingsGoal>>({
    name: '',
    description: '',
    targetAmount: 0,
    targetDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
    category: 'custom',
    priority: 'medium',
  });
  const [uploadedPhoto, setUploadedPhoto] = useState<GoalPhoto | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Handle automatic navigation when steps are disabled
  useEffect(() => {
    if (step === 2 && !enableLossAversion) {
      handleNext();
    } else if (step === 4 && !showPhotoUpload) {
      handleNext();
    }
  }, [step, enableLossAversion, showPhotoUpload]);

  const handlePhotoUpload = async (file: File) => {
    // Validate file
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      setUploadError('File size must be less than 5MB');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      // Create FormData for multipart upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'goals');
      formData.append('generateThumbnail', 'true');

      // Upload file using fetch with progress tracking
      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          setUploadProgress({
            loaded: event.loaded,
            total: event.total,
            percentage: Math.round((event.loaded / event.total) * 100),
          });
        }
      });

      // Handle completion
      xhr.addEventListener('load', () => {
        if (xhr.status >= HTTP_OK && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            if (response.success && response.data) {
              const photo: GoalPhoto = {
                id: response.data.publicId,
                goalId: selectedTemplate?.id || 'custom',
                photoUrl: response.data.url,
                thumbnailUrl: response.data.thumbnailUrl || response.data.url,
                uploadedAt: new Date(),
                fileSize: file.size,
                mimeType: file.type,
              };
              setUploadedPhoto(photo);
              setGoalData(prev => ({ ...prev, photoUrl: photo.photoUrl }));
            } else {
              throw new Error(response.error || 'Upload failed');
            }
          } catch (e) {
            setUploadError('Failed to process upload response');
          }
        } else {
          setUploadError(`Upload failed with status: ${xhr.status}`);
        }
        setIsUploading(false);
        setUploadProgress(null);
      });

      // Handle errors
      xhr.addEventListener('error', () => {
        setUploadError('Network error during upload');
        setIsUploading(false);
        setUploadProgress(null);
      });

      // Send request
      xhr.open('POST', '/api/upload');
      const token = apiClient.getToken();
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }
      xhr.send(formData);
    } catch (error) {
      console.error('Upload failed:', error);
      setUploadError(error instanceof Error ? error.message : 'Upload failed');
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  // BEGIN: Navigation and Goal Creation Handler
  // This function manages step progression and final goal creation
  // It handles both manual navigation (user clicks next) and automatic step skipping
  const handleNext = useCallback(() => {
    if (step < 4) {
      // Skip framing (step 2) when loss aversion is disabled
      // This prevents users from getting stuck on a disabled step
      const skipFraming = !enableLossAversion && step === 1;

      // Skip photo upload (step 4) when photo upload is disabled
      // This applies when we're on step 3 (before photo upload)
      const skipPhoto = !showPhotoUpload && step === 3;

      // Calculate step increment: skip 2 steps if we're bypassing a disabled step
      const increment = skipFraming || skipPhoto ? 2 : 1;

      // Ensure we don't exceed the maximum step (4)
      setStep(Math.min(4, step + increment));

    } else {
      // BEGIN: Final Goal Creation (Step 4)
      // When reaching the final step, create the complete goal object
      // This consolidates all user inputs and template data into a single goal
      const finalGoalData: Partial<SavingsGoal> = {
        // Spread existing goal data (name, description, targetAmount, etc.)
        ...goalData,

        // Set framing type based on user preference or default to achievement
        // Loss aversion framing is only available when the feature is enabled
        framingType: enableLossAversion ? framingType : 'achievement',

        // Add loss avoidance description if user chose that framing
        // Only include when both loss aversion is enabled and user selected it
        lossAvoidanceDescription: framingType === 'loss-avoidance' && selectedTemplate
          ? selectedTemplate.lossAversionFraming
          : undefined,

        // Add achievement description if user chose that framing
        // This provides positive motivation messaging for the goal
        achievementDescription: framingType === 'achievement' && selectedTemplate
          ? selectedTemplate.achievementFraming
          : undefined,

        // Include photo URL if user uploaded an image
        // This adds visual motivation and personalization to the goal
        photoUrl: uploadedPhoto?.photoUrl,

        // Generate milestone targets for progress tracking
        // Creates 25%, 50%, 75%, and 100% completion checkpoints
        milestones: generateMilestones(goalData.targetAmount || 0),
      };

      // Call the parent callback to handle goal creation
      // This allows the parent component to save the goal and close the wizard
      onGoalCreated(finalGoalData);
      // END: Final Goal Creation
    }
  }, [step, goalData, enableLossAversion, framingType, selectedTemplate, uploadedPhoto, onGoalCreated]);
  // END: Navigation and Goal Creation Handler

  const generateMilestones = (targetAmount: number) => {
    const milestones = [];
    const milestoneAmounts = [0.25, 0.5, 0.75, 1];

    for (const percentage of milestoneAmounts) {
      milestones.push({
        id: `milestone-${percentage}`,
        amount: targetAmount * percentage,
        description: `${percentage * 100}% of goal`,
        isCompleted: false,
      });
    }

    return milestones;
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div>
            <h3 className="text-xl font-semibold mb-6">{t('goalWizard.selectTemplate')}</h3>
            <div className="grid grid-cols-2 gap-4">
              {GOAL_TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  onClick={() => {
                    setSelectedTemplate(template);
                    setGoalData(prev => ({
                      ...prev,
                      name: template.name,
                      category: template.category as GoalCategory,
                      targetAmount: template.suggestedAmount,
                    }));
                  }}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    selectedTemplate?.id === template.id
                      ? 'border-primary-trust-blue bg-primary-trust-blue/5'
                      : 'border-neutral-gray/30 hover:border-neutral-gray/50'
                  }`}
                >
                  <span className="text-3xl mb-2 block">{template.icon}</span>
                  <h4 className="font-medium text-neutral-charcoal">{template.name}</h4>
                  <p className="text-sm text-neutral-gray mt-1">
                    ${template.suggestedAmount.toLocaleString()}
                  </p>
                </button>
              ))}
            </div>
          </div>
        );

      // BEGIN: Goal Framing Step (Case 2)
      // This step allows users to choose between loss-avoidance and achievement framing
      // for their savings goal, applying behavioral psychology principles to motivation
      case 2:
        // Conditional rendering: Only show framing step if loss aversion is enabled
        // When disabled, this step is automatically skipped via useEffect hook
        return enableLossAversion ? (
          <div>
            <h3 className="text-xl font-semibold mb-6">{t('goalWizard.chooseFraming')}</h3>
            <div className="space-y-4">
              {/* Loss Avoidance Framing Option */}
              {/* Uses coral-red styling to emphasize risk and potential losses */}
              <label
                className={`block p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  framingType === 'loss-avoidance'
                    ? 'border-accent-coral-red bg-accent-coral-red/5'
                    : 'border-neutral-gray/30 hover:border-neutral-gray/50'
                }`}
              >
                {/* Hidden radio input for accessibility - label provides clickable area */}
                <input
                  type="radio"
                  name="framing"
                  value="loss-avoidance"
                  checked={framingType === 'loss-avoidance'}
                  onChange={(e) => setFramingType(e.target.value as any)}
                  className="sr-only" // Screen reader only - visual styling handled by label
                />
                <div>
                  <h4 className="font-medium text-neutral-charcoal mb-2">
                    {t('goalWizard.avoidLoss')}
                  </h4>
                  {/* Dynamic content from selected template's loss aversion framing */}
                  <p className="text-sm text-neutral-gray">
                    {selectedTemplate?.lossAversionFraming}
                  </p>
                </div>
              </label>

              {/* Achievement Framing Option */}
              {/* Uses growth-green styling to emphasize positive outcomes and success */}
              <label
                className={`block p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  framingType === 'achievement'
                    ? 'border-secondary-growth-green bg-secondary-growth-green/5'
                    : 'border-neutral-gray/30 hover:border-neutral-gray/50'
                }`}
              >
                {/* Hidden radio input for accessibility - label provides clickable area */}
                <input
                  type="radio"
                  name="framing"
                  value="achievement"
                  checked={framingType === 'achievement'}
                  onChange={(e) => setFramingType(e.target.value as any)}
                  className="sr-only" // Screen reader only - visual styling handled by label
                />
                <div>
                  <h4 className="font-medium text-neutral-charcoal mb-2">
                    {t('goalWizard.achieveGoal')}
                  </h4>
                  {/* Dynamic content from selected template's achievement framing */}
                  <p className="text-sm text-neutral-gray">
                    {selectedTemplate?.achievementFraming}
                  </p>
                </div>
              </label>
            </div>
          </div>
        ) : (
          // When loss aversion is disabled, this step is skipped
          // The useEffect hook will automatically advance to the next step
          null // Loss aversion step is skipped when enableLossAversion is false
        );
        // END: Goal Framing Step

      case 3:
        return (
          <div>
            <h3 className="text-xl font-semibold mb-6">{t('goalWizard.customizeGoal')}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-charcoal mb-2">
                  {t('goalWizard.goalName')}
                </label>
                <input
                  type="text"
                  value={goalData.name}
                  onChange={(e) => setGoalData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-neutral-gray/30 rounded-lg focus:ring-2 focus:ring-primary-trust-blue focus:border-transparent"
                  placeholder={t('goalWizard.enterGoalName')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-charcoal mb-2">
                  {t('goalWizard.description')}
                </label>
                <textarea
                  value={goalData.description}
                  onChange={(e) => setGoalData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-neutral-gray/30 rounded-lg focus:ring-2 focus:ring-primary-trust-blue focus:border-transparent"
                  rows={3}
                  placeholder={t('goalWizard.enterDescription')}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-charcoal mb-2">
                    {t('goalWizard.targetAmount')}
                  </label>
                  <input
                    type="number"
                    value={goalData.targetAmount}
                    onChange={(e) => setGoalData(prev => ({ ...prev, targetAmount: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-neutral-gray/30 rounded-lg focus:ring-2 focus:ring-primary-trust-blue focus:border-transparent"
                    min="0"
                    step="100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-charcoal mb-2">
                    {t('goalWizard.targetDate')}
                  </label>
                  <input
                    type="date"
                    value={formatDateInput(goalData.targetDate instanceof Date ? goalData.targetDate : (goalData.targetDate ? new Date(goalData.targetDate) : new Date()))}
                    onChange={(e) => setGoalData(prev => ({ ...prev, targetDate: parseDateInput(e.target.value) }))}
                    className="w-full px-3 py-2 border border-neutral-gray/30 rounded-lg focus:ring-2 focus:ring-primary-trust-blue focus:border-transparent"
                    min={formatDateInput(new Date())}
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 4:
        return showPhotoUpload ? (
          <div>
            <h3 className="text-xl font-semibold mb-6">{t('goalWizard.addPhoto')}</h3>
            <div className="text-center">
              {uploadedPhoto ? (
                <div className="relative inline-block">
                  <img
                    src={uploadedPhoto.thumbnailUrl || uploadedPhoto.photoUrl}
                    alt="Goal"
                    className="w-64 h-64 object-cover rounded-lg"
                  />
                  <button
                    onClick={() => {
                      setUploadedPhoto(null);
                      setGoalData(prev => ({ ...prev, photoUrl: undefined }));
                    }}
                    className="absolute top-2 right-2 p-1 bg-white rounded-full shadow-md hover:shadow-lg"
                  >
                    <XMarkIcon className="w-5 h-5 text-neutral-gray" />
                  </button>
                </div>
              ) : (
                <label className="block">
                  <div className="w-64 h-64 mx-auto border-2 border-dashed border-neutral-gray/30 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary-trust-blue transition-colors">
                    {isUploading ? (
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-trust-blue mx-auto mb-4"></div>
                        {uploadProgress && (
                          <div className="w-48">
                            <div className="h-2 bg-neutral-gray/20 rounded-full overflow-hidden mb-2">
                              <div
                                className="h-full bg-primary-trust-blue rounded-full transition-all duration-300"
                                style={{ width: `${uploadProgress.percentage}%` }}
                              />
                            </div>
                            <p className="text-sm text-neutral-gray">{uploadProgress.percentage}%</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <>
                        <CameraIcon className="w-12 h-12 text-neutral-gray/50 mb-2" />
                        <p className="text-sm text-neutral-gray">{t('goalWizard.uploadPhoto')}</p>
                        <p className="text-xs text-neutral-gray/70 mt-1">Max 5MB</p>
                      </>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {handlePhotoUpload(file);}
                    }}
                    disabled={isUploading}
                    className="sr-only"
                  />
                </label>
              )}

              {uploadError && (
                <p className="text-sm text-accent-coral-red mt-2">{uploadError}</p>
              )}

              <p className="text-sm text-neutral-gray mt-4">
                {t('goalWizard.photoDescription')}
              </p>
            </div>
          </div>
        ) : (
          null // Photo upload step is skipped when showPhotoUpload is false
        );
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-neutral-charcoal">
          {t('goalWizard.title')}
        </h2>
        <button
          onClick={onClose}
          className="p-2 hover:bg-neutral-gray/10 rounded-lg transition-colors"
        >
          <XMarkIcon className="w-6 h-6 text-neutral-gray" />
        </button>
      </div>

      {/* Progress indicator */}
      <div className="flex items-center justify-center mb-8">
        {[1, 2, 3, 4].map((i) => (
          <React.Fragment key={i}>
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                i <= step
                  ? 'bg-primary-trust-blue text-white'
                  : 'bg-neutral-gray/20 text-neutral-gray'
              }`}
            >
              {i < step ? <CheckCircleIcon className="w-5 h-5" /> : i}
            </div>
            {i < 4 && (
              <div
                className={`w-16 h-1 ${
                  i < step ? 'bg-primary-trust-blue' : 'bg-neutral-gray/20'
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Step content */}
      <div className="mb-8">
        {renderStep()}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={() => setStep(Math.max(1, step - 1))}
          disabled={step === 1}
          className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
            step === 1
              ? 'bg-neutral-gray/10 text-neutral-gray/50 cursor-not-allowed'
              : 'bg-neutral-gray/10 text-neutral-charcoal hover:bg-neutral-gray/20'
          }`}
        >
          <ArrowLeftIcon className="w-4 h-4 mr-2" />
          {t('common:actions.back')}
        </button>

        <button
          onClick={handleNext}
          disabled={isUploading || !selectedTemplate || !goalData.name}
          className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
            isUploading || !selectedTemplate || !goalData.name
              ? 'bg-primary-trust-blue/50 text-white/70 cursor-not-allowed'
              : 'bg-primary-trust-blue text-white hover:bg-primary-trust-blue/90'
          }`}
        >
          {step === 4 ? t('common:actions.create') : t('common:actions.next')}
          <ArrowRightIcon className="w-4 h-4 ml-2" />
        </button>
      </div>
    </div>
  );
}
