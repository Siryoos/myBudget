# API Reference

This document provides a complete reference for the SmartSave API, including all endpoints, authentication methods, request/response formats, and error handling.

## 🔐 Authentication

### JWT Token Authentication

All API endpoints require authentication using JWT tokens in the Authorization header.

```http
Authorization: Bearer <your-jwt-token>
```

### Token Types

- **Access Token**: Short-lived (15 minutes) for API requests
- **Refresh Token**: Long-lived (7 days) for obtaining new access tokens

### Token Refresh

When an access token expires, use the refresh token to obtain a new one:

```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "your-refresh-token"
}
```

## 📡 API Endpoints

### Authentication Endpoints

#### User Registration

```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "dateOfBirth": "1990-01-01T00:00:00.000Z",
  "preferences": {
    "currency": "USD",
    "language": "en",
    "timezone": "America/New_York"
  }
}
```

**Response**:
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "tokens": {
    "accessToken": "jwt-token",
    "refreshToken": "refresh-token"
  }
}
```

#### User Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response**:
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe"
  },
  "tokens": {
    "accessToken": "jwt-token",
    "refreshToken": "refresh-token"
  }
}
```

#### User Logout

```http
POST /api/auth/logout
Authorization: Bearer <access-token>
```

**Response**:
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### Budget Management Endpoints

#### Get All Budgets

```http
GET /api/budgets
Authorization: Bearer <access-token>
```

**Response**:
```json
{
  "success": true,
  "budgets": [
    {
      "id": "uuid",
      "name": "Monthly Budget",
      "amount": 5000.00,
      "period": "monthly",
      "startDate": "2024-01-01T00:00:00.000Z",
      "endDate": "2024-01-31T23:59:59.999Z",
      "categories": [
        {
          "id": "uuid",
          "name": "Housing",
          "amount": 1500.00,
          "color": "#3B82F6",
          "icon": "home"
        }
      ]
    }
  ]
}
```

#### Create Budget

```http
POST /api/budgets
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "name": "Monthly Budget",
  "amount": 5000.00,
  "period": "monthly",
  "startDate": "2024-01-01T00:00:00.000Z",
  "endDate": "2024-01-31T23:59:59.999Z",
  "categories": [
    {
      "name": "Housing",
      "amount": 1500.00,
      "color": "#3B82F6",
      "icon": "home"
    }
  ]
}
```

#### Update Budget

```http
PUT /api/budgets/{budgetId}
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "name": "Updated Budget Name",
  "amount": 6000.00
}
```

#### Delete Budget

```http
DELETE /api/budgets/{budgetId}
Authorization: Bearer <access-token>
```

### Transaction Management Endpoints

#### Get Transactions

```http
GET /api/transactions
Authorization: Bearer <access-token>
Query Parameters:
- page: number (default: 1)
- limit: number (default: 20)
- startDate: ISO date string
- endDate: ISO date string
- categoryId: UUID
- type: "income" | "expense"
- search: string
```

