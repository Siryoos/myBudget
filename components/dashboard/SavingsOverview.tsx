'use client'

import { useState, useEffect } from 'react'
import { 
  ArrowUpIcon, 
  ArrowDownIcon, 
  ArrowTrendingUpIcon,
  BanknotesIcon,
  CalendarIcon
} from '@heroicons/react/24/outline'
import { Card, CardContent } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { formatCurrency, calculateProgress, formatPercentage } from '@/lib/utils'
import { useTranslation } from '@/lib/useTranslation'

interface SavingsOverviewProps {
  showTotalSavings?: boolean
  showMonthlyProgress?: boolean
  showGoalProgress?: boolean
  animateOnLoad?: boolean
}

export function SavingsOverview({
  showTotalSavings = true,
  showMonthlyProgress = true,
  showGoalProgress = true,
  animateOnLoad = true,
}: SavingsOverviewProps) {
  const { t } = useTranslation(['dashboard'])
  const [isAnimated, setIsAnimated] = useState(!animateOnLoad)

  // Mock data - would come from API/context
  const savingsData = {
    totalSavings: 12450,
    monthlyGoal: 1000,
    monthlySaved: 680,
    previousMonth: 850,
    annualGoal: 15000,
    growthRate: 8.5,
  }

  const monthlyProgress = calculateProgress(savingsData.monthlySaved, savingsData.monthlyGoal)
  const annualProgress = calculateProgress(savingsData.totalSavings, savingsData.annualGoal)
  const monthlyChange = savingsData.monthlySaved - savingsData.previousMonth
  const isPositiveChange = monthlyChange >= 0

  useEffect(() => {
    if (animateOnLoad) {
      const timer = setTimeout(() => setIsAnimated(true), 100)
      return () => clearTimeout(timer)
    }
  }, [animateOnLoad])

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
                  {t('dashboard:savingsOverview.totalSavings', { defaultValue: 'Total Savings' })}
                </h3>
                <p className="text-secondary-growth-green-light text-sm">
                  {t('dashboard:savingsOverview.growingAnnually', { 
                    rate: formatPercentage(savingsData.growthRate),
                    defaultValue: `Growing at ${formatPercentage(savingsData.growthRate)} annually`
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
                {formatCurrency(savingsData.totalSavings)}
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
                    {t('dashboard:savingsOverview.fromLastMonth', { 
                      amount: formatCurrency(Math.abs(monthlyChange)),
                      defaultValue: `${formatCurrency(Math.abs(monthlyChange))} from last month`
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
                    {t('dashboard:savingsOverview.thisMonthsGoal', { defaultValue: 'This Month\'s Goal' })}
                  </h4>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-neutral-dark-gray">
                    {formatCurrency(savingsData.monthlySaved)} / {formatCurrency(savingsData.monthlyGoal)}
                  </div>
                  <div className="text-sm text-neutral-gray">
                    {t('dashboard:savingsOverview.remaining', { 
                      amount: formatCurrency(monthlyProgress.remaining),
                      defaultValue: `${formatCurrency(monthlyProgress.remaining)} remaining`
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
                <span>{formatPercentage(monthlyProgress.percentage)} {t('dashboard:savingsOverview.complete', { defaultValue: 'complete' })}</span>
                <span>{Math.ceil((30 * monthlyProgress.remaining) / savingsData.monthlyGoal)} {t('dashboard:savingsOverview.daysAtCurrentRate', { defaultValue: 'days at current rate' })}</span>
              </div>
            </div>
          )}

          {showGoalProgress && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-neutral-dark-gray">
                  {t('dashboard:savingsOverview.annualSavingsGoal', { defaultValue: 'Annual Savings Goal' })}
                </h4>
                <div className="text-right">
                  <div className="font-semibold text-neutral-dark-gray">
                    {formatPercentage(annualProgress.percentage)}
                  </div>
                  <div className="text-sm text-neutral-gray">
                    {t('dashboard:savingsOverview.of', { defaultValue: 'of' })} {formatCurrency(savingsData.annualGoal)}
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
                    {t('dashboard:savingsOverview.saved', { defaultValue: 'Saved' })}
                  </div>
                  <div className="text-lg font-bold text-secondary-growth-green">
                    {formatCurrency(savingsData.totalSavings)}
                  </div>
                </div>
                <div className="bg-neutral-light-gray rounded-lg p-3">
                  <div className="text-sm font-medium text-neutral-dark-gray">
                    {t('dashboard:savingsOverview.remaining', { defaultValue: 'Remaining' })}
                  </div>
                  <div className="text-lg font-bold text-accent-action-orange">
                    {formatCurrency(annualProgress.remaining)}
                  </div>
                </div>
                <div className="bg-neutral-light-gray rounded-lg p-3">
                  <div className="text-sm font-medium text-neutral-dark-gray">
                    {t('dashboard:savingsOverview.monthlyNeed', { defaultValue: 'Monthly Need' })}
                  </div>
                  <div className="text-lg font-bold text-primary-trust-blue">
                    {formatCurrency(annualProgress.remaining / 12)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
