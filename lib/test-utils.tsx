import type { RenderOptions } from '@testing-library/react';
import { render } from '@testing-library/react';
import type { NextRouter } from 'next/router';
import React from 'react';
import type { ReactElement } from 'react';

// Note: These context providers would need to exist
// For now, we'll create mock versions
const MockAppProvider: React.FC<{ children: React.ReactNode; initialState?: unknown }> = ({ children }) => <div data-testid="app-provider">{children}</div>;
const MockAuthProvider: React.FC<{ children: React.ReactNode; initialState?: unknown }> = ({ children }) => <div data-testid="auth-provider">{children}</div>;
const MockThemeProvider: React.FC<{ children: React.ReactNode; initialTheme?: string }> = ({ children }) => <div data-testid="theme-provider">{children}</div>;

/**
 * Comprehensive Test Utilities for MyBudget Application
 *
 * This module provides utilities for:
 * - Component testing with proper context providers
 * - Mock data generation
 * - API mocking
 * - Database testing
 * - Authentication testing
 */

// Test wrapper with all necessary providers
interface TestWrapperProps {
  children: React.ReactNode;
  initialAuthState?: {
    user?: Record<string, unknown>;
    isAuthenticated?: boolean;
    isLoading?: boolean;
  };
  initialAppState?: {
    theme?: 'light' | 'dark' | 'auto';
    sidebarOpen?: boolean;
  };
  router?: Partial<NextRouter>;
}

/**
 * Composes mock Theme, Auth, and App providers around `children` for testing.
 *
 * Use this wrapper when rendering components in tests to provide consistent
 * application context (theme, authentication state, and app state).
 *
 * @param children - React nodes to render within the composed providers.
 * @param initialAuthState - Optional initial authentication context injected into the MockAuthProvider.
 * @param initialAppState - Optional initial application context injected into the MockAppProvider; its `theme` value also seeds the MockThemeProvider.
 * @param router - Optional partial Next.js router object that can be passed alongside the wrapper (not used directly by the wrapper).
 * @returns A JSX element that wraps `children` with MockThemeProvider, MockAuthProvider, and MockAppProvider.
 */
export const TestWrapper = ({
  children,
  initialAuthState = {},
  initialAppState = {},
  router = {},
}: TestWrapperProps) => {
  return (
    <MockThemeProvider initialTheme={initialAppState.theme || 'light'}>
      <MockAuthProvider initialState={initialAuthState}>
        <MockAppProvider initialState={initialAppState}>
          {children}
        </MockAppProvider>
      </MockAuthProvider>
    </MockThemeProvider>
  );
};

/**
 * Renders a React element wrapped with the library's test providers (theme, auth, app).
 *
 * Renders `ui` using React Testing Library's `render` while wrapping it in the TestWrapper
 * so components under test receive the same provider composition used across tests.
 *
 * @param ui - The React element to render.
 * @param options.initialAuthState - Optional initial authentication state for the Auth provider.
 * @param options.initialAppState - Optional initial application state for the App provider.
 * @param options.router - Optional partial Next.js router to provide to the TestWrapper.
 * @returns The RenderResult returned by React Testing Library's `render`.
 */
export const renderWithProviders = (
  ui: ReactElement,
  options: RenderOptions & {
    initialAuthState?: TestWrapperProps['initialAuthState'];
    initialAppState?: TestWrapperProps['initialAppState'];
    router?: Partial<NextRouter>;
  } = {},
) => {
  const {
    initialAuthState,
    initialAppState,
    router,
    ...renderOptions
  } = options;

  return render(ui, {
    wrapper: ({ children }) => (
      <TestWrapper
        initialAuthState={initialAuthState}
        initialAppState={initialAppState}
        router={router}
      >
        {children}
      </TestWrapper>
    ),
    ...renderOptions,
  });
};

