-- FinMentor · 0009 · Equipo (invitaciones) y adjuntos de comprobantes

-- ───────────── Invitaciones al espacio ─────────────
-- El propietario invita por correo y comparte el enlace /invitacion/<token>.
-- La persona invitada acepta con la cuenta de ese mismo correo (accept_invitation).
create table public.workspace_invitations (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  email        text not null check (email = lower(email) and position('@' in email) > 1),
  role         public.member_role not null check (role in ('editor', 'lector')),
  token        text not null unique default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  invited_by   uuid references public.profiles (id) default auth.uid(),
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null default now() + interval '7 days',
  accepted_at  timestamptz,
  accepted_by  uuid references public.profiles (id)
);
create unique index on public.workspace_invitations (workspace_id, email) where accepted_at is null;
create index on public.workspace_invitations (workspace_id);

alter table public.workspace_invitations enable row level security;

create policy inv_select on public.workspace_invitations for select to authenticated
  using (public.is_member(workspace_id, 'owner') or public.is_admin());
create policy inv_insert on public.workspace_invitations for insert to authenticated
  with check ((public.is_member(workspace_id, 'owner') and public.workspace_writable(workspace_id)) or public.is_admin());
create policy inv_delete on public.workspace_invitations for delete to authenticated
  using (public.is_member(workspace_id, 'owner') or public.is_admin());

-- Reglas al invitar: solo empresas, no duplicar miembros y respetar max_miembros (miembros + invitaciones vigentes)
create function public.guard_invitation() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_kind public.account_kind;
  v_lim  bigint;
  v_used bigint;
begin
  select kind into v_kind from public.workspaces where id = new.workspace_id;
  if v_kind is distinct from 'empresa' then
    raise exception 'Solo los espacios de empresa admiten más usuarios';
  end if;
  if exists (
    select 1 from public.workspace_members m join public.profiles p on p.id = m.user_id
    where m.workspace_id = new.workspace_id and lower(p.email) = new.email
  ) then
    raise exception 'Esa persona ya es miembro del espacio';
  end if;

  v_lim := public.get_limit(new.workspace_id, 'max_miembros');
  if v_lim is not null and v_lim >= 0 then
    select (select count(*) from public.workspace_members where workspace_id = new.workspace_id)
         + (select count(*) from public.workspace_invitations
             where workspace_id = new.workspace_id and accepted_at is null and expires_at > now())
      into v_used;
    if v_used >= v_lim then
      raise exception 'LIMIT_EXCEEDED:max_miembros' using errcode = 'P0001';
    end if;
  end if;
  return new;
end $$;
create trigger trg_guard_invitation before insert on public.workspace_invitations
  for each row execute function public.guard_invitation();

-- Vista previa pública de una invitación (el token es el secreto): permite mostrar el aviso antes de iniciar sesión
create function public.invitation_preview(p_token text)
returns table (workspace_name text, role public.member_role, email text, inviter text, expired boolean, accepted boolean)
language sql stable security definer set search_path = public as $$
  select w.name, i.role, i.email, coalesce(p.full_name, p.email), i.expires_at <= now(), i.accepted_at is not null
  from public.workspace_invitations i
  join public.workspaces w on w.id = i.workspace_id
  left join public.profiles p on p.id = i.invited_by
  where i.token = p_token;
$$;

-- Aceptar: exige sesión activa y que el correo de la cuenta coincida con el de la invitación
create function public.accept_invitation(p_token text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  inv     public.workspace_invitations;
  v_email text;
begin
  if auth.uid() is null then raise exception 'Sesión requerida'; end if;
  if not exists (select 1 from public.profiles where id = auth.uid() and is_active) then
    raise exception 'Tu cuenta aún no está activada';
  end if;

  select * into inv from public.workspace_invitations where token = p_token for update;
  if not found or inv.accepted_at is not null or inv.expires_at <= now() then
    raise exception 'INVITACION_INVALIDA';
  end if;

  select lower(email) into v_email from auth.users where id = auth.uid();
  if v_email is distinct from inv.email then raise exception 'INVITACION_OTRO_CORREO'; end if;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (inv.workspace_id, auth.uid(), inv.role)
  on conflict (workspace_id, user_id) do nothing;

  update public.workspace_invitations set accepted_at = now(), accepted_by = auth.uid() where id = inv.id;
  return inv.workspace_id;
end $$;

revoke execute on function public.guard_invitation() from public, anon, authenticated;
revoke execute on function public.accept_invitation(text) from public, anon;
grant  execute on function public.accept_invitation(text) to authenticated;
revoke execute on function public.invitation_preview(text) from public;
grant  execute on function public.invitation_preview(text) to anon, authenticated;

-- El propietario del espacio no puede ser expulsado ni degradado (salvo Administrador de la plataforma)
create function public.guard_member_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.role = 'owner'
     and (tg_op = 'DELETE' or new.role <> 'owner')
     and auth.uid() is not null and not public.is_admin()
     and exists (select 1 from public.workspaces w where w.id = old.workspace_id and w.owner_id = old.user_id) then
    raise exception 'No se puede quitar ni cambiar al propietario del espacio';
  end if;
  return case tg_op when 'DELETE' then old else new end;
end $$;
revoke execute on function public.guard_member_change() from public, anon, authenticated;
create trigger trg_guard_member before update or delete on public.workspace_members
  for each row execute function public.guard_member_change();

-- ───────────── Adjuntos de comprobantes ─────────────
-- Espacio usado (bytes) por los adjuntos de un espacio; lo usa la app para respetar max_adjuntos_mb.
create function public.attachments_usage(ws uuid) returns bigint
language plpgsql stable security definer set search_path = public, storage as $$
begin
  if not (public.is_member(ws) or public.is_admin()) then raise exception 'No autorizado'; end if;
  return coalesce((
    select sum((o.metadata ->> 'size')::bigint)
    from storage.objects o
    where o.bucket_id = 'attachments' and (storage.foldername(o.name))[1] = ws::text
  ), 0);
end $$;
revoke execute on function public.attachments_usage(uuid) from public, anon;
grant  execute on function public.attachments_usage(uuid) to authenticated;

-- El bucket solo acepta imágenes y PDF de hasta 5 MB
do $$
begin
  update storage.buckets
     set file_size_limit = 5242880,
         allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
   where id = 'attachments';
exception when others then
  raise notice 'No se pudo limitar el bucket (%): configúralo en Storage → attachments.', sqlerrm;
end $$;
