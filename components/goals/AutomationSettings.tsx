'use client';

import {
  CogIcon,
  ArrowPathIcon,
  BoltIcon,
  BanknotesIcon,
  CalendarIcon,
  PlusIcon,
  MinusIcon,
} from '@heroicons/react/24/outline';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { useTranslation } from '@/lib/useTranslation';
import { formatCurrency } from '@/lib/utils';

interface AutomationSettingsProps {
  autoTransfer?: boolean
  roundUpSavings?: boolean
  ruleBasedSaving?: boolean
  customRules?: boolean
}

/**
 * Renders the Savings Automation settings card with configurable tabs and local UI state.
 *
 * Displays up to three tabs—Auto Transfer, Round Up, and Smart Rules—controlled by the boolean props.
 * Uses client-side i18n readiness to show a centered loading spinner until translations are ready.
 * All interactive controls update local component state; no network requests or external side effects are performed.
 *
 * @param autoTransfer - When true, shows the "Auto Transfer" tab (default: true).
 * @param roundUpSavings - When true, shows the "Round Up" tab (default: true).
 * @param ruleBasedSaving - When true, shows the "Smart Rules" tab (default: true).
 * @param customRules - Accepted prop but not currently used to alter rendering (default: true).
 * @returns The AutomationSettings React element.
 */
