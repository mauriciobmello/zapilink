-- ZAPILINK — Programa de Fidelidade (estrelas) — Database Schema
-- Execute no SQL Editor do seu projeto Supabase.
-- Inclui as funções RPC add_loyalty_star / reverse_loyalty_star / redeem_loyalty_benefit.

-- ============ TABELAS ============

create table if not exists public.loyalty_programs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  name varchar(150) not null default 'Programa de Fidelidade',
  description text,
  rules text,
  stars_required integer not null default 6 check (stars_required between 1 and 100),
  benefit_description text,
  reset_on_redeem boolean not null default true,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Cliente do programa: entidade separada de auth.users, sempre no contexto de
-- um perfil (evita compartilhar clientes entre proprietários diferentes).
create table if not exists public.loyalty_customers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  name varchar(150) not null,
  email varchar(255) not null,
  phone varchar(30) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.loyalty_program_members (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.loyalty_programs(id) on delete cascade,
  customer_id uuid not null references public.loyalty_customers(id) on delete cascade,
  status varchar(20) not null default 'active'
    check (status in ('active', 'completed', 'cancelled', 'blocked')),
  current_cycle integer not null default 1 check (current_cycle >= 1),
  lookup_token uuid not null default gen_random_uuid(),
  consent_at timestamptz,
  consent_version varchar(20),
  joined_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (program_id, customer_id)
);

