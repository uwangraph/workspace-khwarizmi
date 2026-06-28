-- Tambah kolom yang hilang untuk fitur cancel, description, dan reminder
ALTER TABLE scheduled_meetings 
ADD COLUMN IF NOT EXISTS is_cancelled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Index untuk filter is_cancelled
CREATE INDEX IF NOT EXISTS idx_scheduled_meetings_is_cancelled ON scheduled_meetings(is_cancelled);
