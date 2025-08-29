'use client';

import { Suspense } from 'react';
import BudgetHeader from '@/components/budget/BudgetHeader';
import { BudgetMethodSelector } from '@/components/budget/BudgetMethodSelector';
import { LazyBudgetAllocator, LazyBudgetVisualization, LazyIncomeManager } from '@/components/lazy';
import { CardLoading } from '@/components/ui/Card';

export default function BudgetPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <BudgetHeader />

      {/* Budget Method Selection */}
      <BudgetMethodSelector />

      {/* Main Budget Planning Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Input and Configuration */}
        <div className="space-y-6">
          <Suspense fallback={<CardLoading />}>
            <LazyIncomeManager
              allowMultipleSources={true}
              recurringIncomeTracking={true}
              irregularIncomeSupport={true}
            />
          </Suspense>

          <Suspense fallback={<CardLoading />}>
            <LazyBudgetAllocator
              visualAllocation={true}
              dragAndDrop={true}
              warningThresholds={true}
            />
          </Suspense>
        </div>

        {/* Right Column - Visualization */}
        <div>
          <Suspense fallback={<CardLoading />}>
            <LazyBudgetVisualization
              chartTypes={['pie', 'bar', 'sankey']}
              interactive={true}
              showComparison={true}
            />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
