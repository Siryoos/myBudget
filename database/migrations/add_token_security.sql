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
DO $$
BEGIN
    -- Check if column exists and is TIMESTAMP type
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'password_changed_at' 
        AND data_type = 'timestamp without time zone'
    ) THEN
        -- Convert existing TIMESTAMP column to TIMESTAMPTZ
        -- Convert existing values to UTC timezone to preserve data integrity
        -- UTC is used because TIMESTAMP columns are typically stored as local time
        -- and converting to UTC ensures consistent timezone handling
        ALTER TABLE users 
        ALTER COLUMN password_changed_at TYPE TIMESTAMPTZ 
        USING password_changed_at AT TIME ZONE 'UTC';
        
        -- Set default value for future inserts
        ALTER TABLE users 
        ALTER COLUMN password_changed_at SET DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

-- Create index on token_version for performance
CREATE INDEX IF NOT EXISTS idx_users_token_version ON users(token_version);

-- Create index on password_changed_at for performance
CREATE INDEX IF NOT EXISTS idx_users_password_changed_at ON users(password_changed_at);

-- Update existing users to have password_changed_at set to created_at
-- Note: created_at should also be TIMESTAMPTZ for consistency
UPDATE users 
SET password_changed_at = created_at 
WHERE password_changed_at IS NULL;

-- Ensure token_version is not null for existing users
UPDATE users 
SET token_version = 1 
WHERE token_version IS NULL;

-- Migration complete. The password_changed_at column is now TIMESTAMPTZ
-- which provides timezone-aware timestamps for reliable JWT time comparisons
-- across different timezones, improving security and data consistency.
