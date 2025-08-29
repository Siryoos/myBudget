'use client';

import dynamic from 'next/dynamic';
import { ComponentType } from 'react';
import { Skeleton } from '@/components/ui/Skeleton';
import { CardLoading } from '@/components/ui/Card';

// Loading fallback components
const DashboardLoading = () => (
  <div className="space-y-6">
    <Skeleton className="h-32 w-full" />
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <CardLoading />
        <CardLoading />
      </div>
      <div className="space-y-6">
        <CardLoading />
        <CardLoading />
      </div>
    </div>
  </div>
);

const TableLoading = () => (
  <div className="space-y-4">
    <div className="flex justify-between items-center">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-10 w-32" />
    </div>
    <div className="bg-white rounded-lg shadow-sm">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="p-4 border-b border-gray-100">
          <Skeleton className="h-6 w-full" />
        </div>
      ))}
    </div>
  </div>
);

const FormLoading = () => (
  <div className="space-y-6">
    <CardLoading />
    <CardLoading />
    <CardLoading />
  </div>
);

// Lazy loaded dashboard components
export const LazyBudgetSummary = dynamic(
  () => import('@/components/dashboard/BudgetSummary').then(mod => ({ default: mod.BudgetSummary })),
  { 
    loading: () => <CardLoading />,
    ssr: false 
  }
);

export const LazyInsightsPanel = dynamic(
  () => import('@/components/dashboard/InsightsPanel').then(mod => ({ default: mod.InsightsPanel })),
  { 
    loading: () => <CardLoading />,
    ssr: false 
  }
);

export const LazyRecentTransactions = dynamic(
  () => import('@/components/dashboard/RecentTransactions').then(mod => ({ default: mod.RecentTransactions })),
  { 
    loading: () => <CardLoading />,
    ssr: false 
  }
);

export const LazyOnboardingChecklist = dynamic(
  () => import('@/components/dashboard/OnboardingChecklist').then(mod => ({ default: mod.OnboardingChecklist })),
  { 
    loading: () => <CardLoading />,
    ssr: false 
  }
);

// Lazy loaded transaction components
export const LazyTransactionTable = dynamic(
  () => import('@/components/transactions/TransactionTable').then(mod => ({ default: mod.TransactionTable })),
  { 
    loading: () => <TableLoading />,
    ssr: false 
  }
);

export const LazyVirtualTransactionTable = dynamic(
  () => import('@/components/transactions/VirtualTransactionTable').then(mod => ({ default: mod.VirtualTransactionTable })),
  { 
    loading: () => <TableLoading />,
    ssr: false 
  }
);

export const LazySpendingAnalytics = dynamic(
  () => import('@/components/transactions/SpendingAnalytics').then(mod => ({ default: mod.SpendingAnalytics })),
  { 
    loading: () => <CardLoading />,
    ssr: false 
  }
);

// Lazy loaded goal components
export const LazyGoalWizard = dynamic(
  () => import('@/components/goals/GoalWizard').then(mod => ({ default: mod.GoalWizard })),
  { 
    loading: () => <CardLoading />,
    ssr: false 
  }
);

export const LazyGoalProgressTracker = dynamic(
  () => import('@/components/goals/GoalProgressTracker').then(mod => ({ default: mod.GoalProgressTracker })),
  { 
    loading: () => <CardLoading />,
    ssr: false 
  }
);

export const LazyAutomationSettings = dynamic(
  () => import('@/components/goals/AutomationSettings').then(mod => ({ default: mod.AutomationSettings })),
  { 
    loading: () => <CardLoading />,
    ssr: false 
  }
);

// Lazy loaded budget components
export const LazyBudgetAllocator = dynamic(
  () => import('@/components/budget/BudgetAllocator').then(mod => ({ default: mod.BudgetAllocator })),
  { 
    loading: () => <CardLoading />,
    ssr: false 
  }
);

export const LazyBudgetVisualization = dynamic(
  () => import('@/components/budget/BudgetVisualization').then(mod => ({ default: mod.BudgetVisualization })),
  { 
    loading: () => <CardLoading />,
    ssr: false 
  }
);

export const LazyIncomeManager = dynamic(
  () => import('@/components/budget/IncomeManager').then(mod => ({ default: mod.IncomeManager })),
  { 
    loading: () => <CardLoading />,
    ssr: false 
  }
);

// Lazy loaded settings components
export const LazyProfileManager = dynamic(
  () => import('@/components/settings/ProfileManager').then(mod => ({ default: mod.ProfileManager })),
  { 
    loading: () => <FormLoading />,
    ssr: false 
  }
);

export const LazyNotificationSettings = dynamic(
  () => import('@/components/settings/NotificationSettings').then(mod => ({ default: mod.NotificationSettings })),
  { 
    loading: () => <FormLoading />,
    ssr: false 
  }
);

export const LazySecurityPanel = dynamic(
  () => import('@/components/settings/SecurityPanel').then(mod => ({ default: mod.SecurityPanel })),
  { 
    loading: () => <FormLoading />,
    ssr: false 
  }
);

export const LazyRegionalizationSettings = dynamic(
  () => import('@/components/settings/RegionalizationSettings').then(mod => ({ default: mod.RegionalizationSettings })),
  { 
    loading: () => <FormLoading />,
    ssr: false 
  }
);

// Lazy loaded education components
export const LazyEducationHub = dynamic(
  () => import('@/components/education/EducationHub').then(mod => ({ default: mod.EducationHub })),
  { 
    loading: () => <DashboardLoading />,
    ssr: false 
  }
);

export const LazyTipsFeed = dynamic(
  () => import('@/components/education/TipsFeed').then(mod => ({ default: mod.TipsFeed })),
  { 
    loading: () => <CardLoading />,
    ssr: false 
  }
);

// Higher-order component for lazy loading with custom loading states
export function lazyLoadComponent<P extends object>(
  importFunc: () => Promise<{ default: ComponentType<P> }>,
  LoadingComponent: ComponentType = CardLoading
): ComponentType<P> {
  return dynamic(importFunc, {
    loading: () => <LoadingComponent />,
    ssr: false
  }) as ComponentType<P>;
}

// Utility to preload components
export const preloadComponent = (componentName: keyof typeof componentMap) => {
  const component = componentMap[componentName];
  if (component && 'preload' in component) {
    (component as any).preload();
  }
};

// Map of all lazy components for easy preloading
const componentMap = {
  BudgetSummary: LazyBudgetSummary,
  InsightsPanel: LazyInsightsPanel,
  RecentTransactions: LazyRecentTransactions,
  OnboardingChecklist: LazyOnboardingChecklist,
  TransactionTable: LazyTransactionTable,
  SpendingAnalytics: LazySpendingAnalytics,
  GoalWizard: LazyGoalWizard,
  GoalProgressTracker: LazyGoalProgressTracker,
  AutomationSettings: LazyAutomationSettings,
  BudgetAllocator: LazyBudgetAllocator,
  BudgetVisualization: LazyBudgetVisualization,
  IncomeManager: LazyIncomeManager,
  ProfileManager: LazyProfileManager,
  NotificationSettings: LazyNotificationSettings,
  SecurityPanel: LazySecurityPanel,
  RegionalizationSettings: LazyRegionalizationSettings,
  EducationHub: LazyEducationHub,
  TipsFeed: LazyTipsFeed,
};

// Preload critical components on idle
if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
  window.requestIdleCallback(() => {
    // Preload dashboard components that are likely to be needed
    preloadComponent('BudgetSummary');
    preloadComponent('InsightsPanel');
    preloadComponent('RecentTransactions');
  });
}