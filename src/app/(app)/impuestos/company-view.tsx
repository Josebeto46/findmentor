import type { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { clsx } from "clsx";
import { AlertTriangle, CalendarClock, ChevronLeft, ChevronRight, Download, Lock } from "lucide-react";
import { daysUntil, getDueDay, getIvaSummary, ivaDueDate, ninthDigit, resolvePeriod, shiftPeriod, type RateRow, type WithholdingRow } from "@/lib/tax";
import { formatDate, money } from "@/lib/format";
import { HeroFigure, StatTile } from "../flujo-de-caja/stat-tile";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export async function CompanyView({
  supabase,
  workspaceId,
  periodKey,
  periodicity,
  ruc,
  canExport,
}: {
  supabase: Supabase;
  workspaceId: string;
  periodKey: string | undefined;
  periodicity: "mensual" | "semestral";
  ruc: string | null;
  canExport: boolean;
}) {
  const period = resolvePeriod(periodKey, periodicity);
  const defaultPeriod = resolvePeriod(undefined, periodicity);
  const digit = ninthDigit(ruc);
  const [s, dueDay] = await Promise.all([getIvaSummary(supabase, workspaceId, period.from, period.to), getDueDay(supabase, digit)]);

  const due = dueDay ? ivaDueDate(period, dueDay) : null;
  const left = due ? daysUntil(due) : null;

  // Próximas tres declaraciones a partir del último período cerrado
  const upcoming = dueDay
    ? [0, 1, 2].map((i) => {
        const p = resolvePeriod(shiftPeriod(defaultPeriod, i), periodicity);
        const d = ivaDueDate(p, dueDay);
        return { key: p.key, label: p.label, due: d, left: daysUntil(d) };
      })
    : [];

  const toPay = s.balance > 0;
  const credit = s.balance < 0;
  const exportHref = (tipo: string) => `/impuestos/exportar?periodo=${period.key}&tipo=${tipo}`;
  const nav = (delta: number) => `/impuestos?periodo=${shiftPeriod(period, delta)}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 rounded-xl border border-border bg-surface p-1">
          <Link href={nav(-1)} aria-label="Período anterior" className="grid size-9 place-items-center rounded-lg hover:bg-brand-soft">
            <ChevronLeft className="size-4" aria-hidden />
          </Link>
          <span className="min-w-44 text-center text-sm font-semibold">{period.label}</span>
          <Link href={nav(1)} aria-label="Período siguiente" className="grid size-9 place-items-center rounded-lg hover:bg-brand-soft">
            <ChevronRight className="size-4" aria-hidden />
          </Link>
        </div>
        {period.inProgress && <span className="rounded-full bg-warn/15 px-3 py-1 text-xs font-medium text-warn">Período en curso: aún puede cambiar</span>}
        {period.key !== defaultPeriod.key && (
          <Link href="/impuestos" className="text-sm font-medium text-brand hover:underline">
            Ir al período por declarar
          </Link>
        )}
      </div>

      {/* Vencimiento */}
      {due && left !== null ? (
        <div
          className={clsx(
            "flex flex-wrap items-center gap-3 rounded-2xl border px-4 py-3 text-sm",
            left < 0 ? "border-danger/40 bg-danger-soft text-danger" : left <= 5 ? "border-warn/40 bg-warn/10 text-warn" : "border-border bg-surface",
          )}
        >
          <CalendarClock className="size-5 shrink-0" aria-hidden />
          <span>
            Declaración de IVA de <strong>{period.label}</strong>: vence el <strong>{formatDate(due)}</strong> ·{" "}
            {left < 0 ? `venció hace ${-left} ${-left === 1 ? "día" : "días"}` : left === 0 ? "vence hoy" : `faltan ${left} ${left === 1 ? "día" : "días"}`}
          </span>
        </div>
      ) : (
        <Link href="#datos-tributarios" className="flex items-center gap-3 rounded-2xl border border-dashed border-border bg-surface px-4 py-3 text-sm hover:border-brand">
          <CalendarClock className="size-5 shrink-0 text-muted" aria-hidden />
          <span>Agrega tu RUC en “Mis datos tributarios” para ver la fecha de vencimiento de tus declaraciones.</span>
        </Link>
      )}

      <HeroFigure
        label={toPay ? `IVA a pagar · ${period.label}` : credit ? `Crédito tributario a favor · ${period.label}` : `IVA del período · ${period.label}`}
        value={toPay ? money(s.balance) : credit ? money(-s.balance) : money(0)}
        sub={
          <>
            IVA en ventas {money(s.salesIva)} − crédito tributario {money(s.credit)}
            {credit && " · se arrastra al siguiente período"}
          </>
        }
      />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Resumen">
        <StatTile label="IVA en ventas" value={money(s.salesIva)} sub={`Base ${money(s.salesBase)}`} />
        <StatTile label="IVA en compras" value={money(s.purchasesIva)} sub={`Base ${money(s.purchasesBase)}`} />
        <StatTile label="Crédito tributario" value={money(s.credit)} sub="Compras marcadas como deducibles" />
        <StatTile label="Te retuvieron" value={money(s.withheldToMeTotal)} sub="Renta a tu favor" />
      </section>

      {(s.noDocPurchases > 0 || s.nonCreditPurchasesWithIva > 0) && (
        <ul className="space-y-2" aria-label="Para revisar">
          {s.nonCreditPurchasesWithIva > 0 && (
            <Notice>
              {s.nonCreditPurchasesWithIva} {s.nonCreditPurchasesWithIva === 1 ? "compra tiene" : "compras tienen"} IVA pero no está marcada como crédito tributario. Si corresponde, edítala y activa “El IVA es crédito tributario”.
            </Notice>
          )}
          {s.noDocPurchases > 0 && (
            <Notice>
              {s.noDocPurchases} {s.noDocPurchases === 1 ? "compra no tiene" : "compras no tienen"} número de comprobante. Complétalo para respaldar tu declaración.
            </Notice>
          )}
        </ul>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <RateTable title="Ventas por tarifa de IVA" rows={s.salesByRate} empty="Sin ventas en este período." />
        <RateTable title="Compras por tarifa de IVA" rows={s.purchasesByRate} empty="Sin compras en este período." />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <WithholdingTable title="Retenciones que te hicieron" hint="Crédito a favor para tu impuesto a la renta." rows={s.withheldToMe} total={s.withheldToMeTotal} empty="Nadie te retuvo en este período." />
        <WithholdingTable title="Retenciones que tú practicaste" hint="Debes declararlas y pagarlas al SRI (formulario 103)." rows={s.withheldByMe} total={s.withheldByMeTotal} empty="No practicaste retenciones en este período." />
      </div>

      {upcoming.length > 0 && (
        <section className="space-y-3 rounded-2xl border border-border bg-surface p-4 sm:p-5" aria-label="Próximos vencimientos">
          <h2 className="font-semibold">Próximos vencimientos de IVA</h2>
          <ul className="divide-y divide-border text-sm">
            {upcoming.map((u) => (
              <li key={u.key} className="flex items-center justify-between gap-3 py-2.5">
                <span>{u.label}</span>
                <span className={clsx("tabular-nums", u.left < 0 ? "text-danger" : u.left <= 5 ? "text-warn" : "text-muted")}>
                  {formatDate(u.due)} · {u.left < 0 ? "vencido" : u.left === 0 ? "hoy" : `en ${u.left} días`}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-3" aria-label="Exportar">
        <h2 className="font-semibold">Exportar para tu contador</h2>
        <div className="flex flex-wrap gap-3">
          {(["ventas", "compras"] as const).map((t) =>
            canExport ? (
              <a key={t} href={exportHref(t)} className="inline-flex h-11 items-center gap-2 rounded-xl border border-border bg-surface px-4 text-sm font-semibold hover:bg-brand-soft">
                <Download className="size-4" aria-hidden /> {t === "ventas" ? "Ventas" : "Compras"} (CSV)
              </a>
            ) : (
              <span key={t} title="Disponible en planes superiores" className="inline-flex h-11 items-center gap-2 rounded-xl border border-dashed border-border px-4 text-sm text-muted">
                <Lock className="size-4" aria-hidden /> {t === "ventas" ? "Ventas" : "Compras"} (CSV)
              </span>
            ),
          )}
        </div>
        {!canExport && <p className="text-sm text-muted">La exportación está disponible en planes superiores. Pídela al administrador.</p>}
      </section>

      <ul className="space-y-1 text-xs text-muted">
        <li>Resumen de apoyo con lo que registraste (por fecha del comprobante). La declaración oficial (formulario 104) se presenta en el portal del SRI.</li>
        <li>No considera retenciones de IVA recibidas ni notas de crédito. Las fechas de vencimiento pasan al lunes si caen en fin de semana, pero no consideran feriados.</li>
        <li>El impuesto a la renta de sociedades y las cuotas RIMPE aún no están en esta versión.</li>
      </ul>
    </div>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 rounded-xl border border-warn/40 bg-warn/10 px-4 py-3 text-sm text-warn">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden /> <span>{children}</span>
    </li>
  );
}

function RateTable({ title, rows, empty }: { title: string; rows: RateRow[]; empty: string }) {
  return (
    <section className="space-y-3 rounded-2xl border border-border bg-surface p-4 sm:p-5" aria-label={title}>
      <h2 className="font-semibold">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-muted">{empty}</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="py-1.5 font-medium">Tarifa</th>
              <th className="py-1.5 text-right font-medium">Base</th>
              <th className="py-1.5 text-right font-medium">IVA</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => (
              <tr key={r.code}>
                <td className="py-2">{r.name}</td>
                <td className="py-2 text-right tabular-nums">{money(r.base)}</td>
                <td className="py-2 text-right tabular-nums">{money(r.iva)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

function WithholdingTable({ title, hint, rows, total, empty }: { title: string; hint: string; rows: WithholdingRow[]; total: number; empty: string }) {
  return (
    <section className="space-y-3 rounded-2xl border border-border bg-surface p-4 sm:p-5" aria-label={title}>
      <div>
        <h2 className="font-semibold">{title}</h2>
        <p className="text-sm text-muted">{hint}</p>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted">{empty}</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="py-1.5 font-medium">Código</th>
              <th className="py-1.5 text-right font-medium">Base</th>
              <th className="py-1.5 text-right font-medium">Retenido</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => (
              <tr key={r.code}>
                <td className="py-2">
                  {r.code} <span className="text-muted">({r.pct}%)</span>
                </td>
                <td className="py-2 text-right tabular-nums">{money(r.base)}</td>
                <td className="py-2 text-right tabular-nums">{money(r.amount)}</td>
              </tr>
            ))}
            <tr className="font-semibold">
              <td className="py-2">Total</td>
              <td />
              <td className="py-2 text-right tabular-nums">{money(total)}</td>
            </tr>
          </tbody>
        </table>
      )}
    </section>
  );
}
