-- Jalankan di Supabase Dashboard > SQL Editor

-- 1. Tabel task_comments
CREATE TABLE IF NOT EXISTS public.task_comments (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id    uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content    text NOT NULL CHECK (char_length(content) >= 1 AND char_length(content) <= 1000),
  tag        text NOT NULL DEFAULT 'general'
               CHECK (tag IN ('problem', 'late', 'missed_deadline', 'general')),
  reply_to   uuid REFERENCES public.task_comments(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

-- 2. Index untuk performa query
CREATE INDEX IF NOT EXISTS task_comments_task_id_idx ON public.task_comments(task_id);
CREATE INDEX IF NOT EXISTS task_comments_reply_to_idx ON public.task_comments(reply_to);

-- 3. RLS
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

-- Hanya peserta tugas (assignee atau pembuat) yang bisa baca
CREATE POLICY "task_comments_select" ON public.task_comments
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM public.task_assignments WHERE task_id = task_comments.task_id
      UNION
      SELECT created_by FROM public.tasks WHERE id = task_comments.task_id
    )
  );

-- Peserta tugas bisa insert (komentar harus milik sendiri)
CREATE POLICY "task_comments_insert" ON public.task_comments
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    auth.uid() IN (
      SELECT user_id FROM public.task_assignments WHERE task_id = task_comments.task_id
      UNION
      SELECT created_by FROM public.tasks WHERE id = task_comments.task_id
    )
  );

-- Hanya pemilik komentar yang bisa update
CREATE POLICY "task_comments_update" ON public.task_comments
  FOR UPDATE USING (auth.uid() = user_id);

-- Pemilik komentar atau admin bisa hapus
CREATE POLICY "task_comments_delete" ON public.task_comments
  FOR DELETE USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 4. Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_comments;

-- 5. Fix notifications CHECK constraint: tambahkan task_comment dan workload_alert
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check CHECK (
  type IN (
    'task_collaboration_invite',
    'task_assigned',
    'collaboration_accepted',
    'collaboration_rejected',
    'task_completed',
    'task_ready_review',
    'task_deadline_today',
    'task_deleted',
    'task_revision',
    'leave_request',
    'workload_alert',
    'task_comment'
  )
);
