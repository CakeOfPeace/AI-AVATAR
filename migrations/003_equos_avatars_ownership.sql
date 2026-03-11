-- EQUOS Avatar Ownership Tracking
-- Version: 003
-- Tracks which user created each EQUOS avatar

-- Add user_id column to equos_agents if not exists
ALTER TABLE equos_agents 
ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

-- Create EQUOS avatars ownership table
CREATE TABLE IF NOT EXISTS equos_avatars (
    id SERIAL PRIMARY KEY,
    equos_id VARCHAR(100) UNIQUE NOT NULL,
    organization_id VARCHAR(100),
    name VARCHAR(255),
    identity VARCHAR(255),
    agent_id VARCHAR(100),
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_equos_avatars_equos_id ON equos_avatars(equos_id);
CREATE INDEX IF NOT EXISTS idx_equos_avatars_user_id ON equos_avatars(user_id);
CREATE INDEX IF NOT EXISTS idx_equos_agents_user_id ON equos_agents(user_id);

-- Grant permissions
GRANT ALL PRIVILEGES ON TABLE equos_avatars TO avatar_admin;
GRANT USAGE, SELECT ON SEQUENCE equos_avatars_id_seq TO avatar_admin;
