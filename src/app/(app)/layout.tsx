import { requireWorkspace } from "@/lib/context";
import { Logo } from "@/components/ui";
import { BottomNav, Sidebar } from "@/components/app-nav";
import { accessInfo, formatExpiry } from "@/lib/access";
import { getTxUsage } from "@/lib/usage";
import { todayEC } from "@/lib/format";
import { TxUsageChip } from "@/components/tx-usage";
import { WorkspaceSwitcher } from "@/components/workspace-switcher";

const readOnlyEarly = (status: string, expires: string | null) => status !== "active" || accessInfo(expires).state === "expired";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const { supabase, workspace, profile, role, workspaces } = await requireWorkspace();
  const access = accessInfo(workspace.access_expires_at);
  if (!readOnlyEarly(workspace.status, workspace.access_expires_at) && (role === "owner" || role === "editor")) {
    const { count } = await supabase
      .from("recurring_rules")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspace.id)
      .eq("is_active", true)
      .lte("next_date", todayEC());
    if (count) await supabase.rpc("run_recurring", { p_ws: workspace.id });
  }
  const usage = await getTxUsage(workspace.id);
  const suspended = workspace.status === "suspended";
  const readOnly = suspended || access.state === "expired";
  const canEdit = (role === "owner" || role === "editor") && !readOnly;

  const accessText =
    access.state === "none"
      ? "Acceso sin vencimiento"
      : access.state === "expired"
        ? "Acceso vencido"
        : `${access.days} ${access.days === 1 ? "día" : "días"} de acceso`;
  const accessTone = access.state === "expired" ? "danger" : access.state === "expiring" ? "warn" : "ok";

  return (
    <div className="flex min-h-dvh">
      <Sidebar
        workspaceName={workspace.name}
        isAdmin={profile?.platform_role === "admin"}
        canEdit={canEdit}
        isEmpresa={workspace.kind === "empresa"}
        accessText={suspended ? "Espacio suspendido" : accessText}
        accessTone={suspended ? "danger" : accessTone}
        usageChip={<TxUsageChip usage={usage} stacked />}
        switcher={<WorkspaceSwitcher items={workspaces} activeId={workspace.id} />}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border bg-surface px-4 py-3 lg:hidden">
          <Logo />
          <span className="max-w-[45%] truncate text-sm text-muted">{workspace.name}</span>
        </header>
        {usage.limit !== null && (
          <div className="border-b border-border bg-surface px-4 py-2.5 lg:hidden">
            <TxUsageChip usage={usage} />
          </div>
        )}
        {readOnly && (
          <p role="alert" className="bg-danger-soft px-4 py-3 text-center text-sm text-danger">
            {suspended
              ? "Tu espacio está suspendido. Puedes consultar tus datos, pero no registrar nuevos movimientos. Comunícate con el administrador."
              : `Tu acceso venció el ${access.state === "expired" ? formatExpiry(access.date) : ""}. Puedes consultar tus datos, pero no registrar nuevos movimientos. Comunícate con el administrador para renovarlo.`}
          </p>
        )}
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-28 pt-6 sm:px-8 sm:pt-10 lg:pb-10">{children}</main>
      </div>
      <BottomNav canEdit={canEdit} />
    </div>
  );
}
