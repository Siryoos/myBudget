'use client';

import {
  ChartPieIcon,
  BanknotesIcon,
  EnvelopeIcon,
  CalculatorIcon,
  BookOpenIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';

import { apiClient } from '@/lib/api-client';
import { useTranslation } from '@/lib/useTranslation';

interface BudgetMethod {
  id: string
  name: string
  description: string
  icon: React.ComponentType<any>
  difficulty: string
  categories: Array<{
    name: string
    percentage?: number
    description: string
  }>
}

interface BudgetMethodSelectorProps {
  showComparison?: boolean
  allowCustomization?: boolean
  onMethodSelected?: (method: string) => void
}

const BUDGET_METHODS: BudgetMethod[] = [
  {
    id: '50-30-20',
    name: '50/30/20 Rule',
    description: 'Popular and simple budgeting method',
    icon: ChartPieIcon,
    difficulty: 'Beginner',
    categories: [
      { name: 'Needs', percentage: 50, description: 'Essential expenses like rent, utilities, groceries' },
      { name: 'Wants', percentage: 30, description: 'Entertainment, dining out, hobbies' },
      { name: 'Savings', percentage: 20, description: 'Emergency fund, investments, debt repayment' },
    ],
  },
  {
    id: 'pay-yourself-first',
    name: 'Pay Yourself First',
    description: 'Prioritize savings before other expenses',
    icon: BanknotesIcon,
    difficulty: 'Beginner',
    categories: [
      { name: 'Savings', percentage: 20, description: 'Set aside first before any spending' },
      { name: 'Fixed Expenses', description: 'Rent, insurance, subscriptions' },
      { name: 'Variable Expenses', description: 'Everything else after savings and fixed costs' },
    ],
  },
  {
    id: 'envelope',
    name: 'Envelope System',
    description: 'Cash-based budgeting for spending control',
    icon: EnvelopeIcon,
    difficulty: 'Intermediate',
    categories: [
      { name: 'Groceries', description: 'Weekly food budget' },
      { name: 'Entertainment', description: 'Fun money' },
      { name: 'Transportation', description: 'Gas, transit, parking' },
      { name: 'Personal', description: 'Clothing, personal care' },
    ],
  },
  {
    id: 'zero-based',
    name: 'Zero-Based Budget',
    description: 'Every dollar has a purpose',
    icon: CalculatorIcon,
    difficulty: 'Advanced',
    categories: [
      { name: 'Income', description: 'Total monthly income' },
      { name: 'Fixed Expenses', description: 'Bills that don\'t change' },
      { name: 'Variable Expenses', description: 'Fluctuating costs' },
      { name: 'Savings & Goals', description: 'Future planning' },
    ],
  },
  {
    id: 'kakeibo',
    name: 'Kakeibo Method',
    description: 'Japanese mindful spending approach',
    icon: BookOpenIcon,
    difficulty: 'Intermediate',
    categories: [
      { name: 'Survival', description: 'Must-have expenses' },
      { name: 'Optional', description: 'Nice-to-have spending' },
      { name: 'Culture', description: 'Books, museums, learning' },
      { name: 'Extra', description: 'Unexpected or emergency' },
    ],
  },
];

export function BudgetMethodSelector({
  showComparison = true,
  allowCustomization = true,
  onMethodSelected,
}: BudgetMethodSelectorProps) {
  const { t } = useTranslation(['budget', 'common']);
  const router = useRouter();
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customizations, setCustomizations] = useState<Record<string, number>>({});

  const handleSelectMethod = (methodId: string) => {
    setSelectedMethod(methodId);
    setShowDetails(true);
    setError(null);

    // Initialize customizations for methods with percentages
    const method = BUDGET_METHODS.find(m => m.id === methodId);
    if (method) {
      const initialCustomizations: Record<string, number> = {};
      method.categories.forEach(cat => {
        if (cat.percentage) {
          initialCustomizations[cat.name] = cat.percentage;
        }
      });
      setCustomizations(initialCustomizations);
    }
  };

  // Helper function to determine which categories require percentage validation
  // Some methods like "Pay Yourself First" only require percentages for specific categories
  const getRequiredPercentageCategories = (methodId: string): string[] => {
    const method = BUDGET_METHODS.find(m => m.id === methodId);
    if (!method) {return [];}

    // Return categories that have predefined percentages (these require validation)
    return method.categories
      .filter(cat => cat.percentage !== undefined)
      .map(cat => cat.name);
  };

  // Helper function to validate percentages with partial coverage support
  const validatePercentages = (methodId: string, customizations: Record<string, number>): boolean => {
    const requiredCategories = getRequiredPercentageCategories(methodId);

    // If no categories require percentages, validation passes
    if (requiredCategories.length === 0) {return true;}

    // Check if all required categories have provided percentages
    const allRequiredProvided = requiredCategories.every(cat =>
      customizations[cat] !== undefined && customizations[cat] > 0,
    );

    // If not all required categories are provided, skip 100% validation
    if (!allRequiredProvided) {return true;}

    // Validate numeric ranges for provided percentages
    const providedValues = Object.values(customizations);
    const hasInvalidRange = providedValues.some(val => val < 0 || val > 100);
    if (hasInvalidRange) {return false;}

    // Only enforce 100% total when all required categories have percentages
    const total = providedValues.reduce((sum, val) => sum + val, 0);
    return Math.abs(total - 100) <= 0.01;
  };

  const handleConfirmMethod = async () => {
    if (!selectedMethod) {return;}

    setIsCreating(true);
    setError(null);

    try {
      const method = BUDGET_METHODS.find(m => m.id === selectedMethod);
      if (!method) {throw new Error('Method not found');}

      // Validate percentages if applicable
      if (allowCustomization && Object.keys(customizations).length > 0) {
        if (!validatePercentages(selectedMethod, customizations)) {
          throw new Error(t('errors.percentagesMustEqual100'));
        }
      }

      // Create budget with API
      const response = await apiClient.createBudget({
        name: `My ${method.name} Budget`,
        method: selectedMethod as any,
        totalIncome: 0, // Will be set in budget configuration
        period: 'monthly',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        categories: method.categories.map(cat => ({
          name: cat.name,
          allocated: customizations[cat.name] || 0,
          color: getColorForCategory(cat.name),
          icon: getIconForCategory(cat.name),
          isEssential: cat.name === 'Needs' || cat.name === 'Survival' || cat.name === 'Fixed Expenses',
        })),
      });

      if (response.success && response.data) {
        // Notify parent component
        if (onMethodSelected) {
          onMethodSelected(selectedMethod);
        }

        // Navigate to budget configuration
        router.push(`/budget/${response.data.budgetId}/configure`);
      } else {
        throw new Error(response.error || 'Failed to create budget');
      }
    } catch (err) {
      console.error('Failed to create budget:', err);
      setError(err instanceof Error ? err.message : 'Failed to create budget');
    } finally {
      setIsCreating(false);
    }
  };

  const getColorForCategory = (name: string): string => {
    const colors: Record<string, string> = {
      'Needs': '#3B82F6',
      'Wants': '#F59E0B',
      'Savings': '#10B981',
      'Fixed Expenses': '#6366F1',
      'Variable Expenses': '#EC4899',
      'Groceries': '#84CC16',
      'Entertainment': '#F97316',
      'Transportation': '#06B6D4',
      'Personal': '#8B5CF6',
      'Survival': '#EF4444',
      'Optional': '#FBBF24',
      'Culture': '#3B82F6',
      'Extra': '#10B981',
    };
    return colors[name] || '#6B7280';
  };

  const getIconForCategory = (name: string): string => {
    const icons: Record<string, string> = {
      'Needs': '🏠',
      'Wants': '🎮',
      'Savings': '💰',
      'Fixed Expenses': '📋',
      'Variable Expenses': '📊',
      'Groceries': '🛒',
      'Entertainment': '🎬',
      'Transportation': '🚗',
      'Personal': '👤',
      'Survival': '⚡',
      'Optional': '✨',
      'Culture': '📚',
      'Extra': '🎁',
    };
    return icons[name] || '📁';
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Beginner':
        return 'bg-secondary-growth-green/10 text-secondary-growth-green';
      case 'Intermediate':
        return 'bg-accent-warm-orange/10 text-accent-warm-orange';
      case 'Advanced':
        return 'bg-accent-coral-red/10 text-accent-coral-red';
      default:
        return 'bg-neutral-gray/10 text-neutral-gray';
    }
  };

  const handleCustomizationChange = (category: string, value: number) => {
    setCustomizations(prev => ({
      ...prev,
      [category]: value,
    }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-neutral-charcoal mb-2">
          {t('methodSelector.title')}
        </h2>
        <p className="text-neutral-gray">
          {t('methodSelector.description')}
        </p>
      </div>

      {error && (
        <div className="bg-accent-coral-red/10 border border-accent-coral-red/30 rounded-lg p-4">
          <p className="text-sm text-accent-coral-red">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {BUDGET_METHODS.map((method) => {
          const Icon = method.icon;
          return (
            <button
              key={method.id}
              onClick={() => handleSelectMethod(method.id)}
              className={`p-6 rounded-lg border-2 text-left transition-all ${
                selectedMethod === method.id
                  ? 'border-primary-trust-blue bg-primary-trust-blue/5'
                  : 'border-neutral-gray/30 hover:border-neutral-gray/50 bg-white'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <Icon className="w-8 h-8 text-primary-trust-blue" />
                <span className={`px-2 py-1 text-xs rounded-full ${getDifficultyColor(method.difficulty)}`}>
                  {method.difficulty}
                </span>
              </div>
              <h3 className="font-semibold text-lg text-neutral-charcoal mb-2">
                {method.name}
              </h3>
              <p className="text-sm text-neutral-gray">
                {method.description}
              </p>
              {selectedMethod === method.id && (
                <CheckCircleIcon className="w-5 h-5 text-primary-trust-blue mt-4" />
              )}
            </button>
          );
        })}
      </div>

      {/* Method Details */}
      {showDetails && selectedMethod && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-neutral-charcoal mb-4">
            {BUDGET_METHODS.find(m => m.id === selectedMethod)?.name} Details
          </h3>

          <div className="space-y-4">
            {BUDGET_METHODS.find(m => m.id === selectedMethod)?.categories.map((category) => (
              <div key={category.name} className="flex items-start space-x-4">
                <span className="text-2xl">{getIconForCategory(category.name)}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-medium text-neutral-charcoal">
                      {category.name}
                    </h4>
                    {category.percentage !== undefined && allowCustomization && (
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          value={customizations[category.name] || category.percentage}
                          onChange={(e) => handleCustomizationChange(category.name, parseFloat(e.target.value) || 0)}
                          className="w-16 px-2 py-1 text-sm border border-neutral-gray/30 rounded focus:ring-2 focus:ring-primary-trust-blue focus:border-transparent"
                          min="0"
                          max="100"
                          step="1"
                        />
                        <span className="text-sm text-neutral-gray">%</span>
                      </div>
                    )}
                    {category.percentage !== undefined && !allowCustomization && (
                      <span className="text-sm font-medium text-primary-trust-blue">
                        {category.percentage}%
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-neutral-gray">
                    {category.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {allowCustomization && Object.keys(customizations).length > 0 && (
            <div className="mt-6 p-4 bg-neutral-light-gray/50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="font-medium text-neutral-charcoal">Total:</span>
                <span className={`font-bold ${
                  validatePercentages(selectedMethod, customizations)
                    ? 'text-secondary-growth-green'
                    : 'text-accent-coral-red'
                }`}>
                  {Object.values(customizations).reduce((sum, val) => sum + val, 0).toFixed(0)}%
                </span>
              </div>
            </div>
          )}

          <div className="mt-6 flex justify-end space-x-4">
            <button
              onClick={() => {
                setShowDetails(false);
                setSelectedMethod(null);
                setCustomizations({});
              }}
              className="px-4 py-2 bg-neutral-gray/10 text-neutral-charcoal rounded-lg hover:bg-neutral-gray/20 transition-colors"
            >
              {t('common:actions.cancel')}
            </button>
            <button
              onClick={handleConfirmMethod}
              disabled={isCreating || (Object.keys(customizations).length > 0 &&
                !validatePercentages(selectedMethod, customizations))}
              className="px-4 py-2 bg-primary-trust-blue text-white rounded-lg hover:bg-primary-trust-blue/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreating ? t('common:status.creating') : t('common:actions.createBudget')}
            </button>
          </div>
        </div>
      )}

      {/* Method Comparison */}
      {showComparison && !showDetails && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-neutral-charcoal mb-4">
            {t('methodSelector.comparison.title')}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-gray/20">
                  <th className="text-left py-2 px-4 text-sm font-medium text-neutral-gray">
                    {t('methodSelector.comparison.method')}
                  </th>
                  <th className="text-left py-2 px-4 text-sm font-medium text-neutral-gray">
                    {t('methodSelector.comparison.bestFor')}
                  </th>
                  <th className="text-left py-2 px-4 text-sm font-medium text-neutral-gray">
                    {t('methodSelector.comparison.difficulty')}
                  </th>
                  <th className="text-left py-2 px-4 text-sm font-medium text-neutral-gray">
                    {t('methodSelector.comparison.flexibility')}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-neutral-gray/10">
                  <td className="py-3 px-4 text-sm text-neutral-charcoal font-medium">50/30/20</td>
                  <td className="py-3 px-4 text-sm text-neutral-gray">Beginners, steady income</td>
                  <td className="py-3 px-4"><span className="text-xs px-2 py-1 rounded-full bg-secondary-growth-green/10 text-secondary-growth-green">Easy</span></td>
                  <td className="py-3 px-4 text-sm text-neutral-gray">Moderate</td>
                </tr>
                <tr className="border-b border-neutral-gray/10">
                  <td className="py-3 px-4 text-sm text-neutral-charcoal font-medium">Pay Yourself First</td>
                  <td className="py-3 px-4 text-sm text-neutral-gray">Savings-focused individuals</td>
                  <td className="py-3 px-4"><span className="text-xs px-2 py-1 rounded-full bg-secondary-growth-green/10 text-secondary-growth-green">Easy</span></td>
                  <td className="py-3 px-4 text-sm text-neutral-gray">High</td>
                </tr>
                <tr className="border-b border-neutral-gray/10">
                  <td className="py-3 px-4 text-sm text-neutral-charcoal font-medium">Envelope System</td>
                  <td className="py-3 px-4 text-sm text-neutral-gray">Cash users, overspenders</td>
                  <td className="py-3 px-4"><span className="text-xs px-2 py-1 rounded-full bg-accent-warm-orange/10 text-accent-warm-orange">Medium</span></td>
                  <td className="py-3 px-4 text-sm text-neutral-gray">Low</td>
                </tr>
                <tr className="border-b border-neutral-gray/10">
                  <td className="py-3 px-4 text-sm text-neutral-charcoal font-medium">Zero-Based</td>
                  <td className="py-3 px-4 text-sm text-neutral-gray">Detail-oriented, variable income</td>
                  <td className="py-3 px-4"><span className="text-xs px-2 py-1 rounded-full bg-accent-coral-red/10 text-accent-coral-red">Hard</span></td>
                  <td className="py-3 px-4 text-sm text-neutral-gray">Very High</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-sm text-neutral-charcoal font-medium">Kakeibo</td>
                  <td className="py-3 px-4 text-sm text-neutral-gray">Mindful spenders</td>
                  <td className="py-3 px-4"><span className="text-xs px-2 py-1 rounded-full bg-accent-warm-orange/10 text-accent-warm-orange">Medium</span></td>
                  <td className="py-3 px-4 text-sm text-neutral-gray">High</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
