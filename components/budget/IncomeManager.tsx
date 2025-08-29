'use client';

import {
  PlusIcon,
  XMarkIcon,
  BanknotesIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { TextInput, NumberInput, Select, Checkbox, type SelectOption } from '@/components/ui/Input';
import { formatCurrency, sanitizeNumberInput } from '@/lib/utils';

interface IncomeSource {
  id: string
  name: string
  amount: number
  frequency: 'weekly' | 'biweekly' | 'monthly' | 'yearly'
  isRegular: boolean
}

interface IncomeManagerProps {
  allowMultipleSources?: boolean
  recurringIncomeTracking?: boolean
  irregularIncomeSupport?: boolean
}

export function IncomeManager({
  allowMultipleSources = true,
  recurringIncomeTracking = true,
  irregularIncomeSupport = true,
}: IncomeManagerProps) {
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([
    {
      id: '1',
      name: 'Primary Job',
      amount: 4500,
      frequency: 'monthly',
      isRegular: true,
    },
  ]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSource, setNewSource] = useState({
    name: '',
    amount: '',
    frequency: 'monthly' as const,
    isRegular: true,
  });

  const frequencyMultipliers = {
    weekly: 52,
    biweekly: 26,
    monthly: 12,
    yearly: 1,
  };

  const calculateMonthlyAmount = (amount: number, frequency: keyof typeof frequencyMultipliers) => (amount * frequencyMultipliers[frequency]) / 12;

  const totalMonthlyIncome = incomeSources.reduce(
    (sum, source) => sum + calculateMonthlyAmount(source.amount, source.frequency),
    0,
  );

  const handleAddSource = () => {
    if (newSource.name && newSource.amount) {
      const source: IncomeSource = {
        id: Date.now().toString(),
        name: newSource.name,
        amount: sanitizeNumberInput(newSource.amount),
        frequency: newSource.frequency,
        isRegular: newSource.isRegular,
      };

      setIncomeSources(prev => [...prev, source]);
      setNewSource({ name: '', amount: '', frequency: 'monthly', isRegular: true });
      setShowAddForm(false);
    }
  };

  const handleRemoveSource = (id: string) => {
    setIncomeSources(prev => prev.filter(source => source.id !== id));
  };

  const getFrequencyLabel = (frequency: string) => {
    const labels = {
      weekly: 'Weekly',
      biweekly: 'Bi-weekly',
      monthly: 'Monthly',
      yearly: 'Yearly',
    };
    return labels[frequency as keyof typeof labels] || frequency;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="bg-secondary-growth-green/10 rounded-lg p-2 mr-3">
              <BanknotesIcon className="h-6 w-6 text-secondary-growth-green" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-neutral-dark-gray">
                Income Sources
              </h3>
              <p className="text-sm text-neutral-gray">
                Add all your income sources for accurate budgeting
              </p>
            </div>
          </div>

          {allowMultipleSources && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddForm(true)}
              disabled={showAddForm}
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Source
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {/* Total Monthly Income Display */}
        <div className="bg-gradient-to-r from-secondary-growth-green to-secondary-growth-green-light rounded-lg p-4 text-white mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-secondary-growth-green-light text-sm">
                Total Monthly Income
              </p>
              <p className="text-2xl font-bold">
                {formatCurrency(totalMonthlyIncome)}
              </p>
            </div>
            <CalendarIcon className="h-8 w-8 text-secondary-growth-green-light" />
          </div>
        </div>

        {/* Income Sources List */}
        <div className="space-y-3 mb-6">
          {incomeSources.map((source) => (
            <div
              key={source.id}
              className="flex items-center justify-between p-3 bg-neutral-light-gray/50 rounded-lg"
            >
              <div className="flex-1">
                <div className="flex items-center mb-1">
                  <h4 className="font-medium text-neutral-dark-gray mr-2">
                    {source.name}
                  </h4>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    source.isRegular
                      ? 'bg-secondary-growth-green/10 text-secondary-growth-green'
                      : 'bg-accent-action-orange/10 text-accent-action-orange'
                  }`}>
                    {source.isRegular ? 'Regular' : 'Irregular'}
                  </span>
                </div>
                <div className="flex items-center text-sm text-neutral-gray">
                  <span className="font-semibold text-neutral-dark-gray mr-2">
                    {formatCurrency(source.amount)}
                  </span>
                  <span>{getFrequencyLabel(source.frequency)}</span>
                  <span className="mx-2">•</span>
                  <span className="text-secondary-growth-green font-medium">
                    {formatCurrency(calculateMonthlyAmount(source.amount, source.frequency))} monthly
                  </span>
                </div>
              </div>

              {incomeSources.length > 1 && (
                <Button
                  onClick={() => handleRemoveSource(source.id)}
                  variant="ghost"
                  size="sm"
                  className="p-1 rounded-full text-neutral-gray hover:text-accent-warning-red"
                  aria-label={`Remove ${source.name}`}
                >
                  <XMarkIcon className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>

        {/* Add New Source Form */}
        {showAddForm && (
          <div className="bg-white border border-neutral-gray/30 rounded-lg p-4 space-y-4 animate-slide-up">
            <h4 className="font-medium text-neutral-dark-gray">
              Add Income Source
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="source-name" className="block text-sm font-medium text-neutral-dark-gray mb-1">
                  Source Name
                </label>
                <TextInput
                  id="source-name"
                  placeholder="e.g., Part-time job, Freelance"
                  value={newSource.name}
                  onChange={(e) => setNewSource(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>

              <div>
                <label htmlFor="source-amount" className="block text-sm font-medium text-neutral-dark-gray mb-1">
                  Amount
                </label>
                <NumberInput
                  id="source-amount"
                  min={0}
                  placeholder="0.00"
                  value={newSource.amount}
                  onChange={(e) => setNewSource(prev => ({ ...prev, amount: e.target.value }))}
                  leftAdornment={<span className="text-neutral-gray">$</span>}
                  required
                />
              </div>

              <div>
                <label htmlFor="source-frequency" className="block text-sm font-medium text-neutral-dark-gray mb-1">
                  Frequency
                </label>
                <Select
                  label="Frequency"
                  name="frequency"
                  value={newSource.frequency}
                  onChange={(value) => setNewSource(prev => ({ ...prev, frequency: value as IncomeSource['frequency'] }))}
                  options={[
                    { value: 'weekly', label: 'Weekly' },
                    { value: 'biweekly', label: 'Bi-weekly' },
                    { value: 'monthly', label: 'Monthly' },
                    { value: 'yearly', label: 'Yearly' }
                  ] as SelectOption[]}
                  placeholder="Select frequency"
                />
              </div>

              {irregularIncomeSupport && (
                <div className="flex items-center">
                  <label className="flex items-center cursor-pointer">
                    <Checkbox
                      checked={newSource.isRegular}
                      onChange={(e) => setNewSource(prev => ({ ...prev, isRegular: e.target.checked }))}
                      className="mr-2"
                    />
                    <span className="text-sm text-neutral-dark-gray">
                      Regular/Predictable Income
                    </span>
                  </label>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end space-x-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowAddForm(false);
                  setNewSource({ name: '', amount: '', frequency: 'monthly', isRegular: true });
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleAddSource}
                disabled={!newSource.name || !newSource.amount}
              >
                Add Source
              </Button>
            </div>
          </div>
        )}

        {/* Income Insights */}
        <div className="bg-primary-trust-blue/5 rounded-lg p-4">
          <h4 className="font-medium text-primary-trust-blue mb-2">
            💡 Income Planning Tips
          </h4>
          <ul className="text-sm text-neutral-gray space-y-1">
            <li>• Include all income sources, even irregular ones</li>
            <li>• Use conservative estimates for variable income</li>
            <li>• Update amounts when income changes significantly</li>
            {irregularIncomeSupport && (
              <li>• Mark irregular income to build appropriate buffers</li>
            )}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
