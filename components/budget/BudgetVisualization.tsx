'use client';

import {
  ChartPieIcon,
  ChartBarIcon,
  ArrowsRightLeftIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import { useState } from 'react';

import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { formatCurrency, formatPercentage } from '@/lib/utils';

interface BudgetVisualizationProps {
  chartTypes?: string[]
  interactive?: boolean
  showComparison?: boolean
}

export function BudgetVisualization({
  chartTypes = ['pie', 'bar', 'sankey'],
  interactive = true,
  showComparison: showComparisonProp = true,
}: BudgetVisualizationProps) {
  const [activeChart, setActiveChart] = useState<'pie' | 'bar' | 'sankey'>('pie');
  const [showComparison, setShowComparison] = useState(showComparisonProp);

  // Mock budget data
  const budgetData = [
    { name: 'Housing', allocated: 1350, color: '#1E5A8D', essential: true },
    { name: 'Transportation', allocated: 810, color: '#27AE60', essential: true },
    { name: 'Food', allocated: 648, color: '#FF6B35', essential: true },
    { name: 'Utilities', allocated: 432, color: '#10B981', essential: true },
    { name: 'Savings', allocated: 1080, color: '#27AE60', essential: true },
    { name: 'Entertainment', allocated: 324, color: '#FF6B35', essential: false },
    { name: 'Personal', allocated: 162, color: '#10B981', essential: false },
    { name: 'Other', allocated: 108, color: '#6C757D', essential: false },
  ];

  const totalBudget = budgetData.reduce((sum, item) => sum + item.allocated, 0);
  const essentialSpending = budgetData.filter(item => item.essential).reduce((sum, item) => sum + item.allocated, 0);
  const nonEssentialSpending = budgetData.filter(item => !item.essential).reduce((sum, item) => sum + item.allocated, 0);

  // Recommended budget percentages (50/30/20 rule)
  const recommendations = {
    needs: totalBudget * 0.5,
    wants: totalBudget * 0.3,
    savings: totalBudget * 0.2,
  };

  const PieChart = () => {
    const centerX = 120;
    const centerY = 120;
    const radius = 80;
    let cumulativePercentage = 0;

    const createArc = (percentage: number, color: string, offset: number) => {
      const angle = (percentage / 100) * 360;
      const startAngle = (offset / 100) * 360 - 90;
      const endAngle = startAngle + angle;

      const x1 = centerX + radius * Math.cos((startAngle * Math.PI) / 180);
      const y1 = centerY + radius * Math.sin((startAngle * Math.PI) / 180);
      const x2 = centerX + radius * Math.cos((endAngle * Math.PI) / 180);
      const y2 = centerY + radius * Math.sin((endAngle * Math.PI) / 180);

      const largeArcFlag = angle > 180 ? 1 : 0;

      return `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
    };

    return (
      <div className="flex flex-col items-center">
        <svg width="240" height="240" className="mb-4">
          {budgetData.map((item, index) => {
            const percentage = (item.allocated / totalBudget) * 100;
            const path = createArc(percentage, item.color, cumulativePercentage);
            cumulativePercentage += percentage;

            return (
              <path
                key={index}
                d={path}
                fill={item.color}
                className="hover:opacity-80 transition-opacity cursor-pointer"
                aria-label={`${item.name}: ${formatPercentage(percentage)}`}
              />
            );
          })}

          {/* Center circle with total */}
          <circle cx={centerX} cy={centerY} r={40} fill="white" className="drop-shadow-sm" />
          <text x={centerX} y={centerY - 5} textAnchor="middle" className="text-xs font-medium fill-neutral-gray">
            Total Budget
          </text>
          <text x={centerX} y={centerY + 10} textAnchor="middle" className="text-sm font-bold fill-neutral-dark-gray">
            {formatCurrency(totalBudget)}
          </text>
        </svg>

        {/* Legend */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          {budgetData.map((item, index) => (
            <div key={index} className="flex items-center">
              <div
                className="w-3 h-3 rounded-full mr-2"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-neutral-dark-gray truncate">
                {item.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const BarChart = () => {
    const maxValue = Math.max(...budgetData.map(item => item.allocated));

    return (
      <div className="space-y-3">
        {budgetData.map((item, index) => {
          const percentage = (item.allocated / maxValue) * 100;

          return (
            <div key={index} className="flex items-center space-x-3">
              <div className="w-20 text-sm font-medium text-neutral-dark-gray truncate">
                {item.name}
              </div>
              <div className="flex-1 flex items-center">
                <div className="flex-1 bg-neutral-light-gray rounded-full h-6 relative overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300 flex items-center justify-end pr-2"
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: item.color,
                    }}
                  >
                    <span className="text-xs font-medium text-white">
                      {formatCurrency(item.allocated)}
                    </span>
                  </div>
                </div>
                <div className="ml-2 text-sm text-neutral-gray w-12">
                  {formatPercentage((item.allocated / totalBudget) * 100)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const SankeyDiagram = () => (
      <div className="space-y-6">
        {/* Income flow */}
        <div className="text-center">
          <div className="bg-secondary-growth-green text-white rounded-lg p-4 inline-block">
            <div className="text-sm">Monthly Income</div>
            <div className="text-xl font-bold">{formatCurrency(totalBudget)}</div>
          </div>
        </div>

        {/* Flow arrows and categories */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Needs */}
          <div className="text-center">
            <div className="bg-primary-trust-blue text-white rounded-lg p-3 mb-2">
              <div className="text-sm">Needs (50%)</div>
              <div className="text-lg font-bold">{formatCurrency(essentialSpending)}</div>
            </div>
            <div className="space-y-1 text-xs">
              {budgetData.filter(item => item.essential && item.name !== 'Savings').map(item => (
                <div key={item.name} className="flex justify-between bg-neutral-light-gray rounded px-2 py-1">
                  <span>{item.name}</span>
                  <span>{formatCurrency(item.allocated)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Wants */}
          <div className="text-center">
            <div className="bg-accent-action-orange text-white rounded-lg p-3 mb-2">
              <div className="text-sm">Wants (30%)</div>
              <div className="text-lg font-bold">{formatCurrency(nonEssentialSpending)}</div>
            </div>
            <div className="space-y-1 text-xs">
              {budgetData.filter(item => !item.essential).map(item => (
                <div key={item.name} className="flex justify-between bg-neutral-light-gray rounded px-2 py-1">
                  <span>{item.name}</span>
                  <span>{formatCurrency(item.allocated)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Savings */}
          <div className="text-center">
            <div className="bg-secondary-growth-green text-white rounded-lg p-3 mb-2">
              <div className="text-sm">Savings (20%)</div>
              <div className="text-lg font-bold">
                {formatCurrency(budgetData.find(item => item.name === 'Savings')?.allocated || 0)}
              </div>
            </div>
            <div className="text-xs bg-neutral-light-gray rounded px-2 py-1">
              Future Goals & Emergency Fund
            </div>
          </div>
        </div>
      </div>
    );

  const chartComponents = {
    pie: PieChart,
    bar: BarChart,
    sankey: SankeyDiagram,
  };

  const chartIcons = {
    pie: ChartPieIcon,
    bar: ChartBarIcon,
    sankey: ArrowsRightLeftIcon,
  };

  const chartLabels = {
    pie: 'Pie Chart',
    bar: 'Bar Chart',
    sankey: 'Flow Diagram',
  };

  const ActiveChartComponent = chartComponents[activeChart];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-neutral-dark-gray">
              Budget Visualization
            </h3>
            <p className="text-sm text-neutral-gray">
              Visual representation of your budget allocation
            </p>
          </div>

          <div className="flex items-center space-x-2">
            {showComparison && (
              <button
                onClick={() => setShowComparison(!showComparison)}
                className={`p-2 rounded-lg transition-colors ${
                  showComparison
                    ? 'bg-primary-trust-blue text-white'
                    : 'bg-neutral-light-gray text-neutral-gray hover:text-neutral-dark-gray'
                }`}
                title="Compare with recommendations"
              >
                <EyeIcon className="h-4 w-4" />
              </button>
            )}

            {interactive && (
              <div className="flex bg-neutral-light-gray rounded-lg p-1">
                {chartTypes.map((type) => {
                  const IconComponent = chartIcons[type as keyof typeof chartIcons];
                  return (
                    <button
                      key={type}
                      onClick={() => setActiveChart(type as any)}
                      className={`p-2 rounded-md transition-all duration-200 ${
                        activeChart === type
                          ? 'bg-white text-primary-trust-blue shadow-sm'
                          : 'text-neutral-gray hover:text-neutral-dark-gray'
                      }`}
                      title={chartLabels[type as keyof typeof chartLabels]}
                    >
                      <IconComponent className="h-4 w-4" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="mb-6">
          <ActiveChartComponent />
        </div>

        {/* Budget Health Indicators */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center bg-neutral-light-gray/50 rounded-lg p-3">
            <div className="text-sm text-neutral-gray">Essential</div>
            <div className="text-lg font-bold text-primary-trust-blue">
              {formatPercentage((essentialSpending / totalBudget) * 100)}
            </div>
          </div>
          <div className="text-center bg-neutral-light-gray/50 rounded-lg p-3">
            <div className="text-sm text-neutral-gray">Discretionary</div>
            <div className="text-lg font-bold text-accent-action-orange">
              {formatPercentage((nonEssentialSpending / totalBudget) * 100)}
            </div>
          </div>
          <div className="text-center bg-neutral-light-gray/50 rounded-lg p-3">
            <div className="text-sm text-neutral-gray">Savings Rate</div>
            <div className="text-lg font-bold text-secondary-growth-green">
              {formatPercentage(((budgetData.find(item => item.name === 'Savings')?.allocated || 0) / totalBudget) * 100)}
            </div>
          </div>
        </div>

        {/* Recommendations (if comparison is enabled) */}
        {showComparison && (
          <div className="bg-primary-trust-blue/5 rounded-lg p-4">
            <h4 className="font-medium text-primary-trust-blue mb-3">
              💡 Budget Recommendations (50/30/20 Rule)
            </h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <div className="text-neutral-gray">Recommended Needs</div>
                <div className="font-bold text-neutral-dark-gray">
                  {formatCurrency(recommendations.needs)}
                </div>
                <div className={`text-xs ${
                  essentialSpending <= recommendations.needs
                    ? 'text-secondary-growth-green'
                    : 'text-accent-warning-red'
                }`}>
                  Current: {formatCurrency(essentialSpending)}
                </div>
              </div>
              <div className="text-center">
                <div className="text-neutral-gray">Recommended Wants</div>
                <div className="font-bold text-neutral-dark-gray">
                  {formatCurrency(recommendations.wants)}
                </div>
                <div className={`text-xs ${
                  nonEssentialSpending <= recommendations.wants
                    ? 'text-secondary-growth-green'
                    : 'text-accent-warning-red'
                }`}>
                  Current: {formatCurrency(nonEssentialSpending)}
                </div>
              </div>
              <div className="text-center">
                <div className="text-neutral-gray">Recommended Savings</div>
                <div className="font-bold text-neutral-dark-gray">
                  {formatCurrency(recommendations.savings)}
                </div>
                <div className={`text-xs ${
                  (budgetData.find(item => item.name === 'Savings')?.allocated || 0) >= recommendations.savings
                    ? 'text-secondary-growth-green'
                    : 'text-accent-warning-red'
                }`}>
                  Current: {formatCurrency(budgetData.find(item => item.name === 'Savings')?.allocated || 0)}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
