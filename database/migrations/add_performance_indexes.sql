-- Migration: Add Performance Indexes
-- Date: 2024-01-XX
-- Description: Add missing database indexes for performance optimization

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users (created_at);
CREATE INDEX IF NOT EXISTS idx_users_language ON users (language);
CREATE INDEX IF NOT EXISTS idx_users_currency ON users (currency);

-- Budgets table indexes
CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON budgets (user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_period ON budgets (period);
CREATE INDEX IF NOT EXISTS idx_budgets_start_date ON budgets (start_date);
CREATE INDEX IF NOT EXISTS idx_budgets_end_date ON budgets (end_date);
CREATE INDEX IF NOT EXISTS idx_budgets_user_period ON budgets (user_id, period);

-- Budget categories table indexes
CREATE INDEX IF NOT EXISTS idx_budget_categories_budget_id ON budget_categories (budget_id);
CREATE INDEX IF NOT EXISTS idx_budget_categories_name ON budget_categories (name);
CREATE INDEX IF NOT EXISTS idx_budget_categories_essential ON budget_categories (is_essential);

-- Transactions table indexes
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions (user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions (date);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions (category);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions (type);
CREATE INDEX IF NOT EXISTS idx_transactions_budget_category_id ON transactions (budget_category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions (user_id, date);
CREATE INDEX IF NOT EXISTS idx_transactions_user_category ON transactions (user_id, category);
CREATE INDEX IF NOT EXISTS idx_transactions_user_type ON transactions (user_id, type);
CREATE INDEX IF NOT EXISTS idx_transactions_recurring ON transactions (is_recurring) WHERE is_recurring = true;

-- Savings goals table indexes
CREATE INDEX IF NOT EXISTS idx_savings_goals_user_id ON savings_goals (user_id);
CREATE INDEX IF NOT EXISTS idx_savings_goals_category ON savings_goals (category);
CREATE INDEX IF NOT EXISTS idx_savings_goals_priority ON savings_goals (priority);
CREATE INDEX IF NOT EXISTS idx_savings_goals_active ON savings_goals (is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_savings_goals_target_date ON savings_goals (target_date);
CREATE INDEX IF NOT EXISTS idx_savings_goals_user_category ON savings_goals (user_id, category);
CREATE INDEX IF NOT EXISTS idx_savings_goals_user_priority ON savings_goals (user_id, priority);

-- Milestones table indexes
CREATE INDEX IF NOT EXISTS idx_milestones_goal_id ON milestones (goal_id);
CREATE INDEX IF NOT EXISTS idx_milestones_completed ON milestones (is_completed);
CREATE INDEX IF NOT EXISTS idx_milestones_amount ON milestones (amount);

-- Quick saves table indexes
CREATE INDEX IF NOT EXISTS idx_quick_saves_user_id ON quick_saves (user_id);
CREATE INDEX IF NOT EXISTS idx_quick_saves_timestamp ON quick_saves (timestamp);
CREATE INDEX IF NOT EXISTS idx_quick_saves_goal_id ON quick_saves (goal_id);
CREATE INDEX IF NOT EXISTS idx_quick_saves_user_timestamp ON quick_saves (user_id, timestamp);

-- Achievements table indexes
CREATE INDEX IF NOT EXISTS idx_achievements_user_id ON achievements (user_id);
CREATE INDEX IF NOT EXISTS idx_achievements_unlocked ON achievements (is_unlocked);
CREATE INDEX IF NOT EXISTS idx_achievements_unlocked_date ON achievements (unlocked_date);
CREATE INDEX IF NOT EXISTS idx_achievements_user_unlocked ON achievements (user_id, is_unlocked);

-- Notifications table indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications (type);
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notifications (priority);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications (is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications (created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications (user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_user_type ON notifications (user_id, type);

-- Password reset tokens table indexes
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON password_reset_tokens (expires_at);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_expires ON password_reset_tokens (user_id, expires_at);

-- Audit logs table indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs (timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON audit_logs (table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_timestamp ON audit_logs (user_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_timestamp ON audit_logs (action, timestamp);

-- Performance metrics table indexes
CREATE INDEX IF NOT EXISTS idx_performance_metrics_endpoint ON performance_metrics (endpoint);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_timestamp ON performance_metrics (timestamp);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_status_code ON performance_metrics (status_code);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_endpoint_timestamp ON performance_metrics (endpoint, timestamp);

-- Security events table indexes
CREATE INDEX IF NOT EXISTS idx_security_events_event_type ON security_events (event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events (severity);
CREATE INDEX IF NOT EXISTS idx_security_events_timestamp ON security_events (timestamp);
CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON security_events (user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_type_timestamp ON security_events (event_type, timestamp);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_transactions_user_date_category ON transactions (user_id, date, category);
CREATE INDEX IF NOT EXISTS idx_budgets_user_start_end ON budgets (user_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_savings_goals_user_active_priority ON savings_goals (user_id, is_active, priority);

-- Partial indexes for active records
CREATE INDEX IF NOT EXISTS idx_budgets_active ON budgets (user_id, start_date) WHERE end_date >= CURRENT_DATE;
CREATE INDEX IF NOT EXISTS idx_savings_goals_active_target ON savings_goals (user_id, target_date) WHERE is_active = true;

-- Text search indexes for better search performance
CREATE INDEX IF NOT EXISTS idx_transactions_description_gin ON transactions USING gin(to_tsvector('english', description));
CREATE INDEX IF NOT EXISTS idx_savings_goals_name_description_gin ON savings_goals USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));

-- Add comments for documentation
COMMENT ON INDEX idx_users_email_lower IS 'Index for case-insensitive email lookups';
COMMENT ON INDEX idx_transactions_user_date IS 'Index for user transaction history queries';
COMMENT ON INDEX idx_savings_goals_user_active_priority IS 'Index for active goals by priority';
COMMENT ON INDEX idx_budgets_user_start_end IS 'Index for budget period queries';
COMMENT ON INDEX idx_notifications_user_read IS 'Index for unread notifications';
COMMENT ON INDEX idx_audit_logs_user_timestamp IS 'Index for user audit trail';
COMMENT ON INDEX idx_security_events_type_timestamp IS 'Index for security event analysis';
