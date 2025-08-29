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
import { Card, CardContent, CardHeader, CardLoading, CardError } from '@/components/ui/Card';
import { useAuth } from '@/contexts/AuthContext';
import { actionHandler } from '@/lib/action-handler';
// Removed old hooks - using mock data for now until insights service is implemented
import { useTranslation } from '@/lib/useTranslation';
import { formatCurrency } from '@/lib/utils';
import type { FinancialInsight, InsightAction } from '@/types';

import { getMockInsights, getMockSavingTips, getMockPeerComparisons } from './insights-data';

type TabType = 'tips' | 'recommendations' | 'peers'

// TabButton component for accessible tab navigation
const TabButton = React.memo(({ tab, activeTab, onClick, Icon, label, isRTL = false }: {
  tab: TabType;
  activeTab: TabType;
  onClick: (tab: TabType) => void;
  Icon: React.ComponentType<{ className?: string }>;
  label: string;
  isRTL?: boolean;
}) => {
  return (
    <button
      id={`${tab}-tab`}
      role="tab"
      aria-selected={activeTab === tab}
      aria-controls={`${tab}-panel`}
      tabIndex={activeTab === tab ? 0 : -1}
      onClick={() => onClick(tab)}
      className={`flex items-center justify-center sm:justify-start px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all duration-200 flex-1 sm:flex-none min-w-0 min-h-[44px] touch-manipulation ${
        activeTab === tab
          ? 'bg-primary-trust-blue text-white'
          : 'text-neutral-gray hover:text-neutral-dark-gray hover:bg-neutral-light-gray'
      }`}
    >
      <Icon className={`h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0 ${isRTL ? 'ml-1 sm:ml-2' : 'mr-1 sm:mr-2'}`} />
      <span className="truncate text-xs sm:text-sm">{label}</span>
    </button>
  );
});

TabButton.displayName = 'TabButton';

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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState<string>('');
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
  const dismissInsight = (_id: string) => {};

  // Handle tab keyboard navigation
  const handleTabKeyDown = useCallback((e: React.KeyboardEvent) => {
    const tabs: TabType[] = [];
    if (showSavingTips) tabs.push('tips');
    if (personalizedRecommendations) tabs.push('recommendations');
    if (comparePeers) tabs.push('peers');

    const currentIndex = tabs.indexOf(activeTab);

    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault();
        setActiveTab(tabs[(currentIndex + 1) % tabs.length]);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault();
        setActiveTab(tabs[(currentIndex - 1 + tabs.length) % tabs.length]);
        break;
      case 'Home':
        e.preventDefault();
        setActiveTab(tabs[0]);
        break;
      case 'End':
        e.preventDefault();
        setActiveTab(tabs[tabs.length - 1]);
        break;
    }
  }, [activeTab, showSavingTips, personalizedRecommendations, comparePeers]);

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
    if (!ready || insightsLoading || dashboardLoading || isLoading) {
      return (
        <div className="flex items-center justify-center h-64" role="status" aria-live="polite">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-trust-blue mx-auto mb-4"></div>
            <p className="text-neutral-gray">{t('common:status.loading', { defaultValue: 'Loading...' })}</p>
          </div>
        </div>
      );
    }

    if (error) {
      return <CardError message={error} onRetry={() => setError(null)} />;
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
                    <div className="flex items-center justify-between">
                      <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                        tip.difficulty === t('difficulty.easy')
                          ? 'bg-secondary-growth-green/10 text-secondary-growth-green'
                          : tip.difficulty === t('difficulty.medium')
                          ? 'bg-accent-warm-orange/10 text-accent-warm-orange'
                          : 'bg-accent-coral-red/10 text-accent-coral-red'
                      }`}>
                        {tip.difficulty}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setAnnouncement(`Tip "${tip.title}" selected`);
                          // In a real app, this would navigate to tip details or start a challenge
                        }}
                        aria-label={`Try tip: ${tip.title}`}
                      >
                        {t('insights.tryTip', { defaultValue: 'Try This Tip' })}
                      </Button>
                    </div>
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

  // Detect RTL language support
  const isRTL = typeof window !== 'undefined' && document.documentElement.dir === 'rtl';

  // Announce changes to screen readers
  useEffect(() => {
    if (announcement) {
      const timeout = setTimeout(() => setAnnouncement(''), 1000);
      return () => clearTimeout(timeout);
    }
  }, [announcement]);

  // Announce tab changes and manage focus
  useEffect(() => {
    const tabLabels = {
      tips: t('insights.tabs.tips', { defaultValue: 'Tips' }),
      recommendations: t('insights.tabs.recommendations', { defaultValue: 'Recommendations' }),
      peers: t('insights.tabs.peers', { defaultValue: 'Peers' })
    };
    setAnnouncement(`${tabLabels[activeTab]} tab selected`);

    // Set focus to the active tab button
    const activeButton = document.getElementById(`${activeTab}-tab`);
    if (activeButton) {
      activeButton.focus();
    }
  }, [activeTab, t]);

  if (!ready) {
    return <CardLoading title={t('insights.loading', { defaultValue: 'Loading insights...' })} />;
  }

  return (
    <>
      {/* Screen reader announcements */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </div>

      <Card className="h-full">
        <CardHeader>
          <div className={`flex items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className={`bg-accent-action-orange/10 rounded-lg p-2 ${isRTL ? 'ml-3' : 'mr-3'}`}>
              <LightBulbIcon className="h-6 w-6 text-accent-action-orange" />
            </div>
            <div className={isRTL ? 'text-right' : 'text-left'}>
              <h3 className="text-lg font-semibold text-neutral-dark-gray">
                {t('insights.title', { defaultValue: 'Financial Insights' })}
              </h3>
              <p className="text-sm text-neutral-gray">
                {t('insights.subtitle', { defaultValue: 'Personalized recommendations to improve your finances' })}
              </p>
            </div>
          </div>

          {/* Tab Navigation */}
          <div
            role="tablist"
            aria-label={t('insights.title', { defaultValue: 'Financial Insights' })}
            className={`flex flex-col sm:flex-row gap-1 sm:space-x-1 mt-4 bg-neutral-light-gray rounded-lg p-1 overflow-hidden ${isRTL ? 'sm:flex-row-reverse' : ''}`}
            onKeyDown={handleTabKeyDown}
          >
            {showSavingTips && (
              <TabButton
                tab="tips"
                activeTab={activeTab}
                onClick={setActiveTab}
                Icon={LightBulbIcon}
                label={t('insights.tabs.tips', { defaultValue: 'Tips' })}
                isRTL={isRTL}
              />
            )}
            {personalizedRecommendations && (
              <TabButton
                tab="recommendations"
                activeTab={activeTab}
                onClick={setActiveTab}
                Icon={ChartBarIcon}
                label={t('insights.tabs.recommendations', { defaultValue: 'Recommendations' })}
                isRTL={isRTL}
              />
            )}
            {comparePeers && (
              <TabButton
                tab="peers"
                activeTab={activeTab}
                onClick={setActiveTab}
                Icon={UserGroupIcon}
                label={t('insights.tabs.peers', { defaultValue: 'Peers' })}
                isRTL={isRTL}
              />
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div
            id={`${activeTab}-panel`}
            role="tabpanel"
            aria-labelledby={`${activeTab}-tab`}
            tabIndex={0}
          >
            {renderContent()}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
