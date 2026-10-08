import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, ArrowDownCircle, ArrowUpCircle, PiggyBank, Plus, Sparkles } from "lucide-react";
import { clsx } from "clsx";
import { requireWorkspace } from "@/lib/context";
import { formatDate, money, monthLabel, todayEC } from "@/lib/format";
import { accessInfo, accessLabel } from "@/lib/access";
import { getTxUsage } from "@/lib/usage";
import { TxUsageCard } from "@/components/tx-usage";
import { getBudgetOverview } from "@/lib/budgets";

export const metadata: Metadata = { title: "Panel" };

const USAGE_LABELS: Record<string, string> = {
  max_transacciones_mes: "Transacciones este mes",
  max_cuentas: "Cuentas",
  max_miembros: "Usuarios",
};

export default async function DashboardPage() {
  const { supabase, workspace, profile, role } = await requireWorkspace();
  const month = todayEC().slice(0, 7);

  const [{ data: usage }, { data: summaryRows }, { data: balances }, { data: recent }] = await Promise.all([
    supabase.rpc("workspace_usage", { ws: workspace.id }),
    supabase.rpc("month_summary", { ws: workspace.id, month_start: `${month}-01` }),
    supabase.rpc("account_balances", { ws: workspace.id }),
    supabase
      .from("transactions")
      .select("id, type, occurred_on, description, total, withheld_amount, payment_status, categories(name)")
      .eq("workspace_id", workspace.id)
      .order("occurred_on", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const s = summaryRows?.[0] ?? { income: 0, expense: 0, receivable: 0, payable: 0 };
  const income = Number(s.income);
  const expense = Number(s.expense);
  const cash = (balances ?? []).reduce((sum, b) => sum + Number(b.balance), 0);
  const firstName = profile?.full_name?.split(" ")[0];
  const canEdit = role !== "lector";
  const rows = (usage ?? []).filter((u) => u.key !== "max_transacciones_mes" && USAGE_LABELS[u.key] && (workspace.kind === "empresa" || u.key !== "max_miembros"));
  const list = recent ?? [];
  const access = accessInfo(workspace.access_expires_at);
  const txUsage = await getTxUsage(workspace.id);
  const budget = await getBudgetOverview(supabase, workspace.id, month);

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{firstName ? `Hola, ${firstName}` : "Hola"}</h1>
        <p className="text-muted">
          {workspace.name} · {workspace.plans?.name ?? "Plan gratuito"}
        </p>
      </header>

      <section
        aria-label="Acceso a tu plan"
        className={clsx(
          "flex flex-wrap items-center justify-between gap-2 rounded-2xl border px-4 py-3 text-sm",
          access.state === "expired" && "border-danger/40 bg-danger-soft text-danger",
          access.state === "expiring" && "border-warn/40 bg-warn/10 text-warn",
          (access.state === "none" || access.state === "active") && "border-border bg-surface",
        )}
      >
        <span className="font-medium">{workspace.plans?.name ?? "Plan gratuito"}</span>
        <span>{accessLabel(access)}</span>
      </section>

      <TxUsageCard usage={txUsage} />

      <section aria-label={`Resumen de ${monthLabel(month)}`} className="space-y-3">
        <div className="rounded-2xl bg-brand p-5 text-brand-fg sm:p-6">
          <p className="text-sm opacity-90">Dinero disponible</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums sm:text-4xl">{money(cash)}</p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card label={`Ingresos · ${monthLabel(month).split(" ")[0]}`} value={money(income)} tone="brand" />
          <Card label={`Gastos · ${monthLabel(month).split(" ")[0]}`} value={money(expense)} tone="danger" />
          <Card label="Por cobrar" value={money(Number(s.receivable))} />
          <Card label="Por pagar" value={money(Number(s.payable))} />
        </div>
      </section>

      {budget.hasBudget ? (
        <section className="space-y-3 rounded-2xl border border-border bg-surface p-4 sm:p-5" aria-label="Presupuesto del mes">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold">Presupuesto de {monthLabel(month).split(" ")[0].toLowerCase()}</h2>
            <Link href="/presupuestos" className="text-sm font-medium text-brand hover:underline">
              Ver presupuestos
            </Link>
          </div>
          {(() => {
            const pct = budget.totalBudget > 0 ? Math.round((budget.spentBudgeted / budget.totalBudget) * 100) : 0;
            return (
              <div className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span>
                    Gastado {money(budget.spentBudgeted)} de {money(budget.totalBudget)}
                  </span>
                  <span className={clsx("tabular-nums font-medium", pct > 100 ? "text-danger" : pct >= 80 ? "text-warn" : "text-muted")}>{pct}%</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-border" role="progressbar" aria-label="Presupuesto usado" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(pct, 100)}>
                  <div className={clsx("h-full rounded-full", pct > 100 ? "bg-danger" : pct >= 80 ? "bg-warn" : "bg-brand")} style={{ width: `${Math.min(pct, 100)}%` }} />
                </div>
              </div>
            );
          })()}
          {budget.atRisk.length > 0 && (
            <ul className="space-y-1.5 text-sm" aria-label="Categorías en riesgo">
              {budget.atRisk.slice(0, 3).map((r) => (
                <li key={r.categoryId} className={clsx("flex items-center gap-2", r.state === "over" ? "text-danger" : "text-warn")}>
                  <AlertTriangle className="size-4 shrink-0" aria-hidden />
                  <span>
                    <strong>{r.name}</strong>: {r.state === "over" ? `te pasaste (${r.pct}%)` : `${r.pct}% usado`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        canEdit && (
          <Link href="/presupuestos" className="flex items-center justify-between gap-3 rounded-2xl border border-dashed border-border bg-surface px-4 py-3.5 text-sm hover:border-brand">
            <span>
              <strong>Define un presupuesto</strong> <span className="text-muted">y te avisamos antes de pasarte en cada categoría.</span>
            </span>
            <PiggyBank className="size-5 shrink-0 text-brand" aria-hidden />
          </Link>
        )
      )}

      <section className="space-y-3" aria-label="Últimos movimientos">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Últimos movimientos</h2>
          {list.length > 0 && (
            <Link href="/movimientos" className="text-sm font-medium text-brand hover:underline">
              Ver todos
            </Link>
          )}
        </div>
        {list.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-surface px-6 py-10 text-center">
            <span className="grid size-12 place-items-center rounded-full bg-brand-soft text-brand">
              <Sparkles className="size-6" aria-hidden />
            </span>
            <h3 className="text-lg font-semibold">Registra tu primer movimiento</h3>
            <p className="max-w-md text-muted">Anota un ingreso o un gasto y verás aquí tu resumen al instante.</p>
            {canEdit && (
              <Link href="/movimientos/nuevo" className="inline-flex h-11 items-center gap-2 rounded-xl bg-brand px-5 text-sm font-semibold text-brand-fg hover:brightness-110">
                <Plus className="size-4" aria-hidden /> Nuevo movimiento
              </Link>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
            {list.map((r) => {
              const Icon = r.type === "ingreso" ? ArrowUpCircle : ArrowDownCircle;
              return (
                <li key={r.id} className="flex items-center gap-3 px-4 py-3.5">
                  <Icon className={clsx("size-6 shrink-0", r.type === "ingreso" ? "text-brand" : "text-danger")} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{r.description || r.categories?.name || (r.type === "ingreso" ? "Ingreso" : "Gasto")}</p>
                    <p className="text-sm text-muted">
                      {formatDate(r.occurred_on)}
                      {r.payment_status === "pendiente" && <span className="text-warn"> · {r.type === "ingreso" ? "Por cobrar" : "Por pagar"}</span>}
                    </p>
                  </div>
                  <span className={clsx("font-semibold tabular-nums", r.type === "ingreso" && "text-brand")}>
                    {r.type === "ingreso" ? "+" : "−"}
                    {money(r.total - r.withheld_amount)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {rows.length > 0 && (
        <section className="space-y-4 rounded-2xl border border-border bg-surface p-5" aria-label="Uso del plan">
          <h2 className="font-semibold">Uso de tu plan</h2>
          {rows.map((u) => {
            const unlimited = u.limit === null || u.limit < 0;
            const pct = unlimited ? 0 : Math.min(100, Math.round((u.used / Math.max(u.limit ?? 1, 1)) * 100));
            return (
              <div key={u.key} className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span>{USAGE_LABELS[u.key]}</span>
                  <span className="tabular-nums text-muted">
                    {u.used} / {unlimited ? "∞" : u.limit}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-border" role="progressbar" aria-label={USAGE_LABELS[u.key]} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                  <div className={pct >= 90 ? "h-full bg-danger" : pct >= 70 ? "h-full bg-warn" : "h-full bg-brand"} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}

function Card({ label, value, tone }: { label: string; value: string; tone?: "brand" | "danger" }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <p className="truncate text-sm text-muted">{label}</p>
      <p className={clsx("mt-1 truncate text-xl font-semibold tabular-nums", tone === "brand" && "text-brand", tone === "danger" && "text-danger")}>{value}</p>
    </div>
  );
}
