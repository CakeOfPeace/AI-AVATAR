-- Add transcript storage to session logs for faster loading
ALTER TABLE equos_session_logs ADD COLUMN IF NOT EXISTS transcript JSONB;

-- Grant permissions
GRANT ALL PRIVILEGES ON TABLE equos_session_logs TO avatar_admin;
