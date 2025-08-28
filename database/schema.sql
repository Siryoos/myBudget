-- Users table with enhanced constraints
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  name VARCHAR(255) NOT NULL CHECK (length(trim(name)) >= 2),
  avatar VARCHAR(500) CHECK (avatar IS NULL OR avatar ~* '^https?://'),
  password_hash VARCHAR(255) NOT NULL CHECK (length(password_hash) >= 60),
  currency VARCHAR(3) NOT NULL DEFAULT 'USD' CHECK (currency IN (
    'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR', 'BRL',
    'KRW', 'MXN', 'SGD', 'HKD', 'NOK', 'SEK', 'DKK', 'PLN', 'CZK', 'HUF',
    'RUB', 'TRY', 'ZAR', 'THB', 'MYR', 'IDR', 'PHP', 'VND', 'BDT', 'PKR'
  )),
  language VARCHAR(5) NOT NULL DEFAULT 'en' CHECK (language IN (
    'en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh',
    'ar', 'hi', 'bn', 'ur', 'fa', 'tr', 'nl', 'sv', 'da', 'no',
    'fi', 'pl', 'cs', 'hu', 'ro', 'bg', 'hr', 'sk', 'sl', 'et',
    'lv', 'lt', 'mt', 'el', 'he', 'th', 'vi', 'id', 'ms', 'tl'
  )),
  timezone VARCHAR(50) NOT NULL DEFAULT 'UTC',
  date_format VARCHAR(20) NOT NULL DEFAULT 'MM/DD/YYYY' CHECK (date_format IN ('MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD')),
  monthly_income DECIMAL(12,2) CHECK (monthly_income IS NULL OR monthly_income >= 0),
  risk_tolerance VARCHAR(20) NOT NULL DEFAULT 'moderate' CHECK (risk_tolerance IN ('conservative', 'moderate', 'aggressive')),
  savings_rate DECIMAL(5,2) CHECK (savings_rate IS NULL OR (savings_rate >= 0 AND savings_rate <= 100)),
  debt_to_income_ratio DECIMAL(5,2) CHECK (debt_to_income_ratio IS NULL OR (debt_to_income_ratio >= 0 AND debt_to_income_ratio <= 100)),
  credit_score INTEGER CHECK (credit_score IS NULL OR (credit_score >= 300 AND credit_score <= 850)),
  dependents INTEGER NOT NULL DEFAULT 0 CHECK (dependents >= 0),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Budgets table with enhanced constraints
CREATE TABLE budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL CHECK (length(trim(name)) >= 1),
  method VARCHAR(50) NOT NULL CHECK (method IN ('50-30-20', 'pay-yourself-first', 'envelope', 'zero-based', 'kakeibo')),
  total_income DECIMAL(12,2) NOT NULL CHECK (total_income > 0),
  period VARCHAR(20) NOT NULL CHECK (period IN ('weekly', 'monthly', 'yearly')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL CHECK (end_date > start_date),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, name),
  CONSTRAINT valid_budget_dates CHECK (start_date <= end_date)
);

-- Budget categories table with enhanced constraints
CREATE TABLE budget_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL CHECK (length(trim(name)) >= 1),
  allocated DECIMAL(12,2) NOT NULL CHECK (allocated >= 0),
  spent DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (spent >= 0),
  color VARCHAR(7) NOT NULL CHECK (color ~* '^#[0-9A-F]{6}$'),
  icon VARCHAR(100) CHECK (icon IS NULL OR length(trim(icon)) > 0),
  is_essential BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(budget_id, name)
);

