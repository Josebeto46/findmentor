-- FinMentor · 0003 · Endurecer funciones SECURITY DEFINER expuestas por la API (PostgREST)

-- Funciones solo de uso interno (triggers / helpers): nadie las llama vía API
revoke execute on function public.audit_row()                                   from public, anon, authenticated;
revoke execute on function public.compute_tx_totals()                           from public, anon, authenticated;
revoke execute on function public.enforce_limit()                               from public, anon, authenticated;
revoke execute on function public.guard_profile_update()                        from public, anon, authenticated;
revoke execute on function public.guard_workspace_update()                      from public, anon, authenticated;
revoke execute on function public.handle_new_user()                             from public, anon, authenticated;
revoke execute on function public.get_limit(uuid, text)                         from public, anon, authenticated;
revoke execute on function public.has_feature(uuid, text)                       from public, anon, authenticated;
revoke execute on function public.seed_workspace_defaults(uuid, public.account_kind) from public, anon, authenticated;

-- Expuestas solo a usuarios con sesión (las usan las políticas RLS y la app)
revoke execute on function public.is_admin()                                    from public, anon;
revoke execute on function public.is_member(uuid, public.member_role)           from public, anon;
revoke execute on function public.workspace_usage(uuid)                         from public, anon;
revoke execute on function public.create_workspace(text, public.account_kind, text, text, public.tax_regime) from public, anon;
grant  execute on function public.is_admin()                                    to authenticated;
grant  execute on function public.is_member(uuid, public.member_role)           to authenticated;
grant  execute on function public.workspace_usage(uuid)                         to authenticated;
grant  execute on function public.create_workspace(text, public.account_kind, text, text, public.tax_regime) to authenticated;

alter function public.set_updated_at() set search_path = public;
