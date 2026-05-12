-- Jalankan di Supabase Dashboard > SQL Editor
-- Trigger: kirim notifikasi ke semua admin saat ada pengajuan izin/sakit baru

CREATE OR REPLACE FUNCTION public.notify_admins_on_leave()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin   RECORD;
  v_name    TEXT;
  v_title   TEXT;
  v_message TEXT;
BEGIN
  SELECT COALESCE(full_name, 'Seseorang') INTO v_name
  FROM profiles WHERE id = NEW.user_id;

  v_title   := 'Pengajuan ' || CASE WHEN NEW.type = 'sakit' THEN 'Sakit' ELSE 'Izin' END || ' Baru';
  v_message := v_name || ' · ' || TO_CHAR(NEW.date, 'DD Mon YYYY');

  FOR v_admin IN (SELECT id FROM profiles WHERE role = 'admin') LOOP
    BEGIN
      PERFORM public.send_notification(
        p_user_id => v_admin.id,
        p_type    => 'leave_request',
        p_title   => v_title,
        p_message => v_message,
        p_data    => jsonb_build_object(
          'leave_type', NEW.type,
          'user_id',    NEW.user_id::text,
          'user_name',  v_name,
          'date',       NEW.date::text,
          'leave_id',   NEW.id::text
        )
      );
    EXCEPTION WHEN OTHERS THEN
      -- Jangan pernah gagalkan INSERT izin hanya karena notifikasi error
      RAISE WARNING 'notify_admins_on_leave: gagal kirim notif ke admin %, error: %', v_admin.id, SQLERRM;
    END;
  END LOOP;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Fallback: jika seluruh blok gagal (misal: profiles query error), tetap loloskan INSERT
  RAISE WARNING 'notify_admins_on_leave outer error: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_admins_on_leave ON attendance_leaves;
CREATE TRIGGER trg_notify_admins_on_leave
  AFTER INSERT ON attendance_leaves
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admins_on_leave();