-- Transactions table with enhanced constraints
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  budget_category_id UUID REFERENCES budget_categories(id) ON DELETE SET NULL,
  amount DECIMAL(12,2) NOT NULL CHECK (amount <> 0),
  description VARCHAR(500) NOT NULL CHECK (length(trim(description)) >= 1),
  category VARCHAR(100) NOT NULL CHECK (length(trim(category)) >= 1),
  date DATE NOT NULL CHECK (date <= CURRENT_DATE + INTERVAL '1 day'),
  type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense')),
  account VARCHAR(100) CHECK (account IS NULL OR length(trim(account)) > 0),
  tags TEXT[] CHECK (tags IS NULL OR array_length(tags, 1) <= 10),
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Savings goals table with enhanced constraints
CREATE TABLE savings_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL CHECK (length(trim(name)) >= 1),
  description TEXT CHECK (description IS NULL OR length(trim(description)) > 0),
  target_amount DECIMAL(12,2) NOT NULL CHECK (target_amount > 0),
  current_amount DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (current_amount >= 0),
  target_date DATE NOT NULL CHECK (target_date >= CURRENT_DATE),
  category VARCHAR(50) NOT NULL CHECK (length(trim(category)) >= 1),
  priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  photo_url VARCHAR(500) CHECK (photo_url IS NULL OR photo_url ~* '^https?://'),
  framing_type VARCHAR(20) CHECK (framing_type IS NULL OR framing_type IN ('gain', 'loss')),
  loss_avoidance_description TEXT CHECK (loss_avoidance_description IS NULL OR length(trim(loss_avoidance_description)) > 0),
  achievement_description TEXT CHECK (achievement_description IS NULL OR length(trim(achievement_description)) > 0),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, name),
  CONSTRAINT valid_goal_amounts CHECK (current_amount <= target_amount)
);

-- Milestones table with enhanced constraints
CREATE TABLE milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES savings_goals(id) ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  description VARCHAR(500) NOT NULL CHECK (length(trim(description)) >= 1),
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_date DATE CHECK (completed_date IS NULL OR completed_date >= CURRENT_DATE),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT valid_completed_date CHECK (
    (is_completed = false AND completed_date IS NULL) OR
    (is_completed = true AND completed_date IS NOT NULL)
  )
);

-- Automation rules table with enhanced constraints
CREATE TABLE automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES savings_goals(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('fixed_amount', 'percentage', 'round_up')),
  amount DECIMAL(12,2) CHECK (amount IS NULL OR amount > 0),
  percentage DECIMAL(5,2) CHECK (percentage IS NULL OR (percentage > 0 AND percentage <= 100)),
  frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT valid_automation_rule CHECK (
    (type = 'fixed_amount' AND amount IS NOT NULL AND percentage IS NULL) OR
    (type = 'percentage' AND percentage IS NOT NULL AND amount IS NULL) OR
    (type = 'round_up' AND amount IS NULL AND percentage IS NULL)
  )
);

-- Achievements table with enhanced constraints
CREATE TABLE achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL CHECK (length(trim(name)) >= 1),
  description TEXT NOT NULL CHECK (length(trim(description)) >= 1),
  category VARCHAR(50) NOT NULL CHECK (length(trim(category)) >= 1),
  icon VARCHAR(100) NOT NULL CHECK (length(trim(icon)) >= 1),
  requirement_type VARCHAR(50) NOT NULL CHECK (requirement_type IN ('transaction_count', 'saving_streak', 'budget_adherence', 'goal_completion')),
  requirement_value INTEGER NOT NULL CHECK (requirement_value > 0),
  requirement_timeframe VARCHAR(20) CHECK (requirement_timeframe IS NULL OR requirement_timeframe IN ('daily', 'weekly', 'monthly', 'yearly')),
  requirement_description TEXT CHECK (requirement_description IS NULL OR length(trim(requirement_description)) > 0),
  points INTEGER NOT NULL CHECK (points > 0),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- User achievements table with enhanced constraints
CREATE TABLE user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  is_unlocked BOOLEAN NOT NULL DEFAULT false,
  unlocked_date DATE CHECK (unlocked_date IS NULL OR unlocked_date >= CURRENT_DATE),
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0),
  max_progress INTEGER NOT NULL CHECK (max_progress > 0),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, achievement_id),
  CONSTRAINT valid_unlocked_date CHECK (
    (is_unlocked = false AND unlocked_date IS NULL) OR
    (is_unlocked = true AND unlocked_date IS NOT NULL)
  ),
  CONSTRAINT valid_progress CHECK (progress <= max_progress)
);

