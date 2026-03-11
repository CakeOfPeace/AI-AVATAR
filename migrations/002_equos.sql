-- EQUOS AI Migration
-- Version: 002
-- Adds support for EQUOS AI avatars and agents

-- Add EQUOS-specific columns to avatars table
ALTER TABLE avatars 
ADD COLUMN IF NOT EXISTS equos_avatar_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS equos_agent_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS provider VARCHAR(50) DEFAULT 'duix',
ADD COLUMN IF NOT EXISTS task_id VARCHAR(100);

-- Create indexes for EQUOS IDs
CREATE INDEX IF NOT EXISTS idx_avatars_equos_avatar_id ON avatars(equos_avatar_id);
CREATE INDEX IF NOT EXISTS idx_avatars_equos_agent_id ON avatars(equos_agent_id);
CREATE INDEX IF NOT EXISTS idx_avatars_provider ON avatars(provider);

-- Create EQUOS agents table for local tracking
CREATE TABLE IF NOT EXISTS equos_agents (
    id SERIAL PRIMARY KEY,
    equos_id VARCHAR(100) UNIQUE NOT NULL,
    organization_id VARCHAR(100),
    name VARCHAR(100),
    provider VARCHAR(50) NOT NULL,
    model VARCHAR(100),
    voice VARCHAR(100),
    instructions TEXT,
    greeting_msg TEXT,
    search BOOLEAN DEFAULT false,
    emotions BOOLEAN DEFAULT false,
    memory BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create EQUOS sessions table for history and transcripts
CREATE TABLE IF NOT EXISTS equos_sessions (
    id SERIAL PRIMARY KEY,
    equos_session_id VARCHAR(100) UNIQUE NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    avatar_id INTEGER REFERENCES avatars(id) ON DELETE SET NULL,
    equos_avatar_id VARCHAR(100),
    equos_agent_id VARCHAR(100),
    name VARCHAR(255),
    status VARCHAR(50) DEFAULT 'active',
    max_duration INTEGER,
    additional_ctx TEXT,
    livekit_server_url VARCHAR(500),
    transcript JSONB,
    started_at TIMESTAMP,
    ended_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for EQUOS sessions
CREATE INDEX IF NOT EXISTS idx_equos_sessions_user_id ON equos_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_equos_sessions_avatar_id ON equos_sessions(avatar_id);
CREATE INDEX IF NOT EXISTS idx_equos_sessions_equos_session_id ON equos_sessions(equos_session_id);
CREATE INDEX IF NOT EXISTS idx_equos_sessions_status ON equos_sessions(status);

-- Create indexes for EQUOS agents
CREATE INDEX IF NOT EXISTS idx_equos_agents_equos_id ON equos_agents(equos_id);
CREATE INDEX IF NOT EXISTS idx_equos_agents_provider ON equos_agents(provider);

-- Update call_sessions to support EQUOS
ALTER TABLE call_sessions
ALTER COLUMN call_type SET DEFAULT 'equos';

-- Grant permissions
GRANT ALL PRIVILEGES ON TABLE equos_agents TO avatar_admin;
GRANT ALL PRIVILEGES ON TABLE equos_sessions TO avatar_admin;
GRANT USAGE, SELECT ON SEQUENCE equos_agents_id_seq TO avatar_admin;
GRANT USAGE, SELECT ON SEQUENCE equos_sessions_id_seq TO avatar_admin;
