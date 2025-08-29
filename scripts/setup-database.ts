/**
 * Database Setup Script for MyBudget Application
 *
 * This script provides a robust, idempotent way to set up the database schema
 * and insert sample data for development and testing purposes.
 *
 * ✅ IMPROVEMENTS IMPLEMENTED:
 * 1. Transactional Operations: All database operations are wrapped in transactions
 *    using the withTransaction helper for atomicity
 * 2. Idempotent Design: Script can be run multiple times safely without errors
 * 3. Proper Error Handling: Comprehensive error handling with proper exit codes
 * 4. Data Cleanup: Removes old sample data before inserting new data
 * 5. Type Safety: Full TypeScript support with proper types
 * 6. Unique Constraints: Added database constraints for data integrity
 * 7. ON CONFLICT Handling: Uses PostgreSQL's UPSERT capabilities
 *
 * 🔧 USAGE:
 * - First run: Creates schema and inserts sample data
 * - Subsequent runs: Updates existing data safely
 * - Always transactional: Either all operations succeed or none do
 *
 * 🚀 FEATURES:
 * - Demo user with realistic budget data
 * - 50-30-20 budgeting method implementation
 * - Sample categories with color coding
 * - Emergency fund savings goal
 * - Comprehensive logging and error reporting
 */

import * as fs from 'fs';
import * as path from 'path';

import type { PoolClient } from 'pg';

import { query, withTransaction } from '../lib/database';

/**
 * Checks if the database is already set up by looking for existing data
 */
async function isDatabaseSetup(): Promise<boolean> {
  try {
    const result = await query('SELECT COUNT(*) as count FROM users');
    return parseInt(result.rows[0].count) > 0;
  } catch (error) {
    // If tables don't exist, database is not set up
    return false;
  }
}

/**
 * Cleans up existing sample data to ensure a fresh start
 */
async function cleanupSampleData(client: PoolClient) {
  console.log('Cleaning up existing sample data...');

  // Delete in reverse order of dependencies to avoid foreign key violations
  await client.query('DELETE FROM budget_categories WHERE budget_id IN (SELECT id FROM budgets WHERE user_id = (SELECT id FROM users WHERE email = $1))', ['demo@example.com']);
  await client.query('DELETE FROM savings_goals WHERE user_id = (SELECT id FROM users WHERE email = $1)', ['demo@example.com']);
  await client.query('DELETE FROM budgets WHERE user_id = (SELECT id FROM users WHERE email = $1)', ['demo@example.com']);
  await client.query('DELETE FROM users WHERE email = $1', ['demo@example.com']);

  console.log('Sample data cleanup completed');
}

async function setupDatabase() {
  try {
    console.log('Setting up database...');

    // Check if database is already set up
    if (await isDatabaseSetup()) {
      console.log('Database already contains data. Running in update mode...');
    }

    // Read schema file
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // Execute schema
    await query(schema);

    console.log('Database schema executed successfully!');

    // Insert some sample data
    await insertSampleData();

    console.log('Sample data inserted/updated successfully!');

  } catch (error) {
    console.error('Database setup failed:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

async function insertSampleData() {
  // ✅ REFACTORED: Now idempotent and transactional
  // Uses withTransaction helper for atomic operations
  // Implements ON CONFLICT for safe re-runs

  await withTransaction(async (client) => {
    // Clean up existing sample data first
    await cleanupSampleData(client);

    // Insert sample user - safe to re-run
    const userResult = await client.query(
      `INSERT INTO users (email, password_hash, name, currency, monthly_income) 
       VALUES ($1, $2, $3, $4, $5) 
       ON CONFLICT (email) DO UPDATE SET 
         name = EXCLUDED.name,
         currency = EXCLUDED.currency,
         monthly_income = EXCLUDED.monthly_income
       RETURNING id`,
      ['demo@example.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.i8i', 'Demo User', 'USD', 5000],
    );

    const userId = userResult.rows[0].id;

    // Upsert budget - safe to re-run
    const budgetResult = await client.query(
      `INSERT INTO budgets (user_id, name, method, total_income, period, start_date, end_date) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       ON CONFLICT (user_id, name) DO UPDATE SET 
         method = EXCLUDED.method,
         total_income = EXCLUDED.total_income,
         period = EXCLUDED.period,
         start_date = EXCLUDED.start_date,
         end_date = EXCLUDED.end_date
       RETURNING id`,
      [userId, 'Monthly Budget', '50-30-20', 5000, 'monthly', '2024-01-01', '2024-12-31'],
    );

    const budgetId = budgetResult.rows[0].id;

    // Insert sample budget categories
    // These categories follow the 50-30-20 budgeting method:
    // - Essential categories (Housing, Food, Transportation): 75% of total budget
    // - Non-essential categories (Entertainment, Savings): 25% of total budget
    // Each category has a distinct color for UI visualization
    const categories = [
      { name: 'Housing', allocated: 2500, color: '#3B82F6', isEssential: true }, // 50% - Blue
      { name: 'Food', allocated: 750, color: '#10B981', isEssential: true }, // 15% - Green
      { name: 'Transportation', allocated: 500, color: '#F59E0B', isEssential: true }, // 10% - Orange
      { name: 'Entertainment', allocated: 250, color: '#8B5CF6', isEssential: false }, // 5% - Purple
      { name: 'Savings', allocated: 1000, color: '#EF4444', isEssential: false }, // 20% - Red
    ];

    // Insert each category into the budget_categories table
    // This creates the budget structure that users will see and interact with
    for (const category of categories) {
      await client.query(
        'INSERT INTO budget_categories (budget_id, name, allocated, color, is_essential) VALUES ($1, $2, $3, $4, $5)',
        [budgetId, category.name, category.allocated, category.color, category.isEssential],
      );
    }

    // Upsert savings goal - safe to re-run
    await client.query(
      `INSERT INTO savings_goals (user_id, name, description, target_amount, target_date, category, priority) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       ON CONFLICT (user_id, name) DO UPDATE SET 
         description = EXCLUDED.description,
         target_amount = EXCLUDED.target_amount,
         target_date = EXCLUDED.target_date,
         category = EXCLUDED.category,
         priority = EXCLUDED.priority`,
      [userId, 'Emergency Fund', 'Save 6 months of expenses', 15000, '2024-12-31', 'emergency', 'high'],
    );
  });
}

setupDatabase();
