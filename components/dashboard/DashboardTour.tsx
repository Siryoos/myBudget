'use client';

import { useEffect, useState } from 'react';
import { OnboardingTour, TourStep, useOnboardingTour } from '@/components/ui/OnboardingTour';
import { useTranslation } from '@/lib/useTranslation';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/useToast';

export function DashboardTour() {
  const { t } = useTranslation('onboarding');
  const router = useRouter();
  const { toast } = useToast();
  const { shouldShowTour, completeTour } = useOnboardingTour('smartsave-dashboard-tour');
  const [startTour, setStartTour] = useState(false);

  // Delay tour start to ensure DOM is ready
  useEffect(() => {
    if (shouldShowTour) {
      const timer = setTimeout(() => {
        setStartTour(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [shouldShowTour]);

  const tourSteps: TourStep[] = [
    {
      target: '.welcome-header',
      title: 'Welcome to SmartSave!',
      content: 'This is your financial command center. Here you can see your personalized greeting, current date, and quick actions.',
      placement: 'bottom',
      spotlightPadding: 16,
    },
    {
      target: '[data-tour="savings-overview"]',
      title: 'Your Savings at a Glance',
      content: 'Track your total savings, monthly progress, and goal achievements all in one place. Watch your money grow with our visual progress indicators.',
      placement: 'right',
      actions: [
        {
          label: 'Set a Goal',
          action: () => router.push('/goals'),
          variant: 'primary',
        },
      ],
    },
    {
      target: '[data-tour="budget-summary"]',
      title: 'Budget Management',
      content: 'See how your spending aligns with your budget. Get alerts when you\'re approaching limits and visualize your spending patterns.',
      placement: 'left',
    },
    {
      target: '[data-tour="recent-transactions"]',
      title: 'Transaction History',
      content: 'Keep track of your recent transactions. Categorize, search, and analyze your spending habits to make better financial decisions.',
      placement: 'top',
    },
    {
      target: '[data-tour="quick-save"]',
      title: 'Quick Save Widget',
      content: 'Save money instantly with just one click! Choose from preset amounts or enter a custom amount. Every little bit counts!',
      placement: 'left',
      actions: [
        {
          label: 'Try Saving $10',
          action: () => {
            toast({
              title: 'Great job!',
              description: 'You just saved $10. Keep up the good work!',
              variant: 'success',
            });
          },
          variant: 'primary',
        },
      ],
    },
    {
      target: '[data-tour="insights-panel"]',
      title: 'Personalized Insights',
      content: 'Get AI-powered financial tips, compare your progress with peers, and receive personalized recommendations to optimize your savings.',
      placement: 'left',
    },
    {
      target: '[aria-label="Main navigation"]',
      title: 'Navigation Menu',
      content: 'Access all features of SmartSave from here. Explore budgets, goals, transactions, and educational resources.',
      placement: 'right',
      spotlightPadding: 20,
    },
    {
      target: '[data-tour="onboarding-checklist"]',
      title: 'Complete Your Setup',
      content: 'Follow this checklist to get the most out of SmartSave. Complete each step to unlock the full potential of your financial journey!',
      placement: 'bottom',
      skipable: false,
    },
  ];

  const handleComplete = () => {
    completeTour();
    toast({
      title: t('tour.completed.title', { defaultValue: 'Tour Completed!' }),
      description: t('tour.completed.description', { 
        defaultValue: 'You\'re all set to start your financial journey with SmartSave.' 
      }),
      variant: 'success',
      duration: 5000,
    });
  };

  const handleSkip = () => {
    completeTour();
    toast({
      title: t('tour.skipped.title', { defaultValue: 'Tour Skipped' }),
      description: t('tour.skipped.description', { 
        defaultValue: 'You can restart the tour anytime from the help menu.' 
      }),
      variant: 'info',
    });
  };

  return (
    <OnboardingTour
      steps={tourSteps}
      onComplete={handleComplete}
      onSkip={handleSkip}
      startTour={startTour}
      showProgress={true}
      allowKeyboardNavigation={true}
    />
  );
}

// Button to restart the tour
export function RestartTourButton() {
  const { t } = useTranslation('onboarding');
  const { resetTour } = useOnboardingTour('smartsave-dashboard-tour');
  
  const handleRestart = () => {
    resetTour();
    window.location.reload(); // Reload to trigger the tour
  };

  return (
    <button
      onClick={handleRestart}
      className="text-sm text-primary-trust-blue hover:text-primary-trust-blue/80 underline"
    >
      {t('tour.restart', { defaultValue: 'Restart tour' })}
    </button>
  );
}
