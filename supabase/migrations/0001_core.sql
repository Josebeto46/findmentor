-- FinMentor · 0001 · Núcleo: perfiles, planes/límites, espacios de trabajo, seguridad base
-- Convenciones: dinero en USD numeric(14,2). Límites: -1 = ilimitado; booleanos 0/1.

create extension if not exists pgcrypto;

-- ───────────── Tipos ─────────────
create type public.platform_role   as enum ('user', 'admin');
create type public.account_kind    as enum ('personal', 'empresa');
create type public.member_role     as enum ('owner', 'editor', 'lector');
create type public.tax_regime      as enum ('persona_natural', 'general', 'rimpe_emprendedor', 'rimpe_negocio_popular');
create type public.workspace_status as enum ('active', 'suspended');

create function public.set_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- ───────────── Tablas ─────────────
create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  email         text,
  full_name     text,
  platform_role public.platform_role not null default 'user',
  is_active     boolean not null default true,
  country       text not null default 'EC',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table public.plans (
  id           uuid primary key default gen_random_uuid(),
  code         text not null unique,
  name         text not null,
  account_kind public.account_kind not null,
  price_usd    numeric(10,2) not null default 0 check (price_usd >= 0),
  is_free      boolean not null default false,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now()
);

create table public.plan_limits (
  plan_id uuid not null references public.plans (id) on delete cascade,
  key     text not null,
  value   bigint not null,
  primary key (plan_id, key)
);

create table public.workspaces (
  id                   uuid primary key default gen_random_uuid(),
  name                 text not null,
  kind                 public.account_kind not null,
  owner_id             uuid not null references public.profiles (id),
  plan_id              uuid not null references public.plans (id),
  status               public.workspace_status not null default 'active',
  currency             text not null default 'USD',
  ruc                  text,
  legal_name           text,
  regime               public.tax_regime,
  obligado_contabilidad boolean not null default false,
  iva_periodicity      text not null default 'mensual' check (iva_periodicity in ('mensual', 'semestral')),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  role         public.member_role not null default 'lector',
  created_at   timestamptz not null default now(),
  primary key (workspace_id, user_id)
);
create index on public.workspace_members (user_id);

create table public.app_settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

create trigger trg_profiles_updated   before update on public.profiles   for each row execute function public.set_updated_at();
create trigger trg_workspaces_updated before update on public.workspaces for each row execute function public.set_updated_at();

-- ───────────── Funciones de seguridad ─────────────
create function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and platform_role = 'admin' and is_active
  );
$$;

create function public.is_member(ws uuid, min_role public.member_role default 'lector') returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.workspace_members m
    where m.workspace_id = ws and m.user_id = auth.uid()
      and case min_role
            when 'lector' then true
            when 'editor' then m.role in ('owner', 'editor')
            else m.role = 'owner'
          end
  );
$$;

-- Alta automática de perfil al registrarse
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email,
          coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'));
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

-- Nadie (salvo Admin o el SQL editor) puede cambiar su rol/estado
create function public.guard_profile_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if new.platform_role is distinct from old.platform_role
       or new.is_active is distinct from old.is_active then
      raise exception 'No autorizado para cambiar rol o estado';
    end if;
  end if;
  return new;
end $$;
create trigger trg_guard_profile before update on public.profiles
  for each row execute function public.guard_profile_update();

-- El owner no puede cambiar plan, estado ni propietario
create function public.guard_workspace_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if new.plan_id is distinct from old.plan_id
       or new.status is distinct from old.status
       or new.owner_id is distinct from old.owner_id
       or new.kind is distinct from old.kind then
      raise exception 'No autorizado para cambiar plan, estado, propietario o tipo';
    end if;
  end if;
  return new;
end $$;
create trigger trg_guard_workspace before update on public.workspaces
  for each row execute function public.guard_workspace_update();

-- ───────────── Límites del plan ─────────────
-- Devuelve el límite de una clave para un espacio (null = sin límite definido).
create function public.get_limit(ws uuid, k text) returns bigint
language sql stable security definer set search_path = public as $$
  select pl.value
  from public.workspaces w
  join public.plan_limits pl on pl.plan_id = w.plan_id and pl.key = k
  where w.id = ws;
$$;

create function public.has_feature(ws uuid, k text) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.get_limit(ws, k), 0) <> 0;
$$;

create function public.enforce_limit() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_key   text;
  v_lim   bigint;
  v_used  bigint;
  v_month timestamptz := date_trunc('month', now() at time zone 'America/Guayaquil') at time zone 'America/Guayaquil';
