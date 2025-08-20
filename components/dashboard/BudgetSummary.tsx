'use client'

import { useState } from 'react'
import { 
  ExclamationTriangleIcon,
  ChartPieIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Button } from '@/components/ui/Button'
import { formatCurrency, formatPercentage, getBudgetCategoryColor } from '@/lib/utils'
import type { BudgetCategory } from '@/types'

interface BudgetSummaryProps {
  showCategories?: boolean
  showSpendingAlerts?: boolean
  visualType?: 'donutChart' | 'progressBars' | 'list'
}

export function BudgetSummary({
  showCategories = true,
  showSpendingAlerts = true,
  visualType = 'donutChart',
}: BudgetSummaryProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month'>('month')

  // Mock budget data
  const budgetData: BudgetCategory[] = [
    { id: '1', name: 'Housing', allocated: 1200, spent: 1200, remaining: 0, color: '#1E5A8D', isEssential: true },
    { id: '2', name: 'Food', allocated: 400, spent: 320, remaining: 80, color: '#27AE60', isEssential: true },
    { id: '3', name: 'Transportation', allocated: 300, spent: 280, remaining: 20, color: '#FF6B35', isEssential: true },
    { id: '4', name: 'Entertainment', allocated: 200, spent: 250, remaining: -50, color: '#DC3545', isEssential: false },
    { id: '5', name: 'Shopping', allocated: 150, spent: 90, remaining: 60, color: '#10B981', isEssential: false },
    { id: '6', name: 'Healthcare', allocated: 100, spent: 45, remaining: 55, color: '#4A8BC2', isEssential: true },
  ]

  const totalAllocated = budgetData.reduce((sum, cat) => sum + cat.allocated, 0)
  const totalSpent = budgetData.reduce((sum, cat) => sum + cat.spent, 0)
  const totalRemaining = totalAllocated - totalSpent
  const overBudgetCategories = budgetData.filter(cat => cat.spent > cat.allocated)

  const DonutChart = () => {
    const centerX = 80
    const centerY = 80
    const radius = 60
    let cumulativePercentage = 0

    const createArc = (percentage: number, color: string, offset: number) => {
      const angle = (percentage / 100) * 360
      const startAngle = (offset / 100) * 360 - 90
      const endAngle = startAngle + angle
      
      const x1 = centerX + radius * Math.cos((startAngle * Math.PI) / 180)
      const y1 = centerY + radius * Math.sin((startAngle * Math.PI) / 180)
      const x2 = centerX + radius * Math.cos((endAngle * Math.PI) / 180)
      const y2 = centerY + radius * Math.sin((endAngle * Math.PI) / 180)
      
      const largeArcFlag = angle > 180 ? 1 : 0
      
      return `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`
    }

    return (
      <div className="flex items-center justify-center">
        <svg width="160" height="160" className="transform -rotate-90">
          {budgetData.map((category, index) => {
            const percentage = (category.spent / totalSpent) * 100
            const path = createArc(percentage, category.color, cumulativePercentage)
            cumulativePercentage += percentage
            
            return (
              <path
                key={category.id}
                d={path}
                fill={category.color}
                className="hover:opacity-80 transition-opacity cursor-pointer"
                title={`${category.name}: ${formatPercentage(percentage)}`}
              />
            )
          })}
          {/* Center circle */}
          <circle
            cx={centerX}
            cy={centerY}
            r={30}
            fill="white"
            className="drop-shadow-sm"
          />
          <text
            x={centerX}
            y={centerY - 5}
            textAnchor="middle"
            className="text-xs font-semibold fill-neutral-dark-gray"
            transform={`rotate(90 ${centerX} ${centerY})`}
          >
            Spent
          </text>
          <text
            x={centerX}
            y={centerY + 8}
            textAnchor="middle"
            className="text-sm font-bold fill-neutral-dark-gray"
            transform={`rotate(90 ${centerX} ${centerY})`}
          >
            {formatPercentage((totalSpent / totalAllocated) * 100)}
          </text>
        </svg>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <ChartPieIcon className="h-6 w-6 text-primary-trust-blue mr-2" />
            <div>
              <h3 className="text-lg font-semibold text-neutral-dark-gray">
                Budget Overview
              </h3>
              <p className="text-sm text-neutral-gray">
                {formatCurrency(totalSpent)} of {formatCurrency(totalAllocated)} spent
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value as 'week' | 'month')}
              className="text-sm border border-neutral-gray/30 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary-trust-blue"
            >
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Spending Alerts */}
        {showSpendingAlerts && overBudgetCategories.length > 0 && (
          <div className="mb-6 bg-accent-warning-red/10 border border-accent-warning-red/20 rounded-lg p-4">
            <div className="flex items-start">
              <ExclamationTriangleIcon className="h-5 w-5 text-accent-warning-red mt-0.5 mr-3 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="font-medium text-accent-warning-red mb-1">
                  Budget Alerts
                </h4>
                <p className="text-sm text-neutral-dark-gray">
                  {overBudgetCategories.length} {overBudgetCategories.length === 1 ? 'category is' : 'categories are'} over budget:
                </p>
                <ul className="mt-2 space-y-1">
                  {overBudgetCategories.map(category => (
                    <li key={category.id} className="text-sm text-neutral-gray">
                      <span className="font-medium">{category.name}</span> - 
                      {formatCurrency(Math.abs(category.remaining))} over
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Visualization */}
          <div className="flex flex-col items-center">
            {visualType === 'donutChart' && <DonutChart />}
            
            <div className="mt-4 text-center">
              <div className="text-2xl font-bold text-neutral-dark-gray">
                {formatCurrency(totalRemaining)}
              </div>
              <div className="text-sm text-neutral-gray">
                {totalRemaining >= 0 ? 'Remaining' : 'Over Budget'}
              </div>
            </div>
          </div>

          {/* Categories List */}
          {showCategories && (
            <div className="space-y-3">
              <h4 className="font-semibold text-neutral-dark-gray mb-3">
                Category Breakdown
              </h4>
              
              {budgetData.map(category => {
                const percentage = (category.spent / category.allocated) * 100
                const isOverBudget = category.spent > category.allocated
                
                return (
                  <div key={category.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div 
                          className="w-3 h-3 rounded-full mr-2"
                          style={{ backgroundColor: category.color }}
                        />
                        <span className="text-sm font-medium text-neutral-dark-gray">
                          {category.name}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm font-semibold ${getBudgetCategoryColor(category.spent, category.allocated)}`}>
                          {formatCurrency(category.spent)}
                        </div>
                        <div className="text-xs text-neutral-gray">
                          of {formatCurrency(category.allocated)}
                        </div>
                      </div>
                    </div>
                    
                    <ProgressBar
                      value={category.spent}
                      max={category.allocated}
                      size="sm"
                      color={isOverBudget ? 'danger' : percentage > 80 ? 'warning' : 'success'}
                      className="mb-1"
                    />
                  </div>
                )
              })}
              
              <div className="pt-3 border-t border-neutral-gray/20">
                <Button variant="outline" size="sm" className="w-full">
                  <span>View Full Budget</span>
                  <ArrowRightIcon className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
