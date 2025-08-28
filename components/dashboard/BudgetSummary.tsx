'use client';

import {
  ExclamationTriangleIcon,
  ChartPieIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Skeleton } from '@/components/ui/Skeleton';
import { useBudgets } from '@/contexts/AppProvider';
import { useTranslation } from '@/lib/useTranslation';
import { formatCurrency, formatPercentage, getBudgetCategoryColor } from '@/lib/utils';
import type { BudgetCategory } from '@/types';

interface BudgetSummaryProps {
  showCategories?: boolean
  showSpendingAlerts?: boolean
  visualType?: 'donutChart' | 'progressBars' | 'list'
}

/**
 * Renders a budget overview card showing totals, category breakdown, alerts, and an optional visual (donut) representation.
 *
 * Displays total income, total expenses, and remaining balance calculated from the active budget's categories. Optionally
 * shows category progress bars, spending alerts for categories over their allocation, and a donut chart visualization.
 *
 * @param showCategories - If true, renders the category breakdown and progress bars. Defaults to `true`.
 * @param showSpendingAlerts - If true, renders alerts for categories where spent > allocated. Defaults to `true`.
 * @param visualType - Determines the visual representation shown; currently supports `'donutChart'` (default), `'progressBars'`, or `'list'`.
 * @returns A React element containing the budget summary card.
 */
