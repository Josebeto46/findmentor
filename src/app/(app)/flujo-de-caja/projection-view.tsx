import type { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { clsx } from "clsx";
import { AlertTriangle, CheckCircle2, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { getProjection, shortDate } from "@/lib/cashflow";
import { formatDate, money } from "@/lib/format";
import { BalanceLineFigure, FlowBarsFigure } from "@/components/charts";
import { MarkPaidButton } from "../movimientos/mark-paid-button";
import { HeroFigure, StatTile } from "./stat-tile";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export async function ProjectionView({ supabase, workspaceId, horizon, canEdit }: { supabase: Supabase; workspaceId: string; horizon: number; canEdit: boolean }) {
  const p = await getProjection(supabase, workspaceId, horizon);
  const negative = p.negativeFrom;
  const upcoming = p.items.slice(0, 15);

  return (
    <div className="space-y-6">
      {negative ? (
        <div role="alert" className="flex items-start gap-3 rounded-2xl border border-danger/40 bg-danger-soft px-4 py-3.5 text-danger">
          <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden />
          <p className="text-sm">
            <strong>Tu saldo proyectado queda negativo desde el {formatDate(negative.date)}.</strong> El punto más bajo es {money(p.min.balance)} el {formatDate(p.min.date)}. Revisa los pagos que vencen antes o adelanta cobros.
          </p>
        </div>
      ) : (
        <div className="flex items-start gap-3 rounded-2xl border border-border bg-surface px-4 py-3.5">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden />
          <p className="text-sm">
            Con lo que tienes registrado, <strong>tu saldo se mantiene positivo</strong> durante los próximos {horizon} días.
          </p>
        </div>
      )}

      <HeroFigure label={`Saldo proyectado al ${formatDate(p.end)}`} value={money(p.final)} sub={`Hoy tienes ${money(p.balance)}`} />

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3" aria-label="Resumen de la proyección">
        <StatTile label="Cobros esperados" value={money(p.receivable)} sub={`Próximos ${horizon} días`} />
        <StatTile label="Pagos esperados" value={money(p.payable)} sub={`Próximos ${horizon} días`} />
        <StatTile label="Saldo mínimo" value={money(p.min.balance)} tone={p.min.balance < 0 ? "bad" : undefined} sub={`El ${shortDate(p.min.date)}`} />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <FlowBarsFigure
          title="Cobros y pagos por semana"
          subtitle="Lo pendiente según su fecha de vencimiento"
          groups={p.weeks.map((w) => ({ label: w.label, range: w.range, a: w.inflow, b: w.outflow }))}
          aName="Cobros"
          bName="Pagos"
          periodHeader="Semana"
        />
        <BalanceLineFigure
          title="Saldo proyectado"
          subtitle={`Desde hoy hasta el ${formatDate(p.end)}`}
          name="Saldo proyectado"
          points={p.days.map((d) => ({ label: d.label, date: d.date, value: d.balance }))}
          mark={p.min.index > 0 || p.min.balance < 0 ? { index: p.min.index, text: `Mínimo ${money(p.min.balance)}`, critical: p.min.balance < 0 } : undefined}
        />
      </div>

      <section className="space-y-3" aria-label="Próximos cobros y pagos">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Próximos cobros y pagos</h2>
          <Link href="/movimientos" className="text-sm font-medium text-brand hover:underline">
            Ver movimientos
          </Link>
        </div>
        {upcoming.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-surface px-6 py-10 text-center text-sm text-muted">
            No hay cobros ni pagos pendientes en este período. Registra uno como “Por cobrar” o “Por pagar” y aparecerá aquí.
          </p>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
            {upcoming.map((i) => {
              const Icon = i.type === "ingreso" ? ArrowUpCircle : ArrowDownCircle;
              return (
                <li key={i.id} className="flex items-center gap-3 px-4 py-3.5">
                  <Icon className={clsx("size-6 shrink-0", i.type === "ingreso" ? "text-brand" : "text-danger")} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{i.label}</p>
                    <p className="truncate text-sm text-muted">{i.meta || (i.type === "ingreso" ? "Por cobrar" : "Por pagar")}</p>
                    <p className={clsx("text-xs font-medium", i.overdue ? "text-danger" : "text-muted")}>
                      {i.overdue ? `Vencido desde el ${formatDate(i.originalDate)} · se espera hoy` : `Vence el ${formatDate(i.originalDate)}`}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <span className={clsx("font-semibold tabular-nums", i.amount > 0 && "text-brand")}>
                      {i.amount > 0 ? "+" : "−"}
                      {money(Math.abs(i.amount))}
                    </span>
                    {canEdit && <MarkPaidButton id={i.id} type={i.type} />}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <ul className="space-y-1 text-xs text-muted">
          {p.items.length > upcoming.length && <li>Se muestran los primeros {upcoming.length} de {p.items.length} movimientos pendientes.</li>}
          {p.overdueCount > 0 && <li>Lo vencido se considera como esperado “hoy”, de forma conservadora.</li>}
          {p.beyond > 0 && <li>{p.beyond} movimiento{p.beyond === 1 ? "" : "s"} pendiente{p.beyond === 1 ? "" : "s"} vence{p.beyond === 1 ? "" : "n"} después de este horizonte y no se incluye{p.beyond === 1 ? "" : "n"}.</li>}
          <li>La proyección usa solo lo que registraste como pendiente; no estima ventas ni gastos futuros.</li>
        </ul>
      </section>
    </div>
  );
}