-- Comprehensive indexes for performance optimization
-- Users table indexes
CREATE INDEX idx_users_email_lower ON users(lower(email));
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_users_currency ON users(currency);
CREATE INDEX idx_users_language ON users(language);

-- Budgets table indexes
CREATE INDEX idx_budgets_user_id ON budgets(user_id);
CREATE INDEX idx_budgets_period ON budgets(period);
CREATE INDEX idx_budgets_start_date ON budgets(start_date);
CREATE INDEX idx_budgets_end_date ON budgets(end_date);
CREATE INDEX idx_budgets_method ON budgets(method);
CREATE INDEX idx_budgets_user_period ON budgets(user_id, period);
CREATE INDEX idx_budgets_user_active ON budgets(user_id, start_date, end_date) WHERE end_date >= CURRENT_DATE;

-- Budget categories table indexes
CREATE INDEX idx_budget_categories_budget_id ON budget_categories(budget_id);
CREATE INDEX idx_budget_categories_name ON budget_categories(name);
CREATE INDEX idx_budget_categories_essential ON budget_categories(is_essential) WHERE is_essential = true;

-- Transactions table indexes
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_transactions_category ON transactions(category);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_budget_category ON transactions(budget_category_id);
CREATE INDEX idx_transactions_user_date ON transactions(user_id, date);
CREATE INDEX idx_transactions_user_category ON transactions(user_id, category);
CREATE INDEX idx_transactions_user_type ON transactions(user_id, type);
CREATE INDEX idx_transactions_date_range ON transactions(date) WHERE date >= CURRENT_DATE - INTERVAL '30 days';
CREATE INDEX idx_transactions_amount ON transactions(amount);
CREATE INDEX idx_transactions_recurring ON transactions(is_recurring) WHERE is_recurring = true;

-- Savings goals table indexes
CREATE INDEX idx_goals_user_id ON savings_goals(user_id);
CREATE INDEX idx_goals_priority ON savings_goals(priority);
CREATE INDEX idx_goals_category ON savings_goals(category);
CREATE INDEX idx_goals_target_date ON savings_goals(target_date);
CREATE INDEX idx_goals_active ON savings_goals(is_active) WHERE is_active = true;
CREATE INDEX idx_goals_user_active ON savings_goals(user_id, is_active) WHERE is_active = true;
CREATE INDEX idx_goals_user_priority ON savings_goals(user_id, priority, is_active) WHERE is_active = true;

-- Milestones table indexes
CREATE INDEX idx_milestones_goal_id ON milestones(goal_id);
CREATE INDEX idx_milestones_completed ON milestones(is_completed);
CREATE INDEX idx_milestones_goal_completed ON milestones(goal_id, is_completed);

-- Automation rules table indexes
CREATE INDEX idx_automation_rules_goal_id ON automation_rules(goal_id);
CREATE INDEX idx_automation_rules_active ON automation_rules(is_active) WHERE is_active = true;
CREATE INDEX idx_automation_rules_type ON automation_rules(type);

-- Achievements table indexes
CREATE INDEX idx_achievements_category ON achievements(category);
CREATE INDEX idx_achievements_requirement_type ON achievements(requirement_type);

-- User achievements table indexes
CREATE INDEX idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX idx_user_achievements_unlocked ON user_achievements(is_unlocked) WHERE is_unlocked = true;
CREATE INDEX idx_user_achievements_user_unlocked ON user_achievements(user_id, is_unlocked);

-- Business logic triggers and functions

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to validate budget category allocation doesn't exceed budget total
CREATE OR REPLACE FUNCTION validate_budget_allocation()
RETURNS TRIGGER AS $$
DECLARE
    budget_total DECIMAL(12,2);
    total_allocated DECIMAL(12,2);
