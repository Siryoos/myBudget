'use client';

import {
  ArrowUpIcon,
  ArrowDownIcon,
  ArrowTrendingUpIcon,
  BanknotesIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { useState, useEffect } from 'react';

import { Card, CardContent, CardError } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Skeleton } from '@/components/ui/Skeleton';
import { useDashboard } from '@/hooks/use-api';
import type { ApiResponse } from '@/types';
import { useTranslation } from '@/lib/useTranslation';
import { formatCurrency, calculateProgress, formatPercentage } from '@/lib/utils';
import { useI18n } from '@/lib/i18n-provider';


interface SavingsOverviewProps {
  showTotalSavings?: boolean
  showMonthlyProgress?: boolean
  showGoalProgress?: boolean
  animateOnLoad?: boolean
}

/**
 * Dashboard card showing savings metrics and progress (total, monthly, and annual).
 *
 * Renders a summary header with growth rate and an optional large total savings value, followed by
 * optional sections for this month's progress and the annual savings goal. Data is sourced from
 * the `useDashboard` hook; the component shows skeleton placeholders while loading and a simple
 * error message if data fails to load. Animations for values and progress bars are controlled by
 * `animateOnLoad`.
 *
 * @param showTotalSavings - When true (default), displays the large total savings value and monthly change indicator.
 * @param showMonthlyProgress - When true (default), displays the monthly progress section including a progress bar and estimates.
 * @param showGoalProgress - When true (default), displays the annual goal progress section with saved/remaining/monthly-need summaries.
 * @param animateOnLoad - When true (default), animates numeric values and progress bars after the initial load completes.
 * @returns A React element representing the SavingsOverview card.
 */
