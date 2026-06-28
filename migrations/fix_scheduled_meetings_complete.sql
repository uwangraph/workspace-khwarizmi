-- =============================================
-- MIGRATION: Fix scheduled_meetings table
-- Jalankan ini di Supabase SQL Editor
-- =============================================

-- 1. Buat tabel jika belum ada
CREATE TABLE IF NOT EXISTS scheduled_meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  scheduled_at timestamptz NOT NULL,
  voice_only boolean DEFAULT false,
  created_by uuid NOT NULL,
  participant_ids text[] DEFAULT '{}',
  room_id uuid,
  is_cancelled boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Tambahkan foreign key ke profiles (nama profiles, bukan auth.users)
-- Hapus constraint lama jika ada, lalu buat yang baru
ALTER TABLE scheduled_meetings 
  DROP CONSTRAINT IF EXISTS scheduled_meetings_created_by_fkey;

ALTER TABLE scheduled_meetings 
  ADD CONSTRAINT scheduled_meetings_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE CASCADE;

-- 3. Index untuk performa
CREATE INDEX IF NOT EXISTS idx_scheduled_meetings_created_by ON scheduled_meetings(created_by);
CREATE INDEX IF NOT EXISTS idx_scheduled_meetings_scheduled_at ON scheduled_meetings(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_scheduled_meetings_is_cancelled ON scheduled_meetings(is_cancelled);

-- 4. Enable RLS (Row Level Security)
ALTER TABLE scheduled_meetings ENABLE ROW LEVEL SECURITY;

-- 5. Policy: User bisa lihat meeting yang dia buat atau diundang
DROP POLICY IF EXISTS "Users can view their scheduled meetings" ON scheduled_meetings;
CREATE POLICY "Users can view their scheduled meetings" ON scheduled_meetings
  FOR SELECT USING (
    created_by = auth.uid() OR participant_ids @> ARRAY[auth.uid()::text]
  );

-- 6. Policy: User bisa membuat meeting
DROP POLICY IF EXISTS "Users can create scheduled meetings" ON scheduled_meetings;
CREATE POLICY "Users can create scheduled meetings" ON scheduled_meetings
  FOR INSERT WITH CHECK (created_by = auth.uid());

-- 7. Policy: User bisa update meeting yang dia buat
DROP POLICY IF EXISTS "Users can update their scheduled meetings" ON scheduled_meetings;
CREATE POLICY "Users can update their scheduled meetings" ON scheduled_meetings
  FOR UPDATE USING (created_by = auth.uid());

-- 8. Policy: User bisa hapus meeting yang dia buat
DROP POLICY IF EXISTS "Users can delete their scheduled meetings" ON scheduled_meetings;
CREATE POLICY "Users can delete their scheduled meetings" ON scheduled_meetings
  FOR DELETE USING (created_by = auth.uid());
