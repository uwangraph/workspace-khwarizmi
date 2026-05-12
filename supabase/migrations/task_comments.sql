-- Jalankan di Supabase SQL Editor
-- Tabel komentar tugas
CREATE TABLE IF NOT EXISTS task_comments (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id     UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  tag         TEXT CHECK (tag IN ('problem', 'late', 'missed_deadline', 'general')) DEFAULT 'general',
  reply_to    UUID REFERENCES task_comments(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_reply_to ON task_comments(reply_to);

-- RLS
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;

-- Bisa baca: anggota tugas atau admin
CREATE POLICY "task_comments_select" ON task_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM task_assignments
      WHERE task_assignments.task_id = task_comments.task_id
        AND task_assignments.user_id = auth.uid()
        AND task_assignments.status IN ('accepted', 'pending', 'completed')
    )
    OR EXISTS (
      SELECT 1 FROM tasks WHERE tasks.id = task_comments.task_id AND tasks.created_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Bisa insert: anggota tugas atau admin
CREATE POLICY "task_comments_insert" ON task_comments
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND (
      EXISTS (
        SELECT 1 FROM task_assignments
        WHERE task_assignments.task_id = task_comments.task_id
          AND task_assignments.user_id = auth.uid()
          AND task_assignments.status IN ('accepted', 'pending', 'completed')
      )
      OR EXISTS (
        SELECT 1 FROM tasks WHERE tasks.id = task_comments.task_id AND tasks.created_by = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
      )
    )
  );

-- Bisa update/delete: hanya penulis sendiri
CREATE POLICY "task_comments_update" ON task_comments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "task_comments_delete" ON task_comments
  FOR DELETE USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE task_comments;
