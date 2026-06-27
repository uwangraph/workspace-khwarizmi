-- Tabel catatan pribadi per user
create table if not exists notes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null default '',
  content     text not null default '',
  color       text not null default 'yellow',
  is_pinned   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Index untuk query by user
create index if not exists notes_user_id_idx on notes(user_id, updated_at desc);

-- RLS: user hanya bisa akses catatan miliknya sendiri
alter table notes enable row level security;

create policy "notes_select" on notes for select using (auth.uid() = user_id);
create policy "notes_insert" on notes for insert with check (auth.uid() = user_id);
create policy "notes_update" on notes for update using (auth.uid() = user_id);
create policy "notes_delete" on notes for delete using (auth.uid() = user_id);

-- Trigger update updated_at otomatis
create or replace function update_notes_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger notes_updated_at
  before update on notes
  for each row execute function update_notes_updated_at();
