ALTER TABLE chat_participants ADD COLUMN IF NOT EXISTS cleared_at timestamptz;
