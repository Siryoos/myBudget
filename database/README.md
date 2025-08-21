# Database Schema and Migrations

## Case-Insensitive Email Handling

### Overview
The application now handles email addresses in a case-insensitive manner to improve user experience and prevent login failures due to case differences.

### Changes Made

#### 1. API Routes Updated
- **Login Route** (`app/api/auth/login/route.ts`): Updated SQL query to use `lower(email) = lower($1)`
- **Register Route** (`app/api/auth/register/route.ts`): Updated SQL query to use `lower(email) = lower($1)`

#### 2. Zod Schema Updates
- Both login and register schemas now transform emails using `.transform(s => s.trim().toLowerCase())`
- This ensures consistent email formatting before database operations

#### 3. Database Index Optimization
- **New Index**: `idx_users_email_lower ON users(lower(email))`
- **Purpose**: Optimizes case-insensitive email lookups
- **Migration File**: `database/migrations/add_case_insensitive_email_index.sql`

### Performance Considerations

#### Before (Case-Sensitive)
```sql
-- This query cannot use the simple email index efficiently
SELECT * FROM users WHERE lower(email) = lower($1);
```

#### After (Optimized)
```sql
-- This query now uses the functional index efficiently
CREATE INDEX idx_users_email_lower ON users(lower(email));
SELECT * FROM users WHERE lower(email) = lower($1);
```

### Database Migration

To apply the case-insensitive email index:

```bash
# Run the migration
psql -d your_database -f database/migrations/add_case_insensitive_email_index.sql
```

### Benefits

1. **User Experience**: Users can log in regardless of email case (e.g., "User@Email.com" vs "user@email.com")
2. **Data Consistency**: Emails are normalized to lowercase before storage
3. **Performance**: Functional index ensures fast case-insensitive lookups
4. **Maintainability**: Consistent approach across all email-related operations

### Important Notes

- The unique constraint on the email column remains intact
- Existing email data will continue to work as expected
- The functional index `idx_users_email_lower` will be used for all case-insensitive email queries
- Consider dropping the old simple index `idx_users_email` if it exists and is no longer needed

### Future Considerations

If you need to enforce case-insensitive uniqueness at the database level, consider adding a unique constraint on the lowercase email:

```sql
-- Optional: Add case-insensitive unique constraint
ALTER TABLE users ADD CONSTRAINT users_email_lower_unique UNIQUE (lower(email));
```

This would prevent users from registering with emails that differ only by case (e.g., "user@email.com" and "User@Email.com").
