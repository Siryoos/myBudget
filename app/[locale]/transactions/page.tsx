'use client';

import { SpendingAnalytics } from '@/components/transactions/SpendingAnalytics';
import { TransactionTable } from '@/components/transactions/TransactionTable';

export default function TransactionsPage() {
  return (
    <div className="space-y-6" id="main-content">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-accent-action-orange to-accent-action-orange/80 rounded-lg p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">Transaction History</h1>
        <p className="text-orange-100">
          Track, categorize, and analyze all your financial transactions
        </p>
      </div>

      {/* Analytics Overview */}
      <SpendingAnalytics
        timeRanges={['week', 'month', 'quarter', 'year']}
        categoryBreakdown={true}
        trendAnalysis={true}
        anomalyDetection={true}
      />

      {/* Transaction Table */}
      <TransactionTable
        sortable={true}
        filterable={true}
        searchable={true}
        bulkActions={true}
        categoryEditing={true}
      />
    </div>
  );
}

