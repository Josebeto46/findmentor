import type { ReactNode } from "react";
import { clsx } from "clsx";

/** Cifra principal de la vista (una sola por pantalla). Sans proporcional, sin tabular-nums. */
export function HeroFigure({ label, value, sub }: { label: string; value: string; sub?: ReactNode }) {
  return (
    <div className="rounded-2xl bg-brand p-5 text-brand-fg sm:p-6">
      <p className="text-sm opacity-90">{label}</p>
      <p className="mt-1 text-4xl font-semibold tracking-tight sm:text-5xl">{value}</p>
      {sub && <p className="mt-2 text-sm opacity-90">{sub}</p>}
    </div>
  );
}

export function StatTile({ label, value, sub, tone }: { label: string; value: string; sub?: ReactNode; tone?: "good" | "bad" }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <p className="truncate text-sm text-muted">{label}</p>
      <p className={clsx("mt-1 truncate text-2xl font-semibold tracking-tight", tone === "good" && "text-brand", tone === "bad" && "text-danger")}>{value}</p>
      {sub && <p className="mt-0.5 truncate text-xs text-muted">{sub}</p>}
    </div>
  );
}
