import type { createClient } from "@/lib/supabase/server";
import { todayEC } from "@/lib/format";
import { addDays } from "@/lib/cashflow";

type Supabase = Awaited<ReturnType<typeof createClient>>;
const round = (n: number) => Math.round(n * 100) / 100;

/* ───────────── Calendario tributario ───────────── */

/** Noveno dígito de la cédula/RUC (define el día de vencimiento). */
export function ninthDigit(id: string | null | undefined): number | null {
  return id && /^\d{10,13}$/.test(id) ? Number(id[8]) : null;
}

/** Si cae en fin de semana, pasa al lunes (no considera feriados nacionales). */
export function nextBusinessDay(iso: string) {
  const dow = new Date(`${iso}T00:00:00Z`).getUTCDay(); // 0 domingo, 6 sábado
  return dow === 6 ? addDays(iso, 2) : dow === 0 ? addDays(iso, 1) : iso;
}

const pad = (n: number) => String(n).padStart(2, "0");
const lastDayOfMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();
const dateOf = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(Math.min(d, lastDayOfMonth(y, m)))}`;

export function daysUntil(iso: string, from = todayEC()) {
  return Math.round((new Date(`${iso}T00:00:00Z`).getTime() - new Date(`${from}T00:00:00Z`).getTime()) / 86_400_000);
}

export type IvaPeriod = {
  key: string; // "2026-09" | "2026-S1"
  kind: "mensual" | "semestral";
  label: string;
  from: string;
  to: string; // exclusivo
  dueMonth: string; // "YYYY-MM" del mes de vencimiento
  inProgress: boolean;
};

const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Período a declarar a partir de su clave; la clave por defecto es el último período cerrado. */
export function resolvePeriod(key: string | undefined, kind: "mensual" | "semestral", today = todayEC()): IvaPeriod {
  const [ty, tm] = today.split("-").map(Number);

  if (kind === "semestral") {
    const m = key && /^(\d{4})-S([12])$/.exec(key);
    let y: number, s: number;
    if (m) {
      y = Number(m[1]);
      s = Number(m[2]);
    } else {
      // último semestre cerrado
      if (tm >= 7) [y, s] = [ty, 1];
      else [y, s] = [ty - 1, 2];
    }
    const from = s === 1 ? `${y}-01-01` : `${y}-07-01`;
    const to = s === 1 ? `${y}-07-01` : `${y + 1}-01-01`;
    return {
      key: `${y}-S${s}`,
      kind,
      label: `${s === 1 ? "Enero – junio" : "Julio – diciembre"} de ${y}`,
      from,
      to,
      dueMonth: s === 1 ? `${y}-07` : `${y + 1}-01`,
      inProgress: today >= from && today < to,
    };
  }

  const m = key && /^(\d{4})-(0[1-9]|1[0-2])$/.exec(key);
  let y: number, mo: number;
  if (m) {
    y = Number(m[1]);
    mo = Number(m[2]);
  } else {
    [y, mo] = tm === 1 ? [ty - 1, 12] : [ty, tm - 1];
  }
  const nextY = mo === 12 ? y + 1 : y;
  const nextM = mo === 12 ? 1 : mo + 1;
  return {
    key: `${y}-${pad(mo)}`,
    kind,
    label: `${cap(MONTHS[mo - 1])} de ${y}`,
    from: `${y}-${pad(mo)}-01`,
    to: `${nextY}-${pad(nextM)}-01`,
    dueMonth: `${nextY}-${pad(nextM)}`,
    inProgress: today >= `${y}-${pad(mo)}-01` && today < `${nextY}-${pad(nextM)}-01`,
  };
}

export function shiftPeriod(p: IvaPeriod, delta: number): string {
  const [ys, rest] = p.key.split("-");
  const y = Number(ys);
  if (p.kind === "semestral") {
    const idx = y * 2 + (rest === "S2" ? 1 : 0) + delta;
    return `${Math.floor(idx / 2)}-S${(idx % 2) + 1}`;
  }
  const idx = y * 12 + (Number(rest) - 1) + delta;
  return `${Math.floor(idx / 12)}-${pad((idx % 12) + 1)}`;
}

/** Fecha de vencimiento de la declaración de un período, según el día que corresponde al noveno dígito. */
export function ivaDueDate(period: IvaPeriod, dueDay: number) {
  const [y, m] = period.dueMonth.split("-").map(Number);
  return nextBusinessDay(dateOf(y, m, dueDay));
}

/** Vencimiento de la declaración anual del impuesto a la renta (marzo del año siguiente). */
export function annualRentDueDate(year: number, dueDay: number) {
  return nextBusinessDay(dateOf(year + 1, 3, dueDay));
}

export async function getDueDay(supabase: Supabase, digit: number | null) {
  if (digit === null) return null;
  const { data } = await supabase.from("tax_due_days").select("due_day").eq("ninth_digit", digit).maybeSingle();
  return data?.due_day ?? null;
}

/* ───────────── IVA y retenciones (empresa) ───────────── */

export type RateRow = { code: string; name: string; pct: number; base: number; iva: number };
export type WithholdingRow = { code: string; pct: number; base: number; amount: number };

export async function getIvaSummary(supabase: Supabase, ws: string, from: string, to: string) {
  const { data } = await supabase
    .from("transactions")
    .select("type, base_amount, tax_amount, withheld_amount, iva_deductible, doc_number, tax_rates(code, name, percentage), withholding_codes(sri_code, percentage)")
    .eq("workspace_id", ws)
    .gte("occurred_on", from)
    .lt("occurred_on", to)
    .limit(5000);
  const rows = data ?? [];

  const group = (type: "ingreso" | "gasto") => {
    const m = new Map<string, RateRow>();
    for (const r of rows.filter((x) => x.type === type)) {
      const code = r.tax_rates?.code ?? "SINIVA";
      const cur = m.get(code) ?? { code, name: r.tax_rates?.name ?? "Sin IVA", pct: Number(r.tax_rates?.percentage ?? 0), base: 0, iva: 0 };
      cur.base += Number(r.base_amount);
      cur.iva += Number(r.tax_amount);
      m.set(code, cur);
    }
    return [...m.values()].map((x) => ({ ...x, base: round(x.base), iva: round(x.iva) })).sort((a, b) => b.pct - a.pct);
  };

  const withholdings = (type: "ingreso" | "gasto") => {
    const m = new Map<string, WithholdingRow>();
    for (const r of rows.filter((x) => x.type === type && Number(x.withheld_amount) > 0)) {
      const code = r.withholding_codes?.sri_code ?? "—";
      const cur = m.get(code) ?? { code, pct: Number(r.withholding_codes?.percentage ?? 0), base: 0, amount: 0 };
      cur.base += Number(r.base_amount);
      cur.amount += Number(r.withheld_amount);
      m.set(code, cur);
    }
    return [...m.values()].map((x) => ({ ...x, base: round(x.base), amount: round(x.amount) }));
  };

  const sales = rows.filter((r) => r.type === "ingreso");
  const purchases = rows.filter((r) => r.type === "gasto");

  const salesIva = round(sales.reduce((s, r) => s + Number(r.tax_amount), 0));
  const purchasesIva = round(purchases.reduce((s, r) => s + Number(r.tax_amount), 0));
  const credit = round(purchases.filter((r) => r.iva_deductible).reduce((s, r) => s + Number(r.tax_amount), 0));
  const balance = round(salesIva - credit);

  return {
    salesByRate: group("ingreso"),
    purchasesByRate: group("gasto"),
    salesBase: round(sales.reduce((s, r) => s + Number(r.base_amount), 0)),
    purchasesBase: round(purchases.reduce((s, r) => s + Number(r.base_amount), 0)),
    salesIva,
    purchasesIva,
    credit,
    /** > 0: IVA a pagar · < 0: crédito tributario a favor para el siguiente período */
    balance,
    withheldToMe: withholdings("ingreso"),
    withheldByMe: withholdings("gasto"),
    withheldToMeTotal: round(sales.reduce((s, r) => s + Number(r.withheld_amount), 0)),
    withheldByMeTotal: round(purchases.reduce((s, r) => s + Number(r.withheld_amount), 0)),
    noDocPurchases: purchases.filter((r) => !r.doc_number).length,
    nonCreditPurchasesWithIva: purchases.filter((r) => Number(r.tax_amount) > 0 && !r.iva_deductible).length,
    count: rows.length,
  };
}

/* ───────────── Impuesto a la renta personal ───────────── */

export type Bracket = { lower: number; upper: number | null; base_tax: number; rate: number };

/** Impuesto = impuesto a la fracción básica + % sobre el excedente (tabla oficial del SRI). */
export function incomeTax(base: number, brackets: Bracket[]) {
  const row = [...brackets].sort((a, b) => b.lower - a.lower).find((r) => base >= r.lower);
  return row ? round(Number(row.base_tax) + ((base - Number(row.lower)) * Number(row.rate)) / 100) : 0;
}

export async function getTaxTables(supabase: Supabase, requestedYear: number) {
  const [{ data: params }, { data: brackets }, { data: baskets }] = await Promise.all([
    supabase.from("tax_year_params").select("*").order("year"),
    supabase.from("income_tax_brackets").select("*").order("lower"),
    supabase.from("rebate_baskets").select("*"),
  ]);
  const years = (params ?? []).map((p) => p.year);
  // Año pedido, o el último anterior; si no hay, el más reciente disponible.
  const year = years.includes(requestedYear) ? requestedYear : ([...years].reverse().find((y) => y < requestedYear) ?? years[years.length - 1]);
  const p = (params ?? []).find((x) => x.year === year) ?? null;
  return {
    year: year ?? null,
    usedFallback: year !== undefined && year !== requestedYear,
    params: p,
    brackets: (brackets ?? []).filter((b) => b.year === year).map((b) => ({ lower: Number(b.lower), upper: b.upper === null ? null : Number(b.upper), base_tax: Number(b.base_tax), rate: Number(b.rate) })),
    baskets: (baskets ?? []).filter((b) => b.year === year),
  };
}

export const DEDUCTIBLE_GROUPS: Record<string, string> = {
  vivienda: "Vivienda",
  educacion: "Educación, arte y cultura",
  salud: "Salud",
  alimentacion: "Alimentación",
  vestimenta: "Vestimenta",
  turismo: "Turismo nacional",
};

export async function getPersonalRent(
  supabase: Supabase,
  ws: string,
  year: number,
  opts: { dependents: number; employed: boolean },
) {
  const [tables, { data }] = await Promise.all([
    getTaxTables(supabase, year),
    supabase
      .from("transactions")
      .select("type, base_amount, total, withheld_amount, categories(name, tax_deductible_group)")
      .eq("workspace_id", ws)
      .gte("occurred_on", `${year}-01-01`)
      .lt("occurred_on", `${year + 1}-01-01`)
      .limit(5000),
  ]);
  const rows = data ?? [];
  const { params, brackets, baskets } = tables;

  const income = round(rows.filter((r) => r.type === "ingreso").reduce((s, r) => s + Number(r.base_amount), 0));
  const salary = rows.filter((r) => r.type === "ingreso" && r.categories?.name === "Sueldo").reduce((s, r) => s + Number(r.base_amount), 0);
  const iess = opts.employed && params ? round((salary * Number(params.iess_rate)) / 100) : 0;
  const taxable = Math.max(round(income - iess), 0);
  const causado = brackets.length ? incomeTax(taxable, brackets) : 0;

  const byGroup = new Map<string, number>();
  for (const r of rows.filter((x) => x.type === "gasto" && x.categories?.tax_deductible_group)) {
    const g = r.categories!.tax_deductible_group!;
    byGroup.set(g, (byGroup.get(g) ?? 0) + Number(r.total));
  }
  const groups = Object.entries(DEDUCTIBLE_GROUPS).map(([key, name]) => ({ name, total: round(byGroup.get(key) ?? 0) })).sort((a, b) => b.total - a.total);
  const deductible = round(groups.reduce((s, g) => s + g.total, 0));

  const dep = Math.min(Math.max(opts.dependents, 0), 5);
  const basketCount = baskets.find((b) => b.dependents === dep)?.baskets ?? null;
  const cap = params && basketCount ? round(basketCount * Number(params.basic_basket_value)) : null;
  const rebateBase = cap === null ? null : Math.min(deductible, cap);
  const rebateRaw = rebateBase === null || !params ? 0 : round((rebateBase * Number(params.rebate_rate)) / 100);
  const rebate = Math.min(rebateRaw, causado);
  const withheld = round(rows.filter((r) => r.type === "ingreso").reduce((s, r) => s + Number(r.withheld_amount), 0));
  const result = round(causado - rebate - withheld);

  return {
    ...tables,
    income,
    iess,
    taxable,
    causado,
    groups,
    deductible,
    cap,
    basketCount,
    rebate,
    rebateMax: params && cap ? round((cap * Number(params.rebate_rate)) / 100) : null,
    remainingToCap: cap === null ? null : Math.max(round(cap - deductible), 0),
    withheld,
    /** > 0: impuesto estimado a pagar · < 0: saldo a favor */
    result,
    belowThreshold: brackets.length > 0 && taxable <= (brackets.find((b) => b.rate > 0)?.lower ?? 0),
    count: rows.length,
  };
}