**Response**:
```json
{
  "success": true,
  "transactions": [
    {
      "id": "uuid",
      "amount": 150.00,
      "description": "Grocery shopping",
      "transactionDate": "2024-01-15T00:00:00.000Z",
      "type": "expense",
      "category": {
        "id": "uuid",
        "name": "Food & Dining",
        "color": "#10B981"
      },
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

#### Create Transaction

```http
POST /api/transactions
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "amount": 150.00,
  "description": "Grocery shopping",
  "transactionDate": "2024-01-15T00:00:00.000Z",
  "type": "expense",
  "categoryId": "uuid",
  "tags": ["groceries", "food"]
}
```

#### Update Transaction

```http
PUT /api/transactions/{transactionId}
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "amount": 160.00,
  "description": "Updated description"
}
```

#### Delete Transaction

```http
DELETE /api/transactions/{transactionId}
Authorization: Bearer <access-token>
```

### Savings Goals Endpoints

#### Get All Goals

```http
GET /api/goals
Authorization: Bearer <access-token>
```

**Response**:
```json
{
  "success": true,
  "goals": [
    {
      "id": "uuid",
      "name": "Vacation Fund",
      "targetAmount": 5000.00,
      "currentAmount": 2500.00,
      "targetDate": "2024-06-01T00:00:00.000Z",
      "status": "active",
      "progress": 0.5,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### Create Goal

```http
POST /api/goals
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "name": "Vacation Fund",
  "targetAmount": 5000.00,
  "targetDate": "2024-06-01T00:00:00.000Z",
  "description": "Save for summer vacation"
}
```

#### Update Goal Progress

```http
PUT /api/goals/{goalId}/progress
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "amount": 100.00,
  "description": "Weekly savings contribution"
}
```

### Dashboard Endpoints

#### Get Dashboard Overview

```http
GET /api/dashboard/overview
Authorization: Bearer <access-token>
```

**Response**:
```json
{
  "success": true,
  "overview": {
    "totalBalance": 12500.00,
    "monthlyIncome": 8000.00,
    "monthlyExpenses": 6500.00,
    "monthlySavings": 1500.00,
    "budgetUtilization": 0.87,
    "goalProgress": 0.65,
    "recentTransactions": [
      {
        "id": "uuid",
        "amount": 150.00,
        "description": "Grocery shopping",
        "type": "expense",
        "date": "2024-01-15T00:00:00.000Z"
      }
    ]
  }
}
```

#### Get Financial Insights

```http
GET /api/dashboard/insights
Authorization: Bearer <access-token>
Query Parameters:
- period: "week" | "month" | "year" (default: "month")
```

**Response**:
```json
{
  "success": true,
  "insights": {
    "spendingTrends": {
      "labels": ["Jan", "Feb", "Mar", "Apr"],
      "data": [1200, 1350, 1100, 1400]
    },
    "categoryBreakdown": [
      {
        "category": "Housing",
        "amount": 1500.00,
        "percentage": 30.0
      }
    ],
    "savingsRate": 0.25,
    "budgetVariance": 0.05
  }
}
```

### User Management Endpoints

#### Get User Profile

```http
GET /api/user/profile
Authorization: Bearer <access-token>
```

**Response**:
```json
{
  "success": true,
  "profile": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "dateOfBirth": "1990-01-01T00:00:00.000Z",
    "preferences": {
      "currency": "USD",
      "language": "en",
      "timezone": "America/New_York"
    },
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### Update User Profile

```http
PUT /api/user/profile
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "firstName": "Johnny",
  "lastName": "Smith",
  "preferences": {
    "currency": "EUR",
    "language": "es"
  }
}
```

#### Change Password

```http
PUT /api/user/change-password
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "currentPassword": "OldPass123!",
  "newPassword": "NewPass456!"
}
```

### Reports Endpoints

#### Get Monthly Report

```http
GET /api/reports/monthly
Authorization: Bearer <access-token>
Query Parameters:
- year: number (default: current year)
- month: number (default: current month)
```

**Response**:
```json
{
  "success": true,
  "report": {
    "period": "2024-01",
    "summary": {
      "totalIncome": 8000.00,
      "totalExpenses": 6500.00,
      "netSavings": 1500.00,
      "savingsRate": 0.1875
    },
    "categoryBreakdown": [
      {
        "category": "Housing",
        "budgeted": 1500.00,
        "actual": 1450.00,
        "variance": -50.00,
        "variancePercentage": -0.033
      }
    ],
    "trends": {
      "income": [8000, 8200, 8100, 8000],
      "expenses": [6500, 6700, 6400, 6500],
      "savings": [1500, 1500, 1700, 1500]
    }
  }
}
```

#### Get Category Report

```http
GET /api/reports/category
Authorization: Bearer <access-token>
Query Parameters:
- categoryId: UUID
- startDate: ISO date string
- endDate: ISO date string
```

#### Export Data

```http
GET /api/reports/export
Authorization: Bearer <access-token>
Query Parameters:
- format: "csv" | "json" | "pdf"
- startDate: ISO date string
- endDate: ISO date string
- includeTransactions: boolean
- includeBudgets: boolean
- includeGoals: boolean
```

## 🔍 Error Handling

### Error Response Format

All API errors follow a consistent format:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  },
  "timestamp": "2024-01-15T10:30:00.000Z",
  "requestId": "req_123456789"
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Input validation failed |
| `AUTHENTICATION_ERROR` | 401 | Invalid or missing authentication |
| `AUTHORIZATION_ERROR` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource conflict |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Internal server error |

### Common Error Scenarios

#### Validation Errors

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "password",
        "message": "Password must be at least 8 characters"
      },
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  }
}
```

#### Authentication Errors

```json
{
  "success": false,
  "error": {
    "code": "AUTHENTICATION_ERROR",
    "message": "Invalid or expired token"
  }
}
```

#### Rate Limiting

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later.",
    "retryAfter": 60
  }
}
```

## 📊 Response Formats

### Success Response

All successful API responses include:

```json
{
  "success": true,
  "data": { ... },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Paginated Responses

For endpoints that return lists with pagination:

```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### Bulk Operations

For endpoints that support bulk operations:

```json
{
  "success": true,
  "results": [
    {
      "id": "uuid",
      "status": "success",
      "message": "Created successfully"
    },
    {
      "id": "uuid",
      "status": "error",
      "message": "Validation failed"
    }
  ],
  "summary": {
    "total": 10,
    "successful": 8,
    "failed": 2
  }
}
```

## 🔒 Security Considerations

### Rate Limiting

- **Authentication endpoints**: 5 requests per minute
- **API endpoints**: 100 requests per minute per user
- **File uploads**: 10 requests per minute per user

### Input Validation

All inputs are validated using Zod schemas and sanitized to prevent:
- SQL injection
- XSS attacks
- NoSQL injection
- Command injection

### CORS Configuration

```typescript
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: 86400 // 24 hours
};
```

## 📱 SDK & Client Libraries

### JavaScript/TypeScript Client

```typescript
import { SmartSaveAPI } from '@smartsave/api-client';

