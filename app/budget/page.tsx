import { Metadata } from 'next'
import { BudgetMethodSelector } from '@/components/budget/BudgetMethodSelector'
import { IncomeManager } from '@/components/budget/IncomeManager'
import { BudgetAllocator } from '@/components/budget/BudgetAllocator'
import { BudgetVisualization } from '@/components/budget/BudgetVisualization'
import BudgetHeader from '@/components/budget/BudgetHeader'

export const metadata: Metadata = {
  title: 'Budget Planner',
  description: 'Create and manage your budget with proven methods',
}

export default function BudgetPage() {
  return (
    <div className="space-y-6" id="main-content">
      {/* Page Header */}
      <BudgetHeader />

      {/* Budget Method Selection */}
      <BudgetMethodSelector />

      {/* Main Budget Planning Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Input and Configuration */}
        <div className="space-y-6">
          <IncomeManager 
            allowMultipleSources={true}
            recurringIncomeTracking={true}
            irregularIncomeSupport={true}
          />
          
          <BudgetAllocator
            visualAllocation={true}
            dragAndDrop={true}
            warningThresholds={true}
          />
        </div>

        {/* Right Column - Visualization */}
        <div>
          <BudgetVisualization 
            chartTypes={['pie', 'bar', 'sankey']}
            interactive={true}
            showComparison={true}
          />
        </div>
      </div>
    </div>
  )
}
