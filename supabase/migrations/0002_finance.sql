-- FinMentor · 0002 · Finanzas: cuentas, categorías, contactos, impuestos (Ecuador), transacciones

create type public.tx_type        as enum ('ingreso', 'gasto');
create type public.payment_status as enum ('pagado', 'pendiente');
create type public.bank_account_kind as enum ('efectivo', 'banco', 'tarjeta', 'billetera');
create type public.contact_kind   as enum ('cliente', 'proveedor', 'ambos');

-- ───────────── Catálogos globales (editables por el Admin) ─────────────
create table public.tax_rates (
  id          uuid primary key default gen_random_uuid(),
  code        text not null,
  name        text not null,
  percentage  numeric(5,2) not null check (percentage >= 0),
  valid_from  date not null,
  valid_to    date,
  is_active   boolean not null default true,
  unique (code, valid_from)
);

create table public.withholding_codes (
  id          uuid primary key default gen_random_uuid(),
  sri_code    text not null unique,
  description text not null,
  percentage  numeric(5,2) not null check (percentage >= 0),
  is_active   boolean not null default true
);

-- Día de vencimiento mensual según el noveno dígito del RUC
create table public.tax_due_days (
  ninth_digit smallint primary key check (ninth_digit between 0 and 9),
  due_day     smallint not null check (due_day between 1 and 31)
);

-- ───────────── Datos por espacio ─────────────
create table public.accounts (
  id              uuid primary key default gen_random_uuid(),
  workspace_id    uuid not null references public.workspaces (id) on delete cascade,
  name            text not null,
  kind            public.bank_account_kind not null default 'efectivo',
  initial_balance numeric(14,2) not null default 0,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);
create index on public.accounts (workspace_id);

create table public.categories (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name         text not null,
  type         public.tx_type not null,
  icon         text,
  color        text,
  parent_id    uuid references public.categories (id) on delete set null,
  is_default   boolean not null default false,
  tax_deductible_group text, -- p. ej. vivienda, educacion, salud, alimentacion, vestimenta (renta personal)
  created_at   timestamptz not null default now()
);
create index on public.categories (workspace_id);

create table public.contacts (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name         text not null,
  tax_id       text, -- RUC o cédula
  kind         public.contact_kind not null default 'ambos',
  email        text,
  phone        text,
  created_at   timestamptz not null default now()
);
create index on public.contacts (workspace_id);

create table public.recurring_rules (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  frequency    text not null check (frequency in ('semanal', 'quincenal', 'mensual', 'anual')),
  next_date    date not null,
  template     jsonb not null, -- campos de la transacción a generar
  is_active    boolean not null default true,
  created_at   timestamptz not null default now()
);

