import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { requireWorkspace } from "@/lib/context";
import { getBudgetOverview } from "@/lib/budgets";
import { monthLabel, monthRange, parseMonth, shiftMonth, todayEC } from "@/lib/format";
import { BudgetsEditor } from "./budgets-editor";

export const metadata: Metadata = { title: "Presupuestos" };

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function PresupuestosPage({ searchParams }: PageProps<"/presupuestos">) {
  const sp = await searchParams;
  const month = parseMonth(first(sp.mes));
  const { supabase, workspace, role } = await requireWorkspace();
  const canEdit = role !== "lector" && workspace.status === "active";

  const prev = shiftMonth(month, -1);
  const [overview, { data: prevBudgets }] = await Promise.all([
    getBudgetOverview(supabase, workspace.id, month),
    supabase.from("budgets").select("category_id, amount").eq("workspace_id", workspace.id).eq("month", monthRange(prev).from),
  ]);

  const thisMonth = todayEC().slice(0, 7);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Presupuestos</h1>
        <p className="text-muted">Define cuánto quieres gastar en cada categoría y te avisamos cuando te acerques al límite.</p>
      </header>

      <div className="flex items-center gap-1 self-start rounded-xl border border-border bg-surface p-1 w-fit">
        <Link href={`/presupuestos?mes=${prev}`} aria-label="Mes anterior" className="grid size-9 place-items-center rounded-lg hover:bg-brand-soft">
          <ChevronLeft className="size-4" aria-hidden />
        </Link>
        <span className="min-w-36 text-center text-sm font-semibold">{monthLabel(month)}</span>
        <Link href={`/presupuestos?mes=${shiftMonth(month, 1)}`} aria-label="Mes siguiente" className="grid size-9 place-items-center rounded-lg hover:bg-brand-soft">
          <ChevronRight className="size-4" aria-hidden />
        </Link>
      </div>

      <BudgetsEditor
        key={month}
        workspaceId={workspace.id}
        monthStart={monthRange(month).from}
        monthIsCurrent={month === thisMonth}
        canEdit={canEdit}
        overview={overview}
        previous={(prevBudgets ?? []).map((b) => ({ categoryId: b.category_id, amount: Number(b.amount) }))}
        previousLabel={monthLabel(prev)}
      />
    </div>
  );
}
