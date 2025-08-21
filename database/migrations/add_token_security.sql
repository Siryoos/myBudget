-- Migration: Add token security fields to users table
-- This migration adds fields to track token versioning and password changes
-- for enhanced security when passwords are changed

-- Add token_version field for JWT invalidation
ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INTEGER DEFAULT 1;

-- Add password_changed_at timestamp for password change tracking
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Create index on token_version for performance
CREATE INDEX IF NOT EXISTS idx_users_token_version ON users(token_version);

-- Create index on password_changed_at for performance
CREATE INDEX IF NOT EXISTS idx_users_password_changed_at ON users(password_changed_at);

-- Update existing users to have password_changed_at set to created_at
UPDATE users 
SET password_changed_at = created_at 
WHERE password_changed_at IS NULL;

-- Ensure token_version is not null for existing users
UPDATE users 
SET token_version = 1 
WHERE token_version IS NULL;
