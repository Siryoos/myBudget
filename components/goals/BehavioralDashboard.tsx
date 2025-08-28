'use client';

import {
  PlusIcon,
  TrophyIcon,
  ChartBarIcon,
  LightBulbIcon,
  FireIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { useTranslation } from '@/lib/useTranslation';
import type { SavingsGoal, QuickSaveData, Achievement } from '@/types';

import { AchievementSystem } from './AchievementSystem';
import { GoalProgressTracker } from './GoalProgressTracker';
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
 * Behavioral dashboard component exposing Goals, Quick Save, Achievements, and Insights panels.
 *
 * Renders a four-tab client-side UI that manages local state for savings goals, quick-save history,
 * and transient achievement notifications. On mount it populates the goals list with mock demo data;
 * while translation resources are loading it renders a centered loading state. Tabs include interactive
 * widgets (GoalWizard, QuickSaveWidget, AchievementSystem, InsightsPanel) and an optional behavioral
 * psychology tips card.
 *
 * @param showAllFeatures - When true, displays the behavioral-psychology tips card (loss aversion, social proof, gamification).
 * @param enableAbtesting - When true, enables anchoring/AB-testing behavior in the Quick Save widget.
 * @param showSocialProof - When true, enables peer/comparison UI in panels that support social proof.
 * @param enableNotifications - When true, enables in-app achievement notifications in the Achievements panel.
 * @returns A JSX element rendering the full BehavioralDashboard.
 */
export function BehavioralDashboard({
  showAllFeatures = true,
  enableAbtesting = true,
  showSocialProof = true,
  enableNotifications = true,
}: BehavioralDashboardProps) {
  const { t, ready } = useTranslation('goals');
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [quickSaveHistory, setQuickSaveHistory] = useState<QuickSaveData[]>([]);
  const [activeTab, setActiveTab] = useState<'goals' | 'quick-save' | 'achievements' | 'insights'>('goals');
  const [showGoalWizard, setShowGoalWizard] = useState(false);
  const [recentAchievement, setRecentAchievement] = useState<Achievement | null>(null);

  // Mock initial goals data - MUST be before any early returns
  useEffect(() => {
    const mockGoals: SavingsGoal[] = [
      {
        id: '1',
        name: 'Emergency Fund',
        description: 'Build a safety net for unexpected expenses',
        targetAmount: 10000,
        currentAmount: 6800,
        targetDate: new Date(Date.now() + 4 * 30 * 24 * 60 * 60 * 1000),
        category: 'emergency',
        priority: 'high',
        isActive: true,
        framingType: 'loss-avoidance',
        lossAvoidanceDescription: 'Avoid financial crisis and high-interest debt',
        photoUrl: '/images/emergency-fund.jpg',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        milestones: [
          { id: '1', amount: 2500, description: 'First milestone', isCompleted: true, completedDate: new Date('2024-01-15') },
          { id: '2', amount: 5000, description: 'Halfway there', isCompleted: true, completedDate: new Date('2024-02-20') },
          { id: '3', amount: 7500, description: 'Almost done', isCompleted: false },
          { id: '4', amount: 10000, description: 'Goal complete!', isCompleted: false },
        ],
      },
      {
        id: '2',
        name: 'Dream Vacation',
        description: 'Two weeks in Japan',
        targetAmount: 5000,
        currentAmount: 1200,
        targetDate: new Date(Date.now() + 8 * 30 * 24 * 60 * 60 * 1000),
        category: 'vacation',
        priority: 'medium',
        isActive: true,
        framingType: 'achievement',
        achievementDescription: 'Create unforgettable memories without financial stress',
        photoUrl: '/images/japan-vacation.jpg',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        milestones: [
          { id: '1', amount: 1250, description: 'Flight booking', isCompleted: false },
          { id: '2', amount: 2500, description: 'Accommodation', isCompleted: false },
          { id: '3', amount: 3750, description: 'Activities & food', isCompleted: false },
          { id: '4', amount: 5000, description: 'Full budget ready', isCompleted: false },
        ],
      },
    ];
    setGoals(mockGoals);
  }, []);

  if (!ready) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-trust-blue mx-auto mb-4"></div>
        <p className="text-neutral-gray">Loading behavioral dashboard...</p>
      </div>
    );
  }

  // Handle goal creation
  const handleGoalCreated = (newGoal: Partial<SavingsGoal>) => {
    const goal: SavingsGoal = {
      ...newGoal,
      id: Date.now().toString(),
      currentAmount: 0,
      isActive: true,
      milestones: [],
      automationRules: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    } as SavingsGoal;

    setGoals(prev => [...prev, goal]);
    setShowGoalWizard(false);
  };

  // Handle quick save
  const handleQuickSave = (saveData: QuickSaveData) => {
    setQuickSaveHistory(prev => [saveData, ...prev]);

    // Update goal progress if saving towards a specific goal
    if (saveData.goalId) {
      setGoals(prev => prev.map(goal =>
        (goal.id === saveData.goalId
          ? { ...goal, currentAmount: goal.currentAmount + saveData.amount }
          : goal),
      ));
    }
  };

  // Handle achievement unlocked
  const handleAchievementUnlocked = (achievement: Achievement) => {
    setRecentAchievement(achievement);
    setTimeout(() => setRecentAchievement(null), 5000);
  };

  const tabs = [
    {
      id: 'goals',
      label: t('dashboard:tabs.goals', { defaultValue: 'Goals' }),
      icon: PlusIcon,
      description: t('dashboard:tabs.goalsDescription', { defaultValue: 'Create and track your savings goals' }),
    },
    {
      id: 'quick-save',
      label: t('dashboard:tabs.quickSave', { defaultValue: 'Quick Save' }),
      icon: FireIcon,
      description: t('dashboard:tabs.quickSaveDescription', { defaultValue: 'Save money instantly with smart defaults' }),
    },
    {
      id: 'achievements',
      label: t('dashboard:tabs.achievements', { defaultValue: 'Achievements' }),
      icon: TrophyIcon,
      description: t('dashboard:tabs.achievementsDescription', { defaultValue: 'Earn badges and track your progress' }),
    },
    {
      id: 'insights',
      label: t('dashboard:tabs.insights', { defaultValue: 'Insights' }),
      icon: LightBulbIcon,
      description: t('dashboard:tabs.insightsDescription', { defaultValue: 'Get personalized financial insights' }),
    },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'goals':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {t('dashboard:goals.title', { defaultValue: 'Your Savings Goals' })}
                </h2>
                <p className="text-gray-600">
                  {t('dashboard:goals.subtitle', { defaultValue: 'Track your progress and stay motivated' })}
                </p>
              </div>
              <Button
                onClick={() => setShowGoalWizard(true)}
                size="lg"
                className="bg-gradient-to-r from-primary-trust-blue to-secondary-growth-green hover:from-primary-trust-blue/90 hover:to-secondary-growth-green/90"
              >
                <PlusIcon className="w-5 h-5 mr-2" />
                {t('dashboard:goals.createNew', { defaultValue: 'Create New Goal' })}
              </Button>
            </div>

            <GoalProgressTracker
              goals={goals}
              showFutureProjections={true}
              celebrationAnimations={true}
            />

            {showGoalWizard && (
              <GoalWizard
                onGoalCreated={handleGoalCreated}
                visualGoalSetting={true}
                milestoneBreakdown={true}
              />
            )}
          </div>
        );

      case 'quick-save':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {t('dashboard:quickSave.title', { defaultValue: 'Quick Save' })}
              </h2>
              <p className="text-gray-600">
                {t('dashboard:quickSave.subtitle', { defaultValue: 'Save money instantly with behavioral optimization' })}
              </p>
            </div>

            <QuickSaveWidget
              goals={goals}
              showSocialProof={showSocialProof}
              enableAnchoring={enableAbtesting}
              onQuickSave={handleQuickSave}
            />

            {/* Quick Save History */}
            {quickSaveHistory.length > 0 && (
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {t('dashboard:quickSave.history.title', { defaultValue: 'Recent Quick Saves' })}
                  </h3>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {quickSaveHistory.slice(0, 5).map((save) => (
                      <div key={save.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                            <PlusIcon className="w-4 h-4 text-green-600" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">
                              {formatCurrency(save.amount)}
                            </div>
                            <div className="text-sm text-gray-HTTP_INTERNAL_SERVER_ERROR">
                              {save.timestamp.toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        {save.goalId && (
                          <span className="text-sm text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                            {goals.find(g => g.id === save.goalId)?.name}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case 'achievements':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {t('dashboard:achievements.title', { defaultValue: 'Achievement System' })}
              </h2>
              <p className="text-gray-600">
                {t('dashboard:achievements.subtitle', { defaultValue: 'Earn badges and points for your financial progress' })}
              </p>
            </div>

            <AchievementSystem
              goals={goals}
              showLeaderboard={true}
              enableNotifications={enableNotifications}
              onAchievementUnlocked={handleAchievementUnlocked}
            />
          </div>
        );

      case 'insights':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {t('dashboard:insights.title', { defaultValue: 'Financial Insights' })}
              </h2>
              <p className="text-gray-600">
                {t('dashboard:insights.subtitle', { defaultValue: 'Get personalized insights and peer comparisons' })}
              </p>
            </div>

            <InsightsPanel
              goals={goals}
              quickSaveHistory={quickSaveHistory}
              showPeerComparison={showSocialProof}
              showRiskAwareness={true}
              showTrends={true}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Behavioral Psychology Context */}
      <Card className="bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 border-blue-HTTP_OK">
        <CardContent className="p-6">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="text-4xl">🧠</div>
              <div className="text-4xl">💡</div>
              <div className="text-4xl">💰</div>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-3">
              {t('dashboard:header.title', { defaultValue: 'SmartSave Behavioral Dashboard' })}
            </h1>
            <p className="text-lg text-gray-700 max-w-3xl mx-auto">
              {t('dashboard:header.subtitle', {
                defaultValue: 'Leverage behavioral psychology to build better saving habits. Our platform uses proven techniques like loss aversion, social proof, and gamification to help you achieve your financial goals.',
              })}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Tab Navigation */}
      <div className="border-b border-gray-HTTP_OK">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-primary-trust-blue text-primary-trust-blue'
                  : 'border-transparent text-gray-HTTP_INTERNAL_SERVER_ERROR hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </div>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          {renderTabContent()}
        </motion.div>
      </AnimatePresence>

      {/* Achievement Notification */}
      <AnimatePresence>
        {recentAchievement && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 50 }}
            className="fixed bottom-6 right-6 z-50"
          >
            <Card className="bg-gradient-to-r from-yellow-HTTP_BAD_REQUEST to-orange-HTTP_INTERNAL_SERVER_ERROR text-white shadow-2xl border-0">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="text-3xl">{recentAchievement.icon}</div>
                  <div>
                    <div className="font-bold text-lg">🎉 Achievement Unlocked!</div>
                    <div className="text-sm opacity-90">{recentAchievement.name}</div>
                    <div className="text-xs opacity-75">+{recentAchievement.points} points</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Behavioral Psychology Tips */}
      {showAllFeatures && (
        <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-HTTP_OK">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl mb-2">🎯</div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  {t('dashboard:psychology.lossAversion.title', { defaultValue: 'Loss Aversion' })}
                </h3>
                <p className="text-sm text-gray-600">
                  {t('dashboard:psychology.lossAversion.description', {
                    defaultValue: 'We reframe goals to emphasize avoiding negative outcomes, which is 2-3x more motivating than gaining benefits.',
                  })}
                </p>
              </div>

              <div className="text-center">
                <div className="text-3xl mb-2">👥</div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  {t('dashboard:psychology.socialProof.title', { defaultValue: 'Social Proof' })}
                </h3>
                <p className="text-sm text-gray-600">
                  {t('dashboard:psychology.socialProof.description', {
                    defaultValue: 'See how you compare to peers and join a community of successful savers.',
                  })}
                </p>
              </div>

              <div className="text-center">
                <div className="text-3xl mb-2">🏆</div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  {t('dashboard:psychology.gamification.title', { defaultValue: 'Gamification' })}
                </h3>
                <p className="text-sm text-gray-600">
                  {t('dashboard:psychology.gamification.description', {
                    defaultValue: 'Earn points, badges, and rewards to make saving fun and engaging.',
                  })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Helper function to format currency (should be imported from useCurrency hook)
const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
