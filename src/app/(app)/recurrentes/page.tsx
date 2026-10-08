import type { Metadata } from "next";
import { requireWorkspace } from "@/lib/context";
import { RecurringManager, type RuleView } from "./recurring-manager";

export const metadata: Metadata = { title: "Recurrentes" };

type Template = {
  type?: "ingreso" | "gasto";
  base_amount?: number;
  account_id?: string;
  category_id?: string | null;
  description?: string | null;
  tax_rate_id?: string | null;
  payment_status?: string;
};

export default async function RecurrentesPage() {
  const { supabase, workspace, role } = await requireWorkspace();
  const canEdit = role !== "lector" && workspace.status === "active";

  const [{ data: rules }, { data: accounts }, { data: categories }, { data: rates }] = await Promise.all([
    supabase.from("recurring_rules").select("id, frequency, next_date, is_active, template").eq("workspace_id", workspace.id).order("next_date"),
    supabase.from("accounts").select("id, name").eq("workspace_id", workspace.id),
    supabase.from("categories").select("id, name").eq("workspace_id", workspace.id),
    supabase.from("tax_rates").select("id, name"),
  ]);

  const acc = new Map((accounts ?? []).map((a) => [a.id, a.name]));
  const cat = new Map((categories ?? []).map((c) => [c.id, c.name]));
  const rate = new Map((rates ?? []).map((r) => [r.id, r.name]));

  const views: RuleView[] = (rules ?? []).map((r) => {
    const t = (r.template ?? {}) as Template;
    return {
      id: r.id,
      frequency: r.frequency,
      nextDate: r.next_date,
      active: r.is_active,
      type: t.type === "ingreso" ? "ingreso" : "gasto",
      amount: Number(t.base_amount ?? 0),
      label: t.description || (t.category_id ? cat.get(t.category_id) : null) || (t.type === "ingreso" ? "Ingreso" : "Gasto"),
      account: t.account_id ? (acc.get(t.account_id) ?? "Cuenta eliminada") : "—",
      category: t.category_id ? (cat.get(t.category_id) ?? null) : null,
      tax: t.tax_rate_id ? (rate.get(t.tax_rate_id) ?? null) : null,
      pending: t.payment_status === "pendiente",
    };
  });

  return <RecurringManager rules={views} canEdit={canEdit} />;
}