create table public.transactions (
  id               uuid primary key default gen_random_uuid(),
  workspace_id     uuid not null references public.workspaces (id) on delete cascade,
  account_id       uuid not null references public.accounts (id),
  category_id      uuid references public.categories (id),
  contact_id       uuid references public.contacts (id),
  type             public.tx_type not null,
  occurred_on      date not null default current_date,
  description      text,
  base_amount      numeric(14,2) not null check (base_amount >= 0), -- base imponible
  tax_rate_id      uuid references public.tax_rates (id),
  tax_amount       numeric(14,2) not null default 0,                -- calculado por trigger
  withholding_id   uuid references public.withholding_codes (id),
  withheld_amount  numeric(14,2) not null default 0,                -- calculado por trigger
  total            numeric(14,2) not null default 0,                -- base + IVA (calculado)
  iva_deductible   boolean not null default false,
  doc_type         text,
  doc_number       text,
  payment_method   text,
  payment_status   public.payment_status not null default 'pagado',
  due_date         date,
  paid_on          date,
  attachment_path  text,
  recurring_rule_id uuid references public.recurring_rules (id) on delete set null,
  created_by       uuid references public.profiles (id) default auth.uid(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index on public.transactions (workspace_id, occurred_on desc);
create index on public.transactions (workspace_id, payment_status, due_date);
create index on public.transactions (account_id);
create index on public.transactions (category_id);
create index on public.transactions (contact_id);

create table public.budgets (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  category_id  uuid not null references public.categories (id) on delete cascade,
  month        date not null, -- primer día del mes
  amount       numeric(14,2) not null check (amount >= 0),
  unique (workspace_id, category_id, month)
);

create table public.audit_log (
  id           bigint generated always as identity primary key,
  workspace_id uuid,
  user_id      uuid,
  action       text not null,
  table_name   text not null,
  record_id    uuid,
  changes      jsonb,
  created_at   timestamptz not null default now()
);
create index on public.audit_log (workspace_id, created_at desc);

-- ───────────── Triggers ─────────────
create trigger trg_tx_updated before update on public.transactions
  for each row execute function public.set_updated_at();

-- Cálculo autoritativo de IVA, retención y total + coherencia entre espacios
create function public.compute_tx_totals() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_pct numeric(5,2);
begin
  if not exists (select 1 from public.accounts a where a.id = new.account_id and a.workspace_id = new.workspace_id) then
    raise exception 'La cuenta no pertenece al espacio de trabajo';
  end if;
  if new.category_id is not null and not exists
     (select 1 from public.categories c where c.id = new.category_id and c.workspace_id = new.workspace_id) then
    raise exception 'La categoría no pertenece al espacio de trabajo';
  end if;
  if new.contact_id is not null and not exists
     (select 1 from public.contacts c where c.id = new.contact_id and c.workspace_id = new.workspace_id) then
    raise exception 'El contacto no pertenece al espacio de trabajo';
  end if;

  v_pct := coalesce((select percentage from public.tax_rates where id = new.tax_rate_id), 0);
  new.tax_amount := round(new.base_amount * v_pct / 100, 2);
  new.total := new.base_amount + new.tax_amount;

  v_pct := coalesce((select percentage from public.withholding_codes where id = new.withholding_id), 0);
  new.withheld_amount := round(new.base_amount * v_pct / 100, 2);

  if new.payment_status = 'pagado' and new.paid_on is null then new.paid_on := new.occurred_on; end if;
  if new.payment_status = 'pendiente' then new.paid_on := null; end if;
  return new;
end $$;

create trigger trg_tx_compute before insert or update on public.transactions
  for each row execute function public.compute_tx_totals();

create trigger trg_limit_tx   before insert on public.transactions for each row execute function public.enforce_limit();
create trigger trg_limit_acc  before insert on public.accounts     for each row execute function public.enforce_limit();
create trigger trg_limit_cat  before insert on public.categories   for each row execute function public.enforce_limit();

create function public.audit_row() returns trigger
language plpgsql security definer set search_path = public as $$
declare r record := coalesce(new, old);
begin
  insert into public.audit_log (workspace_id, user_id, action, table_name, record_id, changes)
  values (case tg_table_name when 'workspaces' then r.id else r.workspace_id end,
          auth.uid(), tg_op, tg_table_name, r.id,
          case tg_op when 'DELETE' then to_jsonb(old) when 'UPDATE' then jsonb_build_object('old', to_jsonb(old), 'new', to_jsonb(new)) else to_jsonb(new) end);
  return coalesce(new, old);
end $$;
create trigger trg_audit_tx before insert or update or delete on public.transactions for each row execute function public.audit_row();
create trigger trg_audit_ws before update or delete on public.workspaces for each row execute function public.audit_row();

-- ───────────── Alta de espacio de trabajo (onboarding) ─────────────
create function public.seed_workspace_defaults(ws uuid, p_kind public.account_kind) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into public.accounts (workspace_id, name, kind) values (ws, 'Efectivo', 'efectivo');

  if p_kind = 'personal' then
    insert into public.categories (workspace_id, name, type, icon, is_default, tax_deductible_group) values
      (ws, 'Sueldo',        'ingreso', 'briefcase',   true, null),
      (ws, 'Ventas',        'ingreso', 'shopping-bag', true, null),
      (ws, 'Otros ingresos','ingreso', 'plus-circle', true, null),
      (ws, 'Vivienda',      'gasto',   'home',        true, 'vivienda'),
      (ws, 'Alimentación',  'gasto',   'utensils',    true, 'alimentacion'),
      (ws, 'Educación',     'gasto',   'graduation-cap', true, 'educacion'),
      (ws, 'Salud',         'gasto',   'heart-pulse', true, 'salud'),
      (ws, 'Vestimenta',    'gasto',   'shirt',       true, 'vestimenta'),
      (ws, 'Transporte',    'gasto',   'car',         true, null),
      (ws, 'Servicios básicos','gasto','zap',         true, null),
      (ws, 'Entretenimiento','gasto',  'film',        true, null),
      (ws, 'Otros gastos',  'gasto',   'more-horizontal', true, null);
  else
    insert into public.categories (workspace_id, name, type, icon, is_default) values
      (ws, 'Ventas de bienes',    'ingreso', 'shopping-bag', true),
      (ws, 'Prestación de servicios','ingreso','briefcase', true),
      (ws, 'Otros ingresos',      'ingreso', 'plus-circle', true),
      (ws, 'Compras de mercadería','gasto',  'package',     true),
      (ws, 'Sueldos y beneficios','gasto',   'users',       true),
      (ws, 'Arriendo',            'gasto',   'building',    true),
      (ws, 'Servicios básicos',   'gasto',   'zap',         true),
      (ws, 'Publicidad',          'gasto',   'megaphone',   true),
      (ws, 'Transporte',          'gasto',   'truck',       true),
      (ws, 'Honorarios profesionales','gasto','file-text',  true),
      (ws, 'Impuestos y tasas',   'gasto',   'landmark',    true),
      (ws, 'Otros gastos',        'gasto',   'more-horizontal', true);
  end if;
end $$;

create function public.create_workspace(
  p_name text,
  p_kind public.account_kind,
  p_ruc text default null,
  p_legal_name text default null,
  p_regime public.tax_regime default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_uid  uuid := auth.uid();
  v_plan uuid;
  v_ws   uuid;
begin
  if v_uid is null then raise exception 'Sesión requerida'; end if;

  if p_kind = 'personal' and exists (
    select 1 from public.workspaces w
    where w.owner_id = v_uid and w.kind = 'personal'
  ) then
    raise exception 'Ya tienes un espacio personal';
  end if;

  select id into v_plan from public.plans
   where is_free and is_active and account_kind = p_kind order by created_at limit 1;
  if v_plan is null then raise exception 'No hay plan gratuito disponible para %', p_kind; end if;

  insert into public.workspaces (name, kind, owner_id, plan_id, ruc, legal_name, regime)
  values (p_name, p_kind, v_uid, v_plan, p_ruc, p_legal_name,
          coalesce(p_regime, case p_kind when 'personal' then 'persona_natural'::public.tax_regime else 'general'::public.tax_regime end))
  returning id into v_ws;

  insert into public.workspace_members (workspace_id, user_id, role) values (v_ws, v_uid, 'owner');
  perform public.seed_workspace_defaults(v_ws, p_kind);
  return v_ws;
end $$;

-- ───────────── RLS ─────────────
alter table public.tax_rates         enable row level security;
alter table public.withholding_codes enable row level security;
alter table public.tax_due_days      enable row level security;
alter table public.audit_log         enable row level security;

do $$
declare t text;
begin
  foreach t in array array['tax_rates', 'withholding_codes', 'tax_due_days'] loop
    execute format('create policy %I on public.%I for select to authenticated using (true)', t || '_select', t);
    execute format('create policy %I on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t || '_admin', t);
  end loop;

  foreach t in array array['accounts', 'categories', 'contacts', 'transactions', 'recurring_rules', 'budgets'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for select to authenticated using (public.is_member(workspace_id) or public.is_admin())', t || '_select', t);
    execute format($p$create policy %I on public.%I for insert to authenticated
      with check (public.is_member(workspace_id, 'editor')
        and exists (select 1 from public.workspaces w where w.id = workspace_id and w.status = 'active'))$p$, t || '_insert', t);
    execute format($p$create policy %I on public.%I for update to authenticated
      using (public.is_member(workspace_id, 'editor'))
      with check (public.is_member(workspace_id, 'editor'))$p$, t || '_update', t);
    execute format($p$create policy %I on public.%I for delete to authenticated using (public.is_member(workspace_id, 'editor'))$p$, t || '_delete', t);
  end loop;
end $$;

create policy audit_select on public.audit_log for select to authenticated
  using (public.is_admin() or (workspace_id is not null and public.is_member(workspace_id, 'owner')));

-- ───────────── Adjuntos (Storage) ─────────────
-- Ruta: <workspace_id>/<archivo>
insert into storage.buckets (id, name, public) values ('attachments', 'attachments', false)
on conflict (id) do nothing;

create policy att_select on storage.objects for select to authenticated
  using (bucket_id = 'attachments' and public.is_member(((storage.foldername(name))[1])::uuid));
create policy att_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'attachments' and public.is_member(((storage.foldername(name))[1])::uuid, 'editor'));
create policy att_delete on storage.objects for delete to authenticated
  using (bucket_id = 'attachments' and public.is_member(((storage.foldername(name))[1])::uuid, 'editor'));
