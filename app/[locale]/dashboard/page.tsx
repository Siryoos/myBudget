import type { Metadata } from 'next';

import { BudgetSummary } from '@/components/dashboard/BudgetSummary';
import { InsightsPanel } from '@/components/dashboard/InsightsPanel';
import { QuickSaveWidget } from '@/components/dashboard/QuickSaveWidget';
import { RecentTransactions } from '@/components/dashboard/RecentTransactions';
import { SavingsOverview } from '@/components/dashboard/SavingsOverview';
import { WelcomeHeader } from '@/components/dashboard/WelcomeHeader';

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Your financial overview and insights',
};

export default function DashboardPage() {
  return (
    <div className="space-y-6" id="main-content">
      {/* Welcome Header */}
      <WelcomeHeader
        showGreeting={true}
        showDate={true}
        showQuickActions={true}
      />

      {/* Main Dashboard Grid */}
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
          <BudgetSummary
            showCategories={true}
            showSpendingAlerts={true}
            visualType="donutChart"
          />

          {/* Recent Transactions */}
          <RecentTransactions
            limit={5}
            showCategories={true}
            showAmounts={true}
          />
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

