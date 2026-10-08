-- FinMentor · 0006 · Panel Admin: días de acceso, activación de usuarios y protecciones
-- Cambia reglas de seguridad: revisar antes de aplicar.

-- ───────────── Días de acceso (parametrizable por plan y por espacio) ─────────────
-- plans.trial_days: días de acceso al crear un espacio con ese plan (null = sin vencimiento).
-- workspaces.access_expires_at: vencimiento efectivo (null = sin vencimiento).
alter table public.plans add column trial_days integer check (trial_days is null or trial_days > 0);
alter table public.workspaces add column access_expires_at timestamptz;

-- Activación de usuarios por el Admin (apagada por defecto)
insert into public.app_settings (key, value) values ('require_admin_activation', 'false')
on conflict (key) do nothing;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_require boolean;
begin
  select coalesce((value #>> '{}')::boolean, false) into v_require
    from public.app_settings where key = 'require_admin_activation';
  insert into public.profiles (id, email, full_name, is_active)
  values (new.id, new.email,
          coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
          not coalesce(v_require, false));
  return new;
end $$;

-- Un usuario desactivado pierde el acceso a todos sus espacios (todas las políticas usan is_member)
create or replace function public.is_member(ws uuid, min_role public.member_role default 'lector') returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.workspace_members m
    join public.profiles p on p.id = m.user_id and p.is_active
    where m.workspace_id = ws and m.user_id = auth.uid()
      and case min_role
            when 'lector' then true
            when 'editor' then m.role in ('owner', 'editor')
            else m.role = 'owner'
          end
  );
$$;

-- ¿El espacio admite escritura? (activo y con acceso vigente)
create function public.workspace_writable(ws uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.workspaces w
    where w.id = ws and w.status = 'active'
      and (w.access_expires_at is null or w.access_expires_at > now())
  );
$$;
revoke execute on function public.workspace_writable(uuid) from public, anon;
grant  execute on function public.workspace_writable(uuid) to authenticated;

-- Si el acceso vence o el espacio se suspende, los datos quedan en solo lectura
do $$
declare t text;
begin
  foreach t in array array['accounts', 'categories', 'contacts', 'transactions', 'recurring_rules', 'budgets'] loop
    execute format('drop policy %I on public.%I', t || '_insert', t);
    execute format('drop policy %I on public.%I', t || '_update', t);
    execute format('drop policy %I on public.%I', t || '_delete', t);
    execute format($p$create policy %I on public.%I for insert to authenticated
      with check (public.is_member(workspace_id, 'editor') and public.workspace_writable(workspace_id))$p$, t || '_insert', t);
    execute format($p$create policy %I on public.%I for update to authenticated
      using (public.is_member(workspace_id, 'editor') and public.workspace_writable(workspace_id))
      with check (public.is_member(workspace_id, 'editor') and public.workspace_writable(workspace_id))$p$, t || '_update', t);
    execute format($p$create policy %I on public.%I for delete to authenticated
      using (public.is_member(workspace_id, 'editor') and public.workspace_writable(workspace_id))$p$, t || '_delete', t);
  end loop;
end $$;

-- Protecciones: el owner no toca el vencimiento; nunca se queda la plataforma sin Admin activo
create or replace function public.guard_workspace_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if new.plan_id is distinct from old.plan_id
       or new.status is distinct from old.status
       or new.owner_id is distinct from old.owner_id
       or new.kind is distinct from old.kind
       or new.access_expires_at is distinct from old.access_expires_at then
      raise exception 'No autorizado para cambiar plan, estado, propietario, tipo o vencimiento';
    end if;
  end if;
  return new;
end $$;

create or replace function public.guard_profile_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if new.platform_role is distinct from old.platform_role
       or new.is_active is distinct from old.is_active then
      raise exception 'No autorizado para cambiar rol o estado';
    end if;
  end if;
  if old.platform_role = 'admin' and old.is_active
     and (new.platform_role <> 'admin' or not new.is_active)
     and not exists (select 1 from public.profiles p
                     where p.id <> old.id and p.platform_role = 'admin' and p.is_active) then
    raise exception 'Debe existir al menos un Administrador activo';
  end if;
  return new;
end $$;

-- Nuevos espacios: vencimiento según los días del plan; usuarios inactivos no pueden crear
create or replace function public.create_workspace(
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
  v_days integer;
  v_ws   uuid;
begin
  if v_uid is null then raise exception 'Sesión requerida'; end if;
  if not exists (select 1 from public.profiles where id = v_uid and is_active) then
    raise exception 'Tu cuenta aún no está activada';
  end if;

  if p_kind = 'personal' and exists (
    select 1 from public.workspaces w where w.owner_id = v_uid and w.kind = 'personal'
  ) then
    raise exception 'Ya tienes un espacio personal';
  end if;

  select id, trial_days into v_plan, v_days from public.plans
   where is_free and is_active and account_kind = p_kind order by created_at limit 1;
  if v_plan is null then raise exception 'No hay plan gratuito disponible para %', p_kind; end if;

  insert into public.workspaces (name, kind, owner_id, plan_id, ruc, legal_name, regime, access_expires_at)
  values (p_name, p_kind, v_uid, v_plan, p_ruc, p_legal_name,
          coalesce(p_regime, case p_kind when 'personal' then 'persona_natural'::public.tax_regime else 'general'::public.tax_regime end),
          case when v_days is not null then now() + make_interval(days => v_days) end)
  returning id into v_ws;

  insert into public.workspace_members (workspace_id, user_id, role) values (v_ws, v_uid, 'owner');
  perform public.seed_workspace_defaults(v_ws, p_kind);
  return v_ws;
end $$;

-- Auditoría de cambios administrativos
create trigger trg_audit_profiles   after update                          on public.profiles          for each row execute function public.audit_row();
create trigger trg_audit_plans      after insert or update or delete       on public.plans             for each row execute function public.audit_row();
create trigger trg_audit_limits     after insert or update or delete       on public.plan_limits       for each row execute function public.audit_row();
create trigger trg_audit_taxrates   after insert or update or delete       on public.tax_rates         for each row execute function public.audit_row();
create trigger trg_audit_withh      after insert or update or delete       on public.withholding_codes for each row execute function public.audit_row();
create trigger trg_audit_duedays    after insert or update or delete       on public.tax_due_days      for each row execute function public.audit_row();
create trigger trg_audit_settings   after insert or update or delete       on public.app_settings      for each row execute function public.audit_row();
