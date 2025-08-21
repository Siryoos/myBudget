# API Error Handling Best Practices

## Zod Validation Error Handling

### Overview
API routes should properly distinguish between validation errors (400) and server errors (500) to provide better client feedback and debugging information.

### Pattern Implementation

```typescript
import { z, ZodError } from 'zod';

// ... route logic ...

} catch (error) {
  if (error instanceof ZodError) {
    // Handle Zod validation errors
    return NextResponse.json(
      { 
        error: 'Validation failed',
        details: error.flatten()
      },
      { status: 400 }
    );
  }
  
  // Handle other errors
  console.error('Route error:', error);
  return NextResponse.json(
    { error: 'Operation failed' },
    { status: 500 }
  );
}
```

### Benefits

1. **Proper HTTP Status Codes**: 400 for client errors, 500 for server errors
2. **Detailed Validation Feedback**: Clients receive specific validation error details
3. **Better Debugging**: Server errors are logged while validation errors are returned to clients
4. **Consistent API Behavior**: Predictable error response format

### Applied To

- ✅ `app/api/auth/login/route.ts` - Login validation errors
- ✅ `app/api/auth/register/route.ts` - Registration validation errors

### Future Improvements

Consider applying this pattern to other API routes that use Zod schemas:
- `app/api/goals/route.ts`
- `app/api/transactions/route.ts`
- `app/api/budgets/route.ts`
- `app/api/user/profile/route.ts`
- And others...

### Error Response Format

#### Validation Error (400)
```json
{
  "error": "Validation failed",
  "details": {
    "fieldErrors": {
      "email": ["Invalid email format"],
      "password": ["Password must be at least 8 characters"]
    },
    "formErrors": []
  }
}
```

#### Server Error (500)
```json
{
  "error": "Operation failed"
}
```
