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
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/contexts/AppProvider';

interface WelcomeHeaderProps {
  showGreeting?: boolean
  showDate?: boolean
  showQuickActions?: boolean
}

/**
 * Renders the dashboard welcome header with a localized greeting, current date, notification insight, quick action buttons, and an achievement summary.
 *
 * The component determines a time-based greeting on mount (morning/afternoon/evening) to avoid hydration mismatches, uses the `common` translation namespace for all displayed strings (with defaults), and formats the date and currency according to the current i18n locale.
 *
 * @param showGreeting - When true, displays the greeting line with the user's name. Defaults to `true`.
 * @param showDate - When true, displays the current formatted date. Defaults to `true`.
 * @param showQuickActions - When true, shows the quick action buttons on the right. Defaults to `true`.
 * @returns A React element containing the styled welcome header.
 */
export function WelcomeHeader({
  showGreeting = true,
  showDate = true,
  showQuickActions = true,
}: WelcomeHeaderProps) {
  const { t, i18n, ready } = useTranslation('common');
  const [userName] = useState('Alex'); // This would come from user context
  const [greeting, setGreeting] = useState('morning'); // Default to morning
  const [today, setToday] = useState(new Date());
  const { toast } = useToast();
  const { user } = useAuth();

  // Set greeting and date on client side to avoid hydration mismatch
  useEffect(() => {
    const hour = new Date().getHours();
    const timeBasedGreeting = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
    setGreeting(timeBasedGreeting);
    setToday(new Date());
  }, []);


  const quickActions = [
    {
      label: t('dashboard:quickActions.addTransaction', { defaultValue: 'Add Transaction' }),
      icon: PlusIcon,
      action: () => toast({ title: t('dashboard:quickActions.addTransaction', { defaultValue: 'Add Transaction' }), description: t('dashboard:tip.addTransaction', { defaultValue: 'Opening add transaction flow...' }), variant: 'info', duration: 2000 }),
      variant: 'primary' as const,
    },
    {
      label: t('dashboard:quickActions.quickSave', { defaultValue: 'Quick Save' }),
      icon: BanknotesIcon,
      action: () => toast({ title: t('dashboard:quickActions.quickSave', { defaultValue: 'Quick Save' }), description: t('dashboard:tip.quickSave', { defaultValue: 'Opening quick save...' }), variant: 'info', duration: 2000 }),
      variant: 'secondary' as const,
    },
    {
      label: t('dashboard:quickActions.viewBudget', { defaultValue: 'View Budget' }),
      icon: ChartBarIcon,
      action: () => toast({ title: t('dashboard:quickActions.viewBudget', { defaultValue: 'View Budget' }), description: t('dashboard:tip.viewBudget', { defaultValue: 'Navigating to budget...' }), variant: 'info', duration: 2000 }),
      variant: 'outline' as const,
    },
  ];

  return (
    <div className="bg-gradient-to-r from-primary-trust-blue to-primary-trust-blue-light rounded-lg p-6 text-white animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1">
          {showGreeting && (
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">
              {t(`common:app.greeting.${greeting}`, { defaultValue: `Good ${greeting}` })}, {user?.name || userName}! 👋
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

        {/* Avatar */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center text-white font-semibold" aria-hidden="true">
            {(user?.name || userName).charAt(0).toUpperCase()}
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
                defaultValue: "You've saved $500 this month!",
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
