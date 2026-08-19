-- ZAPILINK — CRM: Gestão de Clientes — Database Schema
-- Tabelas base, índices, RLS e funções de consolidação de eventos.

-- ============ TABELAS ============

-- Clientes consolidados por negócio (profile_id funciona como tenant).
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  name varchar(255) not null,
  phone varchar(30),
  email varchar(255),
  cpf varchar(14),
  birth_date date,
  gender varchar(20) check (gender in ('male', 'female', 'non_binary', 'other', 'prefer_not_to_say')),
  origin varchar(50) default 'manual',
  city varchar(100),
  profession varchar(100),
  company varchar(150),
  notes text,
  preferences jsonb default '{}'::jsonb,
  status varchar(20) not null default 'active'
    check (status in ('active', 'inactive', 'archived')),
  is_vip boolean not null default false,

  -- Campos derivados (mantidos atualizados pela camada de eventos)
  last_interaction_at timestamptz,
  last_purchase_at timestamptz,
  last_appointment_at timestamptz,
  purchase_count integer not null default 0,
  total_spent numeric(12,2) not null default 0,
  average_ticket numeric(12,2) not null default 0,
  appointment_count integer not null default 0,
  purchase_frequency numeric(6,2) not null default 0,
  loyalty_points integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- Tags de classificação de clientes.
create table if not exists public.customer_tags (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  name varchar(100) not null,
  description text,
  color varchar(7) default '#7C3AED',
  status varchar(20) not null default 'active'
    check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id, lower(name))
);

-- Relação N:N entre clientes e tags.
create table if not exists public.customer_tag_relations (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  tag_id uuid not null references public.customer_tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (customer_id, tag_id)
);

