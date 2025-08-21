-- Migration: Add case-insensitive email index for better login performance
-- This index will be used when querying with lower(email) = lower($1)
-- NO TRANSACTION: Uses CONCURRENTLY and must run outside a transaction

-- Drop the existing simple email index if it exists, without locking writes
DROP INDEX CONCURRENTLY IF EXISTS idx_users_email;

-- Create a functional index for case-insensitive email lookups concurrently
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_lower ON users (lower(email));

-- Add a comment explaining the purpose
COMMENT ON INDEX idx_users_email_lower IS 'Functional index for case-insensitive email lookups in login queries';
