"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { clsx } from "clsx";
import { ArrowDownCircle, ArrowUpCircle, Pause, Play, Plus, Repeat, Trash2 } from "lucide-react";
import { Alert } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { dbErrorMessage } from "@/lib/db-errors";
import { FREQUENCY_LABEL, formatDate, money, type Frequency } from "@/lib/format";

export type RuleView = {
  id: string;
  frequency: string;
  nextDate: string;
  active: boolean;
  type: "ingreso" | "gasto";
  amount: number;
  label: string;
  account: string;
  category: string | null;
  tax: string | null;
  pending: boolean;
};

export function RecurringManager({ rules, canEdit }: { rules: RuleView[]; canEdit: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggle(r: RuleView) {
    setBusy(r.id);
    setError(null);
    const { error } = await createClient().from("recurring_rules").update({ is_active: !r.active }).eq("id", r.id);
    setBusy(null);
    if (error) return setError(dbErrorMessage(error));
    router.refresh();
  }

  async function remove(r: RuleView) {
    if (!window.confirm(`¿Eliminar “${r.label}”? Los movimientos ya registrados se conservan; solo se detiene la repetición.`)) return;
    setBusy(r.id);
    setError(null);
    const { error } = await createClient().from("recurring_rules").delete().eq("id", r.id);
    setBusy(null);
    if (error) return setError(dbErrorMessage(error));
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Movimientos recurrentes</h1>
          <p className="text-muted">Pagos y cobros fijos que se registran solos: arriendo, sueldos, suscripciones.</p>
        </div>
        {canEdit && (
          <Link href="/movimientos/nuevo" className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-brand-fg hover:brightness-110">
            <Plus className="size-4" aria-hidden /> Nuevo
          </Link>
        )}
      </header>

      {error && <Alert>{error}</Alert>}

      {rules.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-surface px-6 py-12 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-brand-soft text-brand">
            <Repeat className="size-6" aria-hidden />
          </span>
          <p className="font-semibold">Aún no tienes movimientos recurrentes</p>
          <p className="max-w-md text-sm text-muted">Al registrar un movimiento nuevo, activa “Repetir automáticamente” y elige cada cuánto se repite.</p>
        </div>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
          {rules.map((r) => {
            const Icon = r.type === "ingreso" ? ArrowUpCircle : ArrowDownCircle;
            return (
              <li key={r.id} className={clsx("flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5", !r.active && "opacity-60")}>
                <Icon className={clsx("size-6 shrink-0", r.type === "ingreso" ? "text-brand" : "text-danger")} aria-hidden />
                <div className="min-w-0 flex-1 basis-48">
                  <p className="truncate font-medium">{r.label}</p>
                  <p className="truncate text-sm text-muted">
                    {FREQUENCY_LABEL[r.frequency as Frequency] ?? r.frequency} · {[r.category, r.account, r.tax].filter(Boolean).join(" · ")}
                    {r.pending && " · queda por " + (r.type === "ingreso" ? "cobrar" : "pagar")}
                  </p>
                  <p className="text-xs text-muted">{r.active ? `Próximo: ${formatDate(r.nextDate)}` : "En pausa"}</p>
                </div>
                <span className={clsx("font-semibold tabular-nums", r.type === "ingreso" && "text-brand")}>
                  {r.type === "ingreso" ? "+" : "−"}
                  {money(r.amount)}
                </span>
                {canEdit && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => toggle(r)}
                      disabled={busy === r.id}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-medium hover:bg-brand-soft disabled:opacity-50"
                    >
                      {r.active ? <Pause className="size-3.5" aria-hidden /> : <Play className="size-3.5" aria-hidden />}
                      {r.active ? "Pausar" : "Reanudar"}
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(r)}
                      disabled={busy === r.id}
                      aria-label={`Eliminar ${r.label}`}
                      className="grid size-9 place-items-center rounded-lg text-muted hover:bg-danger-soft hover:text-danger disabled:opacity-50"
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <ul className="space-y-1 text-xs text-muted">
        <li>Los movimientos se crean automáticamente al llegar su fecha (cada día a las 00:05) y también al abrir la app.</li>
        <li>Si llegaste al límite de transacciones del plan, la repetición espera hasta que haya cupo y se registra después.</li>
      </ul>
    </div>
  );
}
