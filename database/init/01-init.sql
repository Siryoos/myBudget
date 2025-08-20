-- MyBudget Database Initialization Script
-- This script runs when the PostgreSQL container starts

-- Create database if it doesn't exist
SELECT 'CREATE DATABASE mybudget'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'mybudget')\gexec

-- Connect to the mybudget database
\c mybudget;

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom functions
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create tables
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    avatar VARCHAR(500),
    password_hash VARCHAR(255) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    language VARCHAR(5) DEFAULT 'en',
    timezone VARCHAR(50) DEFAULT 'UTC',
    date_format VARCHAR(20) DEFAULT 'MM/DD/YYYY',
    monthly_income DECIMAL(12,2),
    risk_tolerance VARCHAR(20) DEFAULT 'moderate',
    savings_rate DECIMAL(5,2),
    debt_to_income_ratio DECIMAL(5,2),
    credit_score INTEGER,
    dependents INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    method VARCHAR(50) NOT NULL,
    total_income DECIMAL(12,2) NOT NULL,
    period VARCHAR(20) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS budget_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    budget_id UUID REFERENCES budgets(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    allocated DECIMAL(12,2) NOT NULL,
    spent DECIMAL(12,2) DEFAULT 0,
    color VARCHAR(7) NOT NULL,
    icon VARCHAR(100),
    is_essential BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    budget_category_id UUID REFERENCES budget_categories(id) ON DELETE SET NULL,
    amount DECIMAL(12,2) NOT NULL,
    description VARCHAR(500) NOT NULL,
    category VARCHAR(100) NOT NULL,
    date DATE NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense')),
    account VARCHAR(100),
    tags TEXT[],
    is_recurring BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS savings_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    target_amount DECIMAL(12,2) NOT NULL,
    current_amount DECIMAL(12,2) DEFAULT 0,
    target_date DATE NOT NULL,
    category VARCHAR(50) NOT NULL,
    priority VARCHAR(20) DEFAULT 'medium',
    is_active BOOLEAN DEFAULT true,
    photo_url VARCHAR(500),
    framing_type VARCHAR(20),
    loss_avoidance_description TEXT,
    achievement_description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goal_id UUID REFERENCES savings_goals(id) ON DELETE CASCADE,
    amount DECIMAL(12,2) NOT NULL,
    description VARCHAR(500) NOT NULL,
    is_completed BOOLEAN DEFAULT false,
    completed_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS automation_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goal_id UUID REFERENCES savings_goals(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL,
    amount DECIMAL(12,2),
    percentage DECIMAL(5,2),
    frequency VARCHAR(20) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50) NOT NULL,
    icon VARCHAR(100) NOT NULL,
    requirement_type VARCHAR(50) NOT NULL,
    requirement_value INTEGER NOT NULL,
    requirement_timeframe VARCHAR(20),
    requirement_description TEXT,
    points INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    achievement_id UUID REFERENCES achievements(id) ON DELETE CASCADE,
    is_unlocked BOOLEAN DEFAULT false,
    unlocked_date DATE,
    progress INTEGER DEFAULT 0,
    max_progress INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);
CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON savings_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_budget_categories_budget_id ON budget_categories(budget_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_budgets_updated_at ON budgets;
CREATE TRIGGER update_budgets_updated_at BEFORE UPDATE ON budgets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_budget_categories_updated_at ON budget_categories;
CREATE TRIGGER update_budget_categories_updated_at BEFORE UPDATE ON budget_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_savings_goals_updated_at ON savings_goals;
CREATE TRIGGER update_savings_goals_updated_at BEFORE UPDATE ON savings_goals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data
INSERT INTO users (email, password_hash, name, currency, monthly_income) 
VALUES (
    'demo@mybudget.com', 
    crypt('DemoPassword123!', gen_salt('bf', 12)), 
    'Demo User', 
    'USD', 
    5000
) ON CONFLICT (email) DO NOTHING;

-- Get the demo user ID
DO $$
DECLARE
    demo_user_id UUID;
BEGIN
    SELECT id INTO demo_user_id FROM users WHERE email = 'demo@mybudget.com';
    
    IF demo_user_id IS NOT NULL THEN
        -- Insert sample budget
        INSERT INTO budgets (user_id, name, method, total_income, period, start_date, end_date)
        VALUES (
            demo_user_id, 
            'Monthly Budget', 
            '50-30-20', 
            5000, 
            'monthly', 
            CURRENT_DATE, 
            (CURRENT_DATE + INTERVAL '1 year')
        ) ON CONFLICT DO NOTHING;
        
        -- Get the budget ID
        DECLARE
            budget_id UUID;
        BEGIN
            SELECT id INTO budget_id FROM budgets WHERE user_id = demo_user_id LIMIT 1;
            
            IF budget_id IS NOT NULL THEN
                -- Insert sample categories
                INSERT INTO budget_categories (budget_id, name, allocated, color, is_essential) VALUES
                (budget_id, 'Housing', 2500, '#3B82F6', true),
                (budget_id, 'Food', 750, '#10B981', true),
                (budget_id, 'Transportation', 500, '#F59E0B', true),
                (budget_id, 'Entertainment', 250, '#8B5CF6', false),
                (budget_id, 'Savings', 1000, '#EF4444', false)
                ON CONFLICT DO NOTHING;
            END IF;
        END;
        
        -- Insert sample goal
        INSERT INTO savings_goals (user_id, name, description, target_amount, target_date, category, priority)
        VALUES (
            demo_user_id, 
            'Emergency Fund', 
            'Save 6 months of expenses', 
            15000, 
            (CURRENT_DATE + INTERVAL '6 months'), 
            'emergency', 
            'high'
        ) ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO mybudget_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO mybudget_user;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO mybudget_user;

-- Create a health check function
CREATE OR REPLACE FUNCTION health_check()
RETURNS TEXT AS $$
BEGIN
    RETURN 'OK';
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission on health check function
GRANT EXECUTE ON FUNCTION health_check() TO mybudget_user;
