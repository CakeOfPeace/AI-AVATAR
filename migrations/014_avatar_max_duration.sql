-- Migration: Add max_duration to avatars
-- Allows users to set default call duration for each avatar (stored in seconds)

ALTER TABLE equos_avatars ADD COLUMN IF NOT EXISTS max_duration INTEGER DEFAULT 600;

-- Grant permissions
GRANT ALL PRIVILEGES ON TABLE equos_avatars TO avatar_admin;
