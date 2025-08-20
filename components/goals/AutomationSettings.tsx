'use client'

import { useState } from 'react'
import { 
  CogIcon,
  BoltIcon,
  ArrowPathIcon,
  PlusIcon,
  XMarkIcon,
  CheckIcon
} from '@heroicons/react/24/outline'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { formatCurrency } from '@/lib/utils'
import type { AutomationRule } from '@/types'

interface AutomationSettingsProps {
  autoTransfer?: boolean
  roundUpSavings?: boolean
  ruleBasedSaving?: boolean
  customRules?: boolean
}

export function AutomationSettings({
  autoTransfer = true,
  roundUpSavings = true,
  ruleBasedSaving = true,
  customRules = true,
}: AutomationSettingsProps) {
  const [activeTab, setActiveTab] = useState<'transfers' | 'roundup' | 'rules'>('transfers')
  const [showNewRule, setShowNewRule] = useState(false)
  
  // Mock automation rules
  const [automationRules, setAutomationRules] = useState<AutomationRule[]>([
    {
      id: '1',
      type: 'fixed',
      amount: 200,
      frequency: 'weekly',
      isActive: true,
    },
    {
      id: '2',
      type: 'percentage',
      percentage: 10,
      frequency: 'monthly',
      isActive: true,
      conditions: [
        { field: 'income', operator: 'greater_than', value: 3000 }
      ],
    },
    {
      id: '3',
      type: 'round-up',
      frequency: 'daily',
      isActive: true,
    },
  ])

  const [newRule, setNewRule] = useState<{
    type: 'fixed' | 'percentage' | 'remainder'
    amount: string
    percentage: string
    frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly'
  }>({
    type: 'fixed',
    amount: '',
    percentage: '',
    frequency: 'monthly',
  })

  const handleAddRule = () => {
    const rule: AutomationRule = {
      id: Date.now().toString(),
      type: newRule.type,
      amount: newRule.type === 'fixed' ? parseFloat(newRule.amount) : undefined,
      percentage: newRule.type === 'percentage' && newRule.percentage ? parseFloat(newRule.percentage) : undefined,
      frequency: newRule.frequency,
      isActive: true,
    }

    setAutomationRules(prev => [...prev, rule])
    setNewRule({ type: 'fixed', amount: '', percentage: '', frequency: 'monthly' })
    setShowNewRule(false)
  }

  const toggleRule = (ruleId: string) => {
    setAutomationRules(prev =>
      prev.map(rule =>
        rule.id === ruleId ? { ...rule, isActive: !rule.isActive } : rule
      )
    )
  }

  const deleteRule = (ruleId: string) => {
    setAutomationRules(prev => prev.filter(rule => rule.id !== ruleId))
  }

  const formatRuleDescription = (rule: AutomationRule) => {
    let description = ''
    
    switch (rule.type) {
      case 'fixed':
        description = `Save ${formatCurrency(rule.amount || 0)} ${rule.frequency}`
        break
      case 'percentage':
        description = `Save ${rule.percentage}% of income ${rule.frequency}`
        break
      case 'round-up':
        description = `Round up purchases and save the difference`
        break
      case 'remainder':
        description = `Save remaining budget at month end`
        break
    }

    if (rule.conditions && rule.conditions.length > 0) {
      description += ` (when conditions met)`
    }

    return description
  }

  const TabButton = ({ 
    tab, 
    label, 
    icon: Icon 
  }: { 
    tab: 'transfers' | 'roundup' | 'rules'
    label: string
    icon: any
  }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
        activeTab === tab
          ? 'bg-primary-trust-blue text-white'
          : 'text-neutral-gray hover:text-neutral-dark-gray hover:bg-neutral-light-gray'
      }`}
    >
      <Icon className="h-4 w-4 mr-2" />
      {label}
    </button>
  )

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center">
          <div className="bg-primary-trust-blue/10 rounded-lg p-2 mr-3">
            <CogIcon className="h-6 w-6 text-primary-trust-blue" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-neutral-dark-gray">
              Savings Automation
            </h3>
            <p className="text-sm text-neutral-gray">
              Set up automatic savings to reach your goals faster
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-2 mt-4">
          {autoTransfer && (
            <TabButton tab="transfers" label="Auto Transfer" icon={ArrowPathIcon} />
          )}
          {roundUpSavings && (
            <TabButton tab="roundup" label="Round Up" icon={BoltIcon} />
          )}
          {ruleBasedSaving && (
            <TabButton tab="rules" label="Smart Rules" icon={CogIcon} />
          )}
        </div>
      </CardHeader>

      <CardContent>
        {/* Auto Transfers Tab */}
        {activeTab === 'transfers' && autoTransfer && (
          <div className="space-y-4">
            <div className="bg-secondary-growth-green/5 rounded-lg p-4 border border-secondary-growth-green/20">
              <div className="flex items-center mb-3">
                <ArrowPathIcon className="h-5 w-5 text-secondary-growth-green mr-2" />
                <h4 className="font-medium text-secondary-growth-green">
                  Automatic Transfers
                </h4>
              </div>
              <p className="text-sm text-neutral-gray mb-4">
                Set up recurring transfers from your checking to savings account.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-dark-gray mb-1">
                    Transfer Amount
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-neutral-gray">$</span>
                    </div>
                    <input
                      type="number"
                      min="0"
                      step="10"
                      placeholder="200"
                      className="input-field pl-7"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-neutral-dark-gray mb-1">
                    Frequency
                  </label>
                  <select className="input-field">
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Bi-weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              </div>
              
              <div className="mt-4">
                <Button variant="secondary" size="sm">
                  Set Up Auto Transfer
                </Button>
              </div>
            </div>

            {/* Current Auto Transfers */}
            <div>
              <h5 className="font-medium text-neutral-dark-gray mb-3">Active Transfers</h5>
              <div className="space-y-2">
                {automationRules.filter(rule => rule.type === 'fixed').map(rule => (
                  <div key={rule.id} className="flex items-center justify-between p-3 bg-neutral-light-gray/50 rounded-lg">
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-3 ${rule.isActive ? 'bg-secondary-growth-green' : 'bg-neutral-gray'}`} />
                      <div>
                        <div className="font-medium text-neutral-dark-gray">
                          {formatCurrency(rule.amount || 0)} {rule.frequency}
                        </div>
                        <div className="text-xs text-neutral-gray">
                          Next transfer: Tomorrow
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => toggleRule(rule.id)}
                        className={`p-1 rounded-full transition-colors ${
                          rule.isActive ? 'text-secondary-growth-green' : 'text-neutral-gray'
                        }`}
                      >
                        <CheckIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => deleteRule(rule.id)}
                        className="p-1 rounded-full text-neutral-gray hover:text-accent-warning-red transition-colors"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Round Up Tab */}
        {activeTab === 'roundup' && roundUpSavings && (
          <div className="space-y-4">
            <div className="bg-accent-action-orange/5 rounded-lg p-4 border border-accent-action-orange/20">
              <div className="flex items-center mb-3">
                <BoltIcon className="h-5 w-5 text-accent-action-orange mr-2" />
                <h4 className="font-medium text-accent-action-orange">
                  Round-Up Savings
                </h4>
              </div>
              <p className="text-sm text-neutral-gray mb-4">
                Automatically round up your purchases and save the change.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-dark-gray mb-1">
                    Round-Up Multiplier
                  </label>
                  <select className="input-field">
                    <option value="1">1x (round to nearest $1)</option>
                    <option value="2">2x (double the round-up)</option>
                    <option value="5">5x (multiply by 5)</option>
                    <option value="10">10x (multiply by 10)</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-neutral-dark-gray mb-1">
                    Destination Goal
                  </label>
                  <select className="input-field">
                    <option>Emergency Fund</option>
                    <option>Dream Vacation</option>
                    <option>General Savings</option>
                  </select>
                </div>
              </div>

              <div className="bg-white rounded-lg p-3 mb-4">
                <h5 className="font-medium text-neutral-dark-gray mb-2">Example</h5>
                <div className="text-sm text-neutral-gray space-y-1">
                  <div>Coffee purchase: $4.25 → Round up: $0.75</div>
                  <div>Gas purchase: $32.10 → Round up: $0.90</div>
                  <div>Grocery shopping: $67.33 → Round up: $0.67</div>
                  <div className="font-medium text-secondary-growth-green pt-2 border-t">
                    Weekly savings: ~$15-25
                  </div>
                </div>
              </div>
              
              <Button variant="secondary" size="sm">
                Enable Round-Up Savings
              </Button>
            </div>

            {/* Round-up Statistics */}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center bg-neutral-light-gray/50 rounded-lg p-3">
                <div className="text-lg font-bold text-secondary-growth-green">$47.83</div>
                <div className="text-sm text-neutral-gray">This Month</div>
              </div>
              <div className="text-center bg-neutral-light-gray/50 rounded-lg p-3">
                <div className="text-lg font-bold text-secondary-growth-green">$523.19</div>
                <div className="text-sm text-neutral-gray">Total Saved</div>
              </div>
            </div>
          </div>
        )}

        {/* Smart Rules Tab */}
        {activeTab === 'rules' && ruleBasedSaving && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-neutral-dark-gray">Smart Saving Rules</h4>
              {customRules && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNewRule(true)}
                  disabled={showNewRule}
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Add Rule
                </Button>
              )}
            </div>

            {/* New Rule Form */}
            {showNewRule && (
              <div className="bg-white border border-neutral-gray/30 rounded-lg p-4 space-y-4">
                <h5 className="font-medium text-neutral-dark-gray">Create New Rule</h5>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-dark-gray mb-1">
                      Rule Type
                    </label>
                    <select
                      value={newRule.type}
                      onChange={(e) => setNewRule(prev => ({ ...prev, type: e.target.value as any }))}
                      className="input-field"
                    >
                      <option value="fixed">Fixed Amount</option>
                      <option value="percentage">Percentage</option>
                      <option value="remainder">Remainder</option>
                    </select>
                  </div>
                  
                  {newRule.type === 'fixed' && (
                    <div>
                      <label className="block text-sm font-medium text-neutral-dark-gray mb-1">
                        Amount
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-neutral-gray">$</span>
                        </div>
                        <input
                          type="number"
                          min="0"
                          value={newRule.amount}
                          onChange={(e) => setNewRule(prev => ({ ...prev, amount: e.target.value }))}
                          className="input-field pl-7"
                          placeholder="100"
                        />
                      </div>
                    </div>
                  )}
                  
                  {newRule.type === 'percentage' && (
                    <div>
                      <label className="block text-sm font-medium text-neutral-dark-gray mb-1">
                        Percentage
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={newRule.percentage}
                          onChange={(e) => setNewRule(prev => ({ ...prev, percentage: e.target.value }))}
                          className="input-field pr-8"
                          placeholder="10"
                        />
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                          <span className="text-neutral-gray">%</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium text-neutral-dark-gray mb-1">
                      Frequency
                    </label>
                    <select
                      value={newRule.frequency}
                      onChange={(e) => setNewRule(prev => ({ ...prev, frequency: e.target.value as any }))}
                      className="input-field"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="biweekly">Bi-weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                </div>
                
                <div className="flex items-center justify-end space-x-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowNewRule(false)
                      setNewRule({ type: 'fixed', amount: '', percentage: '', frequency: 'monthly' })
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleAddRule}
                    disabled={
                      (newRule.type === 'fixed' && !newRule.amount) ||
                      (newRule.type === 'percentage' && !newRule.percentage)
                    }
                  >
                    Create Rule
                  </Button>
                </div>
              </div>
            )}

            {/* Existing Rules */}
            <div className="space-y-3">
              {automationRules.map(rule => (
                <div key={rule.id} className="flex items-center justify-between p-3 bg-neutral-light-gray/50 rounded-lg">
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full mr-3 ${rule.isActive ? 'bg-secondary-growth-green' : 'bg-neutral-gray'}`} />
                    <div>
                      <div className="font-medium text-neutral-dark-gray">
                        {formatRuleDescription(rule)}
                      </div>
                      <div className="text-xs text-neutral-gray">
                        {rule.isActive ? 'Active' : 'Paused'} • Last executed: 2 days ago
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => toggleRule(rule.id)}
                      className={`p-1 rounded-full transition-colors ${
                        rule.isActive ? 'text-secondary-growth-green' : 'text-neutral-gray'
                      }`}
                    >
                      <CheckIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => deleteRule(rule.id)}
                      className="p-1 rounded-full text-neutral-gray hover:text-accent-warning-red transition-colors"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Automation Insights */}
            <div className="bg-primary-trust-blue/5 rounded-lg p-4">
              <h5 className="font-medium text-primary-trust-blue mb-2">
                💡 Automation Insights
              </h5>
              <div className="text-sm text-neutral-gray space-y-1">
                <div>• Your current rules save approximately {formatCurrency(680)} per month</div>
                <div>• You're on track to save {formatCurrency(8160)} this year through automation</div>
                <div>• Consider adding a percentage-based rule for bonus income</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
