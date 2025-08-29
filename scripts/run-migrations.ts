#!/usr/bin/env tsx

import { readFileSync } from 'fs';
import { join } from 'path';

import { query } from '@/lib/database';

const migrations = [
  'database/migrations/add_token_security.sql',
  'database/migrations/add_email_case_insensitive_index.sql',
];

async function runMigrations() {
  console.log('Starting database migrations...');

  for (const migrationFile of migrations) {
    try {
      console.log(`Running migration: ${migrationFile}`);
      const migrationSQL = readFileSync(join(process.cwd(), migrationFile), 'utf8');
      // Execute the entire file as a single batch to preserve blocks (e.g., DO $$ ... $$)
      await query(migrationSQL);

      console.log(`✓ Migration completed: ${migrationFile}`);
    } catch (error) {
      console.error(`✗ Migration failed: ${migrationFile}`);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
      }
      process.exit(1);
    }
  }

  console.log('All migrations completed successfully!');
  process.exit(0);
}

runMigrations().catch(console.error);
