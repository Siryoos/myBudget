import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppProvider } from '@/contexts/AppProvider';
import DashboardPage from '@/app/[locale]/dashboard/page';

// Mock components that use dynamic imports
jest.mock('@/components/lazy', () => ({
  LazyBudgetSummary: () => <div data-testid="budget-summary">Budget Summary</div>,
  LazyInsightsPanel: () => <div data-testid="insights-panel">Insights Panel</div>,
  LazyRecentTransactions: () => <div data-testid="recent-transactions">Recent Transactions</div>,
  LazyOnboardingChecklist: () => <div data-testid="onboarding-checklist">Onboarding Checklist</div>,
}));

// Mock the tour component
jest.mock('@/components/dashboard/DashboardTour', () => ({
  DashboardTour: () => null,
}));

// Mock the feedback system
jest.mock('@/components/ui/FeedbackSystem', () => ({
  useFeedback: () => ({
    saveSuccess: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  }),
}));

// Helper function to render with providers
const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <AppProvider>
      {component}
    </AppProvider>
  );
};

describe('Dashboard User Flow', () => {
  it('renders all main dashboard components', async () => {
    renderWithProviders(<DashboardPage />);

    // Wait for lazy-loaded components
    await waitFor(() => {
      expect(screen.getByTestId('onboarding-checklist')).toBeInTheDocument();
      expect(screen.getByTestId('budget-summary')).toBeInTheDocument();
      expect(screen.getByTestId('insights-panel')).toBeInTheDocument();
      expect(screen.getByTestId('recent-transactions')).toBeInTheDocument();
    });

    // Check for non-lazy components
    expect(screen.getByText(/good/i)).toBeInTheDocument(); // Welcome header
    expect(screen.getByText(/quick save/i)).toBeInTheDocument();
  });

  it('allows user to save money using quick save widget', async () => {
    const user = userEvent.setup();
    renderWithProviders(<DashboardPage />);

    // Find quick save widget
    const quickSaveSection = screen.getByText(/quick save/i).closest('div');
    expect(quickSaveSection).toBeInTheDocument();

    // Click on $25 preset amount
    const twentyFiveButton = within(quickSaveSection!).getByRole('button', { name: /\$25/i });
    await user.click(twentyFiveButton);

    // Click save button
    const saveButton = within(quickSaveSection!).getByRole('button', { name: /save/i });
    await user.click(saveButton);

    // Should show loading state
    expect(saveButton).toBeDisabled();
    expect(within(saveButton).getByRole('status')).toBeInTheDocument();

    // Wait for save to complete (mocked delay)
    await waitFor(() => {
      expect(saveButton).not.toBeDisabled();
    }, { timeout: 2000 });
  });

  it('allows user to enter custom save amount', async () => {
    const user = userEvent.setup();
    renderWithProviders(<DashboardPage />);

    const quickSaveSection = screen.getByText(/quick save/i).closest('div');

    // Click custom amount button
    const customButton = within(quickSaveSection!).getByRole('button', { name: /custom/i });
    await user.click(customButton);

    // Enter custom amount
    const customInput = within(quickSaveSection!).getByRole('textbox');
    await user.clear(customInput);
    await user.type(customInput, '123.45');

    // Save custom amount
    const saveButton = within(quickSaveSection!).getByRole('button', { name: /save/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(saveButton).not.toBeDisabled();
    });
  });

  it('displays savings overview with proper data', async () => {
    renderWithProviders(<DashboardPage />);

    // Look for savings overview section
    const savingsSection = await screen.findByText(/total savings/i);
    expect(savingsSection).toBeInTheDocument();

    // Should show monthly progress
    expect(screen.getByText(/this month/i)).toBeInTheDocument();

    // Should show goal progress
    expect(screen.getByText(/goals/i)).toBeInTheDocument();
  });

  it('handles responsive layout for mobile', () => {
    // Mock mobile viewport
    global.innerWidth = 375;
    global.innerHeight = 812;
    global.dispatchEvent(new Event('resize'));

    renderWithProviders(<DashboardPage />);

    // Check for mobile-specific layouts
    const budgetSummaryDetails = screen.getByTestId('budget-summary').closest('details');
    expect(budgetSummaryDetails).toHaveClass('lg:open');

    const recentTransactionsDetails = screen.getByTestId('recent-transactions').closest('details');
    expect(recentTransactionsDetails).toHaveClass('lg:open');
  });
});

