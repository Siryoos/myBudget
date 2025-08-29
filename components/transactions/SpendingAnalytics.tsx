'use client';

import {
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ExclamationTriangleIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline';
import { useState } from 'react';

import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { formatCurrency, formatPercentage } from '@/lib/utils';

interface SpendingAnalyticsProps {
  timeRanges?: string[]
  categoryBreakdown?: boolean
  trendAnalysis?: boolean
  anomalyDetection?: boolean
}

export function SpendingAnalytics({
  timeRanges = ['week', 'month', 'quarter', 'year'],
  categoryBreakdown = true,
  trendAnalysis = true,
  anomalyDetection = true,
}: SpendingAnalyticsProps) {
  const [selectedPeriod, setSelectedPeriod] = useState('month');

  // Mock analytics data
  const analyticsData = {
    week: {
      totalSpent: 387.45,
      totalIncome: 0,
      previousPeriod: 425.30,
      categories: [
        { name: 'Food', amount: 145.20, percentage: 37.5, color: '#FF6B35' },
        { name: 'Transportation', amount: 89.50, percentage: 23.1, color: '#27AE60' },
        { name: 'Entertainment', amount: 67.25, percentage: 17.4, color: '#1E5A8D' },
        { name: 'Shopping', amount: 45.80, percentage: 11.8, color: '#10B981' },
        { name: 'Other', amount: 39.70, percentage: 10.2, color: '#6C757D' },
      ],
      trends: [
        { category: 'Food', change: 12.5, isIncrease: true },
        { category: 'Transportation', change: -8.2, isIncrease: false },
        { category: 'Entertainment', change: 25.0, isIncrease: true },
      ],
      anomalies: [
        { description: 'Unusually high entertainment spending', amount: 67.25, severity: 'medium' },
      ],
    },
    month: {
      totalSpent: 2845.67,
      totalIncome: 4500.00,
      previousPeriod: 2632.10,
      categories: [
        { name: 'Housing', amount: 1200.00, percentage: 42.2, color: '#1E5A8D' },
        { name: 'Food', amount: 485.30, percentage: 17.1, color: '#FF6B35' },
        { name: 'Transportation', amount: 320.50, percentage: 11.3, color: '#27AE60' },
        { name: 'Entertainment', amount: 245.80, percentage: 8.6, color: '#10B981' },
        { name: 'Utilities', amount: 198.45, percentage: 7.0, color: '#DC3545' },
        { name: 'Shopping', amount: 156.20, percentage: 5.5, color: '#FF6B35' },
        { name: 'Healthcare', amount: 89.30, percentage: 3.1, color: '#4A8BC2' },
        { name: 'Other', amount: 150.12, percentage: 5.3, color: '#6C757D' },
      ],
      trends: [
        { category: 'Food', change: 15.3, isIncrease: true },
        { category: 'Transportation', change: -5.8, isIncrease: false },
        { category: 'Entertainment', change: 32.1, isIncrease: true },
        { category: 'Utilities', change: -12.4, isIncrease: false },
      ],
      anomalies: [
        { description: 'Entertainment spending 32% above average', amount: 245.80, severity: 'high' },
        { description: 'Unusual large purchase in Shopping', amount: 89.99, severity: 'medium' },
      ],
    },
  };

  const currentData = analyticsData[selectedPeriod as keyof typeof analyticsData] || analyticsData.month;
  const spendingChange = ((currentData.totalSpent - currentData.previousPeriod) / currentData.previousPeriod) * 100;
  const isSpendingUp = spendingChange > 0;

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'text-accent-warning-red bg-accent-warning-red/10 border-accent-warning-red/20';
      case 'medium':
        return 'text-accent-action-orange bg-accent-action-orange/10 border-accent-action-orange/20';
      case 'low':
        return 'text-secondary-growth-green bg-secondary-growth-green/10 border-secondary-growth-green/20';
      default:
        return 'text-neutral-gray bg-neutral-gray/10 border-neutral-gray/20';
    }
  };

  const CategoryChart = () => {
    const maxAmount = Math.max(...currentData.categories.map(cat => cat.amount));

    return (
      <div className="space-y-3">
        {currentData.categories.map((category, index) => (
          <div key={index} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center">
                <div
                  className="w-3 h-3 rounded-full mr-2"
                  style={{ backgroundColor: category.color }}
                />
                <span className="font-medium text-neutral-dark-gray">
                  {category.name}
                </span>
              </div>
              <div className="text-right">
                <span className="font-semibold text-neutral-dark-gray">
                  {formatCurrency(category.amount)}
                </span>
                <span className="text-neutral-gray ml-1">
                  ({formatPercentage(category.percentage)})
                </span>
              </div>
            </div>
            <div className="w-full bg-neutral-light-gray rounded-full h-2">
              <div
                className="h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${(category.amount / maxAmount) * 100}%`,
                  backgroundColor: category.color,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Overview Stats */}
      <Card className="lg:col-span-3">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="bg-accent-action-orange/10 rounded-lg p-2 mr-3">
                <ChartBarIcon className="h-6 w-6 text-accent-action-orange" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-neutral-dark-gray">
                  Spending Analytics
                </h3>
                <p className="text-sm text-neutral-gray">
                  Insights into your spending patterns and trends
                </p>
              </div>
            </div>

            {/* Time Range Selector */}
            <div className="flex bg-neutral-light-gray rounded-lg p-1">
              {timeRanges.map((range) => (
                <button
                  key={range}
                  onClick={() => setSelectedPeriod(range)}
                  className={`px-3 py-1 text-sm font-medium rounded-md transition-all duration-200 ${
                    selectedPeriod === range
                      ? 'bg-white text-primary-trust-blue shadow-sm'
                      : 'text-neutral-gray hover:text-neutral-dark-gray'
                  }`}
                >
                  {range.charAt(0).toUpperCase() + range.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center bg-neutral-light-gray/50 rounded-lg p-4">
              <div className="text-2xl font-bold text-neutral-dark-gray">
                {formatCurrency(currentData.totalSpent)}
              </div>
              <div className="text-sm text-neutral-gray">Total Spent</div>
              <div className={`flex items-center justify-center mt-1 text-xs ${
                isSpendingUp ? 'text-accent-warning-red' : 'text-secondary-growth-green'
              }`}>
                {isSpendingUp ? (
                  <ArrowTrendingUpIcon className="h-3 w-3 mr-1" />
                ) : (
                  <ArrowTrendingDownIcon className="h-3 w-3 mr-1" />
                )}
                {formatPercentage(Math.abs(spendingChange))} vs last {selectedPeriod}
              </div>
            </div>

            {currentData.totalIncome > 0 && (
              <div className="text-center bg-neutral-light-gray/50 rounded-lg p-4">
                <div className="text-2xl font-bold text-secondary-growth-green">
                  {formatCurrency(currentData.totalIncome)}
                </div>
                <div className="text-sm text-neutral-gray">Total Income</div>
                <div className="text-xs text-neutral-gray mt-1">
                  Net: {formatCurrency(currentData.totalIncome - currentData.totalSpent)}
                </div>
              </div>
            )}

            <div className="text-center bg-neutral-light-gray/50 rounded-lg p-4">
              <div className="text-2xl font-bold text-primary-trust-blue">
                {currentData.categories.length}
              </div>
              <div className="text-sm text-neutral-gray">Categories</div>
              <div className="text-xs text-neutral-gray mt-1">
                Top: {currentData.categories[0]?.name}
              </div>
            </div>

            <div className="text-center bg-neutral-light-gray/50 rounded-lg p-4">
              <div className="text-2xl font-bold text-accent-action-orange">
                {formatCurrency(currentData.totalSpent / (selectedPeriod === 'week' ? 7 : selectedPeriod === 'month' ? 30 : 90))}
              </div>
              <div className="text-sm text-neutral-gray">Daily Average</div>
              <div className="text-xs text-neutral-gray mt-1">
                This {selectedPeriod}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Category Breakdown */}
      {categoryBreakdown && (
        <Card className="lg:col-span-2">
          <CardHeader>
            <h4 className="font-semibold text-neutral-dark-gray">
              Spending by Category
            </h4>
          </CardHeader>
          <CardContent>
            <CategoryChart />
          </CardContent>
        </Card>
      )}

      {/* Trends and Anomalies */}
      <div className="space-y-6">
        {/* Trends */}
        {trendAnalysis && (
          <Card>
            <CardHeader>
              <h4 className="font-semibold text-neutral-dark-gray flex items-center">
                <ArrowTrendingUpIcon className="h-5 w-5 mr-2 text-primary-trust-blue" />
                Spending Trends
              </h4>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {currentData.trends.map((trend, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-neutral-light-gray/30 rounded-lg">
                    <div className="flex items-center">
                      <div className={`p-1 rounded-full mr-2 ${
                        trend.isIncrease
                          ? 'bg-accent-warning-red/10 text-accent-warning-red'
                          : 'bg-secondary-growth-green/10 text-secondary-growth-green'
                      }`}>
                        {trend.isIncrease ? (
                          <ArrowTrendingUpIcon className="h-3 w-3" />
                        ) : (
                          <ArrowTrendingDownIcon className="h-3 w-3" />
                        )}
                      </div>
                      <span className="text-sm font-medium text-neutral-dark-gray">
                        {trend.category}
                      </span>
                    </div>
                    <span className={`text-sm font-semibold ${
                      trend.isIncrease ? 'text-accent-warning-red' : 'text-secondary-growth-green'
                    }`}>
                      {trend.isIncrease ? '+' : ''}{formatPercentage(trend.change)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Anomaly Detection */}
        {anomalyDetection && currentData.anomalies.length > 0 && (
          <Card>
            <CardHeader>
              <h4 className="font-semibold text-neutral-dark-gray flex items-center">
                <ExclamationTriangleIcon className="h-5 w-5 mr-2 text-accent-warning-red" />
                Spending Alerts
              </h4>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {currentData.anomalies.map((anomaly, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border ${getSeverityColor(anomaly.severity)}`}
                  >
                    <div className="flex items-start">
                      <ExclamationTriangleIcon className="h-4 w-4 mt-0.5 mr-2 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {anomaly.description}
                        </p>
                        <p className="text-xs mt-1 opacity-75">
                          Amount: {formatCurrency(anomaly.amount)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Insights */}
        <Card>
          <CardHeader>
            <h4 className="font-semibold text-neutral-dark-gray flex items-center">
              <CalendarIcon className="h-5 w-5 mr-2 text-primary-trust-blue" />
              Quick Insights
            </h4>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-neutral-gray">
              <div className="flex items-center">
                <span className="text-secondary-growth-green mr-2">•</span>
                Your housing costs are within the recommended 30% of income
              </div>
              <div className="flex items-center">
                <span className="text-accent-action-orange mr-2">•</span>
                Entertainment spending increased by 32% this month
              </div>
              <div className="flex items-center">
                <span className="text-secondary-growth-green mr-2">•</span>
                You saved 15% compared to last month on transportation
              </div>
              <div className="flex items-center">
                <span className="text-primary-trust-blue mr-2">•</span>
                Most spending occurs on weekends (62% of discretionary)
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
