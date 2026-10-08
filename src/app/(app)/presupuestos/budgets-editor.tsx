"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { clsx } from "clsx";
import { AlertTriangle, CheckCircle2, Copy, OctagonAlert } from "lucide-react";
import { Alert, Button } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { dbErrorMessage } from "@/lib/db-errors";
import { money } from "@/lib/format";
import type { BudgetRow } from "@/lib/budgets";

type Overview = {
  rows: BudgetRow[];
  totalBudget: number;
  spentBudgeted: number;
  spentUnbudgeted: number;
  available: number;
  hasBudget: boolean;
};

const BAR = { none: "bg-border", ok: "bg-brand", warn: "bg-warn", over: "bg-danger" } as const;

export function BudgetsEditor({
  workspaceId,
  monthStart,
  monthIsCurrent,
  canEdit,
  overview,
  previous,
  previousLabel,
}: {
  workspaceId: string;
  monthStart: string;
  monthIsCurrent: boolean;
  canEdit: boolean;
  overview: Overview;
  previous: { categoryId: string; amount: number }[];
  previousLabel: string;
}) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>(Object.fromEntries(overview.rows.map((r) => [r.categoryId, r.budget === null ? "" : String(r.budget)])));
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const dirty = overview.rows.some((r) => (values[r.categoryId] ?? "") !== (r.budget === null ? "" : String(r.budget)));

  function copyPrevious() {
    const next = { ...values };
    for (const p of previous) if (p.categoryId in next) next[p.categoryId] = String(p.amount);
    setValues(next);
    setSaved(false);
  }

  async function save() {
    setError(null);
    const upserts: { workspace_id: string; category_id: string; month: string; amount: number }[] = [];
    const removals: string[] = [];
    for (const r of overview.rows) {
      const raw = (values[r.categoryId] ?? "").trim().replace(",", ".");
      if (raw === "" || Number(raw) === 0) {
        if (r.budget !== null) removals.push(r.categoryId);
        continue;
      }
      const n = Number(raw);
      if (!Number.isFinite(n) || n < 0 || n > 999_999_999) return setError(`“${r.name}”: ingresa un monto válido.`);
      upserts.push({ workspace_id: workspaceId, category_id: r.categoryId, month: monthStart, amount: Math.round(n * 100) / 100 });
    }
    setBusy(true);
    const supabase = createClient();
    if (upserts.length) {
      const { error } = await supabase.from("budgets").upsert(upserts, { onConflict: "workspace_id,category_id,month" });
      if (error) {
        setBusy(false);
        return setError(dbErrorMessage(error));
      }
    }
    if (removals.length) {
      const { error } = await supabase.from("budgets").delete().eq("workspace_id", workspaceId).eq("month", monthStart).in("category_id", removals);
      if (error) {
        setBusy(false);
        return setError(dbErrorMessage(error));
      }
    }
    setBusy(false);
    setSaved(true);
    router.refresh();
  }

  const used = overview.totalBudget > 0 ? Math.round((overview.spentBudgeted / overview.totalBudget) * 100) : 0;
  const alerts = overview.rows.filter((r) => r.state === "warn" || r.state === "over");

  return (
    <div className="space-y-6">
      {overview.hasBudget && (
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-3" aria-label="Resumen del presupuesto">
          <Tile label="Presupuestado" value={money(overview.totalBudget)} />
          <Tile label="Gastado en esas categorías" value={money(overview.spentBudgeted)} sub={`${used}% del presupuesto`} tone={used > 100 ? "bad" : undefined} />
          <Tile label={overview.available >= 0 ? "Te queda" : "Te pasaste por"} value={money(Math.abs(overview.available))} tone={overview.available < 0 ? "bad" : "good"} />
        </section>
      )}

      {alerts.length > 0 && (
        <ul className="space-y-2" aria-label="Alertas de presupuesto">
          {alerts.map((r) => (
            <li
              key={r.categoryId}
              className={clsx("flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm", r.state === "over" ? "border-danger/40 bg-danger-soft text-danger" : "border-warn/40 bg-warn/10 text-warn")}
            >
              {r.state === "over" ? <OctagonAlert className="mt-0.5 size-4 shrink-0" aria-hidden /> : <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />}
              <span>
                <strong>{r.name}</strong>:{" "}
                {r.state === "over" ? `te pasaste por ${money(r.spent - (r.budget ?? 0))} (${r.pct}% del presupuesto).` : `ya usaste el ${r.pct}% (${money(r.spent)} de ${money(r.budget ?? 0)}).`}
              </span>
            </li>
          ))}
        </ul>
      )}
      {overview.hasBudget && alerts.length === 0 && (
        <p className="flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-sm">
          <CheckCircle2 className="size-4 text-brand" aria-hidden /> Vas dentro de tu presupuesto en todas las categorías{monthIsCurrent ? "" : " este mes"}.
        </p>
      )}

      {error && <Alert>{error}</Alert>}

      <section className="overflow-hidden rounded-2xl border border-border bg-surface" aria-label="Presupuesto por categoría">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
          <h2 className="font-semibold">Por categoría de gasto</h2>
          {canEdit && previous.length > 0 && (
            <button type="button" onClick={copyPrevious} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-medium hover:bg-brand-soft">
              <Copy className="size-3.5" aria-hidden /> Copiar de {previousLabel}
            </button>
          )}
        </div>
        <ul className="divide-y divide-border">
          {overview.rows.map((r) => {
            const raw = (values[r.categoryId] ?? "").trim().replace(",", ".");
            const budget = raw === "" ? null : Number(raw);
            const pct = budget && budget > 0 ? Math.round((r.spent / budget) * 100) : null;
            const state = pct === null ? "none" : pct > 100 ? "over" : pct >= 80 ? "warn" : "ok";
            return (
              <li key={r.categoryId} className="grid gap-x-4 gap-y-2 px-4 py-3.5 sm:grid-cols-[1fr_9rem]">
                <div className="min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <p className="font-medium">{r.name}</p>
                    <p className="text-sm text-muted tabular-nums">
                      {money(r.spent)} gastado{budget ? ` de ${money(budget)}` : ""}
                    </p>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-border/70" role="progressbar" aria-label={`Uso del presupuesto de ${r.name}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(pct ?? 0, 100)}>
                    <div className={clsx("h-full rounded-full transition-all", BAR[state])} style={{ width: `${Math.min(pct ?? 0, 100)}%` }} />
                  </div>
                  {state === "over" && <p className="text-xs font-medium text-danger">Te pasaste {pct! - 100}%</p>}
                  {state === "warn" && <p className="text-xs font-medium text-warn">Cerca del límite ({pct}%)</p>}
                </div>
                <div>
                  <label className="sr-only" htmlFor={`b-${r.categoryId}`}>
                    Presupuesto de {r.name}
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">$</span>
                    <input
                      id={`b-${r.categoryId}`}
                      value={values[r.categoryId] ?? ""}
                      onChange={(e) => {
                        setValues({ ...values, [r.categoryId]: e.target.value.replace(/[^\d.,]/g, "") });
                        setSaved(false);
                      }}
                      inputMode="decimal"
                      placeholder="Sin límite"
                      disabled={!canEdit}
                      className="h-10 w-full rounded-xl border border-border bg-surface pl-7 pr-2 text-right tabular-nums focus:border-brand focus:ring-2 focus:ring-brand/25 disabled:opacity-60"
                    />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {overview.spentUnbudgeted > 0 && (
        <p className="text-sm text-muted">
          Además gastaste <strong className="tabular-nums text-foreground">{money(overview.spentUnbudgeted)}</strong> en categorías sin presupuesto (o sin categoría).
        </p>
      )}

      {canEdit ? (
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={save} loading={busy} disabled={!dirty && !busy}>
            Guardar presupuesto
          </Button>
          {saved && !dirty && <span role="status" className="text-sm text-brand">Guardado</span>}
          <span className="text-xs text-muted">Deja un monto vacío para no poner límite a esa categoría.</span>
        </div>
      ) : (
        <p className="text-sm text-muted">Tu rol o el estado del espacio no permiten editar el presupuesto.</p>
      )}
    </div>
  );
}

function Tile({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "good" | "bad" }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <p className="truncate text-sm text-muted">{label}</p>
      <p className={clsx("mt-1 truncate text-2xl font-semibold tracking-tight", tone === "good" && "text-brand", tone === "bad" && "text-danger")}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
    </div>
  );
}
