-- ZAPILINK Phase 2b — Blocos e Botões Editáveis
-- Execute no SQL Editor do Supabase (após a migração Phase 2a).

-- ============ TABELA ============

create table if not exists public.blocks (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  type varchar(20) not null check (type in ('buttons', 'services', 'faq')),
  position integer not null,
  is_visible boolean not null default true,
  title varchar(255),
  content jsonb not null default '{}'::jsonb,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

create index if not exists blocks_profile_position_idx
  on public.blocks(profile_id, position);

-- ============ ROW LEVEL SECURITY ============

alter table public.blocks enable row level security;

-- Leitura pública (qualquer pessoa pode ver blocos)
drop policy if exists "Anyone can view blocks" on public.blocks;
create policy "Anyone can view blocks"
  on public.blocks for select
  using (true);

-- Inserção só nos perfis do próprio usuário
drop policy if exists "Users can insert blocks on their own profiles" on public.blocks;
create policy "Users can insert blocks on their own profiles"
  on public.blocks for insert
  with check (
    profile_id in (select id from public.profiles where user_id = auth.uid())
  );

-- Update só nos perfis do próprio usuário
drop policy if exists "Users can update blocks on their own profiles" on public.blocks;
create policy "Users can update blocks on their own profiles"
  on public.blocks for update
  using (
    profile_id in (select id from public.profiles where user_id = auth.uid())
  )
  with check (
    profile_id in (select id from public.profiles where user_id = auth.uid())
  );

-- Delete só nos perfis do próprio usuário
drop policy if exists "Users can delete blocks on their own profiles" on public.blocks;
create policy "Users can delete blocks on their own profiles"
  on public.blocks for delete
  using (
    profile_id in (select id from public.profiles where user_id = auth.uid())
  );