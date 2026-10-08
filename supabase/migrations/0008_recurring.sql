-- FinMentor · 0008 · Movimientos recurrentes
-- run_recurring genera los movimientos vencidos de las reglas activas y adelanta su próxima fecha.
--   · Desde pg_cron (cada día) procesa todos los espacios.
--   · Desde la app (usuario con sesión) procesa solo el espacio indicado, si es editor.
-- Respeta los límites del plan y el acceso vigente: si no se puede insertar, la regla se reintenta después.

create or replace function public.run_recurring(p_ws uuid default null) returns integer
language plpgsql security definer set search_path = public as $$
declare
  r      record;
  t      jsonb;
  n      integer := 0;
  tries  integer;
  v_next date;
  v_today date := (now() at time zone 'America/Guayaquil')::date;
begin
  if auth.uid() is not null then
    if p_ws is null or not public.is_member(p_ws, 'editor') then
      raise exception 'No autorizado';
    end if;
  end if;

  for r in
    select * from public.recurring_rules
    where is_active and next_date <= v_today and (p_ws is null or workspace_id = p_ws)
    order by next_date
  loop
    if not public.workspace_writable(r.workspace_id) then continue; end if;

    v_next := r.next_date;
    tries := 0;
    while v_next <= v_today and tries < 12 loop
      tries := tries + 1;
      t := r.template;
      begin
        insert into public.transactions (
          workspace_id, account_id, category_id, contact_id, type, occurred_on, description,
          base_amount, tax_rate_id, withholding_id, iva_deductible, payment_status, due_date,
          recurring_rule_id, created_by
        ) values (
          r.workspace_id,
          (t ->> 'account_id')::uuid,
          nullif(t ->> 'category_id', '')::uuid,
          nullif(t ->> 'contact_id', '')::uuid,
          (t ->> 'type')::public.tx_type,
          v_next,
          t ->> 'description',
          (t ->> 'base_amount')::numeric,
          nullif(t ->> 'tax_rate_id', '')::uuid,
          nullif(t ->> 'withholding_id', '')::uuid,
          coalesce((t ->> 'iva_deductible')::boolean, false),
          coalesce((t ->> 'payment_status')::public.payment_status, 'pagado'),
          case when coalesce(t ->> 'payment_status', 'pagado') = 'pendiente'
               then v_next + coalesce((t ->> 'due_days')::int, 0) end,
          r.id,
          null
        );
        n := n + 1;
      exception when others then
        exit; -- sin cupo, cuenta eliminada, etc.: se reintenta en la próxima ejecución
      end;

      v_next := case r.frequency
        when 'semanal'   then v_next + 7
        when 'quincenal' then v_next + 15
        when 'mensual'   then (v_next + interval '1 month')::date
        else                  (v_next + interval '1 year')::date
      end;
      update public.recurring_rules set next_date = v_next where id = r.id;
    end loop;
  end loop;

  return n;
end $$;

revoke execute on function public.run_recurring(uuid) from public, anon;
grant  execute on function public.run_recurring(uuid) to authenticated;

-- Programación diaria (00:05 hora de Ecuador = 05:05 UTC). Si pg_cron no está disponible,
-- la app ejecuta run_recurring al abrirse, así que no es imprescindible.
do $$
begin
  create extension if not exists pg_cron;
  perform cron.schedule('finmentor-recurring', '5 5 * * *', 'select public.run_recurring()');
exception when others then
  raise notice 'pg_cron no disponible (%): los recurrentes se generarán al abrir la app.', sqlerrm;
end $$;
