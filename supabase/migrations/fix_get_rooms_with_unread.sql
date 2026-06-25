-- Update RPC get_rooms_with_unread agar menghormati cleared_at
-- Pesan yang lebih lama dari cleared_at tidak ditampilkan sebagai last_message

drop function if exists get_rooms_with_unread(uuid);

create function get_rooms_with_unread(p_user_id uuid)
returns table (
  room_id             uuid,
  room_name           text,
  room_type           text,
  room_description    text,
  room_avatar_url     text,
  room_created_at     timestamptz,
  partner_name        text,
  partner_avatar      text,
  last_message_content text,
  last_message_type   text,
  last_message_at     timestamptz,
  unread_count        bigint,
  last_read_at        timestamptz
)
language sql
stable
security definer
as $$
  select
    r.id                                        as room_id,
    r.name                                      as room_name,
    r.type                                      as room_type,
    r.description                               as room_description,
    r.avatar_url                                as room_avatar_url,
    r.created_at                                as room_created_at,
    -- partner info untuk DM
    case when r.type = 'direct' then pp.full_name end  as partner_name,
    case when r.type = 'direct' then pp.avatar_url end as partner_avatar,
    -- last message: hanya tampil jika lebih baru dari cleared_at
    case
      when lm.created_at > coalesce(cp.cleared_at, '1970-01-01'::timestamptz)
      then lm.content
    end                                         as last_message_content,
    case
      when lm.created_at > coalesce(cp.cleared_at, '1970-01-01'::timestamptz)
      then lm.type
    end                                         as last_message_type,
    lm.created_at                               as last_message_at,
    -- unread: pesan lebih baru dari last_read_at DAN cleared_at, bukan dari diri sendiri
    coalesce((
      select count(*)
      from chat_messages m2
      where m2.room_id = r.id
        and m2.sender_id <> p_user_id
        and m2.created_at > coalesce(cp.last_read_at, '1970-01-01'::timestamptz)
        and m2.created_at > coalesce(cp.cleared_at,   '1970-01-01'::timestamptz)
    ), 0)                                       as unread_count,
    cp.last_read_at
  from chat_participants cp
  join chat_rooms r on r.id = cp.room_id
  -- last message per room
  left join lateral (
    select content, type, created_at
    from chat_messages
    where room_id = r.id
    order by created_at desc
    limit 1
  ) lm on true
  -- partner untuk DM
  left join lateral (
    select p.full_name, p.avatar_url
    from chat_participants cp2
    join profiles p on p.id = cp2.user_id
    where cp2.room_id = r.id
      and cp2.user_id <> p_user_id
    limit 1
  ) pp on r.type = 'direct'
  where cp.user_id = p_user_id
  order by coalesce(lm.created_at, r.created_at) desc
$$;
