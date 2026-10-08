import type { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { clsx } from "clsx";
import { CalendarClock, ChevronLeft, ChevronRight, Info } from "lucide-react";
import { annualRentDueDate, daysUntil, getDueDay, getPersonalRent, ninthDigit } from "@/lib/tax";
import { formatDate, money, todayEC } from "@/lib/format";
import { CategoryBars } from "@/components/charts";
import { HeroFigure, StatTile } from "../flujo-de-caja/stat-tile";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export async function PersonalView({
  supabase,
  workspaceId,
  year,
  dependents,
  employed,
  id,
}: {
  supabase: Supabase;
  workspaceId: string;
  year: number;
  dependents: number;
  employed: boolean;
  id: string | null;
}) {
  const currentYear = Number(todayEC().slice(0, 4));
  const [r, dueDay] = await Promise.all([getPersonalRent(supabase, workspaceId, year, { dependents, employed }), getDueDay(supabase, ninthDigit(id))]);

  const due = dueDay ? annualRentDueDate(year, dueDay) : null;
  const left = due ? daysUntil(due) : null;
  const noTables = !r.params || r.brackets.length === 0;
  const owes = r.result > 0;
  const refund = r.result < 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 rounded-xl border border-border bg-surface p-1">
          <Link href={`/impuestos?anio=${year - 1}`} aria-label="Año anterior" className="grid size-9 place-items-center rounded-lg hover:bg-brand-soft">
            <ChevronLeft className="size-4" aria-hidden />
          </Link>
          <span className="min-w-28 text-center text-sm font-semibold">Año {year}</span>
          {year < currentYear ? (
            <Link href={`/impuestos?anio=${year + 1}`} aria-label="Año siguiente" className="grid size-9 place-items-center rounded-lg hover:bg-brand-soft">
              <ChevronRight className="size-4" aria-hidden />
            </Link>
          ) : (
            <span className="grid size-9 place-items-center text-muted/40" aria-hidden>
              <ChevronRight className="size-4" />
            </span>
          )}
        </div>
        {year === currentYear && <span className="rounded-full bg-warn/15 px-3 py-1 text-xs font-medium text-warn">Año en curso: es una proyección</span>}
      </div>

      {noTables ? (
        <p role="alert" className="rounded-2xl border border-warn/40 bg-warn/10 px-4 py-3 text-sm text-warn">
          El administrador aún no cargó la tabla de impuesto a la renta. Cuando esté disponible verás aquí tu estimación.
        </p>
      ) : (
        <>
          {r.usedFallback && (
            <p className="flex gap-2 rounded-xl bg-brand-soft px-4 py-3 text-sm">
              <Info className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
              <span>La tabla oficial de {year} aún no está cargada: se usa la de {r.year}.</span>
            </p>
          )}

          {due && left !== null ? (
            <div className={clsx("flex flex-wrap items-center gap-3 rounded-2xl border px-4 py-3 text-sm", left < 0 ? "border-danger/40 bg-danger-soft text-danger" : left <= 30 ? "border-warn/40 bg-warn/10 text-warn" : "border-border bg-surface")}>
              <CalendarClock className="size-5 shrink-0" aria-hidden />
              <span>
                Declaración del impuesto a la renta {year}: vence el <strong>{formatDate(due)}</strong> ·{" "}
                {left < 0 ? "ya venció" : left === 0 ? "vence hoy" : `faltan ${left} días`}
              </span>
            </div>
          ) : (
            <Link href="#datos-tributarios" className="flex items-center gap-3 rounded-2xl border border-dashed border-border bg-surface px-4 py-3 text-sm hover:border-brand">
              <CalendarClock className="size-5 shrink-0 text-muted" aria-hidden />
              <span>Agrega tu cédula o RUC en “Mis datos tributarios” para ver tu fecha de declaración.</span>
            </Link>
          )}

          <HeroFigure
            label={`Impuesto a la renta estimado · ${year}`}
            value={owes ? money(r.result) : refund ? money(-r.result) : money(0)}
            sub={
              r.belowThreshold
                ? `Tu base imponible no supera la fracción básica (${money(r.brackets.find((b) => b.rate > 0)?.lower ?? 0)}): no pagarías impuesto.`
                : refund
                  ? "Saldo a tu favor: las retenciones y la rebaja superan el impuesto causado."
                  : owes
                    ? "Estimación referencial: tu declaración oficial puede variar."
                    : "Sin impuesto a pagar."
            }
          />

          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Resumen">
            <StatTile label="Ingresos del año" value={money(r.income)} sub={`${r.count} movimientos`} />
            <StatTile label="Base imponible" value={money(r.taxable)} sub={r.iess > 0 ? `Tras aporte IESS ${money(r.iess)}` : undefined} />
            <StatTile label="Impuesto causado" value={money(r.causado)} sub="Según tabla oficial del SRI" />
            <StatTile label="Rebaja por gastos" value={money(r.rebate)} tone={r.rebate > 0 ? "good" : undefined} sub={r.rebateMax ? `Máximo posible ${money(r.rebateMax)}` : undefined} />
          </section>

          {/* Gastos personales */}
          <section className="space-y-4 rounded-2xl border border-border bg-surface p-4 sm:p-5" aria-label="Gastos personales">
            <div>
              <h2 className="font-semibold">Gastos personales que reducen tu impuesto</h2>
              <p className="text-sm text-muted">
                Cuentan vivienda, educación (arte y cultura), salud, alimentación, vestimenta y turismo nacional. La rebaja es del {r.params?.rebate_rate}% sobre el menor valor entre tus gastos y el tope.
              </p>
            </div>
            {r.cap !== null ? (
              <div className="space-y-2">
                <div className="flex flex-wrap justify-between gap-x-6 gap-y-1 text-sm">
                  <span>
                    Registrado: <strong className="tabular-nums">{money(r.deductible)}</strong> de <strong className="tabular-nums">{money(r.cap)}</strong>
                    <span className="text-muted"> (tope con {dependents >= 5 ? "5 o más" : dependents} {dependents === 1 ? "carga" : "cargas"}: {r.basketCount} canastas)</span>
                  </span>
                  <span className="text-muted">
                    {r.remainingToCap && r.remainingToCap > 0 ? `Aún puedes aprovechar ${money(r.remainingToCap)}` : "Ya alcanzaste el tope"}
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-border" role="progressbar" aria-label="Gastos deducibles frente al tope" aria-valuemin={0} aria-valuemax={r.cap} aria-valuenow={Math.min(r.deductible, r.cap)}>
                  <div className="h-full rounded-full bg-brand" style={{ width: `${Math.min(100, (r.deductible / r.cap) * 100)}%` }} />
                </div>
              </div>
            ) : (
              <p className="text-sm text-warn">No hay canastas cargadas para {r.year}; no se puede calcular la rebaja todavía.</p>
            )}
            <CategoryBars title="Por rubro" items={r.groups.filter((g) => g.total > 0)} empty="Aún no registras gastos en estos rubros. Usa las categorías Vivienda, Salud, Educación, Alimentación, Vestimenta o Turismo nacional." series={1} />
          </section>

          {/* Detalle del cálculo */}
          <section className="space-y-3 rounded-2xl border border-border bg-surface p-4 sm:p-5" aria-label="Detalle del cálculo">
            <h2 className="font-semibold">Cómo se calculó</h2>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-border">
                <Row label="Ingresos del año" value={money(r.income)} />
                {employed && <Row label={`− Aporte personal al IESS (${r.params?.iess_rate}% del sueldo)`} value={money(r.iess)} />}
                <Row label="= Base imponible" value={money(r.taxable)} strong />
                <Row label="Impuesto causado (tabla del SRI)" value={money(r.causado)} />
                <Row label="− Rebaja por gastos personales" value={money(r.rebate)} />
                <Row label="− Retenciones que te hicieron" value={money(r.withheld)} />
                <Row label={refund ? "= Saldo a favor" : "= Impuesto a pagar"} value={money(Math.abs(r.result))} strong />
              </tbody>
            </table>
          </section>
        </>
      )}

      <ul className="space-y-1 text-xs text-muted">
        <li>Estimación de apoyo con lo que registraste (por fecha del movimiento). No sustituye tu declaración en el portal del SRI.</li>
        <li>Si trabajas en relación de dependencia, el aporte IESS se calcula sobre los ingresos de la categoría “Sueldo”. No se consideran otras deducciones (discapacidad, tercera edad) ni rentas de capital.</li>
      </ul>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <tr className={clsx(strong && "font-semibold")}>
      <td className="py-2.5">{label}</td>
      <td className="py-2.5 text-right tabular-nums">{value}</td>
    </tr>
  );
}