describe('Dashboard Accessibility', () => {
  it('has proper heading hierarchy', () => {
    renderWithProviders(<DashboardPage />);

    const headings = screen.getAllByRole('heading');
    expect(headings.length).toBeGreaterThan(0);

    // First heading should be h1
    const h1 = headings.find(h => h.tagName === 'H1');
    expect(h1).toBeInTheDocument();
  });

  it('supports keyboard navigation', async () => {
    const user = userEvent.setup();
    renderWithProviders(<DashboardPage />);

    // Tab through interactive elements
    await user.tab();
    expect(document.activeElement).toHaveAttribute('type');

    // Continue tabbing
    await user.tab();
    await user.tab();
    
    // Should be able to activate buttons with keyboard
    if (document.activeElement?.getAttribute('role') === 'button') {
      await user.keyboard('{Enter}');
    }
  });

  it('has proper ARIA labels', () => {
    renderWithProviders(<DashboardPage />);

    // Check for main content area
    const main = screen.getByRole('main');
    expect(main).toHaveAttribute('id', 'main-content');

    // Check for labeled regions
    const navigation = screen.queryByRole('navigation');
    if (navigation) {
      expect(navigation).toHaveAttribute('aria-label');
    }
  });

  it('announces dynamic content changes', async () => {
    renderWithProviders(<DashboardPage />);

    // Look for live regions
    const liveRegions = screen.getAllByRole('status');
    expect(liveRegions.length).toBeGreaterThan(0);

    // Check for polite announcements
    const politeRegion = screen.queryByRole('status', { hidden: true });
    if (politeRegion) {
      expect(politeRegion).toHaveAttribute('aria-live', 'polite');
    }
  });
});

describe('Dashboard Error Handling', () => {
  it('displays error state when data fails to load', async () => {
    // Mock API failure
    const mockFetch = jest.spyOn(global, 'fetch');
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    renderWithProviders(<DashboardPage />);

    // Wait for error states
    await waitFor(() => {
      const errorMessages = screen.queryAllByText(/error|failed|retry/i);
      expect(errorMessages.length).toBeGreaterThan(0);
    }, { timeout: 5000 });

    mockFetch.mockRestore();
  });

  it('allows retry after error', async () => {
    const user = userEvent.setup();
    const mockFetch = jest.spyOn(global, 'fetch');
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    renderWithProviders(<DashboardPage />);

    // Wait for retry button
    const retryButton = await screen.findByRole('button', { name: /retry/i });
    
    // Mock successful retry
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: {} }),
    } as Response);

    await user.click(retryButton);

    // Should attempt to reload
    expect(mockFetch).toHaveBeenCalledTimes(2);

    mockFetch.mockRestore();
  });
});

describe('Dashboard Internationalization', () => {
  it('displays translated content', () => {
    renderWithProviders(<DashboardPage />);

    // All text should be using translation keys or have defaults
    const allText = screen.getAllByText(/./);
    
    allText.forEach(element => {
      const text = element.textContent || '';
      // Should either be a translation key or have proper fallback
      expect(text).toBeTruthy();
    });
  });

  it('handles RTL layout correctly', () => {
    // Set RTL locale
    document.documentElement.dir = 'rtl';
    
    renderWithProviders(<DashboardPage />);

    // Check for RTL-specific classes
    const elements = screen.getAllByText(/./);
    elements.forEach(element => {
      const classes = element.className;
      if (classes.includes('ml-')) {
        // Should have corresponding mr- for RTL
        expect(classes).toMatch(/mr-|rtl:|ltr:/);
      }
    });

    // Reset
    document.documentElement.dir = 'ltr';
  });
});