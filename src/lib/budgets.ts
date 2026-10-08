import type { createClient } from "@/lib/supabase/server";
import { monthRange } from "@/lib/format";

type Supabase = Awaited<ReturnType<typeof createClient>>;
const round = (n: number) => Math.round(n * 100) / 100;

export type BudgetRow = {
  categoryId: string;
  name: string;
  budget: number | null;
  spent: number;
  /** % usado del presupuesto (null si no hay presupuesto) */
  pct: number | null;
  state: "none" | "ok" | "warn" | "over";
};

/** Presupuesto del mes por categoría de gasto frente a lo gastado (valor del comprobante, con IVA). */
export async function getBudgetOverview(supabase: Supabase, ws: string, month: string) {
  const { from, to } = monthRange(month);
  const [cats, budgets, tx] = await Promise.all([
    supabase.from("categories").select("id, name").eq("workspace_id", ws).eq("type", "gasto").order("name"),
    supabase.from("budgets").select("category_id, amount").eq("workspace_id", ws).eq("month", from),
    supabase.from("transactions").select("category_id, total").eq("workspace_id", ws).eq("type", "gasto").gte("occurred_on", from).lt("occurred_on", to).limit(5000),
  ]);

  const budgetOf = new Map((budgets.data ?? []).map((b) => [b.category_id, Number(b.amount)]));
  const spentOf = new Map<string, number>();
  let uncategorized = 0;
  for (const t of tx.data ?? []) {
    if (!t.category_id) uncategorized += Number(t.total);
    else spentOf.set(t.category_id, (spentOf.get(t.category_id) ?? 0) + Number(t.total));
  }

  const rows: BudgetRow[] = (cats.data ?? []).map((c) => {
    const budget = budgetOf.get(c.id) ?? null;
    const spent = round(spentOf.get(c.id) ?? 0);
    const pct = budget && budget > 0 ? Math.round((spent / budget) * 100) : null;
    const state = pct === null ? "none" : pct > 100 ? "over" : pct >= 80 ? "warn" : "ok";
    return { categoryId: c.id, name: c.name, budget, spent, pct, state };
  });

  const budgeted = rows.filter((r) => r.budget !== null);
  const totalBudget = round(budgeted.reduce((s, r) => s + (r.budget ?? 0), 0));
  const spentBudgeted = round(budgeted.reduce((s, r) => s + r.spent, 0));
  const spentUnbudgeted = round(rows.filter((r) => r.budget === null).reduce((s, r) => s + r.spent, 0) + uncategorized);

  return {
    rows,
    totalBudget,
    spentBudgeted,
    spentUnbudgeted,
    available: round(totalBudget - spentBudgeted),
    hasBudget: budgeted.length > 0,
    atRisk: budgeted.filter((r) => r.state === "warn" || r.state === "over").sort((a, b) => (b.pct ?? 0) - (a.pct ?? 0)),
  };
}
