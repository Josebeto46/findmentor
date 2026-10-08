import type { Metadata } from "next";
import Link from "next/link";
import { Users } from "lucide-react";
import { requireWorkspace } from "@/lib/context";
import { TeamManager, type InviteView, type MemberView } from "./team-manager";

export const metadata: Metadata = { title: "Equipo" };

export default async function EquipoPage() {
  const { supabase, workspace, role, user } = await requireWorkspace();

  if (workspace.kind !== "empresa") {
    return (
      <div className="mx-auto max-w-lg space-y-4 py-10 text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-brand-soft text-brand">
          <Users className="size-6" aria-hidden />
        </span>
        <h1 className="text-2xl font-semibold tracking-tight">El equipo es para empresas</h1>
        <p className="text-muted">Tu espacio es personal. Si llevas un negocio con otras personas, crea un espacio de empresa e invítalas desde allí.</p>
        <Link href="/onboarding?nuevo=1" className="inline-flex h-11 items-center rounded-xl bg-brand px-5 text-sm font-semibold text-brand-fg">
          Crear espacio de empresa
        </Link>
      </div>
    );
  }

  const isOwner = role === "owner";
  const [{ data: members }, { data: invitations }, { data: usage }] = await Promise.all([
    supabase.from("workspace_members").select("user_id, role, created_at, profiles(full_name, email)").eq("workspace_id", workspace.id).order("created_at"),
    isOwner
      ? supabase.from("workspace_invitations").select("id, email, role, token, expires_at").eq("workspace_id", workspace.id).is("accepted_at", null).order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as { id: string; email: string; role: "editor" | "lector"; token: string; expires_at: string }[] }),
    supabase.rpc("workspace_usage", { ws: workspace.id }),
  ]);

  const nowIso = new Date().toISOString();
  const memberViews: MemberView[] = (members ?? []).map((m) => ({
    userId: m.user_id,
    role: m.role,
    name: m.profiles?.full_name || m.profiles?.email || "Usuario",
    email: m.profiles?.email ?? "",
  }));
  const inviteViews: InviteView[] = (invitations ?? []).map((i) => ({ id: i.id, email: i.email, role: i.role as "editor" | "lector", token: i.token, expired: i.expires_at <= nowIso }));
  const limit = usage?.find((u) => u.key === "max_miembros")?.limit ?? null;

  return (
    <TeamManager
      workspaceId={workspace.id}
      workspaceName={workspace.name}
      meId={user.id}
      isOwner={isOwner}
      limit={limit === null || limit < 0 ? null : limit}
      members={memberViews}
      invitations={inviteViews}
    />
  );
}
