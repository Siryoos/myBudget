'use client'

import { useState, useEffect } from 'react'
import { 
  ExclamationTriangleIcon,
  AdjustmentsHorizontalIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { formatCurrency, formatPercentage, sanitizeNumberInput } from '@/lib/utils'
import type { BudgetCategory } from '@/types'

interface BudgetAllocatorProps {
  visualAllocation?: boolean
  dragAndDrop?: boolean
  warningThresholds?: boolean
}

export function BudgetAllocator({
  visualAllocation = true,
  warningThresholds = true,
}: BudgetAllocatorProps) {
  const [monthlyIncome] = useState(5400) // This would come from the IncomeManager
  const [categories, setCategories] = useState<BudgetCategory[]>([
    { id: '1', name: 'Housing', allocated: 1350, spent: 0, remaining: 1350, color: '#1E5A8D', isEssential: true },
    { id: '2', name: 'Transportation', allocated: 810, spent: 0, remaining: 810, color: '#27AE60', isEssential: true },
    { id: '3', name: 'Food', allocated: 648, spent: 0, remaining: 648, color: '#FF6B35', isEssential: true },
    { id: '4', name: 'Utilities', allocated: 432, spent: 0, remaining: 432, color: '#10B981', isEssential: true },
    { id: '5', name: 'Insurance', allocated: 270, spent: 0, remaining: 270, color: '#4A8BC2', isEssential: true },
    { id: '6', name: 'Healthcare', allocated: 216, spent: 0, remaining: 216, color: '#DC3545', isEssential: true },
    { id: '7', name: 'Savings', allocated: 1080, spent: 0, remaining: 1080, color: '#27AE60', isEssential: true },
    { id: '8', name: 'Entertainment', allocated: 324, spent: 0, remaining: 324, color: '#FF6B35', isEssential: false },
    { id: '9', name: 'Personal', allocated: 162, spent: 0, remaining: 162, color: '#10B981', isEssential: false },
    { id: '10', name: 'Other', allocated: 108, spent: 0, remaining: 108, color: '#6C757D', isEssential: false },
  ])

  const totalAllocated = categories.reduce((sum, cat) => sum + cat.allocated, 0)
  const remainingIncome = monthlyIncome - totalAllocated
  const isOverBudget = totalAllocated > monthlyIncome

  const handleAllocationChange = (categoryId: string, newAmount: number) => {
    setCategories(prev => 
      prev.map(cat => 
        cat.id === categoryId 
          ? { ...cat, allocated: newAmount, remaining: newAmount - cat.spent }
          : cat
      )
    )
  }

  const getWarningLevel = (allocated: number, income: number) => {
    const percentage = (allocated / income) * 100
    if (percentage > 50) return 'high'
    if (percentage > 30) return 'medium'
    return 'low'
  }

  const getWarningColor = (level: string) => {
    switch (level) {
      case 'high':
        return 'text-accent-warning-red bg-accent-warning-red/10'
      case 'medium':
        return 'text-accent-action-orange bg-accent-action-orange/10'
      default:
        return 'text-secondary-growth-green bg-secondary-growth-green/10'
    }
  }

  // Auto-balance based on 50/30/20 rule as default
  const autoBalance = () => {
    const needs = monthlyIncome * 0.5
    const wants = monthlyIncome * 0.3
    const savings = monthlyIncome * 0.2

    const essentialCategories = categories.filter(cat => cat.isEssential && cat.name !== 'Savings')
    const nonEssentialCategories = categories.filter(cat => !cat.isEssential)
    
    // Distribute needs among essential categories (excluding savings)
    const needsPerCategory = needs / essentialCategories.length
    
    // Distribute wants among non-essential categories
    const wantsPerCategory = wants / Math.max(nonEssentialCategories.length, 1)

    setCategories(prev => 
      prev.map(cat => {
        if (cat.name === 'Savings') {
          return { ...cat, allocated: savings, remaining: savings - cat.spent }
        } else if (cat.isEssential) {
          return { ...cat, allocated: needsPerCategory, remaining: needsPerCategory - cat.spent }
        } else {
          return { ...cat, allocated: wantsPerCategory, remaining: wantsPerCategory - cat.spent }
        }
      })
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="bg-primary-trust-blue/10 rounded-lg p-2 mr-3">
              <AdjustmentsHorizontalIcon className="h-6 w-6 text-primary-trust-blue" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-neutral-dark-gray">
                Budget Allocation
              </h3>
              <p className="text-sm text-neutral-gray">
                Distribute your {formatCurrency(monthlyIncome)} monthly income
              </p>
            </div>
          </div>
          
          <button
            onClick={autoBalance}
            className="text-sm text-primary-trust-blue hover:text-primary-trust-blue-dark font-medium"
          >
            Auto-Balance (50/30/20)
          </button>
        </div>
      </CardHeader>

      <CardContent>
        {/* Budget Status */}
        <div className={`rounded-lg p-4 mb-6 ${
          isOverBudget 
            ? 'bg-accent-warning-red/10 border border-accent-warning-red/20' 
            : remainingIncome === 0
              ? 'bg-secondary-growth-green/10 border border-secondary-growth-green/20'
              : 'bg-accent-action-orange/10 border border-accent-action-orange/20'
        }`}>
          <div className="flex items-center mb-2">
            {isOverBudget ? (
              <ExclamationTriangleIcon className="h-5 w-5 text-accent-warning-red mr-2" />
            ) : remainingIncome === 0 ? (
              <CheckCircleIcon className="h-5 w-5 text-secondary-growth-green mr-2" />
            ) : (
              <AdjustmentsHorizontalIcon className="h-5 w-5 text-accent-action-orange mr-2" />
            )}
            <h4 className={`font-medium ${
              isOverBudget 
                ? 'text-accent-warning-red' 
                : remainingIncome === 0
                  ? 'text-secondary-growth-green'
                  : 'text-accent-action-orange'
            }`}>
              {isOverBudget 
                ? 'Over Budget' 
                : remainingIncome === 0
                  ? 'Perfectly Balanced'
                  : 'Unallocated Income'
              }
            </h4>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-gray">
              {isOverBudget 
                ? `Reduce spending by ${formatCurrency(Math.abs(remainingIncome))}`
                : remainingIncome === 0
                  ? 'Every dollar has been allocated'
                  : `${formatCurrency(remainingIncome)} remaining to allocate`
              }
            </span>
            <span className="font-semibold">
              {formatCurrency(totalAllocated)} / {formatCurrency(monthlyIncome)}
            </span>
          </div>
        </div>

        {/* Category Allocation */}
        <div className="space-y-4">
          {categories.map((category) => {
            const percentage = (category.allocated / monthlyIncome) * 100
            const warningLevel = warningThresholds ? getWarningLevel(category.allocated, monthlyIncome) : 'low'
            
            return (
              <div key={category.id} className="bg-neutral-light-gray/30 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <div 
                      className="w-4 h-4 rounded-full mr-3"
                      style={{ backgroundColor: category.color }}
                    />
                    <div>
                      <h4 className="font-medium text-neutral-dark-gray flex items-center">
                        {category.name}
                        {category.isEssential && (
                          <span className="ml-2 text-xs px-2 py-1 bg-primary-trust-blue/10 text-primary-trust-blue rounded-full">
                            Essential
                          </span>
                        )}
                      </h4>
                      <p className="text-sm text-neutral-gray">
                        {formatPercentage(percentage)} of income
                      </p>
                    </div>
                  </div>
                  
                  {warningThresholds && warningLevel !== 'low' && (
                    <span className={`text-xs px-2 py-1 rounded-full ${getWarningColor(warningLevel)}`}>
                      {warningLevel === 'high' ? 'High %' : 'Medium %'}
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-4">
                  <div className="flex-1">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-neutral-gray text-sm">$</span>
                      </div>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={category.allocated}
                        onChange={(e) => handleAllocationChange(category.id, sanitizeNumberInput(e.target.value))}
                        className="block w-full pl-7 pr-3 py-2 border border-neutral-gray/30 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-trust-blue focus:border-primary-trust-blue"
                      />
                    </div>
                  </div>
                  
                  {visualAllocation && (
                    <div className="flex-1">
                      <ProgressBar
                        value={category.allocated}
                        max={monthlyIncome}
                        size="sm"
                        color={percentage > 50 ? 'danger' : percentage > 30 ? 'warning' : 'primary'}
                        showPercentage={false}
                      />
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Budget Summary */}
        <div className="mt-6 bg-white rounded-lg border border-neutral-gray/20 p-4">
          <h4 className="font-medium text-neutral-dark-gray mb-3">
            Budget Summary
          </h4>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-sm text-neutral-gray">Monthly Income</div>
              <div className="text-lg font-bold text-neutral-dark-gray">
                {formatCurrency(monthlyIncome)}
              </div>
            </div>
            
            <div>
              <div className="text-sm text-neutral-gray">Total Allocated</div>
              <div className={`text-lg font-bold ${
                isOverBudget ? 'text-accent-warning-red' : 'text-neutral-dark-gray'
              }`}>
                {formatCurrency(totalAllocated)}
              </div>
            </div>
            
            <div>
              <div className="text-sm text-neutral-gray">Remaining</div>
              <div className={`text-lg font-bold ${
                remainingIncome < 0 ? 'text-accent-warning-red' : 'text-secondary-growth-green'
              }`}>
                {formatCurrency(remainingIncome)}
              </div>
            </div>
            
            <div>
              <div className="text-sm text-neutral-gray">Savings Rate</div>
              <div className="text-lg font-bold text-secondary-growth-green">
                {formatPercentage((categories.find(c => c.name === 'Savings')?.allocated || 0) / monthlyIncome * 100)}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
