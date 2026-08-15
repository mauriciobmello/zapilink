-- ZAPILINK Phase 3 (Agenda) — Database Schema
-- Execute no SQL Editor do seu projeto Supabase.
-- Inclui a função RPC book_slot para reserva atômica de horários.

-- ============ TABELAS ============

create table if not exists public.schedule_events (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  title varchar(255) not null default 'Agenda',
  description text,
  duration_minutes integer not null default 60 check (duration_minutes between 15 and 240),
  default_capacity integer not null default 1 check (default_capacity between 1 and 100),
  location varchar(255),
  timezone varchar(64) not null default 'America/Sao_Paulo',
  is_active boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(profile_id)
);

create table if not exists public.availability_rules (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  day_of_week integer not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  created_at timestamptz default now()
);

create table if not exists public.availability_exceptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  type varchar(20) not null check (type in ('blocked', 'capacity_override')),
  start_time time,
  end_time time,
  capacity integer check (capacity between 1 and 100),
  created_at timestamptz default now()
);

create table if not exists public.google_calendar_connections (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  google_email varchar(255) not null,
  access_token_encrypted text not null,
  refresh_token_encrypted text not null,
  expires_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(profile_id)
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  event_id uuid references public.schedule_events(id) on delete set null,
  slot_date date not null,
  slot_start_time time not null,
  slot_end_time time not null,
  invitee_name varchar(255) not null,
  invitee_email varchar(255) not null,
  invitee_phone varchar(20),
  status varchar(10) not null default 'pending'
    check (status in ('pending', 'approved', 'declined')),
  approval_token uuid not null default gen_random_uuid(),
  google_calendar_event_id varchar(255),
  decided_at timestamptz,
  created_at timestamptz default now()
);

-- Auto-correção p/ tabelas criadas antes da coluna event_id existir.
alter table public.bookings
  add column if not exists event_id uuid references public.schedule_events(id) on delete set null;

-- ============ ÍNDICES ============

create index if not exists idx_availability_rules_profile
  on public.availability_rules (profile_id);
create index if not exists idx_availability_exceptions_profile_date
  on public.availability_exceptions (profile_id, date);
create index if not exists idx_bookings_profile_status
  on public.bookings (profile_id, status);
create index if not exists idx_bookings_slot
  on public.bookings (slot_date, slot_start_time);
create unique index if not exists idx_bookings_approval_token
  on public.bookings (approval_token);

-- ============ updated_at FUNCTION ============

-- Definida de forma idempotente para não depender da ordem das migrações
-- (originalmente criada em supabase/schema.sql).
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============ updated_at TRIGGERS ============

drop trigger if exists trg_schedule_events_updated_at on public.schedule_events;
create trigger trg_schedule_events_updated_at
  before update on public.schedule_events
  for each row execute function public.set_updated_at();

drop trigger if exists trg_google_calendar_connections_updated_at
  on public.google_calendar_connections;
create trigger trg_google_calendar_connections_updated_at
  before update on public.google_calendar_connections
  for each row execute function public.set_updated_at();

-- ============ ROW LEVEL SECURITY ============

alter table public.schedule_events enable row level security;
alter table public.availability_rules enable row level security;
alter table public.availability_exceptions enable row level security;
alter table public.google_calendar_connections enable row level security;
alter table public.bookings enable row level security;

-- schedule_events: leitura pública (página /[username]/agenda),
-- dono gerencia via própria sessão.
drop policy if exists "Schedule events are publicly viewable" on public.schedule_events;
create policy "Schedule events are publicly viewable"
  on public.schedule_events for select
  using (true);

drop policy if exists "Owners manage their schedule event" on public.schedule_events;
create policy "Owners manage their schedule event"
  on public.schedule_events for all
  using (
    profile_id in (select id from public.profiles where user_id = auth.uid())
  )
  with check (
    profile_id in (select id from public.profiles where user_id = auth.uid())
  );

-- availability_rules / availability_exceptions: só o dono (RLS owner-managed).
drop policy if exists "Owners manage availability rules" on public.availability_rules;
create policy "Owners manage availability rules"
  on public.availability_rules for all
  using (
    profile_id in (select id from public.profiles where user_id = auth.uid())
  )
  with check (
    profile_id in (select id from public.profiles where user_id = auth.uid())
  );

drop policy if exists "Owners manage availability exceptions" on public.availability_exceptions;
create policy "Owners manage availability exceptions"
  on public.availability_exceptions for all
  using (
    profile_id in (select id from public.profiles where user_id = auth.uid())
  )
  with check (
    profile_id in (select id from public.profiles where user_id = auth.uid())
  );

-- google_calendar_connections e bookings: SEM políticas (nenhuma).
-- Acesso exclusivo via service role nas rotas de API.

-- ============ RPC: reserva atômica ============

create or replace function public.book_slot(
  p_profile_id uuid,
  p_event_id uuid,
  p_slot_date date,
  p_slot_start_time time,
  p_slot_end_time time,
  p_invitee_name varchar(255),
  p_invitee_email varchar(255),
  p_invitee_phone varchar(20) default null
) returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.schedule_events;
  v_capacity integer;
  v_booked integer;
  v_slot public.bookings;
begin
  select * into v_event
    from public.schedule_events
   where profile_id = p_profile_id
   limit 1;
  if not found or not v_event.is_active then
    raise exception 'Agenda não configurada' using errcode = 'SL001';
  end if;

  -- Serializa concorrência no mesmo horário (evita estouro de capacidade).
  perform pg_advisory_xact_lock(
    hashtextextended(
      p_profile_id::text || ':' || p_slot_date::text || ':' || p_slot_start_time::text,
      0
    )
  );

  select coalesce(e.capacity, v_event.default_capacity)
    into v_capacity
    from public.availability_exceptions e
   where e.profile_id = p_profile_id
     and e.date = p_slot_date
     and e.type = 'capacity_override'
     and e.start_time = p_slot_start_time
     and e.end_time = p_slot_end_time
   limit 1;
  if v_capacity is null then
    v_capacity := v_event.default_capacity;
  end if;

  select count(*) into v_booked
    from public.bookings
   where profile_id = p_profile_id
     and slot_date = p_slot_date
     and slot_start_time = p_slot_start_time
     and status in ('pending', 'approved');

  if v_booked >= v_capacity then
    raise exception 'Horário esgotado' using errcode = 'SL002';
  end if;

  insert into public.bookings (
    profile_id, event_id, slot_date, slot_start_time, slot_end_time,
    invitee_name, invitee_email, invitee_phone
  ) values (
    p_profile_id, p_event_id, p_slot_date, p_slot_start_time, p_slot_end_time,
    p_invitee_name, p_invitee_email, p_invitee_phone
  )
  returning * into v_slot;

  return v_slot;
end;
$$;