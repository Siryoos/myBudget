'use client';

import {
  ChartPieIcon,
  BanknotesIcon,
  EnvelopeIcon,
  CalculatorIcon,
  BookOpenIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { useTranslation } from '@/lib/useTranslation';
import { getBudgetMethodConfig } from '@/lib/utils';
import type { BudgetMethod } from '@/types';

interface BudgetMethodOption {
  id: BudgetMethod
  name: string
  description: string
  icon: any
  difficulty: string
  timeCommitment: 'Low' | 'Medium' | 'High'
  bestFor: string[]
}

/**
 * Renders an interactive budgeting-method picker that lets the user browse, inspect, and choose a budgeting approach.
 *
 * Displays a localized list of predefined budget methods (name, short description, difficulty, time commitment, and icon).
 * Shows a loading placeholder until translations are ready. Selecting a method opens a details panel with a longer description,
 * optional category breakdown, "best for" highlights, and action buttons to either choose a different method or confirm the selection.
 *
 * The confirmed selection is currently logged to the console (placeholder for persisting/updating user configuration).
 *
 * @returns The component's JSX element.
 */
export function BudgetMethodSelector() {
  const { t, ready } = useTranslation('budget');
  const [selectedMethod, setSelectedMethod] = useState<BudgetMethod | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  if (!ready) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-trust-blue mx-auto mb-4"></div>
        <p className="text-neutral-gray">Loading budget methods...</p>
      </div>
    );
  }

  const budgetMethods: BudgetMethodOption[] = [
    {
      id: '50-30-20',
      name: t('methods.rule503020.name', { defaultValue: '50/30/20 Rule' }),
      description: t('methods.rule503020.description', { defaultValue: '50% needs, 30% wants, 20% savings' }),
      icon: ChartPieIcon,
      difficulty: t('difficulty.beginner', { defaultValue: 'Beginner' }),
      timeCommitment: 'Low',
      bestFor: [
        t('methods.rule503020.bestFor.newToBudgeting', { defaultValue: 'New to budgeting' }),
        t('methods.rule503020.bestFor.simpleApproach', { defaultValue: 'Simple approach' }),
        t('methods.rule503020.bestFor.steadyIncome', { defaultValue: 'Steady income' }),
      ],
    },
    {
      id: 'pay-yourself-first',
      name: t('methods.payYourselfFirst.name', { defaultValue: 'Pay Yourself First' }),
      description: t('methods.payYourselfFirst.description', { defaultValue: 'Save 20% first, spend the rest' }),
      icon: BanknotesIcon,
      difficulty: t('difficulty.beginner', { defaultValue: 'Beginner' }),
      timeCommitment: 'Low',
      bestFor: [
        t('methods.payYourselfFirst.bestFor.buildingSavingsHabit', { defaultValue: 'Building savings habit' }),
        t('methods.payYourselfFirst.bestFor.automaticSaving', { defaultValue: 'Automatic saving' }),
        t('methods.payYourselfFirst.bestFor.longTermGoals', { defaultValue: 'Long-term goals' }),
      ],
    },
    {
      id: 'envelope',
      name: t('methods.envelope.name', { defaultValue: 'Digital Envelope System' }),
      description: t('methods.envelope.description', { defaultValue: 'Allocate funds to specific categories' }),
      icon: EnvelopeIcon,
      difficulty: t('difficulty.intermediate', { defaultValue: 'Intermediate' }),
      timeCommitment: 'Medium',
      bestFor: [
        t('methods.envelope.bestFor.detailedTracking', { defaultValue: 'Detailed tracking' }),
        t('methods.envelope.bestFor.spendingControl', { defaultValue: 'Spending control' }),
        t('methods.envelope.bestFor.variableIncome', { defaultValue: 'Variable income' }),
      ],
    },
    {
      id: 'zero-based',
      name: t('methods.zeroBased.name', { defaultValue: 'Zero-Based Budget' }),
      description: t('methods.zeroBased.description', { defaultValue: 'Every dollar has a purpose' }),
      icon: CalculatorIcon,
      difficulty: t('difficulty.advanced', { defaultValue: 'Advanced' }),
      timeCommitment: 'High',
      bestFor: [
        t('methods.zeroBased.bestFor.maximumControl', { defaultValue: 'Maximum control' }),
        t('methods.zeroBased.bestFor.debtPayoff', { defaultValue: 'Debt payoff' }),
        t('methods.zeroBased.bestFor.irregularExpenses', { defaultValue: 'Irregular expenses' }),
      ],
    },
    {
      id: 'kakeibo',
      name: t('methods.kakeibo.name', { defaultValue: 'Kakeibo Method' }),
      description: t('methods.kakeibo.description', { defaultValue: 'Mindful spending with reflection' }),
      icon: BookOpenIcon,
      difficulty: t('difficulty.intermediate', { defaultValue: 'Intermediate' }),
      timeCommitment: 'Medium',
      bestFor: [
        t('methods.kakeibo.bestFor.mindfulSpending', { defaultValue: 'Mindful spending' }),
        t('methods.kakeibo.bestFor.selfReflection', { defaultValue: 'Self-reflection' }),
        t('methods.kakeibo.bestFor.behavioralChange', { defaultValue: 'Behavioral change' }),
      ],
    },
  ];

  const handleMethodSelect = (method: BudgetMethod) => {
    setSelectedMethod(method);
    setShowDetails(true);
  };

  const handleConfirmMethod = () => {
    if (selectedMethod) {
      console.log(`Selected budget method: ${selectedMethod}`);
      // This would typically update the user's budget configuration
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Beginner':
        return 'bg-secondary-growth-green/10 text-secondary-growth-green';
      case 'Intermediate':
        return 'bg-accent-action-orange/10 text-accent-action-orange';
      case 'Advanced':
        return 'bg-accent-warning-red/10 text-accent-warning-red';
      default:
        return 'bg-neutral-gray/10 text-neutral-gray';
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-neutral-dark-gray mb-2">
            {t('methodSelector.title', { defaultValue: 'Choose Your Budgeting Method' })}
          </h2>
          <p className="text-neutral-gray">
            {t('methodSelector.subtitle', { defaultValue: 'Select the budgeting approach that best fits your lifestyle and financial goals.' })}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {budgetMethods.map((method) => {
            const IconComponent = method.icon;
            const isSelected = selectedMethod === method.id;

            return (
              <button
                key={method.id}
                onClick={() => handleMethodSelect(method.id)}
                className={`p-4 rounded-lg border-2 text-left transition-all duration-HTTP_OK hover:shadow-md ${
                  isSelected
                    ? 'border-primary-trust-blue bg-primary-trust-blue/5'
                    : 'border-neutral-gray/30 hover:border-primary-trust-blue/50'
                }`}
              >
                <div className="flex items-start mb-3">
                  <div className={`p-2 rounded-lg mr-3 ${
                    isSelected
                      ? 'bg-primary-trust-blue text-white'
                      : 'bg-neutral-light-gray text-neutral-gray'
                  }`}>
                    <IconComponent className="h-6 w-6" />
                  </div>
                  {isSelected && (
                    <div className="ml-auto">
                      <CheckIcon className="h-5 w-5 text-primary-trust-blue" />
                    </div>
                  )}
                </div>

                <h3 className="font-semibold text-neutral-dark-gray mb-2">
                  {method.name}
                </h3>
                <p className="text-sm text-neutral-gray mb-3">
                  {method.description}
                </p>

                <div className="flex items-center justify-between">
                  <span className={`text-xs px-2 py-1 rounded-full ${getDifficultyColor(method.difficulty)}`}>
                    {method.difficulty}
                  </span>
                  <span className="text-xs text-neutral-gray">
                    {method.timeCommitment} effort
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Method Details */}
        {showDetails && selectedMethod && (
          <div className="bg-neutral-light-gray/50 rounded-lg p-6 animate-slide-up">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-neutral-dark-gray mb-2">
                About {budgetMethods.find(m => m.id === selectedMethod)?.name}
              </h3>

              {(() => {
                const config = getBudgetMethodConfig(selectedMethod);
                const method = budgetMethods.find(m => m.id === selectedMethod);

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium text-neutral-dark-gray mb-2">
                        How it works:
                      </h4>
                      <p className="text-sm text-neutral-gray mb-4">
                        {config.description}
                      </p>

                      {config.categories.length > 0 && (
                        <div>
                          <h4 className="font-medium text-neutral-dark-gray mb-2">
                            Category Breakdown:
                          </h4>
                          <div className="space-y-2">
                            {config.categories.map((category, index) => (
                              <div key={index} className="flex items-center justify-between text-sm">
                                <span className="text-neutral-gray">{category.name}</span>
                                <span className="font-medium text-neutral-dark-gray">
                                  {category.percentage}%
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <h4 className="font-medium text-neutral-dark-gray mb-2">
                        Best for:
                      </h4>
                      <ul className="space-y-1 mb-4">
                        {method?.bestFor.map((item, index) => (
                          <li key={index} className="text-sm text-neutral-gray flex items-center">
                            <CheckIcon className="h-4 w-4 text-secondary-growth-green mr-2 flex-shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>

                      <div className="grid grid-cols-2 gap-4 text-center">
                        <div className="bg-white rounded-lg p-3">
                          <div className="text-sm font-medium text-neutral-dark-gray">
                            Difficulty
                          </div>
                          <div className={`text-xs px-2 py-1 rounded-full mt-1 ${getDifficultyColor(method?.difficulty || '')}`}>
                            {method?.difficulty}
                          </div>
                        </div>
                        <div className="bg-white rounded-lg p-3">
                          <div className="text-sm font-medium text-neutral-dark-gray">
                            Time Commitment
                          </div>
                          <div className="text-xs text-neutral-gray mt-1">
                            {method?.timeCommitment}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="flex items-center justify-end space-x-3">
              <Button
                variant="ghost"
                onClick={() => {
                  setSelectedMethod(null);
                  setShowDetails(false);
                }}
              >
                Choose Different Method
              </Button>
              <Button variant="primary" onClick={handleConfirmMethod}>
                Start with This Method
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
