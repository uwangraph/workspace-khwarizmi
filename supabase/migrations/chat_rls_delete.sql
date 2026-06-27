-- Tambah RLS DELETE policy untuk chat_participants
-- Tanpa policy ini, delete tidak akan dieksekusi meski tidak ada error
create policy "chat_participants_delete"
  on chat_participants
  for delete
  using (auth.uid() = user_id);
