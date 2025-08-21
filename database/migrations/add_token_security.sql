-- Migration: Add token security fields to users table
-- This migration adds fields to track token versioning and password changes
-- for enhanced security when passwords are changed
-- 
-- IMPORTANT: Uses TIMESTAMPTZ (timezone-aware) for reliable JWT time comparisons
-- across different timezones. Existing TIMESTAMP columns will be converted.

-- Add token_version field for JWT invalidation
ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INTEGER DEFAULT 1;

-- Add password_changed_at timestamp for password change tracking (timezone-aware)
-- First, try to add the column with TIMESTAMPTZ
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

-- If the column already exists as TIMESTAMP, convert it to TIMESTAMPTZ
-- This handles cases where the migration was run before with the old type
-- The conversion preserves existing data by treating it as UTC time

-- BEGIN: Column Type Conversion Block
-- This DO block handles the conversion of existing TIMESTAMP columns to TIMESTAMPTZ
-- It's wrapped in a DO block to allow conditional logic execution
DO $$
BEGIN
    -- Check if column exists and is TIMESTAMP type
    -- This condition ensures we only convert columns that actually need conversion
    -- We check the data_type to identify legacy TIMESTAMP columns (without timezone)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'password_changed_at' 
        AND data_type = 'timestamp without time zone'
    ) THEN
        -- Convert existing TIMESTAMP column to TIMESTAMPTZ
        -- This conversion is necessary because:
        -- 1. TIMESTAMP columns don't store timezone information
        -- 2. TIMESTAMPTZ provides timezone-aware storage for consistent JWT comparisons
        -- 3. Existing data needs to be preserved during the conversion
        
        -- Convert existing values to UTC timezone to preserve data integrity
        -- UTC is used because TIMESTAMP columns are typically stored as local time
        -- and converting to UTC ensures consistent timezone handling
        -- Note: This assumes existing TIMESTAMP values were stored in the database's local timezone
        ALTER TABLE users 
        ALTER COLUMN password_changed_at TYPE TIMESTAMPTZ 
        USING password_changed_at AT TIME ZONE 'UTC';
        
        -- Set default value for future inserts
        -- This ensures new records automatically get a timestamp when inserted
        -- CURRENT_TIMESTAMP provides the current time in the database's timezone
        ALTER TABLE users 
        ALTER COLUMN password_changed_at SET DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;
-- END: Column Type Conversion Block

-- Create index on token_version for performance
CREATE INDEX IF NOT EXISTS idx_users_token_version ON users(token_version);

-- Create index on password_changed_at for performance
CREATE INDEX IF NOT EXISTS idx_users_password_changed_at ON users(password_changed_at);

-- Backfill password_changed_at for existing users
-- First try to use created_at if it exists, otherwise use current timestamp
-- Use NOW() for consistency and cast to timestamptz to ensure type normalization
UPDATE users 
SET password_changed_at = COALESCE(created_at, NOW())::timestamptz 
WHERE password_changed_at IS NULL;

-- Ensure token_version is not null for existing users
UPDATE users 
SET token_version = 1 
WHERE token_version IS NULL;

-- Add NOT NULL constraints after backfilling to enforce auth invariants
-- This ensures the database enforces that these critical security fields are always present
ALTER TABLE users ALTER COLUMN token_version SET NOT NULL;
ALTER TABLE users ALTER COLUMN password_changed_at SET NOT NULL;

-- Set default value for token_version to ensure future inserts always have a value
-- This maintains the security invariant that every user must have a token version
ALTER TABLE users ALTER COLUMN token_version SET DEFAULT 1;

-- Migration complete. The password_changed_at column is now TIMESTAMPTZ
-- which provides timezone-aware timestamps for reliable JWT time comparisons
-- across different timezones, improving security and data consistency.
-- Both token_version and password_changed_at are now NOT NULL with appropriate defaults,
-- ensuring database-level enforcement of critical security invariants.
