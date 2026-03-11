-- Add plain_password column for admin viewing
-- Note: This is for admin convenience. New users and password resets will have this populated.

ALTER TABLE users ADD COLUMN IF NOT EXISTS plain_password VARCHAR(255);

-- Add comment for documentation
COMMENT ON COLUMN users.plain_password IS 'Stored for admin viewing purposes. Only populated for new registrations and password resets.';
