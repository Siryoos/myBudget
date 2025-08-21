# API Integration Guide

This guide documents the patterns and best practices for integrating with the SmartSave API.

## Table of Contents
1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Error Handling](#error-handling)
4. [Request Patterns](#request-patterns)
5. [Response Types](#response-types)
6. [Hooks Usage](#hooks-usage)
7. [Caching Strategy](#caching-strategy)
8. [Best Practices](#best-practices)

## Overview

The SmartSave API client provides a centralized way to communicate with the backend. All API calls should go through the `apiClient` instance or the provided hooks.

```typescript
import { apiClient } from '@/lib/api-client';
import { useGoals, useTransactions } from '@/lib/api-hooks';
```

## Authentication

### Initial Setup

Authentication is handled automatically by the `AuthContext`. The auth token is stored in localStorage and automatically included in all API requests.

```typescript
// Login
const { login } = useAuth();
await login(email, password);

// The token is automatically set in apiClient
// All subsequent requests will include the Authorization header
```

### Token Refresh

The API client automatically handles token refresh when a 401 response is received:

```typescript
// This is handled internally by api-client.ts
if (response.status === 401 && this.token) {
  await this.refreshToken();
  // Retry the original request
}
```

### Protected Routes

Use the `ProtectedRoute` component or `withAuth` HOC:

```typescript
// Component protection
<ProtectedRoute 
  requiredRoles={[UserRole.USER, UserRole.PREMIUM_USER]}
  requiredPermissions={[Permission.VIEW_BUDGETS]}
>
  <BudgetDashboard />
</ProtectedRoute>

// HOC protection
export default withAuth(MyComponent, {
  requiredRoles: [UserRole.USER],
  redirectTo: '/login'
});
```

## Error Handling

### Standard Error Types

```typescript
import { 
  ApiError, 
  ValidationError, 
  AuthenticationError,
  NetworkError 
} from '@/lib/error-handling';
```

### Using Error Handler Hook

```typescript
function MyComponent() {
  const { handle: handleError } = useErrorHandler({
    showToast: true,
    context: { component: 'MyComponent' }
  });
  
  const fetchData = async () => {
    try {
      const response = await apiClient.getTransactions();
      // Handle success
    } catch (error) {
      handleError(error); // Automatically logs and shows toast
    }
  };
}
```

### Error Recovery Strategies

```typescript
const recoveryStrategies: ErrorRecoveryStrategy[] = [
  {
    canRecover: (error) => error instanceof NetworkError,
    recover: async () => {
      // Wait and retry
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
];

const { handle } = useErrorHandler({ strategies: recoveryStrategies });
```

## Request Patterns

### Basic Requests

```typescript
// GET request
const transactions = await apiClient.getTransactions({
  page: 1,
  limit: 20,
  category: 'food'
});

// POST request
const newGoal = await apiClient.createGoal({
  name: 'Emergency Fund',
  targetAmount: 10000,
  targetDate: '2024-12-31',
  priority: 'high',
  category: 'savings'
});

// PUT request
await apiClient.updateProfile({
  name: 'John Doe',
  monthlyIncome: 5000
});

// DELETE request
await apiClient.deleteTransaction(transactionId);
```

### Using Hooks

```typescript
function GoalsComponent() {
  // Automatic loading, error handling, and data management
  const { 
    goals, 
    loading, 
    error, 
    createGoal, 
    updateGoal, 
    deleteGoal 
  } = useGoals();
  
  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  
  return <GoalsList goals={goals} />;
}
```

### Async Operations Hook

```typescript
function TransactionForm() {
  const { execute, loading, error } = useAsync(
    apiClient.createTransaction,
    {
      onSuccess: (data) => {
        toast({ title: 'Transaction created!' });
        router.push(`/transactions/${data.id}`);
      },
      retries: 2,
      retryDelay: 1000
    }
  );
  
  const handleSubmit = (formData: CreateTransactionRequest) => {
    execute(formData);
  };
  
  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      <button disabled={loading}>
        {loading ? 'Creating...' : 'Create Transaction'}
      </button>
      {error && <ErrorMessage error={error} />}
    </form>
  );
}
```

## Response Types

All API responses follow a standard format:

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  details?: any;
  timestamp?: string;
  requestId?: string;
}
```

### Paginated Responses

```typescript
interface PaginatedResponse<T> {
  data?: T;
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}
```

### Type-Safe Responses

All API methods return typed responses:

```typescript
// The response is fully typed
const response: ApiResponse<TransactionsResponse> = 
  await apiClient.getTransactions();

if (response.success && response.data) {
  // TypeScript knows the shape of response.data
  response.data.transactions.forEach(transaction => {
    console.log(transaction.amount); // Type-safe access
  });
}
```

## Hooks Usage

### Data Fetching Hooks

```typescript
// Simple data fetching
const { data: dashboard, loading } = useDashboardData();

// With parameters
const { analytics, refetch } = useAnalytics(startDate, endDate);

// With mutations
const { goals, createGoal, updateGoal } = useGoals();
```

### Debounced Search

```typescript
function SearchComponent() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 500);
  
  const { data: results } = useAsyncEffect(
    () => apiClient.searchTransactions(debouncedQuery),
    [debouncedQuery]
  );
  
  return (
    <input
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      placeholder="Search transactions..."
    />
  );
}
```

### Pagination

```typescript
function TransactionList() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const { 
    page, 
    pageSize, 
    goToPage, 
    nextPage, 
    previousPage,
    updateTotalItems 
  } = useServerPagination();
  
  useEffect(() => {
    const fetchData = async () => {
      const response = await apiClient.getTransactions({
        page,
        limit: pageSize
      });
      
      if (response.success && response.data) {
        setTransactions(response.data.transactions);
        updateTotalItems(response.data.total);
      }
    };
    
    fetchData();
  }, [page, pageSize]);
  
  return (
    <>
      <TransactionTable transactions={transactions} />
      <Pagination
        page={page}
        onPageChange={goToPage}
        onNext={nextPage}
        onPrevious={previousPage}
      />
    </>
  );
}
```

## Caching Strategy

The API client implements automatic caching for GET requests:

```typescript
// Cached for 5 seconds by default
const response1 = await apiClient.getTransactions();
const response2 = await apiClient.getTransactions(); // Returns cached data

// Bypass cache
const freshData = await apiClient.getTransactions({}, { cache: false });

// Clear cache
apiClient.clearCache();

// Invalidate specific cache entries
apiClient.invalidateCache('transactions');
```

### Manual Cache Management

```typescript
// Using localStorage for persistent caching
const { data, setData } = useLocalStorage('dashboardData', null);

useEffect(() => {
  if (!data || isStale(data.timestamp)) {
    apiClient.getDashboard().then(response => {
      if (response.success) {
        setData({
          ...response.data,
          timestamp: Date.now()
        });
      }
    });
  }
}, []);
```

## Best Practices

### 1. Always Use TypeScript Types

```typescript
// ✅ Good
const response: ApiResponse<Transaction[]> = await apiClient.getTransactions();

// ❌ Bad
const response = await apiClient.getTransactions() as any;
```

### 2. Handle Loading and Error States

```typescript
// ✅ Good
function DataComponent() {
  const { data, loading, error } = useData();
  
  if (loading) return <Skeleton />;
  if (error) return <ErrorFallback error={error} />;
  if (!data) return <EmptyState />;
  
  return <DataDisplay data={data} />;
}

// ❌ Bad
function DataComponent() {
  const { data } = useData();
  return <DataDisplay data={data!} />; // Assumes data exists
}
```

### 3. Use Optimistic Updates

```typescript
// ✅ Good
const handleToggle = async (goalId: string, newStatus: boolean) => {
  // Update UI immediately
  setGoals(prev => prev.map(g => 
    g.id === goalId ? { ...g, isActive: newStatus } : g
  ));
  
  try {
    await apiClient.updateGoal(goalId, { isActive: newStatus });
  } catch (error) {
    // Revert on error
    setGoals(prev => prev.map(g => 
      g.id === goalId ? { ...g, isActive: !newStatus } : g
    ));
    handleError(error);
  }
};
```

### 4. Batch Related Requests

```typescript
// ✅ Good - Parallel requests
const [dashboard, goals, transactions] = await Promise.all([
  apiClient.getDashboard(),
  apiClient.getGoals(),
  apiClient.getTransactions({ limit: 5 })
]);

// ❌ Bad - Sequential requests
const dashboard = await apiClient.getDashboard();
const goals = await apiClient.getGoals();
const transactions = await apiClient.getTransactions({ limit: 5 });
```

### 5. Clean Up Subscriptions

```typescript
// ✅ Good
useEffect(() => {
  const controller = new AbortController();
  
  apiClient.getTransactions({ signal: controller.signal })
    .then(handleResponse)
    .catch(handleError);
  
  return () => controller.abort();
}, []);
```

### 6. Validate User Input

```typescript
// ✅ Good
const createTransaction = async (data: unknown) => {
  // Validate with Zod
  const validatedData = createTransactionSchema.parse(data);
  
  try {
    await apiClient.createTransaction(validatedData);
  } catch (error) {
    handleError(error);
  }
};
```

## Examples

### Complete CRUD Example

```typescript
function BudgetManager() {
  const { handle: handleError } = useErrorHandler();
  const { toast } = useToast();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Fetch budgets
  useEffect(() => {
    const fetchBudgets = async () => {
      try {
        const response = await apiClient.getBudgets();
        if (response.success && response.data) {
          setBudgets(response.data);
        }
      } catch (error) {
        handleError(error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchBudgets();
  }, []);
  
  // Create budget
  const createBudget = async (data: CreateBudgetRequest) => {
    try {
      const response = await apiClient.createBudget(data);
      if (response.success) {
        toast({
          title: 'Budget created',
          variant: 'success'
        });
        // Refresh budgets
        const budgetsResponse = await apiClient.getBudgets();
        if (budgetsResponse.success && budgetsResponse.data) {
          setBudgets(budgetsResponse.data);
        }
      }
    } catch (error) {
      handleError(error);
    }
  };
  
  // Update budget
  const updateBudget = async (id: string, data: Partial<Budget>) => {
    // Optimistic update
    setBudgets(prev => prev.map(b => 
      b.id === id ? { ...b, ...data } : b
    ));
    
    try {
      await apiClient.updateBudget(id, data);
      toast({
        title: 'Budget updated',
        variant: 'success'
      });
    } catch (error) {
      // Revert on error
      const response = await apiClient.getBudgets();
      if (response.success && response.data) {
        setBudgets(response.data);
      }
      handleError(error);
    }
  };
  
  // Delete budget
  const deleteBudget = async (id: string) => {
    if (!confirm('Are you sure?')) return;
    
    try {
      await apiClient.deleteBudget(id);
      setBudgets(prev => prev.filter(b => b.id !== id));
      toast({
        title: 'Budget deleted',
        variant: 'success'
      });
    } catch (error) {
      handleError(error);
    }
  };
  
  if (loading) return <LoadingState />;
  
  return (
    <BudgetList
      budgets={budgets}
      onUpdate={updateBudget}
      onDelete={deleteBudget}
      onCreate={createBudget}
    />
  );
}
```
