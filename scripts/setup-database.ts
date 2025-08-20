import { query } from '../lib/database';
import fs from 'fs';
import path from 'path';

async function setupDatabase() {
  try {
    console.log('Setting up database...');
    
    // Read schema file
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute schema
    await query(schema);
    
    console.log('Database setup completed successfully!');
    
    // Insert some sample data
    await insertSampleData();
    
    console.log('Sample data inserted successfully!');
    
  } catch (error) {
    console.error('Database setup failed:', error);
  } finally {
    process.exit(0);
  }
}

async function insertSampleData() {
  // Insert sample user
  const userResult = await query(
    'INSERT INTO users (email, password_hash, name, currency, monthly_income) VALUES ($1, $2, $3, $4, $5) RETURNING id',
    ['demo@example.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.i8i', 'Demo User', 'USD', 5000]
  );
  
  const userId = userResult.rows[0].id;
  
  // Insert sample budget
  const budgetResult = await query(
    'INSERT INTO budgets (user_id, name, method, total_income, period, start_date, end_date) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
    [userId, 'Monthly Budget', '50-30-20', 5000, 'monthly', '2024-01-01', '2024-12-31']
  );
  
  const budgetId = budgetResult.rows[0].id;
  
  // Insert sample categories
  const categories = [
    { name: 'Housing', allocated: 2500, color: '#3B82F6', isEssential: true },
    { name: 'Food', allocated: 750, color: '#10B981', isEssential: true },
    { name: 'Transportation', allocated: 500, color: '#F59E0B', isEssential: true },
    { name: 'Entertainment', allocated: 250, color: '#8B5CF6', isEssential: false },
    { name: 'Savings', allocated: 1000, color: '#EF4444', isEssential: false }
  ];
  
  for (const category of categories) {
    await query(
      'INSERT INTO budget_categories (budget_id, name, allocated, color, is_essential) VALUES ($1, $2, $3, $4, $5)',
      [budgetId, category.name, category.allocated, category.color, category.isEssential]
    );
  }
  
  // Insert sample goal
  await query(
    'INSERT INTO savings_goals (user_id, name, description, target_amount, target_date, category, priority) VALUES ($1, $2, $3, $4, $5, $6, $7)',
    [userId, 'Emergency Fund', 'Save 6 months of expenses', 15000, '2024-12-31', 'emergency', 'high']
  );
}

setupDatabase();
