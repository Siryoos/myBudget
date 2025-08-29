-- Migration: Add token security fields to users table
-- This migration adds fields to track token versioning and password changes

-- Add token_version column (idempotent)
DO $$
BEGIN
  ALTER TABLE users ADD COLUMN token_version INTEGER DEFAULT 1;
EXCEPTION
  WHEN duplicate_column THEN NULL;
  WHEN undefined_table THEN NULL;
END $$ LANGUAGE plpgsql;

-- Add password_changed_at column (idempotent)
DO $$
BEGIN
  ALTER TABLE users ADD COLUMN password_changed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
EXCEPTION
  WHEN duplicate_column THEN NULL;
  WHEN undefined_table THEN NULL;
END $$ LANGUAGE plpgsql;

-- Create index on token_version (idempotent)
DO $$
BEGIN
  CREATE INDEX idx_users_token_version ON users(token_version);
EXCEPTION
  WHEN duplicate_table THEN NULL; -- index already exists
  WHEN undefined_table THEN NULL;
  WHEN duplicate_object THEN NULL;
END $$ LANGUAGE plpgsql;

-- Create index on password_changed_at (idempotent)
DO $$
BEGIN
  CREATE INDEX idx_users_password_changed_at ON users(password_changed_at);
EXCEPTION
  WHEN duplicate_table THEN NULL;
  WHEN undefined_table THEN NULL;
  WHEN duplicate_object THEN NULL;
END $$ LANGUAGE plpgsql;

-- Backfill existing rows (runs safely if table exists)
DO $$
BEGIN
  UPDATE users 
  SET password_changed_at = COALESCE(created_at, NOW())::timestamptz 
  WHERE password_changed_at IS NULL;
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$ LANGUAGE plpgsql;

DO $$
BEGIN
  UPDATE users 
  SET token_version = 1 
  WHERE token_version IS NULL;
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$ LANGUAGE plpgsql;

-- Enforce NOT NULL and defaults (safe if table exists)
DO $$
BEGIN
  ALTER TABLE users ALTER COLUMN token_version SET NOT NULL;
  ALTER TABLE users ALTER COLUMN password_changed_at SET NOT NULL;
  ALTER TABLE users ALTER COLUMN token_version SET DEFAULT 1;
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN undefined_column THEN NULL;
END $$ LANGUAGE plpgsql;

-- Migration complete