export function SavingsOverview({
  showTotalSavings = true,
  showMonthlyProgress = true,
  showGoalProgress = true,
  animateOnLoad = true,
}: SavingsOverviewProps) {
  const { t } = useTranslation('dashboard');
  const { locale } = useI18n();
  const [isAnimated, setIsAnimated] = useState(!animateOnLoad);
  const { data: dashboardResponse, loading, error } = useDashboard();
  const dashboardData = (dashboardResponse as any)?.success ? (dashboardResponse as any).data : (dashboardResponse as any) || {};

  // Calculate savings data from dashboard
  const savingsData = {
    totalSavings: dashboardData?.totalSavings || 0,
    monthlyGoal: dashboardData?.monthlyBudget || 1000,
    monthlySaved: dashboardData?.currentMonthSavings || 0,
    previousMonth: dashboardData?.previousMonthSavings || 0,
    annualGoal: dashboardData?.annualSavingsGoal || 15000,
    growthRate: dashboardData?.savingsGrowthRate || 0,
  };

  const monthlyProgress = calculateProgress(savingsData.monthlySaved, savingsData.monthlyGoal);
  const annualProgress = calculateProgress(savingsData.totalSavings, savingsData.annualGoal);
  const monthlyChange = savingsData.monthlySaved - savingsData.previousMonth;
  const isPositiveChange = monthlyChange >= 0;

  useEffect(() => {
    if (animateOnLoad && !loading) {
      const timer = setTimeout(() => setIsAnimated(true), 100);
      return () => clearTimeout(timer);
    }
  }, [animateOnLoad, loading]);

  if (loading) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="bg-gradient-to-br from-secondary-growth-green to-secondary-growth-green-light p-6 text-white">
            <Skeleton className="h-8 w-48 mb-4 bg-white/20" />
            <Skeleton className="h-10 w-32 mb-2 bg-white/20" />
            <Skeleton className="h-4 w-40 bg-white/20" />
          </div>
          <div className="p-6 space-y-6">
            <div>
              <Skeleton className="h-6 w-32 mb-3" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-3 w-full" />
            </div>
            <div>
              <Skeleton className="h-6 w-40 mb-3" />
              <Skeleton className="h-4 w-full mb-2" />
              <div className="grid grid-cols-3 gap-4">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <CardError 
        message={t('savingsOverview.errorLoading', { defaultValue: 'Unable to load savings data' })}
        onRetry={() => window.location.reload()}
        className="overflow-hidden"
      />
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="bg-gradient-to-br from-secondary-growth-green to-secondary-growth-green-light p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <div className="bg-white/20 rounded-lg p-2 mr-3">
                <BanknotesIcon className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">
                  {t('savingsOverview.totalSavings', { defaultValue: 'Total Savings' })}
                </h3>
                <p className="text-secondary-growth-green-light text-sm">
                  {t('savingsOverview.growingAnnually', {
                    rate: formatPercentage(savingsData.growthRate),
                    defaultValue: `Growing at ${formatPercentage(savingsData.growthRate)} annually`,
                  })}
                </p>
              </div>
            </div>
            <ArrowTrendingUpIcon className="h-8 w-8 text-secondary-growth-green-light" />
          </div>

          {showTotalSavings && (
            <div className="mb-6">
              <div
                className={`text-3xl font-bold transition-all duration-1000 ${
                  isAnimated ? 'opacity-100 transform-none' : 'opacity-0 transform translate-y-4'
                }`}
              >
                {formatCurrency(savingsData.totalSavings, undefined, locale)}
              </div>
              <div className="flex items-center mt-2">
                <div className={`flex items-center text-sm ${
                  isPositiveChange ? 'text-white' : 'text-secondary-growth-green-light'
                }`}>
                  {isPositiveChange ? (
                    <ArrowUpIcon className="h-4 w-4 mr-1" />
                  ) : (
                    <ArrowDownIcon className="h-4 w-4 mr-1" />
                  )}
                  <span>
                    {t('savingsOverview.fromLastMonth', {
                      amount: formatCurrency(Math.abs(monthlyChange), undefined, locale),
                      defaultValue: `${formatCurrency(Math.abs(monthlyChange), undefined, locale)} from last month`,
                    })}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 space-y-6">
          {showMonthlyProgress && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <CalendarIcon className="h-5 w-5 text-neutral-gray mr-2" />
                  <h4 className="font-semibold text-neutral-dark-gray">
                    {t('savingsOverview.thisMonthsGoal', { defaultValue: 'This Month\'s Goal' })}
                  </h4>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-neutral-dark-gray">
                    {formatCurrency(savingsData.monthlySaved, undefined, locale)} / {formatCurrency(savingsData.monthlyGoal, undefined, locale)}
                  </div>
                  <div className="text-sm text-neutral-gray">
                    {t('savingsOverview.remaining', {
                      amount: formatCurrency(monthlyProgress.remaining, undefined, locale),
                      defaultValue: `${formatCurrency(monthlyProgress.remaining, undefined, locale)} remaining`,
                    })}
                  </div>
                </div>
              </div>

              <ProgressBar
                value={savingsData.monthlySaved}
                max={savingsData.monthlyGoal}
                color="secondary"
                animated={isAnimated}
                className="mb-2"
              />

              <div className="flex justify-between text-sm text-neutral-gray">
                <span>{formatPercentage(monthlyProgress.percentage)} {t('savingsOverview.complete', { defaultValue: 'complete' })}</span>
                <span>{Math.ceil((30 * monthlyProgress.remaining) / savingsData.monthlyGoal)} {t('savingsOverview.daysAtCurrentRate', { defaultValue: 'days at current rate' })}</span>
              </div>
            </div>
          )}

          {showGoalProgress && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-neutral-dark-gray">
                  {t('savingsOverview.annualSavingsGoal', { defaultValue: 'Annual Savings Goal' })}
                </h4>
                <div className="text-right">
                  <div className="font-semibold text-neutral-dark-gray">
                    {formatPercentage(annualProgress.percentage)}
                  </div>
                  <div className="text-sm text-neutral-gray">
                    {t('savingsOverview.of', { defaultValue: 'of' })} {formatCurrency(savingsData.annualGoal, undefined, locale)}
                  </div>
                </div>
              </div>

              <ProgressBar
                value={savingsData.totalSavings}
                max={savingsData.annualGoal}
                color="primary"
                animated={isAnimated}
              />

              <div className="mt-3 grid grid-cols-3 gap-4 text-center">
                <div className="bg-neutral-light-gray rounded-lg p-3">
                  <div className="text-sm font-medium text-neutral-dark-gray">
                    {t('savingsOverview.saved', { defaultValue: 'Saved' })}
                  </div>
                  <div className="text-lg font-bold text-secondary-growth-green">
                    {formatCurrency(savingsData.totalSavings, undefined, locale)}
                  </div>
                </div>
                <div className="bg-neutral-light-gray rounded-lg p-3">
                  <div className="text-sm font-medium text-neutral-dark-gray">
                    {t('savingsOverview.remaining', { defaultValue: 'Remaining' })}
                  </div>
                  <div className="text-lg font-bold text-accent-action-orange">
                    {formatCurrency(annualProgress.remaining, undefined, locale)}
                  </div>
                </div>
                <div className="bg-neutral-light-gray rounded-lg p-3">
                  <div className="text-sm font-medium text-neutral-dark-gray">
                    {t('savingsOverview.monthlyNeed', { defaultValue: 'Monthly Need' })}
                  </div>
                  <div className="text-lg font-bold text-primary-trust-blue">
                    {formatCurrency(annualProgress.remaining / 12, undefined, locale)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
