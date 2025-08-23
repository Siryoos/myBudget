'use client';

import {
  PlusIcon,
  FireIcon,
  UsersIcon,
  ArrowTrendingUpIcon,
  SparklesIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { useCurrency } from '@/lib/useCurrency';
import { useTranslation } from '@/lib/useTranslation';
import type { QuickSaveData, SocialProof, SavingsGoal } from '@/types';

interface QuickSaveWidgetProps {
  goals?: SavingsGoal[]
  showSocialProof?: boolean
  enableAnchoring?: boolean
  onQuickSave?: (data: QuickSaveData) => void
}

export function QuickSaveWidget({
  goals = [],
  showSocialProof = true,
  enableAnchoring = true,
  onQuickSave,
}: QuickSaveWidgetProps) {
  const { t, isReady } = useTranslation(['goals', 'common']);
  const { formatCurrency } = useCurrency();
  const [selectedAmount, setSelectedAmount] = useState<number>(25);
  const [selectedGoalId, setSelectedGoalId] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [showSocialMessage, setShowSocialMessage] = useState(false);
  const [saveCount, setSaveCount] = useState(0);

  // A/B testing for default amounts - persistent assignment
  const [abTestGroup] = useState<'control' | 'test'>(() => {
    // Check if user already has an A/B test group assigned
    const stored = localStorage.getItem('quickSave_abTestGroup');
    if (stored === 'control' || stored === 'test') {
      return stored;
    }

    // Assign new user to a random group and persist it with timestamp
    const newGroup = Math.random() > 0.5 ? 'test' : 'control';
    const timestamp = new Date().toISOString();
    localStorage.setItem('quickSave_abTestGroup', newGroup);
    localStorage.setItem('quickSave_abTestGroup_assignedAt', timestamp);
    return newGroup;
  });

  // Anchoring optimization - different default amounts based on A/B test
  const defaultAmounts = {
    control: [10, 25, 50, 100],
    test: [20, 50, 75, 150],
  };

  // A/B testing metadata for analytics
  const abTestMetadata = {
    experimentName: 'quickSave_defaultAmounts',
    version: 'v1',
    group: abTestGroup,
    assignedAt: localStorage.getItem('quickSave_abTestGroup_assignedAt') || new Date().toISOString(),
    defaultAmounts: defaultAmounts[abTestGroup],
  };

  // Social proof messages
  const socialProofMessages: SocialProof[] = [
    {
      id: '1',
      type: 'peer-comparison',
      title: 'Join the Movement',
      message: 'Join 2,500+ people who saved today',
      data: { userCount: 2500, timeFrame: 'today' },
      displayFrequency: 3,
    },
    {
      id: '2',
      type: 'trend-data',
      title: 'Popular Save Time',
      message: 'Most popular save time: 5:30 PM',
      data: { popularTime: '5:30 PM', percentage: 23 },
      displayFrequency: 5,
    },
    {
      id: '3',
      type: 'risk-awareness',
      title: 'Financial Resilience',
      message: 'Your friends saved an average of $45 this week',
      data: { averageAmount: 45, timeFrame: 'week' },
      displayFrequency: 4,
    },
    {
      id: '4',
      type: 'peer-comparison',
      title: 'Emergency Fund Success',
      message: '8 in 10 people with emergency funds avoid debt',
      data: { successRate: 80, benefit: 'debt avoidance' },
      displayFrequency: 6,
    },
  ];

  // Dynamic defaults based on user behavior and peer data
  const getDynamicDefaults = () => {
    const baseAmounts = defaultAmounts[abTestGroup];

    // If user has goals, suggest amounts that align with them
    if (goals.length > 0) {
      const activeGoal = goals.find(g => g.isActive);
      if (activeGoal) {
        const remaining = activeGoal.targetAmount - activeGoal.currentAmount;
        const monthlyTarget = remaining / Math.max(1, Math.ceil(((activeGoal.targetDate instanceof Date ? activeGoal.targetDate : new Date(activeGoal.targetDate)).getTime() - Date.now()) / (30 * 24 * 60 * 60 * 1000)));

        // Suggest amounts that help reach the goal
        const goalAlignedAmounts = [
          Math.round(monthlyTarget * 0.25),
          Math.round(monthlyTarget * 0.5),
          Math.round(monthlyTarget * 0.75),
          Math.round(monthlyTarget),
        ].filter(amount => amount > 0);

        return goalAlignedAmounts.length > 0 ? goalAlignedAmounts : baseAmounts;
      }
    }

    return baseAmounts;
  };

  const handleQuickSave = async () => {
    if (selectedAmount <= 0) {return;}

    setIsSaving(true);

    try {
      const saveData: QuickSaveData = {
        id: Date.now().toString(),
        amount: selectedAmount,
        goalId: selectedGoalId || undefined,
        timestamp: new Date(),
        source: 'manual',
        socialProofMessage: showSocialProof ? socialProofMessages[saveCount % socialProofMessages.length].message : undefined,
      };

      // Track A/B test data for analytics
      const abTestData = {
        experimentName: abTestMetadata.experimentName,
        version: abTestMetadata.version,
        group: abTestMetadata.group,
        selectedAmount,
        defaultAmounts: abTestMetadata.defaultAmounts,
        timestamp: new Date().toISOString(),
      };

      // In production, you would send this to your analytics service
      if (process.env.NODE_ENV === 'development') {
        console.log('A/B Test Data:', abTestData);
      }

      if (onQuickSave) {
        onQuickSave(saveData);
      }

      // Increment save count for social proof rotation
      setSaveCount(prev => prev + 1);

      // Show social proof message
      if (showSocialProof && saveCount % 3 === 0) {
        setShowSocialMessage(true);
        setTimeout(() => setShowSocialMessage(false), 3000);
      }

      // Reset form
      setSelectedAmount(getDynamicDefaults()[0]);
      setSelectedGoalId('');

      // Success animation
      setTimeout(() => setIsSaving(false), 1000);

    } catch (error) {
      console.error('Error during quick save:', error);
      setIsSaving(false);
    }
  };

  const getSocialProofMessage = () => {
    if (saveCount === 0) {return null;}
    return socialProofMessages[saveCount % socialProofMessages.length];
  };

  if (!isReady) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-trust-blue mx-auto mb-4"></div>
            <p className="text-neutral-gray">{t('common:status.loading', { defaultValue: 'Loading...' })}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const dynamicDefaults = getDynamicDefaults();
  const currentSocialProof = getSocialProofMessage();

  return (
    <div className="space-y-6">
      {/* Quick Save Card */}
      <Card className="relative overflow-hidden">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">
                {t('goals:quickSave.title', { defaultValue: 'Quick Save' })}
              </h3>
              <p className="text-sm text-gray-600">
                {t('goals:quickSave.subtitle', { defaultValue: 'Save money instantly towards your goals' })}
              </p>
            </div>
            <div className="text-4xl">💰</div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Amount Selection with Anchoring */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              {t('goals:quickSave.amount.title', { defaultValue: 'How much would you like to save?' })}
            </label>

            {/* Quick Amount Buttons */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              {dynamicDefaults.map((amount) => (
                <motion.button
                  key={amount}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedAmount(amount)}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    selectedAmount === amount
                      ? 'border-primary-trust-blue bg-blue-50 text-primary-trust-blue'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  <div className="text-lg font-semibold">{formatCurrency(amount)}</div>
                  <div className="text-xs text-gray-500">
                    {t('goals:quickSave.amount.quick', { defaultValue: 'Quick' })}
                  </div>
                </motion.button>
              ))}
            </div>

            {/* Custom Amount Input */}
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                $
              </span>
              <input
                type="number"
                value={selectedAmount}
                onChange={(e) => setSelectedAmount(parseFloat(e.target.value) || 0)}
                className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-trust-blue focus:border-transparent"
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>
          </div>

          {/* Goal Selection */}
          {goals.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                {t('goals:quickSave.goal.title', { defaultValue: 'Save towards a specific goal (optional)' })}
              </label>
              <select
                value={selectedGoalId}
                onChange={(e) => setSelectedGoalId(e.target.value)}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-trust-blue focus:border-transparent"
              >
                <option value="">
                  {t('goals:quickSave.goal.select', { defaultValue: 'Select a goal...' })}
                </option>
                {goals.filter(g => g.isActive).map((goal) => (
                  <option key={goal.id} value={goal.id}>
                    {goal.name} - {formatCurrency(goal.targetAmount - goal.currentAmount)} remaining
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Social Proof Integration */}
          {showSocialProof && currentSocialProof && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border border-blue-200"
            >
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  {currentSocialProof.type === 'peer-comparison' && <UsersIcon className="w-5 h-5 text-blue-600" />}
                  {currentSocialProof.type === 'trend-data' && <ArrowTrendingUpIcon className="w-5 h-5 text-purple-600" />}
                  {currentSocialProof.type === 'risk-awareness' && <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />}
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-gray-900">
                    {currentSocialProof.title}
                  </h4>
                  <p className="text-sm text-gray-600">
                    {currentSocialProof.message}
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Quick Save Button */}
          <Button
            onClick={handleQuickSave}
            disabled={selectedAmount <= 0 || isSaving}
            className="w-full py-3 text-lg font-semibold"
            size="lg"
          >
            {isSaving ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>{t('goals:quickSave.saving', { defaultValue: 'Saving...' })}</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <PlusIcon className="w-5 h-5" />
                <span>
                  {t('goals:quickSave.save', { defaultValue: 'Save' })} {formatCurrency(selectedAmount)}
                </span>
              </div>
            )}
          </Button>

          {/* Success Message */}
          <AnimatePresence>
            {showSocialMessage && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-green-50 border border-green-200 rounded-lg p-4 text-center"
              >
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <SparklesIcon className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-green-800">
                    {t('goals:quickSave.success.title', { defaultValue: 'Great job!' })}
                  </span>
                </div>
                <p className="text-sm text-green-700">
                  {t('goals:quickSave.success.message', { defaultValue: 'You\'re building a stronger financial future!' })}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Behavioral Insights */}
      {enableAnchoring && (
        <Card className="bg-gradient-to-r from-yellow-50 to-orange-50 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <FireIcon className="w-6 h-6 text-orange-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-orange-900 mb-1">
                  {t('goals:quickSave.insights.title', { defaultValue: 'Smart Defaults' })}
                </h4>
                <p className="text-sm text-orange-800 mb-3">
                  {t('goals:quickSave.insights.description', {
                    defaultValue: 'We\'ve optimized the default amounts based on what works best for people like you. The most popular save amounts are pre-selected to make saving easier.',
                    group: abTestGroup === 'test' ? 'optimized' : 'standard',
                  })}
                </p>

                {/* A/B Testing Information (for development/debugging) */}
                {process.env.NODE_ENV === 'development' && (
                  <div className="mt-3 p-2 bg-white rounded border border-orange-200">
                    <div className="text-xs text-orange-700">
                      <div className="font-medium mb-1">A/B Test Info (Dev Only):</div>
                      <div>Group: <span className="font-mono">{abTestGroup}</span></div>
                      <div>Default Amounts: <span className="font-mono">{defaultAmounts[abTestGroup].join(', ')}</span></div>
                      <div>Assigned: <span className="font-mono">{new Date(abTestMetadata.assignedAt).toLocaleDateString()}</span></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
