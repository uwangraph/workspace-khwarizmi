-- Migrasi: Tambah kolom rejection_note dan aktifkan Realtime
-- Jalankan SQL ini di Supabase Dashboard > SQL Editor

-- 1. Tambah kolom rejection_note ke attendance_leaves
ALTER TABLE attendance_leaves ADD COLUMN IF NOT EXISTS rejection_note text;

-- 2. Aktifkan Realtime untuk tabel attendance_leaves (opsional, untuk masa depan)
ALTER PUBLICATION supabase_realtime ADD TABLE attendance_leaves;
