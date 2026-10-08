import type { createClient } from "@/lib/supabase/server";
import { monthRange, todayEC } from "@/lib/format";

type Supabase = Awaited<ReturnType<typeof createClient>>;
type Flow = { type: "ingreso" | "gasto"; total: number; withheld_amount: number };

/** Efecto en caja de un movimiento: ingresos suman, gastos restan, netos de retención. */
const net = (t: Flow) => (t.type === "ingreso" ? 1 : -1) * (Number(t.total) - Number(t.withheld_amount));
const round = (n: number) => Math.round(n * 100) / 100;

export function addDays(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const shortFmt = new Intl.DateTimeFormat("es-EC", { day: "numeric", month: "short", timeZone: "UTC" });
/** "2026-10-07" → "7 oct" */
export const shortDate = (iso: string) => shortFmt.format(new Date(`${iso}T00:00:00Z`)).replace(".", "");

async function currentBalance(supabase: Supabase, ws: string) {
  const { data } = await supabase.rpc("account_balances", { ws });
  return round((data ?? []).reduce((s, b) => s + Number(b.balance), 0));
}

export type CashDay = { date: string; label: string; inflow: number; outflow: number; balance: number };
export type CashWeek = { label: string; range: string; inflow: number; outflow: number };
export type CategoryTotal = { name: string; total: number };

/* ───────────── Flujo real (caja: por fecha de cobro/pago) ───────────── */
export async function getRealCashFlow(supabase: Supabase, ws: string, month: string) {
  const { from, to } = monthRange(month);
  const today = todayEC();

  const [balance, paid] = await Promise.all([
    currentBalance(supabase, ws),
    supabase
      .from("transactions")
      .select("type, total, withheld_amount, paid_on, categories(name)")
      .eq("workspace_id", ws)
      .eq("payment_status", "pagado")
      .gte("paid_on", from)
      .limit(5000),
  ]);
  const rows = (paid.data ?? []).filter((r): r is typeof r & { paid_on: string } => !!r.paid_on);

  // Saldo al inicio del mes = saldo actual − lo cobrado/pagado desde esa fecha.
  const opening = round(balance - rows.reduce((s, r) => s + net(r), 0));
  const inMonth = rows.filter((r) => r.paid_on < to);

  const lastDay = addDays(to, -1);
  const lastShown = month > today.slice(0, 7) ? from : lastDay < today ? lastDay : today;
  const hasDays = month <= today.slice(0, 7);

  const byDay = new Map<string, { inflow: number; outflow: number }>();
  for (const r of inMonth) {
    const d = byDay.get(r.paid_on) ?? { inflow: 0, outflow: 0 };
    if (r.type === "ingreso") d.inflow += net(r);
    else d.outflow += -net(r);
    byDay.set(r.paid_on, d);
  }

  const days: CashDay[] = [];
  let running = opening;
  if (hasDays) {
    for (let d = from; d <= lastShown; d = addDays(d, 1)) {
      const v = byDay.get(d) ?? { inflow: 0, outflow: 0 };
      running = round(running + v.inflow - v.outflow);
      days.push({ date: d, label: shortDate(d), inflow: round(v.inflow), outflow: round(v.outflow), balance: running });
    }
  }

  // Semanas del mes: 1–7, 8–14, 15–21, 22–28, 29–fin
  const weeks: CashWeek[] = [];
  for (let start = 0; start < days.length; start += 7) {
    const slice = days.slice(start, start + 7);
    weeks.push({
      label: `${start + 1}–${start + slice.length}`,
      range: `${slice[0].label} – ${slice[slice.length - 1].label}`,
      inflow: round(slice.reduce((s, d) => s + d.inflow, 0)),
      outflow: round(slice.reduce((s, d) => s + d.outflow, 0)),
    });
  }

  const inflow = round(days.reduce((s, d) => s + d.inflow, 0));
  const outflow = round(days.reduce((s, d) => s + d.outflow, 0));

  const top = (type: "ingreso" | "gasto"): CategoryTotal[] => {
    const m = new Map<string, number>();
    for (const r of inMonth.filter((x) => x.type === type)) {
      const k = r.categories?.name ?? "Sin categoría";
      m.set(k, (m.get(k) ?? 0) + Math.abs(net(r)));
    }
    return [...m.entries()].map(([name, total]) => ({ name, total: round(total) })).sort((a, b) => b.total - a.total).slice(0, 6);
  };

  return {
    opening,
    closing: round(opening + inflow - outflow),
    inflow,
    outflow,
    net: round(inflow - outflow),
    days,
    weeks,
    topOut: top("gasto"),
    topIn: top("ingreso"),
    count: inMonth.length,
  };
}

/* ───────────── Flujo proyectado (cobros y pagos pendientes) ───────────── */
export type PendingItem = {
  id: string;
  type: "ingreso" | "gasto";
  date: string;
  originalDate: string;
  overdue: boolean;
  amount: number;
  label: string;
  meta: string;
};

export async function getProjection(supabase: Supabase, ws: string, horizon: number) {
  const today = todayEC();
  const end = addDays(today, horizon);

  const [balance, pending] = await Promise.all([
    currentBalance(supabase, ws),
    supabase
      .from("transactions")
      .select("id, type, total, withheld_amount, due_date, occurred_on, description, categories(name), contacts(name)")
      .eq("workspace_id", ws)
      .eq("payment_status", "pendiente")
      .limit(2000),
  ]);

  const items: PendingItem[] = (pending.data ?? [])
    .map((r) => {
      const original = r.due_date ?? r.occurred_on;
      const overdue = original < today;
      return {
        id: r.id,
        type: r.type,
        date: overdue ? today : original, // lo vencido se espera "hoy" (conservador)
        originalDate: original,
        overdue,
        amount: net(r),
        label: r.description || r.categories?.name || (r.type === "ingreso" ? "Cobro" : "Pago"),
        meta: [r.contacts?.name, r.categories?.name].filter(Boolean).join(" · "),
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  const inHorizon = items.filter((i) => i.date <= end);

  const byDate = new Map<string, number>();
  for (const i of inHorizon) byDate.set(i.date, (byDate.get(i.date) ?? 0) + i.amount);

  const days: CashDay[] = [];
  let running = balance;
  for (let i = 0; i <= horizon; i++) {
    const date = addDays(today, i);
    const delta = byDate.get(date) ?? 0;
    running = round(running + delta);
    days.push({ date, label: shortDate(date), inflow: delta > 0 ? round(delta) : 0, outflow: delta < 0 ? round(-delta) : 0, balance: running });
  }

  const weeks: CashWeek[] = [];
  for (let start = 0; start < days.length; start += 7) {
    const slice = days.slice(start, start + 7);
    weeks.push({
      label: shortDate(slice[0].date),
      range: `${slice[0].label} – ${slice[slice.length - 1].label}`,
      inflow: round(slice.reduce((s, d) => s + d.inflow, 0)),
      outflow: round(slice.reduce((s, d) => s + d.outflow, 0)),
    });
  }

  let minIndex = 0;
  days.forEach((d, i) => {
    if (d.balance < days[minIndex].balance) minIndex = i;
  });
  const negative = days.find((d) => d.balance < 0) ?? null;

  const receivable = round(inHorizon.filter((i) => i.amount > 0).reduce((s, i) => s + i.amount, 0));
  const payable = round(inHorizon.filter((i) => i.amount < 0).reduce((s, i) => s - i.amount, 0));

  return {
    today,
    end,
    balance,
    final: days[days.length - 1].balance,
    receivable,
    payable,
    days,
    weeks,
    min: { index: minIndex, ...days[minIndex] },
    negativeFrom: negative,
    items: inHorizon,
    beyond: items.length - inHorizon.length,
    overdueCount: inHorizon.filter((i) => i.overdue).length,
  };
}
