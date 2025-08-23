'use client';

import {
  PlusIcon,
  BanknotesIcon,
  ChartBarIcon,
  BellIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline';
import { useState, useEffect } from 'react';

import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/lib/i18n';
import { useTranslation } from '@/lib/useTranslation';
import { formatDate } from '@/lib/utils';

interface WelcomeHeaderProps {
  showGreeting?: boolean
  showDate?: boolean
  showQuickActions?: boolean
}

export function WelcomeHeader({
  showGreeting = true,
  showDate = true,
  showQuickActions = true,
}: WelcomeHeaderProps) {
  const { t, i18n, isReady } = useTranslation(['common', 'dashboard']);
  const [userName] = useState('Alex'); // This would come from user context
  const [greeting, setGreeting] = useState('morning'); // Default to morning
  const [today, setToday] = useState(new Date());

  // Set greeting and date on client side to avoid hydration mismatch
  useEffect(() => {
    const hour = new Date().getHours();
    const timeBasedGreeting = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
    setGreeting(timeBasedGreeting);
    setToday(new Date());
  }, []);

  // Debug logging
  useEffect(() => {
    console.log('WelcomeHeader i18n state:', { isReady, language: i18n.language, isInitialized: i18n.isInitialized });
  }, [isReady, i18n.language, i18n.isInitialized]);

  const quickActions = [
    {
      label: t('dashboard:quickActions.addTransaction', { defaultValue: 'Add Transaction' }),
      icon: PlusIcon,
      action: () => console.log('Add transaction'),
      variant: 'primary' as const,
    },
    {
      label: t('dashboard:quickActions.quickSave', { defaultValue: 'Quick Save' }),
      icon: BanknotesIcon,
      action: () => console.log('Quick save'),
      variant: 'secondary' as const,
    },
    {
      label: t('dashboard:quickActions.viewBudget', { defaultValue: 'View Budget' }),
      icon: ChartBarIcon,
      action: () => console.log('View budget'),
      variant: 'outline' as const,
    },
  ];

  return (
    <div className="bg-gradient-to-r from-primary-trust-blue to-primary-trust-blue-light rounded-lg p-6 text-white animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1">
          {showGreeting && (
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">
              {t(`common:app.greeting.${greeting}`, { defaultValue: `Good ${greeting}` })}, {userName}! 👋
            </h1>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-6 space-y-2 sm:space-y-0">
            {showDate && (
              <div className="flex items-center text-primary-trust-blue-light">
                <CalendarIcon className="h-5 w-5 mr-2" />
                <span className="text-sm">
                  {formatDate(today, 'EEEE, MMMM dd, yyyy')}
                </span>
              </div>
            )}

            <div className="flex items-center text-primary-trust-blue-light">
              <BellIcon className="h-5 w-5 mr-2" />
              <span className="text-sm">
                {t('dashboard:insights.newAvailable', { count: 3, defaultValue: '3 new insights available' })}
              </span>
            </div>
          </div>
        </div>

        {showQuickActions && (
          <div className="mt-4 sm:mt-0 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
            {quickActions.map((action, index) => {
              const IconComponent = action.icon;
              return (
                <Button
                  key={index}
                  variant={action.variant}
                  size="sm"
                  onClick={action.action}
                  className="flex items-center justify-center sm:justify-start whitespace-nowrap"
                >
                  <IconComponent className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">{action.label}</span>
                  <span className="sm:hidden">{action.label.split(' ')[0]}</span>
                </Button>
              );
            })}
          </div>
        )}
      </div>

      {/* Achievement notification */}
      <div className="mt-4 bg-white/10 rounded-md p-3 animate-slide-up">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="h-8 w-8 bg-accent-success-emerald rounded-full flex items-center justify-center">
              <span className="text-sm">🎉</span>
            </div>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium">
              {t('dashboard:achievements.monthlySaving', {
                amount: formatCurrency(500, i18n.language),
                defaultValue: 'You\'ve saved $500 this month!',
              })}
            </p>
            <p className="text-xs text-primary-trust-blue-light mt-1">
              {t('dashboard:achievements.goalProgress', {
                percentage: 83,
                defaultValue: 'You\'re 83% towards your goal!',
              })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
