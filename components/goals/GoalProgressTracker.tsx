'use client';

import {
  ChartBarIcon,
  FireIcon,
  BanknotesIcon,
  CheckCircleIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  PlusIcon,
  MinusIcon,
  PhotoIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useCurrency } from '@/lib/useCurrency';
import { useTranslation } from '@/lib/useTranslation';
import { formatDate, calculateProgress } from '@/lib/utils';
import type { SavingsGoal, FutureProjection } from '@/types';

interface GoalProgressTrackerProps {
  goals?: SavingsGoal[]
  visualStyles?: ('progressBar' | 'thermometer' | 'jar')[]
  showTimeRemaining?: boolean
  showProjectedCompletion?: boolean
  celebrationAnimations?: boolean
  showFutureProjections?: boolean
}

export function GoalProgressTracker({
  goals = [],
  visualStyles = ['progressBar', 'thermometer', 'jar'],
  showTimeRemaining = true,
  showProjectedCompletion = true,
  celebrationAnimations = true,
  showFutureProjections = true,
}: GoalProgressTrackerProps) {
  const { t, isReady } = useTranslation(['goals', 'common']);
  const { formatCurrency } = useCurrency();
  const [selectedVisual, setSelectedVisual] = useState<'progressBar' | 'thermometer' | 'jar'>('progressBar');
  const [showCompleted, setShowCompleted] = useState(false);
  const [showProjections, setShowProjections] = useState(false);
  const [celebrationTrigger, setCelebrationTrigger] = useState<string | null>(null);

  // Use goals passed as prop, with fallback to empty array

  // Future projections data
  const futureProjections: FutureProjection[] = goals.map(goal => ({
    goalId: goal.id,
    currentSavings: goal.currentAmount,
    projectedValue: {
      oneYear: goal.currentAmount * Math.pow(1.05, 1), // 5% annual return
      fiveYears: goal.currentAmount * Math.pow(1.05, 5),
      tenYears: goal.currentAmount * Math.pow(1.05, 10),
      twentyYears: goal.currentAmount * Math.pow(1.05, 20),
    },
    interestRate: 0.05,
    inflationRate: 0.02,
    lastCalculated: new Date(),
  }));

  // Enhanced progress calculation with acceleration effect
  const calculateEnhancedProgress = (goal: SavingsGoal) => {
    const progress = (goal.currentAmount / goal.targetAmount) * 100;
    // Add acceleration effect as progress approaches 100%
    if (progress > 80) {
      return progress + (progress - 80) * 0.2; // 20% boost in final stretch
    }
    return progress;
  };

  // Trigger celebration animation when milestone is reached
  useEffect(() => {
    goals.forEach(goal => {
      goal.milestones?.forEach(milestone => {
        if (goal.currentAmount >= milestone.amount && !milestone.isCompleted) {
          setCelebrationTrigger(`${goal.id}-${milestone.id}`);
          setTimeout(() => setCelebrationTrigger(null), 3000);
        }
      });
    });
  }, [goals]);

  const renderProgressVisual = (goal: SavingsGoal, progress: number) => {
    const enhancedProgress = calculateEnhancedProgress(goal);

    switch (selectedVisual) {
      case 'thermometer':
        return (
          <motion.div className="relative w-8 h-32 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              className="absolute bottom-0 w-full bg-gradient-to-t from-red-500 via-yellow-500 to-green-500"
              initial={{ height: 0 }}
              animate={{ height: `${enhancedProgress}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
            {/* Bubbles effect */}
            {enhancedProgress > 50 && (
              <motion.div
                className="absolute top-2 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-white rounded-full opacity-70"
                animate={{ y: [-2, 2, -2] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            )}
          </motion.div>
        );

      case 'jar':
        return (
          <motion.div className="relative w-16 h-20 bg-yellow-100 border-2 border-yellow-300 rounded-lg overflow-hidden">
            {/* Jar outline */}
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-8 h-2 bg-yellow-300 rounded-t-full" />

            {/* Coins filling the jar */}
            <motion.div
              className="absolute bottom-0 w-full bg-gradient-to-t from-yellow-400 to-yellow-600"
              initial={{ height: 0 }}
              animate={{ height: `${enhancedProgress}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />

            {/* Coin dropping effect */}
            {enhancedProgress > 0 && (
              <motion.div
                className="absolute top-0 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-yellow-500 rounded-full"
                animate={{ y: [0, 20], opacity: [1, 0] }}
                transition={{ duration: 0.5, repeat: 3, repeatDelay: 1 }}
              />
            )}
          </motion.div>
        );

      default:
        return (
          <div className="w-full">
            <ProgressBar
              value={enhancedProgress}
              max={100}
              className="h-3"
            />
          </div>
        );
    }
  };

  const renderFutureProjection = (goal: SavingsGoal) => {
    const projection = futureProjections.find(p => p.goalId === goal.id);
    if (!projection) {return null;}

    const chartData = [
      { year: 'Now', value: projection.currentSavings },
      { year: '1 Year', value: Math.round(projection.projectedValue.oneYear) },
      { year: '5 Years', value: Math.round(projection.projectedValue.fiveYears) },
      { year: '10 Years', value: Math.round(projection.projectedValue.tenYears) },
      { year: '20 Years', value: Math.round(projection.projectedValue.twentyYears) },
    ];

    return (
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg"
      >
        <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
          <SparklesIcon className="w-5 h-5 text-purple-600 mr-2" />
          {t('goals:projections.title', { defaultValue: 'Future Self Projection' })}
        </h4>
        <p className="text-sm text-gray-600 mb-4">
          {t('goals:projections.description', { defaultValue: 'See how your savings could grow over time with compound interest' })}
        </p>

        <div className="h-48 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" />
              <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
              <Tooltip
                formatter={(value: number) => [`$${value.toLocaleString()}`, 'Projected Value']}
                labelFormatter={(label) => `${label}`}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="text-center p-3 bg-white rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(projection.projectedValue.fiveYears)}
            </div>
            <div className="text-gray-600">5 Years</div>
          </div>
          <div className="text-center p-3 bg-white rounded-lg">
            <div className="text-2xl font-bold text-purple-600">
              {formatCurrency(projection.projectedValue.tenYears)}
            </div>
            <div className="text-gray-600">10 Years</div>
          </div>
        </div>
      </motion.div>
    );
  };

  const renderGoalCard = (goal: SavingsGoal) => {
    const progress = (goal.currentAmount / goal.targetAmount) * 100;
    const isCompleted = progress >= 100;
    const timeRemaining = (goal.targetDate instanceof Date ? goal.targetDate : new Date(goal.targetDate)).getTime() - Date.now();
    const monthsRemaining = Math.ceil(timeRemaining / (30 * 24 * 60 * 60 * 1000));

    return (
      <motion.div
        key={goal.id}
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="relative"
      >
        <Card className={`h-full transition-all duration-300 ${isCompleted ? 'bg-green-50 border-green-200' : ''}`}>
          <CardContent className="p-6">
            {/* Goal Header with Photo */}
            <div className="flex items-start space-x-4 mb-4">
              {goal.photoUrl && (
                <Image
                  src={goal.photoUrl}
                  alt={goal.name}
                  width={64}
                  height={64}
                  className="w-16 h-16 object-cover rounded-lg"
                />
              )}
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">{goal.name}</h3>
                  <div className="flex items-center space-x-2">
                    {goal.framingType === 'loss-avoidance' && (
                      <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
                    )}
                    {goal.framingType === 'achievement' && (
                      <SparklesIcon className="w-5 h-5 text-green-600" />
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-2">{goal.description}</p>

                {/* Framing Type Display */}
                <div className="text-xs">
                  {goal.framingType === 'loss-avoidance' && goal.lossAvoidanceDescription && (
                    <span className="inline-block bg-red-100 text-red-800 px-2 py-1 rounded-full">
                      {goal.lossAvoidanceDescription}
                    </span>
                  )}
                  {goal.framingType === 'achievement' && goal.achievementDescription && (
                    <span className="inline-block bg-green-100 text-green-800 px-2 py-1 rounded-full">
                      {goal.achievementDescription}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Progress Section */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  {t('goals:progress.current', { defaultValue: 'Current' })}: {formatCurrency(goal.currentAmount)}
                </span>
                <span className="text-sm font-medium text-gray-700">
                  {t('goals:progress.target', { defaultValue: 'Target' })}: {formatCurrency(goal.targetAmount)}
                </span>
              </div>

              <div className="flex items-center space-x-4">
                {renderProgressVisual(goal, progress)}
                <div className="flex-1">
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900">
                      {Math.round(progress)}%
                    </div>
                    <div className="text-sm text-gray-500">
                      {isCompleted
                        ? t('goals:progress.completed', { defaultValue: 'Completed!' })
                        : `${formatCurrency(goal.targetAmount - goal.currentAmount)} ${t('goals:progress.remaining', { defaultValue: 'remaining' })}`
                      }
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Time and Projections */}
            {showTimeRemaining && !isCompleted && (
              <div className="flex items-center justify-between mb-4 text-sm text-gray-600">
                <div className="flex items-center space-x-1">
                  <CalendarIcon className="w-4 h-4" />
                  <span>
                    {monthsRemaining > 0
                      ? t('goals:time.monthsRemaining', { defaultValue: '{{months}} months remaining', months: monthsRemaining })
                      : t('goals:time.overdue', { defaultValue: 'Overdue' })
                    }
                  </span>
                </div>

                {showFutureProjections && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowProjections(!showProjections)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    {showProjections
                      ? t('goals:projections.hide', { defaultValue: 'Hide Projections' })
                      : t('goals:projections.show', { defaultValue: 'Show Future Value' })
                    }
                  </Button>
                )}
              </div>
            )}

            {/* Future Projections */}
            {showProjections && showFutureProjections && renderFutureProjection(goal)}

            {/* Milestones */}
            {goal.milestones && goal.milestones.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  {t('goals:milestones.title', { defaultValue: 'Milestones' })}
                </h4>
                <div className="space-y-2">
                  {goal.milestones.map((milestone) => {
                    const isMilestoneCompleted = goal.currentAmount >= milestone.amount;
                    return (
                      <motion.div
                        key={milestone.id}
                        className={`flex items-center justify-between p-2 rounded-lg text-sm ${
                          isMilestoneCompleted
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                      >
                        <span>{milestone.description}</span>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">
                            {formatCurrency(milestone.amount)}
                          </span>
                          {isMilestoneCompleted && (
                            <CheckCircleIcon className="w-4 h-4 text-green-600" />
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Celebration Animation */}
            <AnimatePresence>
              {celebrationTrigger && celebrationTrigger.startsWith(goal.id) && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="absolute inset-0 flex items-center justify-center pointer-events-none"
                >
                  <div className="text-6xl">🎉</div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  return (
    <>
      {!isReady ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-trust-blue mx-auto mb-4"></div>
              <p className="text-neutral-gray">{t('common:status.loading', { defaultValue: 'Loading...' })}</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
      {/* Header with Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {t('goals:progress.title', { defaultValue: 'Goal Progress Tracker' })}
          </h2>
          <p className="text-gray-600">
            {t('goals:progress.subtitle', { defaultValue: 'Track your savings goals and see your progress' })}
          </p>
        </div>

        <div className="flex items-center space-x-4">
          {/* Visual Style Selector */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">
              {t('goals:progress.visualStyle', { defaultValue: 'Style:' })}
            </span>
            <select
              value={selectedVisual}
              onChange={(e) => setSelectedVisual(e.target.value as 'progressBar' | 'thermometer' | 'jar')}
              className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary-trust-blue"
            >
              <option value="progressBar">{t('goals:progress.styles.progressBar', { defaultValue: 'Progress Bar' })}</option>
              <option value="thermometer">{t('goals:progress.styles.thermometer', { defaultValue: 'Thermometer' })}</option>
              <option value="jar">{t('goals:progress.styles.jar', { defaultValue: 'Jar' })}</option>
            </select>
          </div>

          {/* Show/Hide Completed Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCompleted(!showCompleted)}
          >
            {showCompleted
              ? t('goals:progress.hideCompleted', { defaultValue: 'Hide Completed' })
              : t('goals:progress.showCompleted', { defaultValue: 'Show Completed' })
            }
          </Button>
        </div>
      </div>

      {/* Goals Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AnimatePresence>
          {goals
            .filter(goal => showCompleted || !goal.isActive)
            .map(goal => renderGoalCard(goal))
          }
        </AnimatePresence>
      </div>

      {/* Empty State */}
      {goals.filter(goal => showCompleted || !goal.isActive).length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-12"
        >
          <div className="text-6xl mb-4">🎯</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {t('goals:progress.empty.title', { defaultValue: 'No goals yet' })}
          </h3>
          <p className="text-gray-600 mb-6">
            {t('goals:progress.empty.description', { defaultValue: 'Create your first savings goal to get started' })}
          </p>
        </motion.div>
        )}
      </div>
      )}
    </>
  );
}
