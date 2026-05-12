-- Jalankan di Supabase Dashboard > SQL Editor
-- RPC: hitung top 5 performer bulan ini (attendance on-time + task selesai)

CREATE OR REPLACE FUNCTION public.get_top_performers(p_month text DEFAULT NULL)
RETURNS TABLE (
  user_id         uuid,
  full_name       text,
  avatar_url      text,
  jabatan         text,
  ontime_count    bigint,
  late_count      bigint,
  task_done_count bigint,
  score           int
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start date;
  v_end   date;
BEGIN
  v_start := (COALESCE(p_month, to_char(NOW(), 'YYYY-MM')) || '-01')::date;
  v_end   := (date_trunc('month', v_start) + interval '1 month - 1 day')::date;

  RETURN QUERY
  SELECT
    p.id                                                                         AS user_id,
    p.full_name,
    p.avatar_url,
    p.position                                                                   AS jabatan,
    COUNT(a.id) FILTER (WHERE a.clock_in IS NOT NULL AND a.late = false)         AS ontime_count,
    COUNT(a.id) FILTER (WHERE a.clock_in IS NOT NULL AND a.late = true)          AS late_count,
    COUNT(ta.id) FILTER (WHERE ta.status = 'completed')                          AS task_done_count,
    (
      COUNT(a.id) FILTER (WHERE a.clock_in IS NOT NULL AND a.late = false) * 10 +
      COUNT(a.id) FILTER (WHERE a.clock_in IS NOT NULL AND a.late = true)  *  5 +
      COUNT(ta.id) FILTER (WHERE ta.status = 'completed')                  * 15
    )::int                                                                       AS score
  FROM profiles p
  LEFT JOIN attendance a
    ON a.user_id = p.id AND a.date BETWEEN v_start AND v_end
  LEFT JOIN task_assignments ta
    ON ta.user_id = p.id
  WHERE p.role = 'user'
  GROUP BY p.id, p.full_name, p.avatar_url, p.position
  ORDER BY score DESC
  LIMIT 5;
END;
$$;
