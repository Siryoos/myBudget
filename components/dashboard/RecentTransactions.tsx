'use client';

import {
  ArrowRightIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { useTransactions } from '@/contexts/AppProvider';
import { useTranslation } from '@/lib/useTranslation';
import { formatCurrency, formatRelativeTime } from '@/lib/utils';
import type { Transaction } from '@/types';

interface RecentTransactionsProps {
  limit?: number
  showCategories?: boolean
  showAmounts?: boolean
}

/**
 * Renders a card showing a list of recent financial transactions with filtering, per-item details, and quick summary stats.
 *
 * Displays transactions from the application transactions context, allows switching between "All", "Income", and "Expense" filters,
 * and shows category badges, amounts, relative dates, and quick totals for the currently visible transactions.
 *
 * @param limit - Maximum number of transactions to display (default: 5).
 * @param showCategories - Whether to render category badges for each transaction (default: true).
 * @param showAmounts - Whether to render formatted transaction amounts (default: true).
 */
export function RecentTransactions({
  limit = 5,
  showCategories = true,
  showAmounts = true,
}: RecentTransactionsProps) {
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const { t } = useTranslation('dashboard');

  // Fetch transactions from context
  const { transactions, loading, error } = useTransactions();

  // Filter transactions based on type and limit
  const filteredTransactions = transactions
    .filter(transaction => filterType === 'all' || transaction.type === filterType)
    .slice(0, limit);

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      [t('budget:categories.food')]: '🍽️',
      [t('transactions:categories.income')]: '💰',
      [t('budget:categories.entertainment')]: '🎬',
      [t('budget:categories.transportation')]: '🚗',
      [t('budget:categories.utilities')]: '⚡',
      [t('budget:categories.shopping')]: '🛍️',
      [t('budget:categories.healthcare')]: '🏥',
      [t('budget:categories.education')]: '📚',
    };
    return icons[category] || '💳';
  };

  const getCategoryColor = (category: string, type: 'income' | 'expense') => {
    if (type === 'income') {return 'text-secondary-growth-green';}

    const colors: Record<string, string> = {
      [t('budget:categories.food')]: 'text-accent-action-orange',
      [t('budget:categories.entertainment')]: 'text-purple-600',
      [t('budget:categories.transportation')]: 'text-blue-600',
      [t('budget:categories.utilities')]: 'text-yellow-600',
      [t('budget:categories.shopping')]: 'text-pink-600',
      [t('budget:categories.healthcare')]: 'text-red-600',
      [t('budget:categories.education')]: 'text-indigo-600',
    };
    return colors[category] || 'text-neutral-gray';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-neutral-dark-gray">
              {t('transactions:title', { defaultValue: 'Recent Transactions' })}
            </h3>
            <p className="text-sm text-neutral-gray">
              {t('transactions:subtitle', { defaultValue: 'Your latest financial activity' })}
            </p>
          </div>

          <div className="flex items-center space-x-2">
            {/* Filter buttons */}
            <div className="flex items-center bg-neutral-light-gray rounded-lg p-1">
              {(['all', 'income', 'expense'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all duration-HTTP_OK ${
                    filterType === type
                      ? 'bg-white text-primary-trust-blue shadow-sm'
                      : 'text-neutral-gray hover:text-neutral-dark-gray'
                  }`}
                >
                  {type === 'all'
                    ? t('transactions:filters.all', { defaultValue: 'All' })
                    : type === 'income'
                    ? t('transactions:filters.income', { defaultValue: 'Income' })
                    : t('transactions:filters.expense', { defaultValue: 'Expense' })
                  }
                </button>
              ))}
            </div>

            <Button variant="ghost" size="sm">
              <FunnelIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-8">
            <MagnifyingGlassIcon className="h-12 w-12 text-neutral-gray mx-auto mb-4" />
            <p className="text-neutral-gray">
              {t('transactions:noTransactions', { defaultValue: 'No transactions found for the selected filter.' })}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTransactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center p-3 rounded-lg hover:bg-neutral-light-gray/50 transition-colors duration-HTTP_OK cursor-pointer group"
              >
                {/* Transaction Icon */}
                <div className="flex-shrink-0 mr-3">
                  <div className="w-10 h-10 rounded-full bg-neutral-light-gray flex items-center justify-center text-lg">
                    {getCategoryIcon(transaction.category)}
                  </div>
                </div>

                {/* Transaction Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-neutral-dark-gray truncate">
                      {transaction.description}
                    </p>
                    {showAmounts && (
                      <div className="flex items-center ml-2">
                        <span
                          className={`text-sm font-semibold ${
                            transaction.type === 'income'
                              ? 'text-secondary-growth-green'
                              : 'text-neutral-dark-gray'
                          }`}
                        >
                          {transaction.type === 'income' ? '+' : ''}
                          {formatCurrency(Math.abs(transaction.amount))}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-1">
                    {showCategories && (
                      <span
                        className={`text-xs font-medium px-2 py-1 rounded-full ${getCategoryColor(
                          transaction.category,
                          transaction.type,
                        )} bg-current bg-opacity-10`}
                      >
                        {transaction.category}
                      </span>
                    )}
                    <span className="text-xs text-neutral-gray ml-auto">
                      {formatRelativeTime(transaction.date)}
                    </span>
                  </div>
                </div>

                {/* Arrow icon on hover */}
                <div className="flex-shrink-0 ml-2 opacity-0 group-hover:opacity-100 transition-opacity duration-HTTP_OK">
                  <ArrowRightIcon className="h-4 w-4 text-neutral-gray" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* View All Button */}
        <div className="mt-6 pt-4 border-t border-neutral-gray/20">
          <Button variant="outline" size="sm" className="w-full group">
            <span>{t('transactions:viewAll', { defaultValue: 'View All Transactions' })}</span>
            <ArrowRightIcon className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform duration-HTTP_OK" />
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="bg-secondary-growth-green/10 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-secondary-growth-green">
              {formatCurrency(
                filteredTransactions
                  .filter(t => t.type === 'income')
                  .reduce((sum, t) => sum + t.amount, 0),
              )}
            </div>
            <div className="text-xs text-neutral-gray">
              {t('transactions:stats.incomeThisPeriod', { defaultValue: 'Income This Period' })}
            </div>
          </div>

          <div className="bg-accent-warning-red/10 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-accent-warning-red">
              {formatCurrency(
                Math.abs(filteredTransactions
                  .filter(t => t.type === 'expense')
                  .reduce((sum, t) => sum + t.amount, 0)),
              )}
            </div>
            <div className="text-xs text-neutral-gray">
              {t('transactions:stats.expensesThisPeriod', { defaultValue: 'Expenses This Period' })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