begin
  case tg_table_name
    when 'transactions' then
      v_key := 'max_transacciones_mes';
      v_lim := public.get_limit(new.workspace_id, v_key);
      if v_lim is null or v_lim < 0 then return new; end if;
      -- Se cuenta por fecha de creación para que no se evada el tope con fechas pasadas.
      select count(*) into v_used from public.transactions
        where workspace_id = new.workspace_id and created_at >= v_month;
    when 'accounts' then
      v_key := 'max_cuentas';
      v_lim := public.get_limit(new.workspace_id, v_key);
      if v_lim is null or v_lim < 0 then return new; end if;
      select count(*) into v_used from public.accounts
        where workspace_id = new.workspace_id and is_active;
    when 'categories' then
      if new.is_default then return new; end if;
      v_key := 'max_categorias';
      v_lim := public.get_limit(new.workspace_id, v_key);
      if v_lim is null or v_lim < 0 then return new; end if;
      select count(*) into v_used from public.categories
        where workspace_id = new.workspace_id and not is_default;
    when 'workspace_members' then
      v_key := 'max_miembros';
      v_lim := public.get_limit(new.workspace_id, v_key);
      if v_lim is null or v_lim < 0 then return new; end if;
      select count(*) into v_used from public.workspace_members
        where workspace_id = new.workspace_id;
  end case;

  if v_used >= v_lim then
    raise exception 'LIMIT_EXCEEDED:%', v_key using errcode = 'P0001';
  end if;
  return new;
end $$;

create trigger trg_limit_members before insert on public.workspace_members
  for each row execute function public.enforce_limit();

-- Uso actual vs. límite (para el medidor de la interfaz)
create function public.workspace_usage(ws uuid)
returns table (key text, used bigint, "limit" bigint)
language plpgsql stable security definer set search_path = public as $$
declare v_month timestamptz := date_trunc('month', now() at time zone 'America/Guayaquil') at time zone 'America/Guayaquil';
begin
  if not (public.is_member(ws) or public.is_admin()) then
    raise exception 'No autorizado';
  end if;
  return query
    select 'max_transacciones_mes'::text,
           (select count(*) from public.transactions t where t.workspace_id = ws and t.created_at >= v_month),
           public.get_limit(ws, 'max_transacciones_mes')
    union all
    select 'max_cuentas', (select count(*) from public.accounts a where a.workspace_id = ws and a.is_active),
           public.get_limit(ws, 'max_cuentas')
    union all
    select 'max_categorias', (select count(*) from public.categories c where c.workspace_id = ws and not c.is_default),
           public.get_limit(ws, 'max_categorias')
    union all
    select 'max_miembros', (select count(*) from public.workspace_members m where m.workspace_id = ws),
           public.get_limit(ws, 'max_miembros');
end $$;

-- ───────────── RLS ─────────────
alter table public.profiles          enable row level security;
alter table public.plans             enable row level security;
alter table public.plan_limits       enable row level security;
alter table public.workspaces        enable row level security;
alter table public.workspace_members enable row level security;
alter table public.app_settings      enable row level security;

-- profiles
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin()
         or exists (select 1 from public.workspace_members a join public.workspace_members b
                    on a.workspace_id = b.workspace_id
                    where a.user_id = auth.uid() and b.user_id = profiles.id));
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());

-- plans / limits: lectura para cualquier usuario autenticado, escritura solo Admin
create policy plans_select on public.plans for select to authenticated using (is_active or public.is_admin());
create policy plans_admin  on public.plans for all    to authenticated using (public.is_admin()) with check (public.is_admin());
create policy limits_select on public.plan_limits for select to authenticated using (true);
create policy limits_admin  on public.plan_limits for all    to authenticated using (public.is_admin()) with check (public.is_admin());

-- workspaces (se crean solo vía create_workspace)
create policy ws_select on public.workspaces for select to authenticated
  using (public.is_member(id) or public.is_admin());
create policy ws_update on public.workspaces for update to authenticated
  using (public.is_member(id, 'owner') or public.is_admin())
  with check (public.is_member(id, 'owner') or public.is_admin());
create policy ws_admin_delete on public.workspaces for delete to authenticated using (public.is_admin());

-- miembros
create policy wm_select on public.workspace_members for select to authenticated
  using (user_id = auth.uid() or public.is_member(workspace_id) or public.is_admin());
create policy wm_manage on public.workspace_members for all to authenticated
  using (public.is_member(workspace_id, 'owner') or public.is_admin())
  with check (public.is_member(workspace_id, 'owner') or public.is_admin());

-- app_settings
create policy settings_select on public.app_settings for select to authenticated using (true);
create policy settings_admin  on public.app_settings for all    to authenticated using (public.is_admin()) with check (public.is_admin());