// Mock data generators
export const mockData = {
  user: {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    avatar: 'https://example.com/avatar.jpg',
    currency: 'USD',
    language: 'en',
    timezone: 'UTC',
    monthlyIncome: 5000,
    riskTolerance: 'moderate',
    savingsRate: 20,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },

  budget: {
    id: 'budget-123',
    userId: 'user-123',
    name: 'Monthly Budget',
    method: '50-30-20',
    totalIncome: 5000,
    period: 'monthly',
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-01-31'),
    categories: [
      {
        id: 'cat-1',
        name: 'Housing',
        allocated: 1500,
        spent: 1450,
        color: '#3B82F6',
        icon: 'home',
        isEssential: true,
      },
      {
        id: 'cat-2',
        name: 'Food',
        allocated: 500,
        spent: 480,
        color: '#10B981',
        icon: 'utensils',
        isEssential: true,
      },
    ],
  },

  transaction: {
    id: 'txn-123',
    userId: 'user-123',
    budgetCategoryId: 'cat-1',
    amount: 100,
    description: 'Grocery shopping',
    category: 'food',
    date: new Date('2024-01-15'),
    type: 'expense',
    account: 'Checking',
    tags: ['groceries', 'essential'],
    isRecurring: false,
  },

  savingsGoal: {
    id: 'goal-123',
    userId: 'user-123',
    name: 'Emergency Fund',
    description: '6 months of expenses',
    targetAmount: 15000,
    currentAmount: 8000,
    targetDate: new Date('2024-12-31'),
    category: 'emergency',
    priority: 'high',
    isActive: true,
    photoUrl: 'https://example.com/emergency-fund.jpg',
    framingType: 'loss-avoidance',
    lossAvoidanceDescription: 'Avoid financial crisis',
    achievementDescription: 'Financial security achieved',
  },

  insight: {
    id: 'insight-123',
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
};

// API response mocks
export const mockApiResponses = {
  success: <T,>(data: T) => ({
    success: true,
    data,
    timestamp: new Date().toISOString(),
    requestId: 'test-request-id',
  }),

  error: (code: string, message: string, details?: unknown) => ({
    success: false,
    error: {
      code,
      message,
      details,
    },
    timestamp: new Date().toISOString(),
    requestId: 'test-request-id',
  }),

  paginated: <T,>(data: T[], page: number, limit: number, total: number) => ({
    success: true,
    data: {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    },
    timestamp: new Date().toISOString(),
    requestId: 'test-request-id',
  }),
};

// Mock functions for common operations
export const mockFunctions = {
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
    isReady: true,
    isLocaleDomain: false,
    isPreview: false,
    isFallback: false,
    basePath: '',
    locale: 'en',
    locales: ['en'],
    defaultLocale: 'en',
    domainLocales: [],
    isLocale: false,
    events: {
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
    },
  },

  apiClient: {
    request: jest.fn(),
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    login: jest.fn(),
    logout: jest.fn(),
    refreshToken: jest.fn(),
  },

  database: {
    query: jest.fn(),
    withTransaction: jest.fn(),
    executeTypedQuery: jest.fn(),
  },

  emailService: {
    sendEmail: jest.fn(),
    sendPasswordReset: jest.fn(),
    sendWelcome: jest.fn(),
    isEmailConfigured: jest.fn(),
  },

  loggingService: {
    log: jest.fn(),
    logError: jest.fn(),
    logWarning: jest.fn(),
    logInfo: jest.fn(),
    logDebug: jest.fn(),
  },
};

/**
 * Installs common Jest test-environment hooks and mocks for tests.
 *
 * Sets a global `fetch` mock and replaces `console.log`, `console.warn`, and `console.error`
 * with jest mocks for the duration of the test suite, restoring the original console methods
 * after all tests run. Also clears and resets all Jest mocks before each test.
 *
 * This function registers lifecycle hooks (beforeAll, afterAll, beforeEach) and therefore
 * must be called from a Jest test context (e.g., at the top level of a test file or inside a
 * test setup module).
 */
export const setupTestEnvironment = () => {
  // Mock fetch globally
  global.fetch = jest.fn();

  // Mock console methods in tests
  const originalConsole = {
    log: console.log.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
  };
  beforeAll(() => {
    console.log = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
  });

  afterAll(() => {
    console.log = originalConsole.log;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
  });

  // Reset all mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  });
};

