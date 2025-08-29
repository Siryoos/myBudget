'use client';

import {
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowsUpDownIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon,
  EllipsisHorizontalIcon,
} from '@heroicons/react/24/outline';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { formatCurrency } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/i18n';
import { useI18n } from '@/lib/i18n-provider';
import { useTranslation } from '@/lib/useTranslation';
import type { Transaction } from '@/types';

interface TransactionTableProps {
  sortable?: boolean
  filterable?: boolean
  searchable?: boolean
  bulkActions?: boolean
  categoryEditing?: boolean
}

export function TransactionTable({
  sortable = true,
  filterable = true,
  searchable = true,
  bulkActions = true,
  categoryEditing = true,
}: TransactionTableProps) {
  const { locale } = useI18n();
  const { t } = useTranslation('transactions');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'description'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>([]);
  const [editingTransaction, setEditingTransaction] = useState<string | null>(null);
  const [editCategory, setEditCategory] = useState('');

  // Mock transaction data
  const [transactions, setTransactions] = useState<Transaction[]>([
    {
      id: '1',
      amount: -85.50,
      description: 'Whole Foods Market',
      category: 'Food',
      date: new Date(Date.now() - 2 * 60 * 60 * 1000),
      type: 'expense',
      account: 'Checking',
      tags: ['groceries', 'organic'],
    },
    {
      id: '2',
      amount: 2500.00,
      description: 'Salary Deposit - Tech Corp',
      category: 'Income',
      date: new Date(Date.now() - 24 * 60 * 60 * 1000),
      type: 'income',
      account: 'Checking',
      tags: ['salary', 'monthly'],
      isRecurring: true,
    },
    {
      id: '3',
      amount: -12.99,
      description: 'Netflix Subscription',
      category: 'Entertainment',
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      type: 'expense',
      account: 'Credit Card',
      tags: ['subscription', 'streaming'],
      isRecurring: true,
    },
    {
      id: '4',
      amount: -45.00,
      description: 'Shell Gas Station',
      category: 'Transportation',
      date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      type: 'expense',
      account: 'Credit Card',
      tags: ['gas', 'fuel'],
    },
    {
      id: '5',
      amount: -120.00,
      description: 'Pacific Gas & Electric',
      category: 'Utilities',
      date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      type: 'expense',
      account: 'Checking',
      tags: ['utilities', 'monthly'],
      isRecurring: true,
    },
    {
      id: '6',
      amount: 50.00,
      description: 'Freelance Project Payment',
      category: 'Income',
      date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      type: 'income',
      account: 'Checking',
      tags: ['freelance', 'side-income'],
    },
    {
      id: '7',
      amount: -89.99,
      description: 'Amazon Prime Shopping',
      category: 'Shopping',
      date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
      type: 'expense',
      account: 'Credit Card',
      tags: ['online', 'shopping'],
    },
    {
      id: '8',
      amount: -25.50,
      description: 'Starbucks Coffee',
      category: 'Food',
      date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      type: 'expense',
      account: 'Credit Card',
      tags: ['coffee', 'dining'],
    },
  ]);

  const categories = [
    'All',
'Food',
'Transportation',
'Entertainment',
'Utilities',
    'Shopping',
'Healthcare',
'Income',
'Other',
  ];

  // Filter and sort transactions
  const filteredTransactions = transactions
    .filter(transaction => {
      const matchesSearch = searchQuery === '' ||
        (transaction.description?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        transaction.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        transaction.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory = selectedCategory === 'all' ||
        transaction.category.toLowerCase() === selectedCategory.toLowerCase();

      const matchesType = selectedType === 'all' || transaction.type === selectedType;

      return matchesSearch && matchesCategory && matchesType;
    })
    .sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'date':
          comparison = a.date.getTime() - b.date.getTime();
          break;
        case 'amount':
          comparison = Math.abs(a.amount) - Math.abs(b.amount);
          break;
        case 'description':
          comparison = (a.description || '').localeCompare(b.description || '');
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const handleSort = (column: 'date' | 'amount' | 'description') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const handleSelectTransaction = (transactionId: string) => {
    setSelectedTransactions(prev =>
      (prev.includes(transactionId)
        ? prev.filter(id => id !== transactionId)
        : [...prev, transactionId]),
    );
  };

  const handleSelectAll = () => {
    if (selectedTransactions.length === filteredTransactions.length) {
      setSelectedTransactions([]);
    } else {
      setSelectedTransactions(filteredTransactions.map(t => t.id));
    }
  };

  const handleEditCategory = (transactionId: string, newCategory: string) => {
    setTransactions(prev =>
      prev.map(t =>
        (t.id === transactionId ? { ...t, category: newCategory } : t),
      ),
    );
    setEditingTransaction(null);
    setEditCategory('');
  };

  const handleDeleteTransactions = (transactionIds: string[]) => {
    setTransactions(prev => prev.filter(t => !transactionIds.includes(t.id)));
    setSelectedTransactions([]);
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      'Food': '🍽️',
      'Income': '💰',
      'Entertainment': '🎬',
      'Transportation': '🚗',
      'Utilities': '⚡',
      'Shopping': '🛍️',
      'Healthcare': '🏥',
      'Other': '📝',
    };
    return icons[category] || '💳';
  };

  const getCategoryColor = (category: string, type: 'income' | 'expense') => {
    if (type === 'income') {return 'bg-secondary-growth-green/10 text-secondary-growth-green';}

    const colors: Record<string, string> = {
      'Food': 'bg-accent-action-orange/10 text-accent-action-orange',
      'Entertainment': 'bg-purple-100 text-purple-700',
      'Transportation': 'bg-blue-100 text-blue-700',
      'Utilities': 'bg-yellow-100 text-yellow-700',
      'Shopping': 'bg-pink-100 text-pink-700',
      'Healthcare': 'bg-red-100 text-red-700',
      'Other': 'bg-neutral-gray/10 text-neutral-gray',
    };
    return colors[category] || 'bg-neutral-gray/10 text-neutral-gray';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div>
            <h3 className="text-lg font-semibold text-neutral-dark-gray">
              {t('title', { defaultValue: 'All Transactions' })}
            </h3>
            <p className="text-sm text-neutral-gray">
              {filteredTransactions.length} {t('count.of', { defaultValue: 'of' })} {transactions.length} {t('count.transactions', { defaultValue: 'transactions' })}
            </p>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
            {searchable && (
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-4 w-4 text-neutral-gray" />
                </div>
                <input
                  type="text"
                  placeholder={t('search.placeholder', { defaultValue: 'Search transactions...' })}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-3 py-2 border border-neutral-gray/30 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-trust-blue focus:border-primary-trust-blue"
                />
              </div>
            )}

            {filterable && (
              <div className="flex space-x-2">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-2 border border-neutral-gray/30 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-trust-blue"
                >
                  {categories.map(category => (
                    <option key={category} value={category.toLowerCase()}>
                      {category}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="px-3 py-2 border border-neutral-gray/30 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-trust-blue"
                >
                  <option value="all">{t('filters.allTypes', { defaultValue: 'All Types' })}</option>
                  <option value="income">{t('filters.income', { defaultValue: 'Income' })}</option>
                  <option value="expense">{t('filters.expense', { defaultValue: 'Expenses' })}</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Bulk Actions */}
        {bulkActions && selectedTransactions.length > 0 && (
          <div className="flex items-center justify-between bg-primary-trust-blue/5 border border-primary-trust-blue/20 rounded-lg p-3 mt-4">
            <div className="flex items-center" aria-live="polite">
              <span className="text-sm font-medium text-primary-trust-blue">
                {selectedTransactions.length} transaction{selectedTransactions.length !== 1 ? 's' : ''} selected
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDeleteTransactions(selectedTransactions)}
              >
                <TrashIcon className="h-4 w-4 mr-2" />
                Delete
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedTransactions([])}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent>
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-12">
            <MagnifyingGlassIcon className="h-12 w-12 text-neutral-gray mx-auto mb-4" />
            <h4 className="text-lg font-medium text-neutral-dark-gray mb-2">
              {t('empty.title', { defaultValue: 'No transactions found' })}
            </h4>
            <p className="text-neutral-gray">
              {searchQuery || selectedCategory !== 'all' || selectedType !== 'all'
                ? t('empty.adjust', { defaultValue: 'Try adjusting your search or filters' })
                : t('empty.start', { defaultValue: 'Your transactions will appear here once you start tracking' })}
            </p>
            <div className="mt-4">
              <Button variant="primary" size="sm">
                {t('empty.ctaImport', { defaultValue: 'Import Transactions' })}
              </Button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <caption className="sr-only">{t('table.caption', { defaultValue: 'Transactions table with sorting and filters' })}</caption>
              <thead>
                <tr className="border-b border-neutral-gray/20">
                  {bulkActions && (
                    <th className="text-left py-3 px-2" scope="col">
                      <input
                        type="checkbox"
                        checked={selectedTransactions.length === filteredTransactions.length}
                        onChange={handleSelectAll}
                        className="rounded border-neutral-gray/30 text-primary-trust-blue focus:ring-primary-trust-blue"
                        aria-label={t('table.aria.selectAll', { defaultValue: 'Select all transactions' })}
                      />
                    </th>
                  )}
                  <th
                    className={`text-left py-3 px-2 text-sm font-medium text-neutral-gray ${
                      sortable ? 'cursor-pointer hover:text-neutral-dark-gray' : ''
                    }`}
                    onClick={() => sortable && handleSort('date')}
                    scope="col"
                    aria-sort={sortBy === 'date' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : undefined}
                  >
                    <div className="flex items-center">
                      Date
                      {sortable && sortBy === 'date' && (
                        <ArrowsUpDownIcon className="h-3 w-3 ml-1" />
                      )}
                    </div>
                  </th>
                  <th
                    className={`text-left py-3 px-2 text-sm font-medium text-neutral-gray ${
                      sortable ? 'cursor-pointer hover:text-neutral-dark-gray' : ''
                    }`}
                    onClick={() => sortable && handleSort('description')}
                    scope="col"
                    aria-sort={sortBy === 'description' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : undefined}
                  >
                    <div className="flex items-center">
                      Description
                      {sortable && sortBy === 'description' && (
                        <ArrowsUpDownIcon className="h-3 w-3 ml-1" />
                      )}
                    </div>
                  </th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-neutral-gray" scope="col">
                    Category
                  </th>
                  <th
                    className={`text-right py-3 px-2 text-sm font-medium text-neutral-gray ${
                      sortable ? 'cursor-pointer hover:text-neutral-dark-gray' : ''
                    }`}
                    onClick={() => sortable && handleSort('amount')}
                    scope="col"
                    aria-sort={sortBy === 'amount' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : undefined}
                  >
                    <div className="flex items-center justify-end">
                      Amount
                      {sortable && sortBy === 'amount' && (
                        <ArrowsUpDownIcon className="h-3 w-3 ml-1" />
                      )}
                    </div>
                  </th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-neutral-gray" scope="col">
                    Account
                  </th>
                  <th className="text-center py-3 px-2 text-sm font-medium text-neutral-gray" scope="col">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((transaction) => (
                  <tr
                    key={transaction.id}
                    className="border-b border-neutral-gray/10 hover:bg-neutral-light-gray/30 transition-colors duration-150"
                  >
                  {bulkActions && (
                    <td className="py-4 px-2">
                      <input
                        type="checkbox"
                        checked={selectedTransactions.includes(transaction.id)}
                        onChange={() => handleSelectTransaction(transaction.id)}
                        className="rounded border-neutral-gray/30 text-primary-trust-blue focus:ring-primary-trust-blue"
                        aria-label={t('table.aria.selectRow', { defaultValue: `Select transaction ${transaction.description || transaction.id}` })}
                      />
                    </td>
                  )}
                    <td className="py-4 px-2">
                      <div className="text-sm text-neutral-dark-gray">
                        {formatRelativeTime(transaction.date, locale)}
                      </div>
                      <div className="text-xs text-neutral-gray">
                        {transaction.date.toLocaleDateString()}
                      </div>
                    </td>
                    <td className="py-4 px-2">
                      <div className="flex items-center">
                        <span className="text-lg mr-2">
                          {getCategoryIcon(transaction.category)}
                        </span>
                        <div>
                          <div className="text-sm font-medium text-neutral-dark-gray">
                            {transaction.description}
                          </div>
                          {transaction.tags && transaction.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {transaction.tags.slice(0, 2).map(tag => (
                                <span
                                  key={tag}
                                  className="text-xs px-1.5 py-0.5 bg-neutral-gray/10 text-neutral-gray rounded-full"
                                >
                                  {tag}
                                </span>
                              ))}
                              {transaction.tags.length > 2 && (
                                <span className="text-xs text-neutral-gray">
                                  +{transaction.tags.length - 2} more
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-2">
                      {editingTransaction === transaction.id ? (
                        <div className="flex items-center space-x-1">
                          <select
                            value={editCategory}
                            onChange={(e) => setEditCategory(e.target.value)}
                            className="text-xs px-2 py-1 border border-neutral-gray/30 rounded focus:outline-none focus:ring-1 focus:ring-primary-trust-blue"
                          >
                            {categories.slice(1).map(category => (
                              <option key={category} value={category}>
                                {category}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleEditCategory(transaction.id, editCategory)}
                            className="p-1 text-secondary-growth-green hover:bg-secondary-growth-green/10 rounded"
                          >
                            <CheckIcon className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingTransaction(null);
                              setEditCategory('');
                            }}
                            className="p-1 text-neutral-gray hover:bg-neutral-gray/10 rounded"
                          >
                            <XMarkIcon className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <span
                          className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                            getCategoryColor(transaction.category, transaction.type)
                          }`}
                        >
                          {transaction.category}
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-2 text-right">
                      <div className={`text-sm font-semibold ${
                        transaction.type === 'income'
                          ? 'text-secondary-growth-green'
                          : 'text-neutral-dark-gray'
                      }`}>
                        {transaction.type === 'income' ? '+' : ''}
                        {formatCurrency(Math.abs(transaction.amount), undefined, locale)}
                      </div>
                      {transaction.isRecurring && (
                        <div className="text-xs text-neutral-gray">
                          Recurring
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-2">
                      <div className="text-sm text-neutral-gray">
                        {transaction.account}
                      </div>
                    </td>
                    <td className="py-4 px-2">
                      <div className="flex items-center justify-center space-x-1">
                        {categoryEditing && (
                          <button
                            onClick={() => {
                              setEditingTransaction(transaction.id);
                              setEditCategory(transaction.category);
                            }}
                            className="p-2 min-h-[36px] min-w-[36px] text-neutral-gray hover:text-primary-trust-blue hover:bg-primary-trust-blue/10 rounded transition-colors duration-150"
                            title="Edit category"
                            aria-label="Edit category"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteTransactions([transaction.id])}
                          className="p-2 min-h-[36px] min-w-[36px] text-neutral-gray hover:text-accent-warning-red hover:bg-accent-warning-red/10 rounded transition-colors duration-150"
                          title="Delete transaction"
                          aria-label="Delete transaction"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                        <button
                          className="p-2 min-h-[36px] min-w-[36px] text-neutral-gray hover:text-neutral-dark-gray hover:bg-neutral-gray/10 rounded transition-colors duration-150"
                          title="More options"
                          aria-label="More options"
                        >
                          <EllipsisHorizontalIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
