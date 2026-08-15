-- ZAPILINK — Múltiplos perfis por conta
-- Execute no SQL Editor do Supabase.
-- Remove a restrição que impedia criar mais de um perfil por usuário.

alter table public.profiles
  drop constraint if exists profiles_user_id_key;