export function AutomationSettings({
  autoTransfer = true,
  roundUpSavings = true,
  ruleBasedSaving = true,
  customRules = true,
}: AutomationSettingsProps) {
  const { t, ready } = useTranslation('goals');
  const [activeTab, setActiveTab] = useState<'transfers' | 'roundup' | 'rules'>('transfers');
  const [transferAmount, setTransferAmount] = useState('HTTP_OK');
  const [transferFrequency, setTransferFrequency] = useState('weekly');

  if (!ready) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-trust-blue mx-auto mb-4"></div>
        <p className="text-neutral-gray">Loading automation settings...</p>
      </div>
    );
  }

  const TabButton = ({
    tab,
    label,
    icon: Icon,
    isActive,
    onClick,
  }: {
    tab: string
    label: string
    icon: any
    isActive: boolean
    onClick: () => void
  }) => (
    <button
      onClick={onClick}
      className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
        isActive
          ? 'bg-primary-trust-blue text-white'
          : 'text-neutral-gray hover:text-neutral-dark-gray hover:bg-neutral-light-gray'
      }`}
    >
      <Icon className="h-4 w-4 mr-2" />
      {label}
    </button>
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center">
          <div className="bg-primary-trust-blue/10 rounded-lg p-2 mr-3">
            <CogIcon className="h-6 w-6 text-primary-trust-blue" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-neutral-dark-gray">
              {t('automation.title', { defaultValue: 'Savings Automation' })}
            </h3>
            <p className="text-sm text-neutral-gray">
              {t('automation.subtitle', { defaultValue: 'Set up automatic savings to reach your goals faster' })}
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-2 mt-4">
          {autoTransfer && (
            <TabButton
              tab="transfers"
              label={t('automation.tabs.autoTransfer', { defaultValue: 'Auto Transfer' })}
              icon={ArrowPathIcon}
              isActive={activeTab === 'transfers'}
              onClick={() => setActiveTab('transfers')}
            />
          )}
          {roundUpSavings && (
            <TabButton
              tab="roundup"
              label={t('automation.tabs.roundUp', { defaultValue: 'Round Up' })}
              icon={BoltIcon}
              isActive={activeTab === 'roundup'}
              onClick={() => setActiveTab('roundup')}
            />
          )}
          {ruleBasedSaving && (
            <TabButton
              tab="rules"
              label={t('automation.tabs.smartRules', { defaultValue: 'Smart Rules' })}
              icon={CogIcon}
              isActive={activeTab === 'rules'}
              onClick={() => setActiveTab('rules')}
            />
          )}
        </div>
      </CardHeader>

      <CardContent>
        {/* Auto Transfers Tab */}
        {activeTab === 'transfers' && (
          <div className="space-y-6">
            <div>
              <h4 className="font-medium text-neutral-dark-gray mb-3">
                {t('automation.transfers.title', { defaultValue: 'Automatic Transfers' })}
              </h4>
              <p className="text-sm text-neutral-gray mb-4">
                {t('automation.transfers.description', { defaultValue: 'Set up recurring transfers from your checking to savings account' })}
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-dark-gray mb-2">
                    {t('automation.transfers.frequency', { defaultValue: 'Frequency' })}
                  </label>
                  <select
                    value={transferFrequency}
                    onChange={(e) => setTransferFrequency(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-gray/30 rounded-lg focus:ring-2 focus:ring-primary-trust-blue focus:border-transparent"
                  >
                    <option value="weekly">{t('automation.transfers.frequencies.weekly', { defaultValue: 'Weekly' })}</option>
                    <option value="biweekly">{t('automation.transfers.frequencies.biweekly', { defaultValue: 'Bi-weekly' })}</option>
                    <option value="monthly">{t('automation.transfers.frequencies.monthly', { defaultValue: 'Monthly' })}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-dark-gray mb-2">
                    {t('automation.transfers.amount', { defaultValue: 'Transfer Amount' })}
                  </label>
                  <input
                    type="number"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-gray/30 rounded-lg focus:ring-2 focus:ring-primary-trust-blue focus:border-transparent"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <Button className="mt-4 w-full">
                {t('automation.transfers.setup', { defaultValue: 'Set Up Auto Transfer' })}
              </Button>
            </div>

            {/* Active Transfers */}
            <div>
              <h5 className="font-medium text-neutral-dark-gray mb-3">
                {t('automation.transfers.active', { defaultValue: 'Active Transfers' })}
              </h5>
              <div className="bg-neutral-light-gray/50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <ArrowPathIcon className="h-5 w-5 text-primary-trust-blue mr-2" />
                    <div>
                      <div className="font-medium text-neutral-dark-gray">
                        {transferFrequency} ${transferAmount}
                      </div>
                      <div className="text-sm text-neutral-gray">
                        {t('automation.transfers.nextTransfer', { defaultValue: 'Next transfer: Tomorrow' })}
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    {t('automation.transfers.edit', { defaultValue: 'Edit' })}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Round Up Tab */}
        {activeTab === 'roundup' && (
          <div className="space-y-6">
            <div>
              <h4 className="font-medium text-neutral-dark-gray mb-3">
                {t('automation.roundUp.title', { defaultValue: 'Round Up Savings' })}
              </h4>
              <p className="text-sm text-neutral-gray mb-4">
                {t('automation.roundUp.description', { defaultValue: 'Automatically round up your purchases and save the difference' })}
              </p>

              <div className="bg-neutral-light-gray/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm text-neutral-gray">
                    {t('automation.roundUp.example', { defaultValue: 'Example:' })}
                  </div>
                  <div className="text-sm text-neutral-gray">
                    {t('automation.roundUp.coffee', { defaultValue: 'Coffee: $4.67' })}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-neutral-gray">
                    {t('automation.roundUp.rounded', { defaultValue: 'Rounded to:' })}
                  </div>
                  <div className="text-sm text-neutral-gray">$5.00</div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-neutral-gray">
                    {t('automation.roundUp.saved', { defaultValue: 'Saved:' })}
                  </div>
                  <div className="text-sm font-medium text-secondary-growth-green">$0.33</div>
                </div>
              </div>

              <Button className="mt-4 w-full">
                {t('automation.roundUp.enable', { defaultValue: 'Enable Round Up' })}
              </Button>
            </div>
          </div>
        )}

        {/* Smart Rules Tab */}
        {activeTab === 'rules' && (
          <div className="space-y-6">
            <div>
              <h4 className="font-medium text-neutral-dark-gray mb-3">
                {t('automation.rules.title', { defaultValue: 'Smart Saving Rules' })}
              </h4>
              <p className="text-sm text-neutral-gray mb-4">
                {t('automation.rules.description', { defaultValue: 'Create custom rules to save money automatically based on your spending patterns' })}
              </p>

              <div className="space-y-3">
                <div className="bg-neutral-light-gray/50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h6 className="font-medium text-neutral-dark-gray">
                      {t('automation.rules.rule1.title', { defaultValue: 'Spend Less, Save More' })}
                    </h6>
                    <div className="text-xs text-secondary-growth-green">
                      {t('automation.rules.active', { defaultValue: 'Active' })}
                    </div>
                  </div>
                  <p className="text-sm text-neutral-gray mb-2">
                    {t('automation.rules.rule1.description', { defaultValue: 'When you spend less than your budget, automatically save 50% of the difference' })}
                  </p>
                  <div className="text-xs text-neutral-gray">
                    {t('automation.rules.savedThisMonth', { defaultValue: 'Saved this month: $45.20' })}
                  </div>
                </div>

                <div className="bg-neutral-light-gray/50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h6 className="font-medium text-neutral-dark-gray">
                      {t('automation.rules.rule2.title', { defaultValue: 'Payday Boost' })}
                    </h6>
                    <div className="text-xs text-neutral-gray">
                      {t('automation.rules.inactive', { defaultValue: 'Inactive' })}
                    </div>
                  </div>
                  <p className="text-sm text-neutral-gray mb-2">
                    {t('automation.rules.rule2.description', { defaultValue: 'Save $100 automatically on every payday' })}
                  </p>
                </div>
              </div>

              <Button className="mt-4 w-full">
                {t('automation.rules.createRule', { defaultValue: 'Create New Rule' })}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
