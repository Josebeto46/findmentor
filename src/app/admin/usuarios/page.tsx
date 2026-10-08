import type { Metadata } from "next";
import { requireAdmin } from "@/lib/context";
import { UsersTable, type UserRow } from "./users-table";

export const metadata: Metadata = { title: "Usuarios" };

export default async function UsuariosPage({ searchParams }: PageProps<"/admin/usuarios">) {
  const sp = await searchParams;
  const { supabase, user } = await requireAdmin();

  const [{ data: profiles }, { data: workspaces }] = await Promise.all([
    supabase.from("profiles").select("id, email, full_name, platform_role, is_active, created_at").order("created_at", { ascending: false }).limit(500),
    supabase.from("workspaces").select("owner_id, name, kind"),
  ]);

  const spaces = new Map<string, UserRow["spaces"]>();
  for (const w of workspaces ?? []) spaces.set(w.owner_id, [...(spaces.get(w.owner_id) ?? []), { name: w.name, kind: w.kind }]);

  const rows: UserRow[] = (profiles ?? []).map((p) => ({ ...p, spaces: spaces.get(p.id) ?? [] }));
  const estado = sp.estado === "inactivos" ? "inactivos" : sp.estado === "admins" ? "admins" : "todos";

  return <UsersTable users={rows} meId={user.id} initialFilter={estado} />;
}
