'use client';

import { Suspense } from 'react';
import { LazySpendingAnalytics, LazyTransactionTable } from '@/components/lazy';
import { CardLoading } from '@/components/ui/Card';

export default function TransactionsPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-accent-action-orange to-accent-action-orange/80 rounded-lg p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">Transaction History</h1>
        <p className="text-orange-100">
          Track, categorize, and analyze all your financial transactions
        </p>
      </div>

      {/* Analytics Overview */}
      <Suspense fallback={<CardLoading />}>
        <LazySpendingAnalytics
          timeRanges={['week', 'month', 'quarter', 'year']}
          categoryBreakdown={true}
          trendAnalysis={true}
          anomalyDetection={true}
        />
      </Suspense>

      {/* Transaction Table */}
      <Suspense fallback={<CardLoading />}>
        <LazyTransactionTable
          sortable={true}
          filterable={true}
          searchable={true}
          bulkActions={true}
          categoryEditing={true}
        />
      </Suspense>
    </div>
  );
}
