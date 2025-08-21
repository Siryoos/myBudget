-- Migration: Add missing tables for achievements, notifications, quick_saves, and file_uploads
-- This migration adds the tables needed to support the new API endpoints

-- Create achievements table
CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(100) NOT NULL,
  requirement_type VARCHAR(50) NOT NULL,
  requirement_value INTEGER NOT NULL,
  requirement_description TEXT,
  points INTEGER NOT NULL DEFAULT 0,
  is_unlocked BOOLEAN NOT NULL DEFAULT false,
  unlocked_date TIMESTAMPTZ,
  progress INTEGER NOT NULL DEFAULT 0,
  max_progress INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('insight', 'budget_alert', 'achievement', 'system')),
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  category VARCHAR(100),
  priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  is_read BOOLEAN NOT NULL DEFAULT false,
  action_url TEXT,
  action_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create quick_saves table
CREATE TABLE IF NOT EXISTS quick_saves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  goal_id UUID REFERENCES savings_goals(id) ON DELETE SET NULL,
  source VARCHAR(50) NOT NULL CHECK (source IN ('manual', 'round-up', 'automated')),
  social_proof_message TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create file_uploads table
CREATE TABLE IF NOT EXISTS file_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_key TEXT NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  file_size BIGINT NOT NULL,
  url TEXT,
  thumbnail_url TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'uploading', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMPTZ
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_achievements_user_id ON achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_achievements_category ON achievements(category);
CREATE INDEX IF NOT EXISTS idx_achievements_is_unlocked ON achievements(is_unlocked);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notifications(priority);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

CREATE INDEX IF NOT EXISTS idx_quick_saves_user_id ON quick_saves(user_id);
CREATE INDEX IF NOT EXISTS idx_quick_saves_goal_id ON quick_saves(goal_id);
CREATE INDEX IF NOT EXISTS idx_quick_saves_timestamp ON quick_saves(timestamp);
CREATE INDEX IF NOT EXISTS idx_quick_saves_source ON quick_saves(source);

CREATE INDEX IF NOT EXISTS idx_file_uploads_user_id ON file_uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_file_uploads_status ON file_uploads(status);
CREATE INDEX IF NOT EXISTS idx_file_uploads_created_at ON file_uploads(created_at);

-- Add triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_achievements_updated_at BEFORE UPDATE ON achievements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON notifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_file_uploads_updated_at BEFORE UPDATE ON file_uploads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample achievements for existing users
INSERT INTO achievements (user_id, name, description, category, requirement_type, requirement_value, requirement_description, points)
SELECT 
  u.id,
  'First Goal' as name,
  'Create your first savings goal' as description,
  'goal-achievement' as category,
  'goal-creation' as requirement_type,
  1 as requirement_value,
  'Create your first savings goal' as requirement_description,
  10 as points
FROM users u
WHERE NOT EXISTS (
  SELECT 1 FROM achievements a WHERE a.user_id = u.id AND a.name = 'First Goal'
);

-- Insert sample notifications for existing users
INSERT INTO notifications (user_id, type, title, message, category, priority)
SELECT 
  u.id,
  'insight' as type,
  'Welcome to SmartSave!' as title,
  'Start your financial journey by creating your first savings goal.' as message,
  'Getting Started' as category,
  'medium' as priority
FROM users u
WHERE NOT EXISTS (
  SELECT 1 FROM notifications n WHERE n.user_id = u.id AND n.title = 'Welcome to SmartSave!'
);

-- Migration complete
-- The following tables have been created:
-- 1. achievements - For tracking user achievements and gamification
-- 2. notifications - For insights, alerts, and system messages
-- 3. quick_saves - For tracking quick save transactions
-- 4. file_uploads - For managing file upload metadata
