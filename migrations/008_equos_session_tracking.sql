-- Track EQUOS sessions per user for usage analytics
CREATE TABLE IF NOT EXISTS equos_session_logs (
    id SERIAL PRIMARY KEY,
    equos_session_id VARCHAR(255) NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    avatar_id VARCHAR(255),
    avatar_name VARCHAR(255),
    agent_id VARCHAR(255),
    agent_name VARCHAR(255),
    session_name VARCHAR(255),
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast user lookups
CREATE INDEX IF NOT EXISTS idx_equos_session_logs_user_id ON equos_session_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_equos_session_logs_equos_session_id ON equos_session_logs(equos_session_id);
CREATE INDEX IF NOT EXISTS idx_equos_session_logs_started_at ON equos_session_logs(started_at);

-- Add unique constraint to prevent duplicate session logs
CREATE UNIQUE INDEX IF NOT EXISTS idx_equos_session_logs_unique ON equos_session_logs(equos_session_id);

-- Grant permissions to app user
GRANT ALL PRIVILEGES ON TABLE equos_session_logs TO avatar_admin;
GRANT USAGE, SELECT ON SEQUENCE equos_session_logs_id_seq TO avatar_admin;
