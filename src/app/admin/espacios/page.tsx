import type { Metadata } from "next";
import { requireAdmin } from "@/lib/context";
import { WorkspacesTable, type WorkspaceRow } from "./workspaces-table";

export const metadata: Metadata = { title: "Espacios y acceso" };

export default async function EspaciosPage() {
  const { supabase } = await requireAdmin();

  const [{ data: workspaces }, { data: plans }] = await Promise.all([
    supabase
      .from("workspaces")
      .select("id, name, kind, status, access_expires_at, created_at, plan_id, plans(name), owner:profiles!owner_id(email, full_name)")
      .order("created_at", { ascending: false })
      .limit(500),
    supabase.from("plans").select("id, name, account_kind").order("created_at"),
  ]);

  const rows: WorkspaceRow[] = (workspaces ?? []).map((w) => ({
    id: w.id,
    name: w.name,
    kind: w.kind,
    status: w.status,
    access_expires_at: w.access_expires_at,
    created_at: w.created_at,
    plan_id: w.plan_id,
    planName: w.plans?.name ?? "—",
    owner: w.owner?.full_name || w.owner?.email || "—",
    ownerEmail: w.owner?.email ?? "",
  }));

  return <WorkspacesTable workspaces={rows} plans={plans ?? []} />;
}
