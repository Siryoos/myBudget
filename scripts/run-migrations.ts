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

      // Split by semicolon and execute each statement
      const statements = migrationSQL
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

      for (const statement of statements) {
        if (statement.trim()) {
          await query(statement);
        }
      }

      console.log(`✓ Migration completed: ${migrationFile}`);
    } catch (error) {
      console.error(`✗ Migration failed: ${migrationFile}`, error);
      process.exit(1);
    }
  }

  console.log('All migrations completed successfully!');
  process.exit(0);
}

runMigrations().catch(console.error);
