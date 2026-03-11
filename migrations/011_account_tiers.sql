-- Migration: Account Tiers System
-- Replaces 'user' role with tiered account types: free, starter, business, custom
-- Admin role remains for platform administrators

-- Update existing 'user' roles to 'free'
UPDATE users SET role = 'free' WHERE role = 'user';

-- Add constraint to ensure valid roles (optional, for data integrity)
-- Note: PostgreSQL allows any string in VARCHAR, this is just documentation
-- Valid roles: 'free', 'starter', 'business', 'custom', 'admin'

-- Grant permissions to avatar_admin user
GRANT ALL PRIVILEGES ON users TO avatar_admin;
