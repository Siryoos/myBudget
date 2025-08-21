-- Migration: Add case-insensitive email index
-- This migration adds a functional index on lower(email) for better performance
-- when performing case-insensitive email lookups

-- Create case-insensitive index on email field
CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users(lower(email));

-- This index will improve performance for queries like:
-- SELECT * FROM users WHERE lower(email) = lower($1)
-- Which is used in registration and login endpoints
