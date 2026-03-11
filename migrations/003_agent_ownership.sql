-- Migration 003: Add agent ownership tracking
-- This allows filtering agents by who created them

-- Add user_id column to equos_agents table
ALTER TABLE equos_agents
ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

-- Create index for faster user-based queries
CREATE INDEX IF NOT EXISTS idx_equos_agents_user_id ON equos_agents(user_id);

-- Update existing agents to be owned by the first admin user (for migration)
UPDATE equos_agents 
SET user_id = (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1)
WHERE user_id IS NULL;
