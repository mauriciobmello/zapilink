-- ZAPILINK — Storage para fotos de perfil
-- Execute no SQL Editor do Supabase (após as migrações 2a/2b).

-- Cria/atualiza o bucket público 'profile-photos'
insert into storage.buckets (id, name, public)
values ('profile-photos', 'profile-photos', true)
on conflict (id) do update set public = true;

-- Leitura pública (qualquer pessoa vê as fotos)
drop policy if exists "Public read profile photos" on storage.objects;
create policy "Public read profile photos"
  on storage.objects for select
  using (bucket_id = 'profile-photos');

-- Upload/update/delete restrito ao próprio usuário (pasta = user_id)
drop policy if exists "Users upload own profile photos" on storage.objects;
create policy "Users upload own profile photos"
  on storage.objects for insert
  with check (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users update own profile photos" on storage.objects;
create policy "Users update own profile photos"
  on storage.objects for update
  using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users delete own profile photos" on storage.objects;
create policy "Users delete own profile photos"
  on storage.objects for delete
  using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );