# MyBudget API Documentation

## Overview

The MyBudget API provides a comprehensive set of endpoints for personal finance management, including transactions, budgets, goals, and user management. All endpoints are secured with JWT authentication and include comprehensive input validation.

## Base URL

- **Development**: `http://localhost:3001/api`
- **Production**: `https://yourdomain.com/api`

## Authentication

### JWT Token System

The API uses JWT (JSON Web Tokens) for authentication with the following structure:

- **Access Token**: Short-lived (7 days) for API requests
- **Refresh Token**: Long-lived (30 days) for token renewal
- **Token Version**: Incremented on password change for security

#### Headers Required

```http
Authorization: Bearer <access_token>
Content-Type: application/json
```

### Authentication Endpoints

#### POST /api/auth/login

Authenticate user and receive access/refresh tokens.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "user"
    },
    "accessToken": "jwt_token",
    "refreshToken": "refresh_jwt_token"
  }
}
```

#### POST /api/auth/refresh

Renew access token using refresh token.

**Request Body:**
```json
{
  "refreshToken": "refresh_jwt_token"
}
```

#### POST /api/auth/logout

Invalidate current session and clear tokens.

**Headers:** `Authorization: Bearer <access_token>`

## Core Endpoints

### Transactions

#### GET /api/transactions

Retrieve user transactions with filtering and pagination.

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20, max: 100)
- `category` (string): Filter by category
- `type` (string): Filter by type (`income` or `expense`)
- `startDate` (string): Start date (YYYY-MM-DD)
- `endDate` (string): End date (YYYY-MM-DD)
- `search` (string): Search in description
- `minAmount` (number): Minimum amount filter
- `maxAmount` (number): Maximum amount filter

**Response:**
```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": "uuid",
        "amount": 150.50,
        "description": "Grocery shopping",
        "category": "Food",
        "date": "2024-01-15",
        "type": "expense",
        "isRecurring": false
      }
    ],
    "total": 150,
    "pages": 8
  }
}
```

#### POST /api/transactions

Create a new transaction.

**Request Body:**
```json
{
  "amount": 150.50,
  "description": "Grocery shopping",
  "category": "Food",
  "date": "2024-01-15",
  "type": "expense",
  "isRecurring": false,
  "tags": ["essential", "monthly"]
}
```

**Validation Rules:**
- `amount`: Positive number, max 2 decimal places
- `description`: 1-500 characters, HTML sanitized
- `category`: 1-100 characters, HTML sanitized
- `date`: Valid YYYY-MM-DD format
- `type`: Must be `income` or `expense`

### Budgets

#### GET /api/budgets

Retrieve user budgets with categories.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Monthly Budget",
      "method": "50-30-20",
      "totalIncome": 5000,
      "period": "monthly",
      "startDate": "2024-01-01",
      "endDate": "2024-01-31",
      "categories": [
        {
          "id": "uuid",
          "name": "Housing",
          "allocated": 2500,
          "spent": 2400,
          "remaining": 100,
          "color": "#FF6B6B",
          "isEssential": true
        }
      ]
    }
  ]
}
```

#### POST /api/budgets

Create a new budget.

**Request Body:**
```json
{
  "name": "Monthly Budget",
  "method": "50-30-20",
  "totalIncome": 5000,
  "period": "monthly",
  "startDate": "2024-01-01",
  "endDate": "2024-01-31",
  "categories": [
    {
      "name": "Housing",
      "allocated": 2500,
      "color": "#FF6B6B",
      "isEssential": true
    }
  ]
}
```

**Validation Rules:**
- `name`: 1-100 characters, HTML sanitized
- `method`: Must be valid budget method
- `totalIncome`: Positive number
- `startDate` < `endDate`
- Total allocated must equal total income
- Maximum 50 categories

### Goals

#### GET /api/goals

Retrieve user savings goals.

**Query Parameters:**
- `priority` (string): Filter by priority (`low`, `medium`, `high`)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Emergency Fund",
      "description": "6 months of expenses",
      "targetAmount": 15000,
      "currentAmount": 8000,
      "targetDate": "2024-12-31",
      "priority": "high",
      "category": "emergency",
      "isActive": true
    }
  ]
}
```

## Error Handling

### Standard Error Response Format

All API endpoints return errors in a consistent format:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Input validation failed",
    "details": "Specific error details"
  },
  "requestId": "uuid-for-tracking"
}
```

### Common Error Codes

- `VALIDATION_ERROR`: Input validation failed
- `AUTHENTICATION_ERROR`: Invalid or expired token
- `AUTHORIZATION_ERROR`: Insufficient permissions
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `RESOURCE_NOT_FOUND`: Requested resource doesn't exist
- `INTERNAL_SERVER_ERROR`: Server-side error

### HTTP Status Codes

- `200`: Success
- `201`: Created
- `400`: Bad Request (validation error)
- `401`: Unauthorized (authentication required)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `429`: Too Many Requests (rate limited)
- `500`: Internal Server Error

## Rate Limiting

### Limits by Endpoint

- **Authentication**: 10 requests per 15 minutes
- **General API**: 100 requests per minute
- **File Upload**: 5 requests per minute
- **Budget Operations**: 50 requests per minute

### Rate Limit Headers

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
Retry-After: 60
```

## Request Validation

### Input Sanitization

All user inputs are automatically sanitized to prevent XSS attacks:

- HTML tags are stripped
- Special characters are escaped
- Maximum lengths are enforced
- Type validation is applied

### Request Size Limits

- **Authentication**: 512KB
- **General API**: 1MB
- **File Upload**: 10MB
- **Search Queries**: 256KB

## Security Features

### Security Headers

All responses include comprehensive security headers:

- `Content-Security-Policy`: XSS protection
- `Strict-Transport-Security`: HTTPS enforcement
- `X-Frame-Options`: Clickjacking protection
- `X-Content-Type-Options`: MIME sniffing protection
- `X-XSS-Protection`: Browser XSS filtering

### CORS Configuration

- **Allowed Origins**: Configurable list
- **Methods**: GET, POST, PUT, DELETE, OPTIONS
- **Headers**: Authorization, Content-Type
- **Credentials**: Supported

## Pagination

### Standard Pagination Format

```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8,
    "hasNext": true,
    "hasPrev": false
  }
}
```

## File Upload

### Supported Formats

- **Images**: JPG, PNG, GIF, WebP (max 5MB)
- **Documents**: PDF, DOC, DOCX (max 10MB)
- **Spreadsheets**: XLS, XLSX, CSV (max 5MB)

### Upload Process

1. Request presigned URL from `/api/upload/presigned`
2. Upload file directly to cloud storage
3. Confirm upload completion

## Webhooks (Future)

Webhook support is planned for:
- Transaction creation
- Budget alerts
- Goal milestones
- Security events

## SDKs & Libraries

### JavaScript/TypeScript

```typescript
import { MyBudgetAPI } from '@mybudget/sdk';

const api = new MyBudgetAPI({
  baseURL: 'https://api.mybudget.com',
  token: 'your_jwt_token'
});

// Create transaction
const transaction = await api.transactions.create({
  amount: 150.50,
  description: 'Grocery shopping',
  category: 'Food',
  type: 'expense'
});
```

## Support

For API support and questions:
- **Email**: api-support@mybudget.com
- **Documentation**: https://docs.mybudget.com
- **Status Page**: https://status.mybudget.com

## Changelog

### v1.0.0 (Current)
- Initial API release
- JWT authentication
- Comprehensive validation
- Rate limiting
- Security headers
