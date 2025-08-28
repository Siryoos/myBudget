'use client';

import {
  LightBulbIcon,
  ChartBarIcon,
  UserGroupIcon,
  ArrowRightIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import React, { useState, useCallback, useEffect, useMemo } from 'react';

import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { useAuth } from '@/contexts/AuthContext';
import { actionHandler } from '@/lib/action-handler';
// Removed old hooks - using mock data for now until insights service is implemented
import { useTranslation } from '@/lib/useTranslation';
import { formatCurrency } from '@/lib/utils';
import type { FinancialInsight, InsightAction } from '@/types';

import { getMockInsights, getMockSavingTips, getMockPeerComparisons } from './insights-data';

type TabType = 'tips' | 'recommendations' | 'peers'

interface InsightsPanelProps {
  showSavingTips?: boolean
  personalizedRecommendations?: boolean
  comparePeers?: boolean
}

/**
 * InsightsPanel — a dashboard panel that displays saving tips, personalized recommendations,
 * and peer comparisons in three switchable tabs.
 *
 * Renders mock data for tips, recommendations, and peer comparisons (used until a real
 * insights service is available). Handles insight actions (navigate, execute, external)
 * and provides a dismiss callback for individual insights.
 *
 * @param showSavingTips - If true, shows the "Tips" tab (default: true).
 * @param personalizedRecommendations - If true, shows the "Recommendations" tab (default: true).
 * @param comparePeers - If true, shows the "Peers" tab (default: true).
 *
 * @returns A React element containing the insights card with tabbed content.
 */
export function InsightsPanel({
  showSavingTips = true,
  personalizedRecommendations = true,
  comparePeers = true,
}: InsightsPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('tips');
  const { t, ready } = useTranslation('dashboard');
  const router = useRouter();
  const { user } = useAuth();

  // Use mock data for now - insights service will be implemented later
  const mockInsights = useMemo(() => getMockInsights(t), [t]);
  const insights = mockInsights;
  const insightsLoading = false;
  const dashboardLoading = false;

  // Generate tips and comparisons from mock data
  const savingTips = useMemo(() => getMockSavingTips(t), [t]);
  const peerComparisons = useMemo(() => getMockPeerComparisons(t), [t]);

  // Mock dismiss function
  const dismissInsight = (id: string) => {
    console.log('Dismiss insight:', id);
  };

  const handleInsightAction = useCallback(async (action: InsightAction) => {
    switch (action.type) {
      case 'navigate':
        router.push(action.target);
        break;
      case 'execute':
        // Handle custom actions via action handler
        const result = await actionHandler.executeAction(action, {
          userId: user?.id,
          data: action.data,
        });
        if (!result.success && result.message) {
          console.error('Action failed:', result.message);
        }
        break;
      case 'external':
        window.open(action.target, '_blank', 'noopener,noreferrer');
        break;
    }
  }, [router, user]);

  const renderContent = () => {
    if (!ready || insightsLoading || dashboardLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-trust-blue mx-auto mb-4"></div>
            <p className="text-neutral-gray">{t('common:status.loading')}</p>
          </div>
        </div>
      );
    }

    switch (activeTab) {
      case 'tips':
        return (
          <div className="space-y-4">
            {savingTips.map((tip) => (
              <div key={tip.id} className="p-4 bg-neutral-light-gray/50 rounded-lg">
                <div className="flex items-start space-x-3">
                  <span className="text-2xl">{tip.icon}</span>
                  <div className="flex-1">
                    <h4 className="font-medium text-neutral-charcoal mb-1">
                      {tip.title}
                    </h4>
                    <p className="text-sm text-neutral-gray mb-2">
                      {tip.description}
                    </p>
                    <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                      tip.difficulty === t('difficulty.easy')
                        ? 'bg-secondary-growth-green/10 text-secondary-growth-green'
                        : tip.difficulty === t('difficulty.medium')
                        ? 'bg-accent-warm-orange/10 text-accent-warm-orange'
                        : 'bg-accent-coral-red/10 text-accent-coral-red'
                    }`}>
                      {tip.difficulty}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        );

      case 'recommendations':
        return (
          <div className="space-y-4">
            {insights.map((insight) => (
              <div key={insight.id} className="p-4 bg-white rounded-lg shadow-sm border border-neutral-gray/10">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-neutral-charcoal mb-1">
                      {insight.title}
                    </h4>
                    <p className="text-sm text-neutral-gray mb-3">
                      {insight.description}
                    </p>
                    <div className="flex items-center gap-2">
                      {insight.actions?.map((action) => (
                        <Button
                          key={action.id}
                          variant="outline"
                          size="small"
                          onClick={() => handleInsightAction(action)}
                          className="text-xs"
                        >
                          {action.label}
                          <ArrowRightIcon className="w-3 h-3 ml-1" />
                        </Button>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => dismissInsight(insight.id)}
                    className="ml-4 text-neutral-gray/50 hover:text-neutral-gray"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        );

      case 'peers':
        return (
          <div className="space-y-4">
            {peerComparisons.map((comparison, index) => (
              <div key={index} className="p-4 bg-white rounded-lg shadow-sm border border-neutral-gray/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-neutral-charcoal">
                    {comparison.metric}
                  </span>
                  <span className={`text-sm font-medium ${
                    comparison.better ? 'text-secondary-growth-green' : 'text-accent-coral-red'
                  }`}>
                    {comparison.better ? '↑' : '↓'} {comparison.userValue}{comparison.unit}
                  </span>
                </div>
                <div className="relative h-2 bg-neutral-gray/10 rounded-full overflow-hidden">
                  <div
                    className="absolute top-0 left-0 h-full bg-primary-trust-blue rounded-full"
                    style={{ width: `${(comparison.userValue / (comparison.peerAverage * 2)) * 100}%` }}
                  />
                  <div
                    className="absolute top-0 h-full w-0.5 bg-neutral-charcoal"
                    style={{ left: '50%' }}
                  />
                </div>
                <p className="text-xs text-neutral-gray mt-2">
                  {t('comparisons.peerAverage')}: {comparison.peerAverage}{comparison.unit}
                </p>
              </div>
            ))}
          </div>
        );
    }
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <h3 className="text-lg font-semibold text-neutral-charcoal">
          {t('insights.title')}
        </h3>
        <div className="flex space-x-2 mt-4">
          {showSavingTips && (
            <button
              onClick={() => setActiveTab('tips')}
              className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'tips'
                  ? 'bg-primary-trust-blue text-white'
                  : 'bg-neutral-light-gray text-neutral-gray hover:bg-neutral-gray/20'
              }`}
            >
              <LightBulbIcon className="w-4 h-4 mr-2" />
              {t('insights.tabs.tips')}
            </button>
          )}
          {personalizedRecommendations && (
            <button
              onClick={() => setActiveTab('recommendations')}
              className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'recommendations'
                  ? 'bg-primary-trust-blue text-white'
                  : 'bg-neutral-light-gray text-neutral-gray hover:bg-neutral-gray/20'
              }`}
            >
              <ChartBarIcon className="w-4 h-4 mr-2" />
              {t('insights.tabs.recommendations')}
            </button>
          )}
          {comparePeers && (
            <button
              onClick={() => setActiveTab('peers')}
              className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'peers'
                  ? 'bg-primary-trust-blue text-white'
                  : 'bg-neutral-light-gray text-neutral-gray hover:bg-neutral-gray/20'
              }`}
            >
              <UserGroupIcon className="w-4 h-4 mr-2" />
              {t('insights.tabs.peers')}
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {renderContent()}
      </CardContent>
    </Card>
  );
}
