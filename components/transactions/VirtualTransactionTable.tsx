'use client';

import { useState, useMemo, useCallback } from 'react';
import { VirtualList } from '@/components/ui/VirtualList';
import { CardLoading, CardError } from '@/components/ui/Card';
import { TextInput } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useTranslation } from '@/lib/useTranslation';
import { useCurrency } from '@/lib/useCurrency';
import { formatRelativeTime } from '@/lib/i18n';
import { useToast } from '@/hooks/useToast';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowsUpDownIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PhotoIcon,
} from '@heroicons/react/24/outline';

interface Transaction {
  id: string;
  date: Date;
  description: string;
  category: string;
  amount: number;
  account: string;
  type: 'income' | 'expense';
  tags?: string[];
  receipt?: string;
  recurring?: boolean;
}

interface VirtualTransactionTableProps {
  sortable?: boolean;
  filterable?: boolean;
  searchable?: boolean;
  bulkActions?: boolean;
  categoryEditing?: boolean;
  showReceipts?: boolean;
  className?: string;
}

const ITEM_HEIGHT = 88; // Approximate height of a transaction row

export function VirtualTransactionTable({
  sortable = true,
  filterable = true,
  searchable = true,
  bulkActions = true,
  categoryEditing = true,
  showReceipts = false,
  className = '',
}: VirtualTransactionTableProps) {
  const { t, getCurrentLanguage } = useTranslation('transactions');
  const locale = getCurrentLanguage();
  const { formatCurrency } = useCurrency();
  const { toast } = useToast();

  // Mock data for demonstration
  const generateMockTransactions = (count: number): Transaction[] => {
    const categories = ['Food & Dining', 'Shopping', 'Transportation', 'Bills & Utilities', 'Entertainment', 'Healthcare', 'Income'];
    const accounts = ['Checking', 'Savings', 'Credit Card'];
    const descriptions = [
      'Grocery Store Purchase',
      'Online Shopping',
      'Gas Station',
      'Electric Bill',
      'Movie Tickets',
      'Doctor Visit',
      'Salary Deposit',
      'Restaurant',
      'Coffee Shop',
      'Public Transport',
    ];

    return Array.from({ length: count }, (_, i) => ({
      id: `trans-${i}`,
      date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      description: descriptions[Math.floor(Math.random() * descriptions.length)] + ` #${i}`,
      category: categories[Math.floor(Math.random() * categories.length)],
      amount: Math.random() * 500 + 10,
      account: accounts[Math.floor(Math.random() * accounts.length)],
      type: Math.random() > 0.7 ? 'income' : 'expense',
      tags: Math.random() > 0.5 ? ['tag1', 'tag2'] : undefined,
      receipt: Math.random() > 0.8 ? 'receipt-url' : undefined,
      recurring: Math.random() > 0.9,
    }));
  };

  const [transactions] = useState<Transaction[]>(() => generateMockTransactions(1000));
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>([]);
  const [editingTransaction, setEditingTransaction] = useState<string | null>(null);
  const [editCategory, setEditCategory] = useState('');
  const [isLoading] = useState(false);
  const [error] = useState<Error | null>(null);

  const categories = ['All', 'Food & Dining', 'Shopping', 'Transportation', 'Bills & Utilities', 'Entertainment', 'Healthcare', 'Income'];

  // Filter and sort transactions
  const filteredTransactions = useMemo(() => {
    let filtered = transactions;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(t =>
        t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.tags && t.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())))
      );
    }

    // Category filter
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(t => t.category === selectedCategory);
    }

    // Sort (create a copy to avoid mutation)
    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'date') {
        comparison = a.date.getTime() - b.date.getTime();
      } else if (sortBy === 'amount') {
        comparison = a.amount - b.amount;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [transactions, searchTerm, selectedCategory, sortBy, sortOrder]);

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      'Food & Dining': '🍽️',
      'Shopping': '🛍️',
      'Transportation': '🚗',
      'Bills & Utilities': '📱',
      'Entertainment': '🎬',
      'Healthcare': '🏥',
      'Income': '💰',
    };
    return icons[category] || '📁';
  };

  const renderTransaction = useCallback((transaction: Transaction, index: number) => {
    return (
      <div className="flex items-center px-4 py-3 border-b border-neutral-gray/10 hover:bg-neutral-light-gray/30 transition-colors duration-150">
        {bulkActions && (
          <div className="mr-3">
            <input
              type="checkbox"
              checked={selectedTransactions.includes(transaction.id)}
              onChange={() => {
                setSelectedTransactions(prev =>
                  prev.includes(transaction.id)
                    ? prev.filter(id => id !== transaction.id)
                    : [...prev, transaction.id]
                );
              }}
              className="rounded border-neutral-gray/30 text-primary-trust-blue focus:ring-primary-trust-blue"
            />
          </div>
        )}

        <div className="flex-1 grid grid-cols-12 gap-4 items-center">
          {/* Date */}
          <div className="col-span-2">
            <div className="text-sm text-neutral-dark-gray">
              {formatRelativeTime(transaction.date, locale)}
            </div>
            <div className="text-xs text-neutral-gray">
              {transaction.date.toLocaleDateString()}
            </div>
          </div>

          {/* Description */}
          <div className="col-span-4">
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
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Category */}
          <div className="col-span-2">
            {editingTransaction === transaction.id ? (
              <div className="flex items-center space-x-1">
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="text-xs px-2 py-1 border border-neutral-gray/30 rounded"
                >
                  {categories.slice(1).map(category => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => {
                    // Handle edit
                    setEditingTransaction(null);
                    setEditCategory('');
                  }}
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
              <span className="text-sm px-2 py-1 bg-neutral-light-gray text-neutral-dark-gray rounded-full">
                {transaction.category}
              </span>
            )}
          </div>

          {/* Amount */}
          <div className="col-span-2 text-right">
            <span className={`font-medium ${
              transaction.type === 'income'
                ? 'text-secondary-growth-green'
                : 'text-neutral-dark-gray'
            }`}>
              {transaction.type === 'income' ? '+' : '-'}
              {formatCurrency(transaction.amount)}
            </span>
          </div>

          {/* Account */}
          <div className="col-span-1">
            <span className="text-sm text-neutral-gray">
              {transaction.account}
            </span>
          </div>

          {/* Actions */}
          <div className="col-span-1 flex items-center justify-end space-x-1">
            {categoryEditing && (
              <button
                onClick={() => {
                  setEditingTransaction(transaction.id);
                  setEditCategory(transaction.category);
                }}
                className="p-1 text-neutral-gray hover:text-primary-trust-blue hover:bg-primary-trust-blue/10 rounded"
              >
                <PencilIcon className="h-4 w-4" />
              </button>
            )}
            {showReceipts && (
              <button
                className="p-1 text-neutral-gray hover:text-primary-trust-blue hover:bg-primary-trust-blue/10 rounded"
                aria-label="View receipt"
                onClick={() => {
                  if (transaction.receipt) {
                    toast({ title: 'Opening receipt…', variant: 'info' });
                    // Placeholder: integrate lightbox/viewer here
                  } else {
                    toast({ title: 'No receipt available for this transaction', variant: 'info' });
                  }
                }}
              >
                <PhotoIcon className="h-4 w-4" />
              </button>
            )}
            <button className="p-1 text-neutral-gray hover:text-accent-savings-orange hover:bg-accent-savings-orange/10 rounded">
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }, [selectedTransactions, bulkActions, categoryEditing, showReceipts, editingTransaction, editCategory, categories, formatCurrency, locale]);

  if (isLoading) {
    return <CardLoading />;
  }

  if (error) {
    return (
      <CardError
        message={error?.message || t('table.error', { defaultValue: 'Unable to load transactions' })}
        onRetry={() => window.location.reload()}
      />
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-neutral-gray/10">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-neutral-dark-gray">
            {t('table.title', { defaultValue: 'Transaction History' })}
          </h2>
          
          <div className="flex flex-col sm:flex-row gap-3">
            {searchable && (
              <TextInput
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t('table.search', { defaultValue: 'Search transactions...' })}
                className="w-full sm:w-64"
                leftAdornment={<MagnifyingGlassIcon className="h-4 w-4 text-neutral-gray" />}
              />
            )}
            
            {filterable && (
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 border border-neutral-gray/30 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-trust-blue"
              >
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category === 'All' ? t('filter.all', { defaultValue: 'All Categories' }) : category}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Bulk actions */}
        {bulkActions && selectedTransactions.length > 0 && (
          <div className="mt-4 flex items-center justify-between p-3 bg-primary-trust-blue/5 rounded-md">
            <span className="text-sm text-neutral-dark-gray">
              {t('bulk.selected', { 
                defaultValue: '{{count}} selected', 
                count: selectedTransactions.length 
              })}
            </span>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelectedTransactions([])}
              >
                {t('bulk.clear', { defaultValue: 'Clear' })}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  toast({
                    title: t('toast.deleted', { defaultValue: 'Transactions deleted' }),
                    variant: 'info',
                  });
                  setSelectedTransactions([]);
                }}
              >
                {t('bulk.delete', { defaultValue: 'Delete' })}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Column headers */}
      <div className="px-4 py-2 border-b border-neutral-gray/10 bg-neutral-light-gray/30">
        <div className="flex items-center">
          {bulkActions && (
            <div className="mr-3">
              <input
                type="checkbox"
                checked={selectedTransactions.length === filteredTransactions.length}
                onChange={() => {
                  if (selectedTransactions.length === filteredTransactions.length) {
                    setSelectedTransactions([]);
                  } else {
                    setSelectedTransactions(filteredTransactions.map(t => t.id));
                  }
                }}
                className="rounded border-neutral-gray/30"
              />
            </div>
          )}
          <div className="flex-1 grid grid-cols-12 gap-4 text-sm font-medium text-neutral-gray">
            <div className="col-span-2">
              <button
                onClick={() => {
                  setSortBy('date');
                  setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                }}
                className="flex items-center hover:text-neutral-dark-gray"
              >
                Date
                {sortable && sortBy === 'date' && (
                  <ArrowsUpDownIcon className="h-3 w-3 ml-1" />
                )}
              </button>
            </div>
            <div className="col-span-4">Description</div>
            <div className="col-span-2">Category</div>
            <div className="col-span-2 text-right">
              <button
                onClick={() => {
                  setSortBy('amount');
                  setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                }}
                className="flex items-center justify-end hover:text-neutral-dark-gray"
              >
                Amount
                {sortable && sortBy === 'amount' && (
                  <ArrowsUpDownIcon className="h-3 w-3 ml-1" />
                )}
              </button>
            </div>
            <div className="col-span-1">Account</div>
            <div className="col-span-1 text-right">Actions</div>
          </div>
        </div>
      </div>

      {/* Virtual list */}
      <VirtualList
        items={filteredTransactions}
        height={600}
        itemHeight={ITEM_HEIGHT}
        renderItem={renderTransaction}
        overscan={5}
        className="bg-white"
        emptyMessage={t('table.empty', { defaultValue: 'No transactions found' })}
      />

      {/* Summary */}
      <div className="p-4 border-t border-neutral-gray/10 bg-neutral-light-gray/30">
        <div className="text-sm text-neutral-gray">
          {t('table.showing', { 
            defaultValue: 'Showing {{count}} transactions', 
            count: filteredTransactions.length 
          })}
        </div>
      </div>
    </div>
  );
}
