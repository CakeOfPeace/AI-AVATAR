-- Migration: Add external user tracking for API sessions
-- Allows external systems to track sessions by their own user identifiers

-- Add external_user_id column to track the consumerIdentity from external API calls
ALTER TABLE equos_session_logs ADD COLUMN IF NOT EXISTS external_user_id VARCHAR(255);
ALTER TABLE equos_session_logs ADD COLUMN IF NOT EXISTS external_user_name VARCHAR(255);

-- Index for efficient filtering by external user
CREATE INDEX IF NOT EXISTS idx_equos_session_logs_external_user_id ON equos_session_logs(external_user_id);

-- Grant permissions
GRANT ALL PRIVILEGES ON TABLE equos_session_logs TO avatar_admin;
