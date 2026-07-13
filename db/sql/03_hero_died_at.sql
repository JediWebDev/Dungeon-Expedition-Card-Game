-- Add Sanctuary auto-revive timestamp to heroes.
-- Run against guilds_of_ardessia (or: npm run db:push).
ALTER TABLE hero ADD COLUMN IF NOT EXISTS died_at TIMESTAMPTZ;
