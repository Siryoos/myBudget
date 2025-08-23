import type { FinancialInsight } from '@/types';

export interface SavingTip {
  id: string
  title: string
  description: string
  icon: string
  difficulty: string
}

export interface PeerComparison {
  metric: string
  userValue: number
  peerAverage: number
  unit: string
  better: boolean
}

const getTranslationWithFallback = (t: (key: string) => string, key: string, fallback: string): string => {
  const translation = t(key);
  return translation === key ? fallback : translation;
};

export const getMockInsights = (t: (key: string) => string): FinancialInsight[] => [
  {
    id: '1',
    type: 'saving-opportunity',
    title: getTranslationWithFallback(t, 'insights.coffeeSpending.title', 'Reduce Coffee Spending'),
    description: getTranslationWithFallback(t, 'insights.coffeeSpending.description', 'You could save $120/month by reducing coffee shop visits'),
    impact: 'medium',
    category: getTranslationWithFallback(t, 'categories.food', 'Food & Dining'),
    actionable: true,
    actions: [
      {
        id: '1',
        label: getTranslationWithFallback(t, 'insights.coffeeSpending.actions.setBudget', 'Set Coffee Budget'),
        type: 'navigate',
        target: '/budget',
      },
      {
        id: '2',
        label: getTranslationWithFallback(t, 'insights.coffeeSpending.actions.trackDaily', 'Track Daily Spending'),
        type: 'execute',
        target: 'track_coffee',
      },
    ],
    createdAt: new Date(),
    isRead: false,
  },
  {
    id: '2',
    type: 'goal-progress',
    title: getTranslationWithFallback(t, 'insights.emergencyFund.title', 'Emergency Fund Progress'),
    description: getTranslationWithFallback(t, 'insights.emergencyFund.description', 'You\'re 75% towards your emergency fund goal!'),
    impact: 'high',
    category: getTranslationWithFallback(t, 'categories.savings', 'Savings'),
    actionable: true,
    actions: [
      {
        id: '1',
        label: getTranslationWithFallback(t, 'insights.emergencyFund.actions.viewDetails', 'View Details'),
        type: 'navigate',
        target: '/goals',
      },
    ],
    createdAt: new Date(),
    isRead: false,
  },
  {
    id: '3',
    type: 'spending-pattern',
    title: getTranslationWithFallback(t, 'insights.weekendSpending.title', 'Weekend Spending Pattern'),
    description: getTranslationWithFallback(t, 'insights.weekendSpending.description', 'Your weekend spending is 40% higher than weekdays'),
    impact: 'medium',
    category: getTranslationWithFallback(t, 'categories.budget', 'Budget'),
    actionable: true,
    actions: [
      {
        id: '1',
        label: getTranslationWithFallback(t, 'insights.weekendSpending.actions.viewPatterns', 'View Spending Patterns'),
        type: 'navigate',
        target: '/transactions',
      },
    ],
    createdAt: new Date(),
    isRead: false,
  },
];

export const getMockSavingTips = (t: (key: string) => string): SavingTip[] => [
  {
    id: '1',
    title: getTranslationWithFallback(t, 'savingTips.week52Challenge.title', '52-Week Challenge'),
    description: getTranslationWithFallback(t, 'savingTips.week52Challenge.description', 'Save $1 the first week, $2 the second week, and so on for a year'),
    icon: '💰',
    difficulty: getTranslationWithFallback(t, 'difficulty.easy', 'Easy'),
  },
  {
    id: '2',
    title: getTranslationWithFallback(t, 'savingTips.roundUpSavings.title', 'Round-Up Savings'),
    description: getTranslationWithFallback(t, 'savingTips.roundUpSavings.description', 'Round up every purchase to the nearest dollar and save the difference'),
    icon: '🔄',
    difficulty: getTranslationWithFallback(t, 'difficulty.easy', 'Easy'),
  },
  {
    id: '3',
    title: getTranslationWithFallback(t, 'savingTips.noSpendDays.title', 'No-Spend Days'),
    description: getTranslationWithFallback(t, 'savingTips.noSpendDays.description', 'Challenge yourself to have days where you don\'t spend any money'),
    icon: '🚫',
    difficulty: getTranslationWithFallback(t, 'difficulty.medium', 'Medium'),
  },
];

export const getMockPeerComparisons = (t: (key: string) => string): PeerComparison[] => [
  {
    metric: getTranslationWithFallback(t, 'comparisons.savingsRate', 'Savings Rate'),
    userValue: 18,
    peerAverage: 15,
    unit: '%',
    better: true,
  },
  {
    metric: getTranslationWithFallback(t, 'comparisons.monthlySavings', 'Monthly Savings'),
    userValue: 680,
    peerAverage: 520,
    unit: '$',
    better: true,
  },
  {
    metric: getTranslationWithFallback(t, 'comparisons.budgetAdherence', 'Budget Adherence'),
    userValue: 85,
    peerAverage: 78,
    unit: '%',
    better: true,
  },
];