const api = new SmartSaveAPI({
  baseURL: 'https://api.smartsave.com',
  accessToken: 'your-access-token'
});

// Get user profile
const profile = await api.user.getProfile();

// Create budget
const budget = await api.budgets.create({
  name: 'Monthly Budget',
  amount: 5000,
  period: 'monthly'
});

// Get transactions
const transactions = await api.transactions.list({
  page: 1,
  limit: 20,
  startDate: '2024-01-01'
});
```

### React Hooks

```typescript
import { useTransactions, useBudgets, useGoals } from '@smartsave/react-hooks';

function Dashboard() {
  const { transactions, loading, error } = useTransactions();
  const { budgets } = useBudgets();
  const { goals } = useGoals();

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h1>Dashboard</h1>
      {/* Dashboard content */}
    </div>
  );
}
```

## 🧪 Testing

### API Testing Examples

#### Using cURL

```bash
# Test authentication
curl -X POST https://api.smartsave.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123"}'

# Test protected endpoint
curl -X GET https://api.smartsave.com/api/budgets \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### Using Postman

1. **Set up environment variables**:
   - `baseUrl`: `https://api.smartsave.com`
   - `accessToken`: Your JWT token

2. **Create requests**:
   - Use `{{baseUrl}}/api/endpoint` for URLs
   - Use `{{accessToken}}` in Authorization header

#### Using Jest

```typescript
import { createMocks } from 'node-mocks-http';
import { POST } from '@/app/api/auth/login/route';

describe('/api/auth/login', () => {
  it('should authenticate valid user', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        email: 'test@example.com',
        password: 'testpass123'
      }
    });

    const response = await POST(req);
    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.tokens.accessToken).toBeDefined();
  });
});
```

## 📚 Additional Resources

### OpenAPI Specification

The complete OpenAPI 3.0 specification is available at:
```
https://api.smartsave.com/docs/openapi.json
```

### Interactive Documentation

Interactive API documentation is available at:
```
https://api.smartsave.com/docs
```

### SDK Documentation

- [JavaScript/TypeScript SDK](https://docs.smartsave.com/sdk/javascript)
- [React Hooks](https://docs.smartsave.com/sdk/react)
- [Mobile SDKs](https://docs.smartsave.com/sdk/mobile)

---

**Next Steps**: Explore [Backend Development](backend-development.md) for implementation details, or [Getting Started](getting-started.md) for setup instructions.
