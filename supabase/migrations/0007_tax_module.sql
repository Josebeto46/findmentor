-- FinMentor · 0007 · Módulo de impuestos (Ecuador)
-- Fuentes oficiales (SRI):
--   · Tablas de impuesto a la renta 2025 y 2026: Resolución NAC-DGERCGC25-00000043 (RO 2.º Supl. 194, 30/12/2025).
--   · Rebaja de gastos personales 2026: Boletín NAC-COM-26-006 (06/02/2026): 18 % sobre el menor valor entre los
--     gastos y N canastas básicas (canasta enero 2026 = USD 821,80), N según cargas familiares.
--   · Retención en la fuente de renta: Resolución NAC-DGERCGC26-00000009, aplicable desde el 01/03/2026.
-- Todos estos valores son datos editables por el Administrador (Administración → IVA e impuestos).

-- ───────────── Parámetros de renta personal por año ─────────────
create table public.tax_year_params (
  year                int primary key check (year between 2000 and 2100),
  basic_basket_value  numeric(10,2) not null check (basic_basket_value > 0), -- canasta familiar básica de referencia
  rebate_rate         numeric(5,2)  not null check (rebate_rate between 0 and 100), -- % de rebaja por gastos personales
  catastrophic_baskets int not null default 100,
  iess_rate           numeric(5,2)  not null default 9.45,                    -- aporte personal al IESS (relación de dependencia)
  source              text,
  verified            boolean not null default false
);

create table public.income_tax_brackets (
  year      int not null references public.tax_year_params (year) on delete cascade,
  lower     numeric(14,2) not null,         -- fracción básica
  upper     numeric(14,2),                  -- exceso hasta (null = en adelante)
  base_tax  numeric(14,2) not null,         -- impuesto a la fracción básica
  rate      numeric(5,2)  not null,         -- % sobre el excedente
  primary key (year, lower)
);

-- Canastas básicas topadas según cargas familiares (dependents = 5 significa "5 o más")
create table public.rebate_baskets (
  year        int not null references public.tax_year_params (year) on delete cascade,
  dependents  smallint not null check (dependents between 0 and 5),
  baskets     int not null check (baskets > 0),
  primary key (year, dependents)
);

alter table public.tax_year_params    enable row level security;
alter table public.income_tax_brackets enable row level security;
alter table public.rebate_baskets     enable row level security;

do $$
declare t text;
begin
  foreach t in array array['tax_year_params', 'income_tax_brackets', 'rebate_baskets'] loop
    execute format('create policy %I on public.%I for select to authenticated using (true)', t || '_select', t);
    execute format('create policy %I on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t || '_admin', t);
    execute format('create trigger %I after insert or update or delete on public.%I for each row execute function public.audit_row()', 'trg_audit_' || t, t);
  end loop;
end $$;

-- ───────────── Datos oficiales ─────────────
insert into public.tax_year_params (year, basic_basket_value, rebate_rate, iess_rate, source, verified) values
  (2025, 821.80, 18, 9.45, 'SRI NAC-DGERCGC25-00000043. Rebaja 2025: verificar canasta y canastas con el SRI', false),
  (2026, 821.80, 18, 9.45, 'SRI NAC-DGERCGC25-00000043 (tabla) y Boletín NAC-COM-26-006 (rebaja)', true);

insert into public.income_tax_brackets (year, lower, upper, base_tax, rate) values
  (2025,      0,  12081,     0,  0), (2025,  12081,  15387,     0,  5), (2025,  15387,  19978,   165, 10),
  (2025,  19978,  26422,   624, 12), (2025,  26422,  34770,  1398, 15), (2025,  34770,  46089,  2650, 20),
  (2025,  46089,  61359,  4914, 25), (2025,  61359,  81817,  8731, 30), (2025,  81817, 108810, 14869, 35),
  (2025, 108810,   null, 24316, 37),
  (2026,      0,  12208,     0,  0), (2026,  12208,  15549,     0,  5), (2026,  15549,  20188,   167, 10),
  (2026,  20188,  26700,   631, 12), (2026,  26700,  35136,  1412, 15), (2026,  35136,  46575,  2678, 20),
  (2026,  46575,  62005,  4965, 25), (2026,  62005,  82679,  8823, 30), (2026,  82679, 109956, 15025, 35),
  (2026, 109956,   null, 24572, 37);

-- Canastas por cargas familiares (7, 9, 11, 14, 17, 20): coinciden con los montos máximos publicados
-- (p. ej. 7 × 821,80 × 18 % = USD 1.035,47). Verificar contra el cuadro del SRI antes de producción.
insert into public.rebate_baskets (year, dependents, baskets) values
  (2026, 0, 7), (2026, 1, 9), (2026, 2, 11), (2026, 3, 14), (2026, 4, 17), (2026, 5, 20);

-- ───────────── Retenciones en la fuente (Resolución NAC-DGERCGC26-00000009, desde 01/03/2026) ─────────────
-- El esquema 2026 se organiza por porcentaje. Los códigos numéricos anteriores quedan inactivos
-- (se conservan porque pueden estar usados por movimientos ya registrados).
update public.withholding_codes set is_active = false where sri_code in ('303', '304', '307', '308', '310', '312', '320', '332');

insert into public.withholding_codes (sri_code, description, percentage) values
  ('R0',    '0 %: intereses entre entidades financieras; compras a RIMPE Negocio Popular con comprobante preimpreso', 0),
  ('R1',    '1 %: transporte privado de pasajeros y de carga; productos agropecuarios al productor; compras a RIMPE Emprendedor', 1),
  ('R1.75', '1,75 %: productos agropecuarios en estado natural a comercializadores no productores', 1.75),
  ('R2',    '2 %: energía eléctrica; bienes muebles de naturaleza corporal; seguros; construcción; tarjetas de crédito', 2),
  ('R3',    '3 %: servicios de mano de obra (personas naturales); publicidad y medios; cualquier pago sin porcentaje específico', 3),
  ('R5',    '5 %: servicios profesionales de sociedades; comisiones a sociedades', 5),
  ('R10',   '10 %: honorarios y servicios del intelecto (personas naturales); arrendamiento de inmuebles; docencia; regalías', 10)
on conflict (sri_code) do nothing;

-- ───────────── Datos tributarios del espacio ─────────────
alter table public.workspaces
  add column tax_dependents smallint not null default 0 check (tax_dependents between 0 and 5),
  add column tax_employed   boolean  not null default false; -- relación de dependencia: descuenta aporte IESS

-- ───────────── Rubro "turismo nacional" para gastos personales ─────────────
create or replace function public.seed_workspace_defaults(ws uuid, p_kind public.account_kind) returns void
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
      (ws, 'Educación, arte y cultura', 'gasto', 'graduation-cap', true, 'educacion'),
      (ws, 'Salud',         'gasto',   'heart-pulse', true, 'salud'),
      (ws, 'Vestimenta',    'gasto',   'shirt',       true, 'vestimenta'),
      (ws, 'Turismo nacional', 'gasto', 'plane',      true, 'turismo'),
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
revoke execute on function public.seed_workspace_defaults(uuid, public.account_kind) from public, anon, authenticated;

-- Espacios personales ya creados: agregar el rubro de turismo nacional
insert into public.categories (workspace_id, name, type, icon, is_default, tax_deductible_group)
select w.id, 'Turismo nacional', 'gasto', 'plane', true, 'turismo'
from public.workspaces w
where w.kind = 'personal'
  and not exists (select 1 from public.categories c where c.workspace_id = w.id and c.tax_deductible_group = 'turismo');
