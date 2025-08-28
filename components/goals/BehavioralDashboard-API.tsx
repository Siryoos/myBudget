'use client';

import React, { useState, useEffect } from 'react';

import { useGoals, useMutation, useAuth } from '@/contexts/AppProvider';
import { GoalsService } from '@/lib/services/goals-service';
import { useTranslation } from '@/lib/useTranslation';
import type { SavingsGoal, Achievement, QuickSaveData } from '@/types';

import { AchievementSystem } from './AchievementSystem';
import { GoalWizard } from './GoalWizard';
import { InsightsPanel } from './InsightsPanel';
import { QuickSaveWidget } from './QuickSaveWidget';

interface BehavioralDashboardProps {
  showAllFeatures?: boolean
  enableAbtesting?: boolean
  showSocialProof?: boolean
  enableNotifications?: boolean
}

/**
 * Renders the Smart Savings multi-tab dashboard (Goals, Quick Save, Achievements, Insights).
 *
 * The component coordinates goal creation and contributions via server mutations, shows recent
 * quick-saves and transient achievement notifications, and exposes a goal creation wizard.
 * It also handles loading state while translations or goal-related mutations are in progress.
 *
 * @param showAllFeatures - When true (default), enables UI elements gated behind feature flags.
 * @param enableAbtesting - When true (default), enables experimental anchoring behavior in Quick Save.
 * @param showSocialProof - When true (default), surfaces peer comparison and social proof in widgets.
 * @param enableNotifications - When true (default), displays transient achievement notifications.
 * @returns The dashboard React element.
 */
