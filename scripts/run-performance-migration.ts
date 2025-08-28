#!/usr/bin/env tsx

/**
 * Performance Indexes Migration Script
 *
 * This script adds missing database indexes for performance optimization.
 * It's safe to run multiple times as it uses IF NOT EXISTS.
 */

import * as fs from 'fs';
import * as path from 'path';

import { query, withTransaction } from '../lib/database';

async function runPerformanceMigration(): Promise<void> {
  console.log('🚀 Starting performance indexes migration...');

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '../database/migrations/add_performance_indexes.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    // Split into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📝 Found ${statements.length} SQL statements to execute`);

    // Execute migration within a transaction
    await withTransaction(async (client) => {
      let successCount = 0;
      let skipCount = 0;

      for (const statement of statements) {
        try {
          if (statement.trim()) {
            await client.query(statement);
            successCount++;
            console.log(`✅ Executed: ${statement.substring(0, 60)}...`);
          }
        } catch (error: any) {
          // Check if it's a duplicate index error (safe to ignore)
          if (error.code === '42710' || error.message.includes('already exists')) {
            skipCount++;
            console.log(`⏭️  Skipped (already exists): ${statement.substring(0, 60)}...`);
          } else {
            throw error;
          }
        }
      }

      console.log('\n📊 Migration Summary:');
      console.log(`   ✅ Successfully executed: ${successCount}`);
      console.log(`   ⏭️  Skipped (already exists): ${skipCount}`);
      console.log(`   📝 Total statements: ${statements.length}`);
    });

    console.log('\n🎉 Performance indexes migration completed successfully!');

    // Verify some key indexes were created
    await verifyIndexes();

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

async function verifyIndexes(): Promise<void> {
  console.log('\n🔍 Verifying key indexes...');

  try {
    // Check some key indexes
    const keyIndexes = [
      'idx_users_email_lower',
      'idx_transactions_user_date',
      'idx_savings_goals_user_active_priority',
      'idx_budgets_user_start_end',
      'idx_notifications_user_read',
    ];

    for (const indexName of keyIndexes) {
      try {
        const result = await query(
          'SELECT indexname FROM pg_indexes WHERE indexname = $1',
          [indexName],
        );

        if (result.rows.length > 0) {
          console.log(`   ✅ ${indexName} exists`);
        } else {
          console.log(`   ❌ ${indexName} missing`);
        }
      } catch (error) {
        console.log(`   ⚠️  Could not verify ${indexName}: ${error}`);
      }
    }

    // Check total index count
    const totalIndexes = await query(
      "SELECT COUNT(*) as count FROM pg_indexes WHERE schemaname = 'public'",
    );

    console.log(`\n📊 Total indexes in database: ${totalIndexes.rows[0].count}`);

  } catch (error) {
    console.error('⚠️  Index verification failed:', error);
  }
}

// Run the migration if this script is executed directly
if (require.main === module) {
  runPerformanceMigration()
    .then(() => {
      console.log('\n✨ Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Migration script failed:', error);
      process.exit(1);
    });
}

export { runPerformanceMigration };