// Database testing utilities
export const dbTestUtils = {
  // Create test database connection
  createTestConnection: () => ({
    query: jest.fn(),
    release: jest.fn(),
  }),

  // Mock database results
  mockQueryResult: <T,>(rows: T[]) => ({
    rows,
    rowCount: rows.length,
    command: 'SELECT',
    oid: null,
    fields: [],
  }),

  // Mock transaction
  mockTransaction: (fn: (client: { query: jest.Mock; release: jest.Mock }) => unknown) => {
    const client = {
      query: jest.fn(),
      release: jest.fn(),
    };
    return fn(client);
  },
};

// Authentication testing utilities
export const authTestUtils = {
  // Create mock JWT token
  createMockToken: (payload: Record<string, unknown> = {}) => {
    const SECONDS_IN_HOUR = 3600;
    const MS_IN_SECOND = 1000;
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const body = btoa(JSON.stringify({
      sub: 'user-123',
      email: 'test@example.com',
      iat: Math.floor(Date.now() / MS_IN_SECOND),
      exp: Math.floor(Date.now() / MS_IN_SECOND) + SECONDS_IN_HOUR,
      ...payload,
    }));
    const signature = 'mock-signature';
    return `${header}.${body}.${signature}`;
  },

  // Mock authentication context
  mockAuthContext: (overrides: Record<string, unknown> = {}) => ({
    user: mockData.user,
    isAuthenticated: true,
    isLoading: false,
    login: jest.fn(),
    logout: jest.fn(),
    register: jest.fn(),
    refreshToken: jest.fn(),
    ...overrides,
  }),
};

// Component testing utilities
export const componentTestUtils = {
  // Test component with different states
  testComponentStates: (
    Component: React.ComponentType<any>,
    props: Record<string, unknown>,
    states: Array<{ name: string; props: Record<string, unknown>; expectedText?: string }>,
  ) => {
    states.forEach(({ name, props: stateProps, expectedText }) => {
      it(`renders correctly in ${name} state`, () => {
        const { getByText } = renderWithProviders(
          <Component {...props} {...stateProps} />,
        );

        if (expectedText) {
          expect(getByText(expectedText)).toBeInTheDocument();
        }
      });
    });
  },

  // Test component interactions
  testComponentInteractions: (
    Component: React.ComponentType<any>,
    props: Record<string, unknown>,
    interactions: Array<{
      name: string;
      action: (utils: ReturnType<typeof renderWithProviders>) => void;
      assertion: (utils: ReturnType<typeof renderWithProviders>) => void;
    }>,
  ) => {
    interactions.forEach(({ name, action, assertion }) => {
      it(`handles ${name} correctly`, () => {
        const utils = renderWithProviders(<Component {...props} />);
        action(utils);
        assertion(utils);
      });
    });
  },
};

// Performance testing utilities
export const performanceTestUtils = {
  // Measure render time
  measureRenderTime: (Component: React.ComponentType<Record<string, unknown>>, props: Record<string, unknown>) => {
    const start = performance.now();
    renderWithProviders(<Component {...props} />);
    const end = performance.now();
    return end - start;
  },

  // Test component re-renders
  testReRenders: (
    Component: React.ComponentType<any>,
    props: Record<string, unknown>,
    propChanges: Array<Record<string, unknown>>,
  ) => {
    const { rerender } = renderWithProviders(<Component {...props} />);

    propChanges.forEach((newProps, index) => {
      const start = performance.now();
      rerender(<Component {...props} {...newProps} />);
      const end = performance.now();

      // console.log(`Re-render ${index + 1} took ${end - start}ms`);
    });
  },
};

// Export everything
export default {
  renderWithProviders,
  mockData,
  mockApiResponses,
  mockFunctions,
  setupTestEnvironment,
  dbTestUtils,
  authTestUtils,
  componentTestUtils,
  performanceTestUtils,
};
