import { clsx } from "clsx";
import { Gauge } from "lucide-react";
import type { TxUsage } from "@/lib/usage";

const BAR: Record<TxUsage["state"], string> = { ok: "bg-brand", warn: "bg-warn", danger: "bg-danger", full: "bg-danger", unlimited: "bg-brand" };
const TONE: Record<TxUsage["state"], string> = { ok: "text-brand", warn: "text-warn", danger: "text-danger", full: "text-danger", unlimited: "text-brand" };

function Bar({ usage }: { usage: TxUsage }) {
  return (
    <div
      className="h-2.5 overflow-hidden rounded-full bg-border"
      role="progressbar"
      aria-label="Transacciones usadas este mes"
      aria-valuemin={0}
      aria-valuemax={usage.limit ?? undefined}
      aria-valuenow={usage.used}
    >
      <div className={clsx("h-full rounded-full transition-all", BAR[usage.state])} style={{ width: `${usage.pct}%` }} />
    </div>
  );
}

/** Tarjeta destacada: cuántas transacciones lleva y cuántas le quedan. */
export function TxUsageCard({ usage, className }: { usage: TxUsage; className?: string }) {
  const { used, limit, remaining, state } = usage;
  return (
    <section
      aria-label="Transacciones del mes"
      className={clsx(
        "space-y-3 rounded-2xl border p-4 sm:p-5",
        state === "full" || state === "danger" ? "border-danger/40 bg-danger-soft" : state === "warn" ? "border-warn/40 bg-warn/10" : "border-border bg-surface",
        className,
      )}
    >
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
            <Gauge className="size-5" aria-hidden />
          </span>
          <div>
            <p className="text-sm text-muted">Transacciones registradas este mes</p>
            <p className="text-2xl font-semibold tabular-nums leading-tight">
              {used}
              {limit !== null && <span className="text-base font-normal text-muted"> de {limit}</span>}
            </p>
          </div>
        </div>
        <div className="text-right">
          {remaining === null ? (
            <p className="font-semibold text-brand">Sin límite</p>
          ) : (
            <>
              <p className="text-sm text-muted">Te quedan</p>
              <p className={clsx("text-2xl font-semibold tabular-nums leading-tight", TONE[state])}>{remaining}</p>
            </>
          )}
        </div>
      </div>

      {limit !== null && <Bar usage={usage} />}

      <p className={clsx("text-sm", state === "full" ? "font-medium text-danger" : "text-muted")} role={state === "full" ? "alert" : undefined}>
        {state === "full"
          ? `Llegaste al límite de ${limit} transacciones de tu plan. Podrás registrar más a partir del ${usage.resetsOn}, o pide al administrador ampliar tu plan.`
          : state === "unlimited"
            ? "Tu plan no limita las transacciones mensuales."
            : `El contador se reinicia el ${usage.resetsOn}.`}
      </p>
    </section>
  );
}

/** Versión compacta (barra lateral y móvil). */
export function TxUsageChip({ usage, className, stacked }: { usage: TxUsage; className?: string; stacked?: boolean }) {
  if (usage.limit === null) return null;
  return (
    <div className={clsx("space-y-1.5", className)} aria-label={`Transacciones: ${usage.used} de ${usage.limit}, te quedan ${usage.remaining}`}>
      <div className={clsx("text-xs", stacked ? "space-y-0.5" : "flex items-baseline justify-between gap-2")}>
        <span className={clsx("text-muted", stacked && "block")}>Transacciones</span>
        <span className={clsx("font-semibold tabular-nums", stacked && "block", TONE[usage.state])}>
          {usage.used}/{usage.limit} · quedan {usage.remaining}
        </span>
      </div>
      <Bar usage={usage} />
    </div>
  );
}