export function BehavioralDashboard({
  showAllFeatures = true,
  enableAbtesting = true,
  showSocialProof = true,
  enableNotifications = true,
}: BehavioralDashboardProps) {
  const { t, ready } = useTranslation('goals');
  const { user } = useAuth();
  const { goals, loading: goalsLoading, refreshGoals } = useGoals();

  // Mutations for goal operations
  const createGoalState = useMutation(
    async (goalData: any) => {
      if (!user?.id) {throw new Error('User not authenticated');}
      const goalsService = new GoalsService();
      const result = await goalsService.create(user.id, goalData);
      refreshGoals(); // Refresh after successful creation
      return result;
    }
  );

  const addContributionState = useMutation(
    async ({ goalId, amount }: { goalId: string; amount: number }) => {
      const goalsService = new GoalsService();
      const result = await goalsService.contribute(goalId, amount);
      refreshGoals(); // Refresh after successful contribution
      return result;
    }
  );
  const [quickSaveHistory, setQuickSaveHistory] = useState<QuickSaveData[]>([]);
  const [activeTab, setActiveTab] = useState<'goals' | 'quick-save' | 'achievements' | 'insights'>('goals');
  const [showGoalWizard, setShowGoalWizard] = useState(false);
  const [recentAchievement, setRecentAchievement] = useState<Achievement | null>(null);

  // Initialize with empty quick save history
  useEffect(() => {
    // Quick save history would be loaded from API in production
    setQuickSaveHistory([]);
  }, []);

  if (!ready || goalsLoading || createGoalState.loading || addContributionState.loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-trust-blue mx-auto mb-4"></div>
          <p className="text-neutral-gray">{t('common:status.loading', { defaultValue: 'Loading...' })}</p>
        </div>
      </div>
    );
  }

  // Handle goal creation
  const handleGoalCreated = async (newGoal: Partial<SavingsGoal>) => {
    try {
      await createGoalState.mutate(newGoal);
      setShowGoalWizard(false);

      // Show achievement notification
      if (enableNotifications && goals.length === 0) {
        setRecentAchievement({
          id: 'first-goal',
          name: t('achievements.firstGoal.name', { defaultValue: 'Goal Setter' }),
          description: t('achievements.firstGoal.description', { defaultValue: 'Created your first savings goal!' }),
          icon: '🎯',
          points: 100,
          unlockedAt: new Date(),
          category: 'milestone',
          progress: 100,
          isUnlocked: true,
          requirement: 'Create your first savings goal',
        });

        setTimeout(() => setRecentAchievement(null), 5000);
      }
    } catch (error) {
      console.error('Failed to create goal:', error);
    }
  };

  // Handle quick save
  const handleQuickSave = async (saveData: QuickSaveData) => {
    try {
      // Add contribution to the goal if goalId is provided
      if (saveData.goalId) {
        await addContributionState.mutate({ goalId: saveData.goalId, amount: saveData.amount });
      }

      // Update local history
      setQuickSaveHistory(prev => [saveData, ...prev].slice(0, 10));

      // Check for streak achievement
      if (enableNotifications) {
        const consecutiveDays = checkConsecutiveSaveDays([saveData, ...quickSaveHistory]);
        if (consecutiveDays === 7) {
          setRecentAchievement({
            id: 'week-streak',
            name: t('achievements.weekStreak.name', { defaultValue: 'Week Warrior' }),
            description: t('achievements.weekStreak.description', { defaultValue: 'Saved for 7 consecutive days!' }),
            icon: '🔥',
            points: 250,
            unlockedAt: new Date(),
            category: 'streak',
            progress: 100,
            isUnlocked: true,
            requirement: 'Save for 7 consecutive days',
          });

          setTimeout(() => setRecentAchievement(null), 5000);
        }
      }
    } catch (error) {
      console.error('Failed to save:', error);
    }
  };

  // Check consecutive save days
  const checkConsecutiveSaveDays = (history: QuickSaveData[]): number => {
    if (history.length === 0) {return 0;}

    let consecutiveDays = 1;
    const sortedHistory = [...history].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    for (let i = 1; i < sortedHistory.length; i++) {
      const dayDiff = Math.floor(
        (sortedHistory[i - 1].timestamp.getTime() - sortedHistory[i].timestamp.getTime()) /
        (1000 * 60 * 60 * 24),
      );

      if (dayDiff === 1) {
        consecutiveDays++;
      } else {
        break;
      }
    }

    return consecutiveDays;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-neutral-charcoal">
          {t('dashboard.title', { defaultValue: 'Smart Savings Dashboard' })}
        </h2>
        <button
          onClick={() => setShowGoalWizard(true)}
          className="px-4 py-2 bg-primary-trust-blue text-white rounded-lg hover:bg-primary-trust-blue/90 transition-colors"
        >
          {t('actions.createGoal', { defaultValue: 'Create Goal' })}
        </button>
      </div>

      {/* Recent Achievement Notification */}
      {recentAchievement && (
        <div className="bg-secondary-growth-green/10 border border-secondary-growth-green/30 rounded-lg p-4 flex items-center space-x-4 animate-slide-in-right">
          <span className="text-3xl">{recentAchievement.icon}</span>
          <div className="flex-1">
            <h4 className="font-semibold text-neutral-charcoal">{recentAchievement.name}</h4>
            <p className="text-sm text-neutral-gray">{recentAchievement.description}</p>
          </div>
          <span className="text-secondary-growth-green font-bold">+{recentAchievement.points} pts</span>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-neutral-gray/20">
        <nav className="flex space-x-8" aria-label="Tabs">
          {(['goals', 'quick-save', 'achievements', 'insights'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab
                  ? 'border-primary-trust-blue text-primary-trust-blue'
                  : 'border-transparent text-neutral-gray hover:text-neutral-charcoal'
              }`}
            >
              {t(`tabs.${tab}`, { defaultValue: tab.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') })}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'goals' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {goals.map((goal) => (
              <div key={goal.id} className="bg-white rounded-lg shadow-sm p-6 border border-neutral-gray/10">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-semibold text-lg text-neutral-charcoal">{goal.name}</h3>
                    <p className="text-sm text-neutral-gray mt-1">{goal.description}</p>
                  </div>
                  {goal.icon && <span className="text-2xl">{goal.icon}</span>}
                </div>

                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-neutral-gray">{t('progress', { defaultValue: 'Progress' })}</span>
                    <span className="font-medium text-neutral-charcoal">
                      {Math.round((goal.currentAmount / goal.targetAmount) * 100)}%
                    </span>
                  </div>
                  <div className="h-2 bg-neutral-gray/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary-trust-blue rounded-full transition-all duration-500"
                      style={{ width: `${(goal.currentAmount / goal.targetAmount) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="text-sm text-neutral-gray">
                  <p>${goal.currentAmount.toFixed(2)} / ${goal.targetAmount.toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'quick-save' && (
          <div className="max-w-2xl mx-auto">
            <QuickSaveWidget
              goals={goals}
              showSocialProof={showSocialProof}
              enableAnchoring={enableAbtesting}
              onQuickSave={handleQuickSave}
            />
          </div>
        )}

        {activeTab === 'achievements' && (
          <AchievementSystem goals={goals} />
        )}

        {activeTab === 'insights' && (
          <InsightsPanel
            goals={goals}
            quickSaveHistory={quickSaveHistory.map(qs => ({
              ...qs,
              id: qs.id || `qs-${Date.now()}`,
              source: qs.source || 'manual',
            }))}
            showPeerComparison={showSocialProof}
          />
        )}
      </div>

      {/* Goal Creation Wizard */}
      {showGoalWizard && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <GoalWizard
              onGoalCreated={(newGoal) => {
                handleGoalCreated(newGoal);
                setShowGoalWizard(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
