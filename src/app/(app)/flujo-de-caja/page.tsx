import type { Metadata } from "next";
import Link from "next/link";
import { clsx } from "clsx";
import { ChevronLeft, ChevronRight, Lock } from "lucide-react";
import { requireWorkspace } from "@/lib/context";
import { monthLabel, parseMonth, shiftMonth, todayEC } from "@/lib/format";
import { RealView } from "./real-view";
import { ProjectionView } from "./projection-view";

export const metadata: Metadata = { title: "Flujo de caja" };

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function FlujoDeCajaPage({ searchParams }: PageProps<"/flujo-de-caja">) {
  const sp = await searchParams;
  const vista = first(sp.vista) === "proyectado" ? "proyectado" : "real";
  const month = parseMonth(first(sp.mes));

  const { supabase, workspace, role } = await requireWorkspace();

  // El horizonte de proyección depende del plan: 30 días por defecto; 90 si el plan incluye el flujo proyectado ampliado.
  const { data: flag } = await supabase.from("plan_limits").select("value").eq("plan_id", workspace.plan_id).eq("key", "flujo_caja_proyectado").maybeSingle();
  const maxHorizon = (flag?.value ?? 0) !== 0 ? 90 : 30;
  const requested = Number(first(sp.dias));
  const horizon = [30, 60, 90].includes(requested) && requested <= maxHorizon ? requested : 30;

  const canEdit = role !== "lector" && workspace.status === "active";
  const thisMonth = todayEC().slice(0, 7);

  const tab = (v: "real" | "proyectado", label: string) => (
    <Link
      href={`/flujo-de-caja?vista=${v}`}
      aria-current={vista === v ? "page" : undefined}
      className={clsx("rounded-lg px-4 py-1.5 text-sm font-medium", vista === v ? "bg-brand-soft text-brand" : "text-muted hover:text-foreground")}
    >
      {label}
    </Link>
  );

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Flujo de caja</h1>
        <p className="text-muted">Cuánto entra, cuánto sale y cuánto dinero tendrás. Solo cuenta lo cobrado o pagado; lo pendiente va en la proyección.</p>
      </header>

      {/* Una sola fila de filtros sobre todo el contenido */}
      <div className="flex flex-wrap items-center gap-3">
        <nav aria-label="Vista" className="flex gap-1 rounded-xl border border-border bg-surface p-1">
          {tab("real", "Real")}
          {tab("proyectado", "Proyectado")}
        </nav>

        {vista === "real" ? (
          <div className="flex items-center gap-1 rounded-xl border border-border bg-surface p-1">
            <Link href={`/flujo-de-caja?vista=real&mes=${shiftMonth(month, -1)}`} aria-label="Mes anterior" className="grid size-9 place-items-center rounded-lg hover:bg-brand-soft">
              <ChevronLeft className="size-4" aria-hidden />
            </Link>
            <span className="min-w-36 text-center text-sm font-semibold">{monthLabel(month)}</span>
            {month < thisMonth ? (
              <Link href={`/flujo-de-caja?vista=real&mes=${shiftMonth(month, 1)}`} aria-label="Mes siguiente" className="grid size-9 place-items-center rounded-lg hover:bg-brand-soft">
                <ChevronRight className="size-4" aria-hidden />
              </Link>
            ) : (
              <span className="grid size-9 place-items-center text-muted/40" aria-hidden>
                <ChevronRight className="size-4" />
              </span>
            )}
          </div>
        ) : (
          <nav aria-label="Horizonte" className="flex gap-1 rounded-xl border border-border bg-surface p-1 text-sm">
            {[30, 60, 90].map((d) =>
              d <= maxHorizon ? (
                <Link
                  key={d}
                  href={`/flujo-de-caja?vista=proyectado&dias=${d}`}
                  aria-current={horizon === d ? "page" : undefined}
                  className={clsx("rounded-lg px-3 py-1.5 font-medium", horizon === d ? "bg-brand-soft text-brand" : "text-muted hover:text-foreground")}
                >
                  {d} días
                </Link>
              ) : (
                <span key={d} title="Disponible en planes superiores" className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-muted">
                  <Lock className="size-3" aria-hidden /> {d} días
                </span>
              ),
            )}
          </nav>
        )}
      </div>

      {vista === "real" ? (
        <RealView supabase={supabase} workspaceId={workspace.id} month={month} />
      ) : (
        <ProjectionView supabase={supabase} workspaceId={workspace.id} horizon={horizon} canEdit={canEdit} />
      )}
    </div>
  );
}