-- Observações internas sobre o cliente.
create table if not exists public.customer_notes (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Eventos consolidados do cliente, alimentados pelos módulos do ZAPILINK.
create table if not exists public.customer_events (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  event_type varchar(50) not null,
  source varchar(50) not null,
  reference_id uuid,
  description text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Segmentos salvos com filtros estruturados em JSON.
create table if not exists public.customer_segments (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  name varchar(150) not null,
  description text,
  filters jsonb not null default '{}'::jsonb,
  status varchar(20) not null default 'active'
    check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============ ÍNDICES ============

create index if not exists idx_customers_profile
  on public.customers (profile_id);
create index if not exists idx_customers_profile_name
  on public.customers (profile_id, lower(name));
create unique index if not exists idx_customers_profile_phone
  on public.customers (profile_id, phone) where phone is not null and deleted_at is null;
create unique index if not exists idx_customers_profile_email
  on public.customers (profile_id, lower(email)) where email is not null and deleted_at is null;
create index if not exists idx_customers_profile_status
  on public.customers (profile_id, status);
create index if not exists idx_customers_last_interaction
  on public.customers (profile_id, last_interaction_at desc);
create index if not exists idx_customers_vip
  on public.customers (profile_id, is_vip) where is_vip = true;

create index if not exists idx_customer_tags_profile
  on public.customer_tags (profile_id);
create index if not exists idx_customer_tag_relations_customer
  on public.customer_tag_relations (customer_id);
create index if not exists idx_customer_tag_relations_tag
  on public.customer_tag_relations (tag_id);

create index if not exists idx_customer_notes_customer
  on public.customer_notes (customer_id, created_at desc);

create index if not exists idx_customer_events_customer
  on public.customer_events (customer_id, created_at desc);
create index if not exists idx_customer_events_type
  on public.customer_events (customer_id, event_type, created_at desc);

create index if not exists idx_customer_segments_profile
  on public.customer_segments (profile_id);

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

drop trigger if exists trg_customers_updated_at on public.customers;
create trigger trg_customers_updated_at
  before update on public.customers
  for each row execute function public.set_updated_at();

drop trigger if exists trg_customer_tags_updated_at on public.customer_tags;
create trigger trg_customer_tags_updated_at
  before update on public.customer_tags
  for each row execute function public.set_updated_at();

drop trigger if exists trg_customer_notes_updated_at on public.customer_notes;
create trigger trg_customer_notes_updated_at
  before update on public.customer_notes
  for each row execute function public.set_updated_at();

drop trigger if exists trg_customer_segments_updated_at on public.customer_segments;
create trigger trg_customer_segments_updated_at
  before update on public.customer_segments
  for each row execute function public.set_updated_at();

-- ============ ROW LEVEL SECURITY ============

alter table public.customers enable row level security;
alter table public.customer_tags enable row level security;
alter table public.customer_tag_relations enable row level security;
alter table public.customer_notes enable row level security;
alter table public.customer_events enable row level security;
alter table public.customer_segments enable row level security;

-- Acesso exclusivo por profile_id, verificado no service role das APIs.
-- Nenhum acesso direto autenticado no client; toda a regra passa pelas rotas de API.

drop policy if exists "CRM data isolated by profile" on public.customers;
create policy "CRM data isolated by profile"
  on public.customers for all
  using (
    profile_id in (select id from public.profiles where user_id = auth.uid())
  )
  with check (
    profile_id in (select id from public.profiles where user_id = auth.uid())
  );

-- ============ FUNÇÃO: registrar evento e atualizar last_interaction ============

create or replace function public.crm_register_event(
  p_profile_id uuid,
  p_customer_id uuid,
  p_event_type varchar(50),
  p_source varchar(50),
  p_reference_id uuid default null,
  p_description text default null,
  p_metadata jsonb default '{}'::jsonb
) returns public.customer_events
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.customer_events;
  v_now timestamptz := now();
begin
  -- Insere o evento
  insert into public.customer_events (
    profile_id, customer_id, event_type, source, reference_id, description, metadata
  ) values (
    p_profile_id, p_customer_id, p_event_type, p_source, p_reference_id, p_description, p_metadata
  )
  returning * into v_event;

  -- Atualiza last_interaction_at no cliente
  update public.customers
     set last_interaction_at = v_now,
         updated_at = v_now
   where id = p_customer_id
     and profile_id = p_profile_id;

  -- Atualiza campos derivados por tipo de evento
  if p_event_type = 'appointment.completed' then
    update public.customers
       set last_appointment_at = v_now,
           appointment_count = appointment_count + 1,
           updated_at = v_now
     where id = p_customer_id
       and profile_id = p_profile_id;
  elsif p_event_type in ('purchase.created', 'purchase.completed') then
    update public.customers
       set last_purchase_at = v_now,
           purchase_count = purchase_count + 1,
           updated_at = v_now
     where id = p_customer_id
       and profile_id = p_profile_id;
  elsif p_event_type = 'loyalty.updated' then
    update public.customers
       set loyalty_points = coalesce(p_metadata->>'points', '0')::int,
           updated_at = v_now
     where id = p_customer_id
       and profile_id = p_profile_id;
  end if;

  return v_event;
end;
$$;

-- ============ FUNÇÃO: recalcular ticket médio e frequência ============

create or replace function public.crm_recalculate_customer_metrics(p_customer_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer public.customers;
  v_total_spent numeric(12,2);
  v_purchase_count integer;
  v_first_purchase timestamptz;
  v_last_purchase timestamptz;
begin
  select * into v_customer
    from public.customers
   where id = p_customer_id;

  if not found then
    return;
  end if;

  -- Cálculos simplificados com base nos eventos de compra registrados.
  select
    coalesce(sum((metadata->>'amount')::numeric), 0),
    count(*)::int,
    min(created_at),
    max(created_at)
    into v_total_spent, v_purchase_count, v_first_purchase, v_last_purchase
    from public.customer_events
   where customer_id = p_customer_id
     and event_type in ('purchase.created', 'purchase.completed')
     and (metadata->>'status' is null or metadata->>'status' <> 'cancelled');

  update public.customers
     set total_spent = v_total_spent,
         purchase_count = v_purchase_count,
         average_ticket = case when v_purchase_count > 0 then v_total_spent / v_purchase_count else 0 end,
         last_purchase_at = v_last_purchase,
         updated_at = now()
   where id = p_customer_id;

  -- Frequência: compras por mês desde a primeira compra.
  if v_purchase_count > 1 and v_first_purchase is not null then
    update public.customers
       set purchase_frequency = v_purchase_count::numeric / nullif(greatest(1, extract(epoch from (now() - v_first_purchase)) / 2592000), 0),
           updated_at = now()
     where id = p_customer_id;
  end if;
end;
$$;
