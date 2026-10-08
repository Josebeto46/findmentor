-- FinMentor · 0005 · Resúmenes: saldo por cuenta y resumen mensual

-- Saldo por cuenta = saldo inicial + movimientos pagados (ingresos suman, gastos restan; neto de retenciones).
-- SECURITY INVOKER: se aplica la RLS del usuario que consulta.
create function public.account_balances(ws uuid)
returns table (account_id uuid, balance numeric)
language sql stable security invoker set search_path = public as $$
  select a.id,
         a.initial_balance + coalesce(sum(
           case t.type when 'ingreso' then t.total - t.withheld_amount else -(t.total - t.withheld_amount) end
         ) filter (where t.payment_status = 'pagado'), 0)
  from public.accounts a
  left join public.transactions t on t.account_id = a.id
  where a.workspace_id = ws
  group by a.id;
$$;

-- Resumen del mes (por fecha del movimiento) + pendientes de cobro/pago de cualquier fecha.
create function public.month_summary(ws uuid, month_start date)
returns table (income numeric, expense numeric, receivable numeric, payable numeric)
language sql stable security invoker set search_path = public as $$
  select
    coalesce(sum(t.total - t.withheld_amount) filter (where t.type = 'ingreso' and t.payment_status = 'pagado'
      and t.occurred_on >= month_start and t.occurred_on < (month_start + interval '1 month')), 0),
    coalesce(sum(t.total - t.withheld_amount) filter (where t.type = 'gasto' and t.payment_status = 'pagado'
      and t.occurred_on >= month_start and t.occurred_on < (month_start + interval '1 month')), 0),
    coalesce(sum(t.total - t.withheld_amount) filter (where t.type = 'ingreso' and t.payment_status = 'pendiente'), 0),
    coalesce(sum(t.total - t.withheld_amount) filter (where t.type = 'gasto' and t.payment_status = 'pendiente'), 0)
  from public.transactions t
  where t.workspace_id = ws;
$$;

revoke execute on function public.account_balances(uuid)    from public, anon;
revoke execute on function public.month_summary(uuid, date) from public, anon;
grant  execute on function public.account_balances(uuid)    to authenticated;
grant  execute on function public.month_summary(uuid, date) to authenticated;
