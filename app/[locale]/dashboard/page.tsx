'use client';

import { BudgetSummary } from '@/components/dashboard/BudgetSummary';
import { InsightsPanel } from '@/components/dashboard/InsightsPanel';
import { QuickSaveWidget } from '@/components/dashboard/QuickSaveWidget';
import { RecentTransactions } from '@/components/dashboard/RecentTransactions';
import { SavingsOverview } from '@/components/dashboard/SavingsOverview';
import { WelcomeHeader } from '@/components/dashboard/WelcomeHeader';
import { OnboardingChecklist } from '@/components/dashboard/OnboardingChecklist';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <OnboardingChecklist />
      {/* Welcome Header */}
      <WelcomeHeader
        showGreeting={true}
        showDate={true}
        showQuickActions={true}
      />

      {/* Main Dashboard Grid (mobile-first) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Primary Widgets */}
        <div className="lg:col-span-2 space-y-6">
          {/* Savings Overview */}
          <SavingsOverview
            showTotalSavings={true}
            showMonthlyProgress={true}
            showGoalProgress={true}
            animateOnLoad={true}
          />

          {/* Budget Summary */}
          <details className="lg:open bg-white rounded-md shadow-sm border border-neutral-gray/10">
            <summary className="list-none cursor-pointer px-4 py-3 text-sm font-medium text-neutral-dark-gray lg:hidden">
              Budget Summary
            </summary>
            <div className="p-0 lg:p-0">
              <BudgetSummary
                showCategories={true}
                showSpendingAlerts={true}
                visualType="donutChart"
              />
            </div>
          </details>

          {/* Recent Transactions */}
          <details className="lg:open bg-white rounded-md shadow-sm border border-neutral-gray/10">
            <summary className="list-none cursor-pointer px-4 py-3 text-sm font-medium text-neutral-dark-gray lg:hidden">
              Recent Transactions
            </summary>
            <div>
              <RecentTransactions
                limit={5}
                showCategories={true}
                showAmounts={true}
              />
            </div>
          </details>
        </div>

        {/* Right Column - Secondary Widgets */}
        <div className="space-y-6">
          {/* Quick Save Widget */}
          <QuickSaveWidget
            defaultAmounts={[10, 25, 50, 100]}
            customAmountEnabled={true}
            celebrationAnimation={true}
          />

          {/* Insights Panel */}
          <InsightsPanel
            showSavingTips={true}
            personalizedRecommendations={true}
            comparePeers={true}
          />
        </div>
      </div>
    </div>
  );
}
