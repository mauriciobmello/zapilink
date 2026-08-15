-- ZAPILINK Phase 2a — Database Schema
-- Execute no SQL Editor do seu projeto Supabase.

-- ============ TABELAS ============

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  username varchar(30) unique not null,
  name varchar(255),
  description text,
  photo_url text,
  theme_color varchar(7) default '#7C3AED',
  theme_accent varchar(7) default '#F97316',
  social_links jsonb default '[]'::jsonb,
  updated_at timestamp default now(),
  unique(user_id)
);

create table if not exists public.page_views (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  viewed_at timestamp default now()
);

-- ============ updated_at TRIGGER ============

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ============ ROW LEVEL SECURITY ============

alter table public.profiles enable row level security;
alter table public.page_views enable row level security;

-- Profiles são públicas (qualquer pessoa pode visualizar)
drop policy if exists "Profiles are publicly viewable" on public.profiles;
create policy "Profiles are publicly viewable"
  on public.profiles for select
  using (true);

-- Usuário só edita a própria profile
drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile"
  on public.profiles for update
  using (auth.uid() = user_id);

-- Usuário só insere a própria profile
drop policy if exists "Users insert own profile" on public.profiles;
create policy "Users insert own profile"
  on public.profiles for insert
  with check (auth.uid() = user_id);

-- page_views é append-only: qualquer visitante registra visualização
drop policy if exists "Anyone can record page views" on public.page_views;
create policy "Anyone can record page views"
  on public.page_views for insert
  with check (true);
