import type { createClient } from "@/lib/supabase/server";
import { ArrowDownRight, ArrowUpRight, LineChart } from "lucide-react";
import { getRealCashFlow } from "@/lib/cashflow";
import { money, monthLabel } from "@/lib/format";
import { BalanceLineFigure, CategoryBars, FlowBarsFigure } from "@/components/charts";
import { HeroFigure, StatTile } from "./stat-tile";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export async function RealView({ supabase, workspaceId, month }: { supabase: Supabase; workspaceId: string; month: string }) {
  const cf = await getRealCashFlow(supabase, workspaceId, month);
  const name = monthLabel(month);

  if (cf.days.length === 0 || cf.count === 0) {
    return (
      <div className="space-y-5">
        <HeroFigure label={`Saldo al cierre · ${name}`} value={money(cf.closing)} sub={`Saldo al inicio: ${money(cf.opening)}`} />
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-surface px-6 py-12 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-brand-soft text-brand">
            <LineChart className="size-6" aria-hidden />
          </span>
          <p className="font-semibold">Sin cobros ni pagos en {name.toLowerCase()}</p>
          <p className="max-w-md text-sm text-muted">Aquí aparecerán los movimientos marcados como cobrados o pagados en este mes.</p>
        </div>
      </div>
    );
  }

  const positive = cf.net >= 0;

  return (
    <div className="space-y-6">
      <HeroFigure
        label={`Saldo al cierre · ${name}`}
        value={money(cf.closing)}
        sub={
          <>
            Saldo al inicio: {money(cf.opening)} ·{" "}
            <span className="inline-flex items-center gap-1 font-medium">
              {positive ? <ArrowUpRight className="size-4" aria-hidden /> : <ArrowDownRight className="size-4" aria-hidden />}
              {positive ? "+" : "−"}
              {money(Math.abs(cf.net))} en el mes
            </span>
          </>
        }
      />

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3" aria-label="Resumen del mes">
        <StatTile label="Entradas" value={money(cf.inflow)} sub="Dinero cobrado" />
        <StatTile label="Salidas" value={money(cf.outflow)} sub="Dinero pagado" />
        <StatTile label="Flujo neto" value={`${positive ? "+" : "−"}${money(Math.abs(cf.net))}`} tone={positive ? "good" : "bad"} sub={positive ? "Entró más de lo que salió" : "Salió más de lo que entró"} />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <FlowBarsFigure
          title="Entradas y salidas por semana"
          subtitle="Días 1–7, 8–14, 15–21… del mes"
          groups={cf.weeks.map((w) => ({ label: w.label, range: w.range, a: w.inflow, b: w.outflow }))}
          aName="Entradas"
          bName="Salidas"
          periodHeader="Semana"
        />
        <BalanceLineFigure title="Saldo día a día" subtitle="Dinero disponible al cierre de cada día" points={cf.days.map((d) => ({ label: d.label, date: d.date, value: d.balance }))} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <CategoryBars title="En qué se fue el dinero" items={cf.topOut} empty="Sin salidas este mes." series={2} level={2} />
        <CategoryBars title="De dónde entró el dinero" items={cf.topIn} empty="Sin entradas este mes." series={1} level={2} />
      </div>
    </div>
  );
}
