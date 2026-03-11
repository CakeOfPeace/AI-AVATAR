-- Add source column to track how users were created
ALTER TABLE users
ADD COLUMN source VARCHAR(20) NOT NULL DEFAULT 'ui';

-- Update existing users - assume they were created via UI
UPDATE users SET source = 'ui' WHERE source IS NULL OR source = '';

-- Add comment for clarity
COMMENT ON COLUMN users.source IS 'How the user was created: ui (dashboard signup) or api (external system)';

-- Grant privileges
GRANT ALL PRIVILEGES ON users TO avatar_admin;