export function BudgetSummary({
  showCategories = true,
  showSpendingAlerts = true,
  visualType = 'donutChart',
}: BudgetSummaryProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month'>('month');
  const { t } = useTranslation('dashboard');
  const { budgets, loading, error } = useBudgets();

  // Get the active budget (first one for now, or the current period budget)
  const activeBudget = budgets?.[0];
  const budgetData = activeBudget?.categories || [];

  const totalAllocated = budgetData.reduce((sum, cat) => sum + cat.allocated, 0);
  const totalSpent = budgetData.reduce((sum, cat) => sum + cat.spent, 0);
  const totalRemaining = totalAllocated - totalSpent;
  const overBudgetCategories = budgetData.filter(cat => cat.spent > cat.allocated);

  const DonutChart = () => {
    const centerX = 80;
    const centerY = 80;
    const radius = 60;
    let cumulativePercentage = 0;

    const createArc = (percentage: number, color: string, offset: number) => {
      const angle = (percentage / 100) * 360;
      const startAngle = (offset / 100) * 360 - 90;
      const endAngle = startAngle + angle;

      const x1 = centerX + radius * Math.cos((startAngle * Math.PI) / 180);
      const y1 = centerY + radius * Math.sin((startAngle * Math.PI) / 180);
      const x2 = centerX + radius * Math.cos((endAngle * Math.PI) / 180);
      const y2 = centerY + radius * Math.sin((endAngle * Math.PI) / 180);

      const largeArcFlag = angle > 180 ? 1 : 0;

      return `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
    };

    return (
      <div className="flex items-center justify-center">
        <svg width="160" height="160" className="transform -rotate-90">
          {budgetData.map((category, index) => {
            const percentage = (category.spent / totalSpent) * 100;
            const path = createArc(percentage, category.color, cumulativePercentage);
            cumulativePercentage += percentage;

            return (
              <path
                key={category.id}
                d={path}
                fill={category.color}
                className="hover:opacity-80 transition-opacity cursor-pointer"
                aria-label={`${category.name}: ${formatPercentage(percentage)}`}
              />
            );
          })}
          {/* Center circle */}
          <circle
            cx={centerX}
            cy={centerY}
            r={30}
            fill="white"
            className="drop-shadow-sm"
          />
          <text
            x={centerX}
            y={centerY - 5}
            textAnchor="middle"
            className="text-xs font-semibold fill-neutral-dark-gray"
            transform={`rotate(90 ${centerX} ${centerY})`}
          >
            {t('budget:expenses.spent', { defaultValue: 'Spent' })}
          </text>
          <text
            x={centerX}
            y={centerY + 5}
            textAnchor="middle"
            className="text-xs font-medium fill-neutral-gray"
            transform={`rotate(90 ${centerX} ${centerY})`}
          >
            {formatPercentage((totalSpent / totalAllocated) * 100)}
          </text>
        </svg>
      </div>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Skeleton className="h-10 w-10 rounded-lg mr-3" />
              <div>
                <Skeleton className="h-6 w-32 mb-2" />
                <Skeleton className="h-4 w-48" />
              </div>
            </div>
            <Skeleton className="h-9 w-32" />
          </div>
          <Skeleton className="h-10 w-full mt-4" />
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <div className="flex justify-center mb-6">
            <Skeleton className="h-40 w-40 rounded-full" />
          </div>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-6 w-full mx-4" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !activeBudget) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-neutral-gray">
            <ChartPieIcon className="h-12 w-12 mx-auto mb-4 text-neutral-gray/50" />
            <p className="mb-2">{t('budget:noActiveBudget', { defaultValue: 'No active budget found' })}</p>
            <p className="text-sm mb-4">{error?.message || t('budget:createBudgetPrompt', { defaultValue: 'Create a budget to start tracking your expenses' })}</p>
            <Button>
              {t('budget:createBudget', { defaultValue: 'Create Budget' })}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="bg-primary-trust-blue/10 rounded-lg p-2 mr-3">
              <ChartPieIcon className="h-6 w-6 text-primary-trust-blue" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-neutral-dark-gray">
                {t('budget:overview.title', { defaultValue: 'Budget Overview' })}
              </h3>
              <p className="text-sm text-neutral-gray">
                {t('budget:overview.description', { defaultValue: 'Get a comprehensive view of your financial plan' })}
              </p>
            </div>
          </div>

          <Button variant="outline" size="sm">
            {t('dashboard:quickActions.viewBudget', { defaultValue: 'View Full Budget' })}
            <ArrowRightIcon className="h-4 w-4 ml-1" />
          </Button>
        </div>

        {/* Period Selector */}
        <div className="flex space-x-1 bg-neutral-light-gray rounded-lg p-1 mt-4">
          <button
            onClick={() => setSelectedPeriod('week')}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
              selectedPeriod === 'week'
                ? 'bg-white text-primary-trust-blue shadow-sm'
                : 'text-neutral-gray hover:text-neutral-dark-gray'
            }`}
          >
            {t('common:time.week', { defaultValue: 'Week' })}
          </button>
          <button
            onClick={() => setSelectedPeriod('month')}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
              selectedPeriod === 'month'
                ? 'bg-white text-primary-trust-blue shadow-sm'
                : 'text-neutral-gray hover:text-neutral-dark-gray'
            }`}
          >
            {t('common:time.month', { defaultValue: 'Month' })}
          </button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Budget Summary */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="bg-neutral-light-gray/50 rounded-lg p-4">
            <div className="text-sm text-neutral-gray mb-1">
              {t('budget:overview.totalIncome', { defaultValue: 'Total Income' })}
            </div>
            <div className="text-xl font-bold text-secondary-growth-green">
              {formatCurrency(totalAllocated)}
            </div>
          </div>
          <div className="bg-neutral-light-gray/50 rounded-lg p-4">
            <div className="text-sm text-neutral-gray mb-1">
              {t('budget:overview.totalExpenses', { defaultValue: 'Total Expenses' })}
            </div>
            <div className="text-xl font-bold text-accent-action-orange">
              {formatCurrency(totalSpent)}
            </div>
          </div>
          <div className="bg-neutral-light-gray/50 rounded-lg p-4">
            <div className="text-sm text-neutral-gray mb-1">
              {t('budget:overview.remaining', { defaultValue: 'Remaining' })}
            </div>
            <div className={`text-xl font-bold ${
              totalRemaining >= 0 ? 'text-secondary-growth-green' : 'text-red-500'
            }`}>
              {formatCurrency(totalRemaining)}
            </div>
          </div>
        </div>

        {/* Spending Alerts */}
        {showSpendingAlerts && overBudgetCategories.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center mb-3">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mr-2" />
              <h4 className="font-medium text-red-800">
                {t('budget:alerts.title', { defaultValue: 'Budget Alerts' })}
              </h4>
            </div>
            <div className="space-y-2">
              {overBudgetCategories.map((category) => (
                <div key={category.id} className="flex items-center justify-between text-sm">
                  <span className="text-red-700">{category.name}</span>
                  <span className="font-medium text-red-600">
                    -{formatCurrency(category.spent - category.allocated)} {t('budget:alerts.overBudget', { defaultValue: 'over' })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Category Breakdown */}
        {showCategories && (
          <div>
            <h4 className="font-medium text-neutral-dark-gray mb-4">
              {t('budget:categories.title', { defaultValue: 'Category Breakdown' })}
            </h4>
            <div className="space-y-3">
              {budgetData.map((category) => (
                <div key={category.id} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-neutral-dark-gray">{category.name}</span>
                    <span className="text-neutral-gray">
                      {formatCurrency(category.spent)} {t('budget:overview.of', { defaultValue: 'of' })} {formatCurrency(category.allocated)}
                    </span>
                  </div>
                  <ProgressBar
                    value={category.spent}
                    max={category.allocated}
                    color={category.spent > category.allocated ? 'danger' : 'success'}
                    className="h-2"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Visual Representation */}
        {visualType === 'donutChart' && (
          <div className="text-center">
            <DonutChart />
            <div className="mt-4 text-center">
              <div className="text-2xl font-bold text-neutral-dark-gray">
                {formatCurrency(totalRemaining)}
              </div>
              <div className="text-sm text-neutral-gray">
                {t('budget:overview.remaining', { defaultValue: 'Remaining' })}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
