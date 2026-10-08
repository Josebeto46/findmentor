-- FinMentor · 0004 · Corrige audit_row para la tabla workspaces (no tiene columna workspace_id)

create or replace function public.audit_row() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  r jsonb := to_jsonb(coalesce(new, old));
begin
  insert into public.audit_log (workspace_id, user_id, action, table_name, record_id, changes)
  values (
    case tg_table_name when 'workspaces' then (r ->> 'id')::uuid else (r ->> 'workspace_id')::uuid end,
    auth.uid(), tg_op, tg_table_name, (r ->> 'id')::uuid,
    case tg_op
      when 'DELETE' then to_jsonb(old)
      when 'UPDATE' then jsonb_build_object('old', to_jsonb(old), 'new', to_jsonb(new))
      else to_jsonb(new)
    end);
  return coalesce(new, old);
end $$;

revoke execute on function public.audit_row() from public, anon, authenticated;
