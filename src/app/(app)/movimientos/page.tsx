import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDownCircle, ArrowUpCircle, ChevronLeft, ChevronRight, Download, Lock, Paperclip, Plus, Receipt, Search } from "lucide-react";
import { clsx } from "clsx";
import { requireWorkspace } from "@/lib/context";
import { formatDate, money, monthLabel, monthRange, parseMonth, shiftMonth, todayEC } from "@/lib/format";
import { MarkPaidButton } from "./mark-paid-button";
import { getTxUsage } from "@/lib/usage";
import { TxUsageCard } from "@/components/tx-usage";

export const metadata: Metadata = { title: "Movimientos" };

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function MovimientosPage({ searchParams }: PageProps<"/movimientos">) {
  const sp = await searchParams;
  const month = parseMonth(first(sp.mes));
  const tipoParam = first(sp.tipo);
  const tipo = tipoParam === "ingreso" || tipoParam === "gasto" ? tipoParam : undefined;
  const q = (first(sp.q) ?? "").trim().slice(0, 60);

  const { supabase, workspace, role } = await requireWorkspace();
  const canEdit = role !== "lector";
  const { from, to } = monthRange(month);
  const txUsage = await getTxUsage(workspace.id);
  const { data: exportFlag } = await supabase.from("plan_limits").select("value").eq("plan_id", workspace.plan_id).eq("key", "exportar").maybeSingle();
  const canExport = (exportFlag?.value ?? 0) !== 0;

  let query = supabase
    .from("transactions")
    .select("id, type, occurred_on, description, total, withheld_amount, payment_status, due_date, attachment_path, categories(name), accounts(name), contacts(name)")
    .eq("workspace_id", workspace.id)
    .gte("occurred_on", from)
    .lt("occurred_on", to)
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(500);
  if (tipo) query = query.eq("type", tipo);
  if (q) query = query.ilike("description", `%${q.replace(/[%_\\]/g, "\\$&")}%`);

  const { data: rows, error } = await query;
  const list = rows ?? [];

  const net = (r: (typeof list)[number]) => r.total - r.withheld_amount;
  const income = list.filter((r) => r.type === "ingreso" && r.payment_status === "pagado").reduce((s, r) => s + net(r), 0);
  const expense = list.filter((r) => r.type === "gasto" && r.payment_status === "pagado").reduce((s, r) => s + net(r), 0);

  const href = (over: { mes?: string; tipo?: string | null }) => {
    const p = new URLSearchParams();
    p.set("mes", over.mes ?? month);
    const t = over.tipo === undefined ? tipo : over.tipo;
    if (t) p.set("tipo", t);
    if (q) p.set("q", q);
    return `/movimientos?${p.toString()}`;
  };
  const today = todayEC();

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Movimientos</h1>
        {canEdit && (
          <Link href="/movimientos/nuevo" className="hidden h-11 items-center gap-2 rounded-xl bg-brand px-5 text-sm font-semibold text-brand-fg hover:brightness-110 sm:inline-flex lg:hidden">
            <Plus className="size-4" aria-hidden /> Nuevo
          </Link>
        )}
      </header>

      <TxUsageCard usage={txUsage} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-xl border border-border bg-surface p-1">
          <Link href={href({ mes: shiftMonth(month, -1) })} aria-label="Mes anterior" className="grid size-9 place-items-center rounded-lg hover:bg-brand-soft">
            <ChevronLeft className="size-4" aria-hidden />
          </Link>
          <span className="min-w-36 text-center text-sm font-semibold">{monthLabel(month)}</span>
          <Link href={href({ mes: shiftMonth(month, 1) })} aria-label="Mes siguiente" className="grid size-9 place-items-center rounded-lg hover:bg-brand-soft">
            <ChevronRight className="size-4" aria-hidden />
          </Link>
        </div>
        <nav aria-label="Filtrar por tipo" className="flex gap-1 rounded-xl border border-border bg-surface p-1 text-sm">
          {[
            { label: "Todos", value: null },
            { label: "Ingresos", value: "ingreso" },
            { label: "Gastos", value: "gasto" },
          ].map((t) => (
            <Link
              key={t.label}
              href={href({ tipo: t.value })}
              aria-current={(tipo ?? null) === t.value ? "page" : undefined}
              className={clsx("rounded-lg px-3 py-1.5 font-medium", (tipo ?? null) === t.value ? "bg-brand-soft text-brand" : "text-muted hover:text-foreground")}
            >
              {t.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="flex justify-end">
        {canExport ? (
          <a
            href={`/movimientos/exportar?mes=${month}${tipo ? `&tipo=${tipo}` : ""}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-sm font-medium hover:bg-brand-soft"
          >
            <Download className="size-4" aria-hidden /> Exportar CSV
          </a>
        ) : (
          <span title="Disponible en planes superiores" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-dashed border-border px-3 text-sm text-muted">
            <Lock className="size-3.5" aria-hidden /> Exportar CSV
          </span>
        )}
      </div>

      <form action="/movimientos" className="relative">
        <input type="hidden" name="mes" value={month} />
        {tipo && <input type="hidden" name="tipo" value={tipo} />}
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Buscar por descripción"
          aria-label="Buscar por descripción"
          className="h-11 w-full rounded-xl border border-border bg-surface pl-10 pr-3 text-base focus:border-brand focus:ring-2 focus:ring-brand/25"
        />
      </form>

      <section className="grid grid-cols-3 gap-3" aria-label="Resumen del mes">
        <Stat label="Ingresos" value={money(income)} tone="brand" />
        <Stat label="Gastos" value={money(expense)} tone="danger" />
        <Stat label="Balance" value={money(income - expense)} />
      </section>

      {error ? (
        <p role="alert" className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">
          No pudimos cargar los movimientos. Recarga la página.
        </p>
      ) : list.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-surface px-6 py-12 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-brand-soft text-brand">
            <Receipt className="size-6" aria-hidden />
          </span>
          <p className="font-semibold">{q || tipo ? "No hay resultados con estos filtros" : `Sin movimientos en ${monthLabel(month).toLowerCase()}`}</p>
          {canEdit && !q && !tipo && (
            <Link href="/movimientos/nuevo" className="inline-flex h-11 items-center gap-2 rounded-xl bg-brand px-5 text-sm font-semibold text-brand-fg">
              <Plus className="size-4" aria-hidden /> Registrar el primero
            </Link>
          )}
        </div>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
          {list.map((r) => {
            const pending = r.payment_status === "pendiente";
            const overdue = pending && !!r.due_date && r.due_date < today;
            const Icon = r.type === "ingreso" ? ArrowUpCircle : ArrowDownCircle;
            const meta = [r.categories?.name, r.contacts?.name, r.accounts?.name].filter(Boolean).join(" · ");
            return (
              <li key={r.id} className="flex items-center gap-3 px-4 py-3.5">
                <Icon className={clsx("size-6 shrink-0", r.type === "ingreso" ? "text-brand" : "text-danger")} aria-hidden />
                <Link href={canEdit ? `/movimientos/${r.id}` : "#"} className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {r.description || r.categories?.name || (r.type === "ingreso" ? "Ingreso" : "Gasto")}
                    {r.attachment_path && <Paperclip className="ml-1.5 inline size-3.5 text-muted" aria-label="Tiene comprobante" />}
                  </p>
                  <p className="truncate text-sm text-muted">
                    {formatDate(r.occurred_on)}
                    {meta && ` · ${meta}`}
                  </p>
                  {pending && (
                    <p className={clsx("text-xs font-medium", overdue ? "text-danger" : "text-warn")}>
                      {r.type === "ingreso" ? "Por cobrar" : "Por pagar"}
                      {r.due_date && ` · vence ${formatDate(r.due_date)}`}
                      {overdue && " · vencido"}
                    </p>
                  )}
                </Link>
                <div className="flex flex-col items-end gap-1.5">
                  <span className={clsx("font-semibold tabular-nums", r.type === "ingreso" ? "text-brand" : "text-foreground")}>
                    {r.type === "ingreso" ? "+" : "−"}
                    {money(net(r))}
                  </span>
                  {pending && canEdit && <MarkPaidButton id={r.id} type={r.type} />}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "brand" | "danger" }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-3.5 sm:p-4">
      <p className="text-xs text-muted sm:text-sm">{label}</p>
      <p className={clsx("mt-0.5 truncate text-base font-semibold tabular-nums sm:text-xl", tone === "brand" && "text-brand", tone === "danger" && "text-danger")}>{value}</p>
    </div>
  );
}
