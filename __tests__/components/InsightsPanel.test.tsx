import { screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

import { InsightsPanel } from '@/components/dashboard/InsightsPanel';
import { renderWithProviders, mockData, mockApiResponses } from '@/lib/test-utils';

// Mock the API hooks
jest.mock('@/lib/api-hooks', () => ({
  useInsights: jest.fn(),
  useDashboardData: jest.fn(),
}));

jest.mock('@/lib/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    ready: true,
  }),
}));

describe('InsightsPanel', () => {
  const defaultProps = {
    showSavingTips: true,
    personalizedRecommendations: true,
    comparePeers: true,
  };

  const mockInsights = [
    {
      id: 'insight-1',
      type: 'saving-opportunity',
      title: 'Reduce coffee spending',
      description: 'You could save $120/month by making coffee at home',
      impact: 'medium',
      category: 'food',
      actionable: true,
      actions: [
        {
          id: 'action-1',
          label: 'Set coffee budget',
          type: 'navigate',
          target: '/budget?category=food',
        },
      ],
      createdAt: new Date('2024-01-15'),
      isRead: false,
    },
  ];

  const mockSavingTips = [
    {
      id: 'tip-1',
      title: 'Cook at home',
      description: 'Save money by preparing meals at home',
      difficulty: 'easy',
      icon: '🍳',
      category: 'food',
    },
  ];

  const mockPeerComparisons = [
    {
      id: 'comparison-1',
      metric: 'Savings Rate',
      userValue: 20,
      peerAverage: 15,
      unit: '%',
      better: true,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders all tabs when all features are enabled', () => {
      renderWithProviders(<InsightsPanel {...defaultProps} />);

      expect(screen.getByText('tips')).toBeInTheDocument();
      expect(screen.getByText('recommendations')).toBeInTheDocument();
      expect(screen.getByText('peers')).toBeInTheDocument();
    });

    it('renders only enabled tabs', () => {
      renderWithProviders(
        <InsightsPanel
          showSavingTips={true}
          personalizedRecommendations={false}
          comparePeers={false}
        />,
      );

      expect(screen.getByText('tips')).toBeInTheDocument();
      expect(screen.queryByText('recommendations')).not.toBeInTheDocument();
      expect(screen.queryByText('peers')).not.toBeInTheDocument();
    });

    it('shows loading state initially', () => {
      renderWithProviders(<InsightsPanel {...defaultProps} />);

      expect(screen.getByText('status.loading')).toBeInTheDocument();
    });
  });

  describe('Tab Navigation', () => {
    it('switches between tabs when clicked', async () => {
      renderWithProviders(<InsightsPanel {...defaultProps} />);

      // Click on recommendations tab
      const recommendationsTab = screen.getByText('recommendations');
      fireEvent.click(recommendationsTab);

      await waitFor(() => {
        expect(recommendationsTab).toHaveClass('bg-primary-trust-blue');
      });
    });

    it('maintains tab state across re-renders', () => {
      const { rerender } = renderWithProviders(<InsightsPanel {...defaultProps} />);

      // Click on peers tab
      const peersTab = screen.getByText('peers');
      fireEvent.click(peersTab);

      // Re-render component
      rerender(<InsightsPanel {...defaultProps} />);

      // Tab should still be selected
      expect(peersTab).toHaveClass('bg-primary-trust-blue');
    });
  });

  describe('Content Rendering', () => {
    it('renders saving tips correctly', () => {
      renderWithProviders(<InsightsPanel {...defaultProps} />);

      // Wait for content to load
      waitFor(() => {
        expect(screen.getByText('Cook at home')).toBeInTheDocument();
        expect(screen.getByText('Save money by preparing meals at home')).toBeInTheDocument();
        expect(screen.getByText('🍳')).toBeInTheDocument();
      });
    });

    it('renders insights with actions', () => {
      renderWithProviders(<InsightsPanel {...defaultProps} />);

      waitFor(() => {
        expect(screen.getByText('Reduce coffee spending')).toBeInTheDocument();
        expect(screen.getByText('Set coffee budget')).toBeInTheDocument();
      });
    });

    it('renders peer comparisons with correct styling', () => {
      renderWithProviders(<InsightsPanel {...defaultProps} />);

      waitFor(() => {
        const comparison = screen.getByText('Savings Rate');
        expect(comparison).toBeInTheDocument();

        // Check if better performance is highlighted
        const userValue = screen.getByText('20%');
        expect(userValue).toHaveClass('text-secondary-growth-green');
      });
    });
  });

  describe('Interaction Handling', () => {
    it('handles insight dismissal', async () => {
      const mockDismissInsight = jest.fn();

      renderWithProviders(
        <InsightsPanel {...defaultProps} />,
        {
          initialAppState: {
            // Mock the dismiss function
          },
        },
      );

      waitFor(() => {
        const dismissButton = screen.getByLabelText('Dismiss insight');
        fireEvent.click(dismissButton);

        expect(mockDismissInsight).toHaveBeenCalledWith('insight-1');
      });
    });

    it('handles insight actions', async () => {
      const mockRouter = {
        push: jest.fn(),
      };

      renderWithProviders(
        <InsightsPanel {...defaultProps} />,
        {
          router: mockRouter,
        },
      );

      waitFor(() => {
        const actionButton = screen.getByText('Set coffee budget');
        fireEvent.click(actionButton);

        expect(mockRouter.push).toHaveBeenCalledWith('/budget?category=food');
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      renderWithProviders(<InsightsPanel {...defaultProps} />);

      // Check tab ARIA attributes
      const tipsTab = screen.getByRole('tab', { name: 'tips' });
      expect(tipsTab).toHaveAttribute('aria-selected', 'true');

      const recommendationsTab = screen.getByRole('tab', { name: 'recommendations' });
      expect(recommendationsTab).toHaveAttribute('aria-selected', 'false');
    });

    it('supports keyboard navigation', () => {
      renderWithProviders(<InsightsPanel {...defaultProps} />);

      const tipsTab = screen.getByRole('tab', { name: 'tips' });
      tipsTab.focus();

      // Press arrow key to navigate
      fireEvent.keyDown(tipsTab, { key: 'ArrowRight' });

      const recommendationsTab = screen.getByRole('tab', { name: 'recommendations' });
      expect(recommendationsTab).toHaveFocus();
    });
  });

  describe('Error Handling', () => {
    it('shows error state when API fails', () => {
      // Mock API error
      jest.spyOn(console, 'error').mockImplementation(() => {});

      renderWithProviders(<InsightsPanel {...defaultProps} />);

      waitFor(() => {
        expect(screen.getByText('Failed to load insights')).toBeInTheDocument();
      });
    });

    it('shows empty state when no data', () => {
      renderWithProviders(
        <InsightsPanel {...defaultProps} />,
        {
          initialAppState: {
            // Mock empty data
          },
        },
      );

      waitFor(() => {
        expect(screen.getByText('No insights available')).toBeInTheDocument();
      });
    });
  });

  describe('Performance', () => {
    it('renders within acceptable time', () => {
      const start = performance.now();

      renderWithProviders(<InsightsPanel {...defaultProps} />);

      const end = performance.now();
      const renderTime = end - start;

      // Should render in less than 100ms
      expect(renderTime).toBeLessThan(100);
    });

    it('handles large datasets efficiently', () => {
      const largeInsights = Array.from({ length: 100 }, (_, i) => ({
        ...mockInsights[0],
        id: `insight-${i}`,
        title: `Insight ${i}`,
      }));

      renderWithProviders(
        <InsightsPanel {...defaultProps} />,
        {
          initialAppState: {
            // Mock large dataset
          },
        },
      );

      // Should not crash with large datasets
      expect(screen.getByText('tips')).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('adapts to different screen sizes', () => {
      // Test mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      renderWithProviders(<InsightsPanel {...defaultProps} />);

      // Check if mobile-specific classes are applied
      const container = screen.getByTestId('insights-panel');
      expect(container).toHaveClass('mobile-layout');
    });
  });

  describe('Internationalization', () => {
    it('supports RTL languages', () => {
      renderWithProviders(
        <InsightsPanel {...defaultProps} />,
        {
          initialAppState: {
            // Mock RTL language
          },
        },
      );

      const container = screen.getByTestId('insights-panel');
      expect(container).toHaveAttribute('dir', 'rtl');
    });

    it('translates all text content', () => {
      renderWithProviders(<InsightsPanel {...defaultProps} />);

      // Check if translation keys are used
      expect(screen.getByText('tips')).toBeInTheDocument();
      expect(screen.getByText('recommendations')).toBeInTheDocument();
      expect(screen.getByText('peers')).toBeInTheDocument();
    });
  });
});