-- Cada estrela é uma transação independente: o saldo é derivado da soma.
-- Estornos entram como stars = -1 apontando para a transação original.
create table if not exists public.loyalty_star_transactions (
  id uuid primary key default gen_random_uuid(),
  program_member_id uuid not null
    references public.loyalty_program_members(id) on delete cascade,
  cycle integer not null default 1 check (cycle >= 1),
  stars integer not null default 1 check (stars <> 0),
  service_description varchar(255),
  notes text,
  reverses_transaction_id uuid
    references public.loyalty_star_transactions(id) on delete set null,
  granted_by uuid references auth.users(id) on delete set null,
  granted_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.loyalty_benefit_redemptions (
  id uuid primary key default gen_random_uuid(),
  program_member_id uuid not null
    references public.loyalty_program_members(id) on delete cascade,
  cycle integer not null check (cycle >= 1),
  stars_used integer not null check (stars_used > 0),
  benefit_description text,
  notes text,
  redeemed_by uuid references auth.users(id) on delete set null,
  redeemed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.loyalty_audit_events (
  id uuid primary key default gen_random_uuid(),
  event varchar(50) not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  profile_id uuid references public.profiles(id) on delete cascade,
  program_id uuid references public.loyalty_programs(id) on delete set null,
  customer_id uuid references public.loyalty_customers(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ============ ÍNDICES ============

create unique index if not exists idx_loyalty_programs_profile
  on public.loyalty_programs (profile_id);
create unique index if not exists idx_loyalty_customers_profile_email
  on public.loyalty_customers (profile_id, lower(email));
create unique index if not exists idx_loyalty_customers_profile_phone
  on public.loyalty_customers (profile_id, phone);
create index if not exists idx_loyalty_customers_profile_name
  on public.loyalty_customers (profile_id, lower(name));
create index if not exists idx_loyalty_members_program
  on public.loyalty_program_members (program_id);
create unique index if not exists idx_loyalty_members_lookup_token
  on public.loyalty_program_members (lookup_token);
create index if not exists idx_loyalty_stars_member_cycle
  on public.loyalty_star_transactions (program_member_id, cycle);
create index if not exists idx_loyalty_redemptions_member
  on public.loyalty_benefit_redemptions (program_member_id);
create index if not exists idx_loyalty_audit_profile_created
  on public.loyalty_audit_events (profile_id, created_at desc);

-- ============ updated_at ============

-- Idempotente para não depender da ordem das migrações.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_loyalty_programs_updated_at on public.loyalty_programs;
create trigger trg_loyalty_programs_updated_at
  before update on public.loyalty_programs
  for each row execute function public.set_updated_at();

drop trigger if exists trg_loyalty_customers_updated_at on public.loyalty_customers;
create trigger trg_loyalty_customers_updated_at
  before update on public.loyalty_customers
  for each row execute function public.set_updated_at();

drop trigger if exists trg_loyalty_members_updated_at on public.loyalty_program_members;
create trigger trg_loyalty_members_updated_at
  before update on public.loyalty_program_members
  for each row execute function public.set_updated_at();

-- ============ ROW LEVEL SECURITY ============

alter table public.loyalty_programs enable row level security;
alter table public.loyalty_customers enable row level security;
alter table public.loyalty_program_members enable row level security;
alter table public.loyalty_star_transactions enable row level security;
alter table public.loyalty_benefit_redemptions enable row level security;
alter table public.loyalty_audit_events enable row level security;

-- Programa ativo é público (página /[username]/fidelidade).
drop policy if exists "Active loyalty programs are publicly viewable"
  on public.loyalty_programs;
create policy "Active loyalty programs are publicly viewable"
  on public.loyalty_programs for select
  using (is_active);

drop policy if exists "Owners manage their loyalty program" on public.loyalty_programs;
create policy "Owners manage their loyalty program"
  on public.loyalty_programs for all
  using (
    profile_id in (select id from public.profiles where user_id = auth.uid())
  )
  with check (
    profile_id in (select id from public.profiles where user_id = auth.uid())
  );

-- Dados pessoais dos clientes, participações, estrelas, resgates e auditoria:
-- sem políticas. Acesso exclusivo via service role (lib/supabase/admin.ts),
-- que valida propriedade/permissão do perfil antes de qualquer operação.

-- ============ RPC: saldo de estrelas ============

create or replace function public.loyalty_member_balance(p_member_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(t.stars), 0)::integer
    from public.loyalty_star_transactions t
    join public.loyalty_program_members m on m.id = t.program_member_id
   where t.program_member_id = p_member_id
     and t.cycle = m.current_cycle;
$$;

-- ============ RPC: adicionar estrela ============

create or replace function public.add_loyalty_star(
  p_member_id uuid,
  p_granted_by uuid,
  p_service_description varchar(255) default null,
  p_notes text default null
) returns public.loyalty_star_transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member public.loyalty_program_members;
  v_program public.loyalty_programs;
  v_balance integer;
  v_tx public.loyalty_star_transactions;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_member_id::text, 0));

  select * into v_member
    from public.loyalty_program_members
   where id = p_member_id;
  if not found then
    raise exception 'Participação não encontrada' using errcode = 'LY001';
  end if;

  select * into v_program
    from public.loyalty_programs
   where id = v_member.program_id;
  if not found then
    raise exception 'Programa não encontrado' using errcode = 'LY001';
  end if;

  select coalesce(sum(stars), 0) into v_balance
    from public.loyalty_star_transactions
   where program_member_id = p_member_id
     and cycle = v_member.current_cycle;

  if v_balance >= v_program.stars_required then
    raise exception 'Benefício já disponível, registre o resgate antes de novas estrelas'
      using errcode = 'LY002';
  end if;

  insert into public.loyalty_star_transactions (
    program_member_id, cycle, stars, service_description, notes, granted_by
  ) values (
    p_member_id, v_member.current_cycle, 1, p_service_description, p_notes, p_granted_by
  )
  returning * into v_tx;

  return v_tx;
end;
$$;

-- ============ RPC: estorno de estrela ============

create or replace function public.reverse_loyalty_star(
  p_transaction_id uuid,
  p_granted_by uuid,
  p_reason text
) returns public.loyalty_star_transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_original public.loyalty_star_transactions;
  v_member public.loyalty_program_members;
  v_balance integer;
  v_tx public.loyalty_star_transactions;
begin
  if p_reason is null or length(btrim(p_reason)) = 0 then
    raise exception 'Motivo do estorno é obrigatório' using errcode = 'LY003';
  end if;

  select * into v_original
    from public.loyalty_star_transactions
   where id = p_transaction_id;
  if not found then
    raise exception 'Transação não encontrada' using errcode = 'LY001';
  end if;
  if v_original.stars < 0 then
    raise exception 'Não é possível estornar um estorno' using errcode = 'LY004';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(v_original.program_member_id::text, 0)
  );

  if exists (
    select 1 from public.loyalty_star_transactions
     where reverses_transaction_id = p_transaction_id
  ) then
    raise exception 'Transação já estornada' using errcode = 'LY004';
  end if;

  select * into v_member
    from public.loyalty_program_members
   where id = v_original.program_member_id;

  if v_original.cycle <> v_member.current_cycle then
    raise exception 'Estrela pertence a um ciclo encerrado' using errcode = 'LY005';
  end if;

  select coalesce(sum(stars), 0) into v_balance
    from public.loyalty_star_transactions
   where program_member_id = v_original.program_member_id
     and cycle = v_member.current_cycle;

  if v_balance - v_original.stars < 0 then
    raise exception 'Saldo não pode ficar negativo' using errcode = 'LY006';
  end if;

  insert into public.loyalty_star_transactions (
    program_member_id, cycle, stars, notes,
    reverses_transaction_id, granted_by
  ) values (
    v_original.program_member_id, v_member.current_cycle, -v_original.stars, p_reason,
    p_transaction_id, p_granted_by
  )
  returning * into v_tx;

  return v_tx;
end;
$$;

-- ============ RPC: resgate do benefício ============

create or replace function public.redeem_loyalty_benefit(
  p_member_id uuid,
  p_redeemed_by uuid,
  p_notes text default null
) returns public.loyalty_benefit_redemptions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member public.loyalty_program_members;
  v_program public.loyalty_programs;
  v_balance integer;
  v_redemption public.loyalty_benefit_redemptions;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_member_id::text, 0));

  select * into v_member
    from public.loyalty_program_members
   where id = p_member_id;
  if not found then
    raise exception 'Participação não encontrada' using errcode = 'LY001';
  end if;

  select * into v_program
    from public.loyalty_programs
   where id = v_member.program_id;

  select coalesce(sum(stars), 0) into v_balance
    from public.loyalty_star_transactions
   where program_member_id = p_member_id
     and cycle = v_member.current_cycle;

  if v_balance < v_program.stars_required then
    raise exception 'Meta de estrelas não atingida' using errcode = 'LY007';
  end if;

  insert into public.loyalty_benefit_redemptions (
    program_member_id, cycle, stars_used, benefit_description, notes, redeemed_by
  ) values (
    p_member_id, v_member.current_cycle, v_balance,
    v_program.benefit_description, p_notes, p_redeemed_by
  )
  returning * into v_redemption;

  -- Novo ciclo zera o progresso preservando o histórico das transações.
  if v_program.reset_on_redeem then
    update public.loyalty_program_members
       set current_cycle = current_cycle + 1,
           status = 'active'
     where id = p_member_id;
  else
    update public.loyalty_program_members
       set status = 'completed'
     where id = p_member_id;
  end if;

  return v_redemption;
end;
$$;