BEGIN
    -- Get the budget's total income
    SELECT total_income INTO budget_total
    FROM budgets WHERE id = NEW.budget_id;

    -- Calculate total allocated amount for this budget
    SELECT COALESCE(SUM(allocated), 0) INTO total_allocated
    FROM budget_categories
    WHERE budget_id = NEW.budget_id
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID);

    -- Add the new allocation
    total_allocated := total_allocated + NEW.allocated;

    -- Check if total allocation exceeds budget total
    IF total_allocated > budget_total THEN
        RAISE EXCEPTION 'Total category allocation (%.2f) exceeds budget total (%.2f)',
            total_allocated, budget_total;
    END IF;

    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to update budget category spent amount when transactions are added/updated
CREATE OR REPLACE FUNCTION update_budget_category_spent()
RETURNS TRIGGER AS $$
BEGIN
    -- Only process expense transactions linked to budget categories
    IF NEW.type = 'expense' AND NEW.budget_category_id IS NOT NULL THEN
        UPDATE budget_categories
        SET spent = (
            SELECT COALESCE(SUM(amount), 0)
            FROM transactions
            WHERE budget_category_id = NEW.budget_category_id
            AND type = 'expense'
        )
        WHERE id = NEW.budget_category_id;
    END IF;

    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to update savings goal progress
CREATE OR REPLACE FUNCTION update_savings_goal_progress()
RETURNS TRIGGER AS $$
BEGIN
    -- Update current amount based on transaction type
    IF NEW.type = 'income' AND NEW.category = 'Savings' THEN
        UPDATE savings_goals
        SET current_amount = current_amount + NEW.amount
        WHERE user_id = NEW.user_id;
    END IF;

    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to validate transaction date is not in the future (with small buffer)
CREATE OR REPLACE FUNCTION validate_transaction_date()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.date > CURRENT_DATE + INTERVAL '1 day' THEN
        RAISE EXCEPTION 'Transaction date cannot be more than 1 day in the future';
    END IF;

    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to automatically unlock achievements based on user activity
CREATE OR REPLACE FUNCTION check_achievement_unlock()
RETURNS TRIGGER AS $$
DECLARE
    achievement_record RECORD;
    user_stats RECORD;
BEGIN
    -- Get user statistics
    SELECT
        COUNT(*) as transaction_count,
        COUNT(CASE WHEN type = 'income' THEN 1 END) as income_count,
        COUNT(CASE WHEN type = 'expense' THEN 1 END) as expense_count,
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount END), 0) as total_income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount END), 0) as total_expenses
    INTO user_stats
    FROM transactions
    WHERE user_id = NEW.user_id;

    -- Check achievements that might be unlocked
    FOR achievement_record IN
        SELECT * FROM achievements
        WHERE requirement_type = 'transaction_count'
        AND requirement_value <= user_stats.transaction_count
    LOOP
        -- Check if user already has this achievement
        IF NOT EXISTS (
            SELECT 1 FROM user_achievements
            WHERE user_id = NEW.user_id
            AND achievement_id = achievement_record.id
        ) THEN
            -- Unlock the achievement
            INSERT INTO user_achievements (user_id, achievement_id, is_unlocked, unlocked_date, progress, max_progress)
            VALUES (NEW.user_id, achievement_record.id, true, CURRENT_DATE, achievement_record.requirement_value, achievement_record.requirement_value);
        END IF;
    END LOOP;

    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to all tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_budgets_updated_at BEFORE UPDATE ON budgets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_budget_categories_updated_at BEFORE UPDATE ON budget_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_savings_goals_updated_at BEFORE UPDATE ON savings_goals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Business logic triggers
CREATE TRIGGER validate_budget_allocation_trigger
    BEFORE INSERT OR UPDATE ON budget_categories
    FOR EACH ROW EXECUTE FUNCTION validate_budget_allocation();

CREATE TRIGGER update_budget_category_spent_trigger
    AFTER INSERT OR UPDATE OR DELETE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_budget_category_spent();

CREATE TRIGGER update_savings_goal_progress_trigger
    AFTER INSERT ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_savings_goal_progress();

CREATE TRIGGER validate_transaction_date_trigger
    BEFORE INSERT OR UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION validate_transaction_date();

CREATE TRIGGER check_achievement_unlock_trigger
    AFTER INSERT ON transactions
    FOR EACH ROW EXECUTE FUNCTION check_achievement_unlock();
