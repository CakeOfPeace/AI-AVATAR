-- Avatar Dashboard Platform - Initial Schema
-- Version: 001

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100),
    role VARCHAR(20) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Avatars table (stores user configs + Duix conversation_id)
CREATE TABLE IF NOT EXISTS avatars (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    conversation_id VARCHAR(100),
    config JSONB NOT NULL DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Change requests queue
CREATE TABLE IF NOT EXISTS change_requests (
    id SERIAL PRIMARY KEY,
    avatar_id INTEGER REFERENCES avatars(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    requested_changes TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    admin_notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    resolved_at TIMESTAMP
);

-- Call sessions for analytics
CREATE TABLE IF NOT EXISTS call_sessions (
    id SERIAL PRIMARY KEY,
    avatar_id INTEGER REFERENCES avatars(id) ON DELETE SET NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    started_at TIMESTAMP DEFAULT NOW(),
    ended_at TIMESTAMP,
    duration_seconds INTEGER,
    call_type VARCHAR(20) DEFAULT 'duix'
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_avatars_user_id ON avatars(user_id);
CREATE INDEX IF NOT EXISTS idx_avatars_conversation_id ON avatars(conversation_id);
CREATE INDEX IF NOT EXISTS idx_change_requests_status ON change_requests(status);
CREATE INDEX IF NOT EXISTS idx_change_requests_avatar_id ON change_requests(avatar_id);
CREATE INDEX IF NOT EXISTS idx_call_sessions_avatar_id ON call_sessions(avatar_id);
CREATE INDEX IF NOT EXISTS idx_call_sessions_user_id ON call_sessions(user_id);

-- Grant permissions to avatar_admin
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO avatar_admin;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO avatar_admin;
