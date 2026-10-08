import type { Metadata } from "next";
import { requireWorkspace } from "@/lib/context";
import { AccountsManager } from "./accounts-manager";

export const metadata: Metadata = { title: "Cuentas" };

export default async function CuentasPage() {
  const { supabase, workspace, role } = await requireWorkspace();

  const [{ data: accounts }, { data: balances }, { data: usage }] = await Promise.all([
    supabase.from("accounts").select("id, name, kind, initial_balance").eq("workspace_id", workspace.id).eq("is_active", true).order("created_at"),
    supabase.rpc("account_balances", { ws: workspace.id }),
    supabase.rpc("workspace_usage", { ws: workspace.id }),
  ]);

  const balanceById = new Map((balances ?? []).map((b) => [b.account_id, Number(b.balance)]));
  const limit = usage?.find((u) => u.key === "max_cuentas")?.limit ?? -1;

  return (
    <AccountsManager
      workspaceId={workspace.id}
      canEdit={role !== "lector"}
      limit={limit}
      accounts={(accounts ?? []).map((a) => ({ ...a, balance: balanceById.get(a.id) ?? Number(a.initial_balance) }))}
    />
  );
}
