-- Migration: Add case-insensitive email index for better login performance
-- This index will be used when querying with lower(email) = lower($1)

-- Drop the existing simple email index if it exists
DROP INDEX IF EXISTS idx_users_email;

-- Create a functional index for case-insensitive email lookups
CREATE INDEX idx_users_email_lower ON users(lower(email));

-- Add a comment explaining the purpose
COMMENT ON INDEX idx_users_email_lower IS 'Functional index for case-insensitive email lookups in login queries';
