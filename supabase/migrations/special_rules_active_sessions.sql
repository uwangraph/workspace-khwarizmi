-- Tambah kolom active_sessions ke tabel special_rules
alter table special_rules
  add column if not exists active_sessions integer[] null;
