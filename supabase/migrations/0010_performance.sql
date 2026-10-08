-- FinMentor · 0010 · Rendimiento: RLS con (select auth.uid()) e índices en claves foráneas
-- (Recomendaciones del linter de Supabase; no cambian el comportamiento, solo evitan trabajo repetido por fila.)

drop policy profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.is_admin()
         or exists (select 1 from public.workspace_members a join public.workspace_members b
                    on a.workspace_id = b.workspace_id
                    where a.user_id = (select auth.uid()) and b.user_id = profiles.id));

drop policy profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid()) or public.is_admin())
  with check (id = (select auth.uid()) or public.is_admin());

drop policy wm_select on public.workspace_members;
create policy wm_select on public.workspace_members for select to authenticated
  using (user_id = (select auth.uid()) or public.is_member(workspace_id) or public.is_admin());

create index if not exists budgets_category_id_idx             on public.budgets (category_id);
create index if not exists categories_parent_id_idx            on public.categories (parent_id);
create index if not exists recurring_rules_workspace_id_idx    on public.recurring_rules (workspace_id);
create index if not exists transactions_created_by_idx         on public.transactions (created_by);
create index if not exists transactions_recurring_rule_id_idx  on public.transactions (recurring_rule_id);
create index if not exists transactions_tax_rate_id_idx        on public.transactions (tax_rate_id);
create index if not exists transactions_withholding_id_idx     on public.transactions (withholding_id);
create index if not exists invitations_accepted_by_idx         on public.workspace_invitations (accepted_by);
create index if not exists invitations_invited_by_idx          on public.workspace_invitations (invited_by);
create index if not exists workspaces_owner_id_idx             on public.workspaces (owner_id);
create index if not exists workspaces_plan_id_idx              on public.workspaces (plan_id);
