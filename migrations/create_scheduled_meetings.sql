-- Tabel untuk menyimpan meeting yang dijadwalkan
CREATE TABLE IF NOT EXISTS scheduled_meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  scheduled_at timestamptz NOT NULL,
  voice_only boolean DEFAULT false,
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  participant_ids text[] DEFAULT '{}',
  room_id uuid REFERENCES chat_rooms(id),
  created_at timestamptz DEFAULT now()
);

-- Index agar query by user & tanggal cepat
CREATE INDEX IF NOT EXISTS idx_scheduled_meetings_created_by ON scheduled_meetings(created_by);
CREATE INDEX IF NOT EXISTS idx_scheduled_meetings_scheduled_at ON scheduled_meetings(scheduled_at);
