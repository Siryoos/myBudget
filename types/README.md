# Authentication Types Guide

This directory contains TypeScript type definitions for authentication in the MyBudget application.

## Types Overview

### `AuthenticatedUser`
Represents a user that has been authenticated:
```typescript
interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
}
```

### `AuthenticatedRequest`
Extends NextRequest with a guaranteed user property:
```typescript
interface AuthenticatedRequest extends NextRequest {
  user: AuthenticatedUser; // Note: not optional
}
```

### `JWTPayload`
JWT token payload structure:
```typescript
interface JWTPayload {
  userId: string;
  email: string;
}
```

### `AuthenticatedHandler`
Type for handlers that require authentication:
```typescript
type AuthenticatedHandler = (request: AuthenticatedRequest) => Promise<Response>;
```

### `OptionalAuthHandler`
Type for handlers that work with or without authentication:
```typescript
type OptionalAuthHandler = (request: NextRequest | AuthenticatedRequest) => Promise<Response>;
```

## Usage Examples

### Required Authentication
```typescript
import { requireAuth } from '@/lib/auth-middleware';
import type { AuthenticatedRequest } from '@/types/auth';

export const GET = requireAuth(async (request: AuthenticatedRequest) => {
  // TypeScript knows request.user exists and is typed
  const userId = request.user.id;
  const userEmail = request.user.email;
  
  // ... your logic here
});
```

### Optional Authentication
```typescript
import { optionalAuth } from '@/lib/auth-middleware';
import type { AuthenticatedRequest } from '@/types/auth';

export const GET = optionalAuth(async (request: NextRequest | AuthenticatedRequest) => {
  if ('user' in request) {
    // User is authenticated
    const userId = request.user.id;
    // ... authenticated logic
  } else {
    // No authentication
    // ... public logic
  }
});
```

### Type-Safe User Access
```typescript
// ✅ Good: Type-safe access
const userId = request.user.id;
const userEmail = request.user.email;

// ❌ Bad: No more unsafe casting
// const user = (request as any).user;
```

## Benefits

1. **Type Safety**: No more `(request as any).user` unsafe casts
2. **IntelliSense**: Full autocomplete for user properties
3. **Compile-time Errors**: Catch authentication issues before runtime
4. **Consistent API**: Standardized way to handle authenticated requests
5. **Maintainability**: Clear contracts for authentication requirements

## Migration Guide

### Before (Unsafe)
```typescript
export const GET = requireAuth(async (request: NextRequest) => {
  const user = (request as any).user; // ❌ Unsafe
  // ...
});
```

### After (Type-Safe)
```typescript
import type { AuthenticatedRequest } from '@/types/auth';

export const GET = requireAuth(async (request: AuthenticatedRequest) => {
  const user = request.user; // ✅ Type-safe
  // ...
});
```

## File Structure

```
types/
├── auth.d.ts          # Authentication type definitions
└── README.md          # This documentation file
```

The types are automatically included by the TypeScript compiler through the `@/types/*` path mapping in `tsconfig.json`.
