'use client'

import { useState } from 'react'
import { 
  ArrowRightIcon,
  FunnelIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { formatCurrency, formatRelativeTime } from '@/lib/utils'
import type { Transaction } from '@/types'

interface RecentTransactionsProps {
  limit?: number
  showCategories?: boolean
  showAmounts?: boolean
}

export function RecentTransactions({
  limit = 5,
  showCategories = true,
  showAmounts = true,
}: RecentTransactionsProps) {
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all')
  
  // Mock transaction data
  const allTransactions: Transaction[] = [
    {
      id: '1',
      amount: -85.50,
      description: 'Grocery Store',
      category: 'Food',
      date: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      type: 'expense',
    },
    {
      id: '2',
      amount: 2500.00,
      description: 'Salary Deposit',
      category: 'Income',
      date: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      type: 'income',
    },
    {
      id: '3',
      amount: -12.99,
      description: 'Netflix Subscription',
      category: 'Entertainment',
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      type: 'expense',
    },
    {
      id: '4',
      amount: -45.00,
      description: 'Gas Station',
      category: 'Transportation',
      date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      type: 'expense',
    },
    {
      id: '5',
      amount: -120.00,
      description: 'Electric Bill',
      category: 'Utilities',
      date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // 4 days ago
      type: 'expense',
    },
    {
      id: '6',
      amount: 50.00,
      description: 'Freelance Payment',
      category: 'Income',
      date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      type: 'income',
    },
  ]

  const filteredTransactions = allTransactions
    .filter(transaction => filterType === 'all' || transaction.type === filterType)
    .slice(0, limit)

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      'Food': '🍽️',
      'Income': '💰',
      'Entertainment': '🎬',
      'Transportation': '🚗',
      'Utilities': '⚡',
      'Shopping': '🛍️',
      'Healthcare': '🏥',
      'Education': '📚',
    }
    return icons[category] || '💳'
  }

  const getCategoryColor = (category: string, type: 'income' | 'expense') => {
    if (type === 'income') return 'text-secondary-growth-green'
    
    const colors: Record<string, string> = {
      'Food': 'text-accent-action-orange',
      'Entertainment': 'text-purple-600',
      'Transportation': 'text-blue-600',
      'Utilities': 'text-yellow-600',
      'Shopping': 'text-pink-600',
      'Healthcare': 'text-red-600',
      'Education': 'text-indigo-600',
    }
    return colors[category] || 'text-neutral-gray'
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-neutral-dark-gray">
              Recent Transactions
            </h3>
            <p className="text-sm text-neutral-gray">
              Your latest financial activity
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Filter buttons */}
            <div className="flex items-center bg-neutral-light-gray rounded-lg p-1">
              {(['all', 'income', 'expense'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all duration-200 ${
                    filterType === type
                      ? 'bg-white text-primary-trust-blue shadow-sm'
                      : 'text-neutral-gray hover:text-neutral-dark-gray'
                  }`}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
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
            <p className="text-neutral-gray">No transactions found for the selected filter.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTransactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center p-3 rounded-lg hover:bg-neutral-light-gray/50 transition-colors duration-200 cursor-pointer group"
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
                          transaction.type
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
                <div className="flex-shrink-0 ml-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <ArrowRightIcon className="h-4 w-4 text-neutral-gray" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* View All Button */}
        <div className="mt-6 pt-4 border-t border-neutral-gray/20">
          <Button variant="outline" size="sm" className="w-full group">
            <span>View All Transactions</span>
            <ArrowRightIcon className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform duration-200" />
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="bg-secondary-growth-green/10 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-secondary-growth-green">
              {formatCurrency(
                filteredTransactions
                  .filter(t => t.type === 'income')
                  .reduce((sum, t) => sum + t.amount, 0)
              )}
            </div>
            <div className="text-xs text-neutral-gray">Income This Period</div>
          </div>
          
          <div className="bg-accent-warning-red/10 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-accent-warning-red">
              {formatCurrency(
                Math.abs(filteredTransactions
                  .filter(t => t.type === 'expense')
                  .reduce((sum, t) => sum + t.amount, 0))
              )}
            </div>
            <div className="text-xs text-neutral-gray">Expenses This Period</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
