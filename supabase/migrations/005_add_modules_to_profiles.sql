-- ZAPILINK — Habilitação de módulos por perfil

alter table public.profiles
  add column if not exists enabled_modules jsonb not null default '["edit","schedule","loyalty","crm"]'::jsonb;
