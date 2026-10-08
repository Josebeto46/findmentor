-- FinMentor · semillas. Ejecutar después de las migraciones (idempotente).

-- ───────────── Planes gratuitos y sus límites (editables luego desde el panel Admin) ─────────────
insert into public.plans (code, name, account_kind, is_free) values
  ('free_personal', 'Gratis Personal', 'personal', true),
  ('free_empresa',  'Gratis Empresa',  'empresa',  true)
on conflict (code) do nothing;

insert into public.plan_limits (plan_id, key, value)
select p.id, l.key, l.value
from public.plans p
join (values
  ('free_personal', 'max_transacciones_mes', 100),
  ('free_personal', 'max_cuentas',            3),
  ('free_personal', 'max_categorias',         10),
  ('free_personal', 'max_miembros',           1),
  ('free_personal', 'max_adjuntos_mb',        50),
  ('free_personal', 'flujo_caja_proyectado',  0),
  ('free_personal', 'modulo_impuestos',       1),
  ('free_personal', 'exportar',               0),
  ('free_empresa',  'max_transacciones_mes', 100),
  ('free_empresa',  'max_cuentas',            5),
  ('free_empresa',  'max_categorias',         20),
  ('free_empresa',  'max_miembros',           2),
  ('free_empresa',  'max_adjuntos_mb',        200),
  ('free_empresa',  'flujo_caja_proyectado',  0),
  ('free_empresa',  'modulo_impuestos',       1),
  ('free_empresa',  'exportar',               0)
) as l(code, key, value) on l.code = p.code
on conflict (plan_id, key) do nothing;

-- ───────────── IVA (VERIFICAR vigencias y tarifas en el SRI antes de producción) ─────────────
insert into public.tax_rates (code, name, percentage, valid_from) values
  ('IVA15',   'IVA 15%',            15, '2024-04-01'),
  ('IVA0',    'IVA 0%',              0, '2000-01-01'),
  ('NOOBJ',   'No objeto de IVA',    0, '2000-01-01'),
  ('EXENTO',  'Exento de IVA',       0, '2000-01-01')
on conflict (code, valid_from) do nothing;

-- ───────────── Retenciones en la fuente de renta (VERIFICAR códigos y % con el SRI) ─────────────
insert into public.withholding_codes (sri_code, description, percentage) values
  ('303', 'Honorarios profesionales y demás pagos por servicios relacionados con el título profesional', 10),
  ('304', 'Servicios donde predomina el intelecto', 8),
  ('307', 'Servicios donde predomina la mano de obra', 2),
  ('308', 'Servicios entre sociedades', 2),
  ('310', 'Transporte privado de pasajeros o de carga', 1),
  ('312', 'Transferencia de bienes muebles de naturaleza corporal', 1.75),
  ('320', 'Arrendamiento de bienes inmuebles', 8),
  ('332', 'Otras compras de bienes y servicios no sujetas a retención', 0)
on conflict (sri_code) do nothing;

-- ───────────── Día de vencimiento mensual según noveno dígito del RUC ─────────────
insert into public.tax_due_days (ninth_digit, due_day) values
  (1, 10), (2, 12), (3, 14), (4, 16), (5, 18), (6, 20), (7, 22), (8, 24), (9, 26), (0, 28)
on conflict (ninth_digit) do nothing;

-- ───────────── Parámetros globales ─────────────
insert into public.app_settings (key, value) values
  ('default_currency', '"USD"'),
  ('default_country',  '"EC"'),
  ('default_timezone', '"America/Guayaquil"')
on conflict (key) do nothing;
