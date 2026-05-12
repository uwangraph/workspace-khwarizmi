-- Jalankan di Supabase Dashboard > SQL Editor
-- Tambahkan tipe 'leave_request' ke constraint notifications_type_check

-- Hapus constraint lama
ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Buat ulang dengan menambahkan 'leave_request'
ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check CHECK (
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
      'leave_request'
    )
  );
