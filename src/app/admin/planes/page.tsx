import type { Metadata } from "next";
import { requireAdmin } from "@/lib/context";
import { PlansEditor, type PlanData } from "./plans-editor";

export const metadata: Metadata = { title: "Planes y límites" };

export default async function PlanesPage() {
  const { supabase } = await requireAdmin();

  const [{ data: plans }, { data: workspaces }] = await Promise.all([
    supabase
      .from("plans")
      .select("id, code, name, account_kind, price_usd, is_free, is_active, trial_days, plan_limits(key, value)")
      .order("created_at"),
    supabase.from("workspaces").select("plan_id"),
  ]);

  const inUse = new Map<string, number>();
  for (const w of workspaces ?? []) inUse.set(w.plan_id, (inUse.get(w.plan_id) ?? 0) + 1);

  const data: PlanData[] = (plans ?? []).map((p) => ({
    id: p.id,
    code: p.code,
    name: p.name,
    kind: p.account_kind,
    price: Number(p.price_usd),
    isFree: p.is_free,
    isActive: p.is_active,
    trialDays: p.trial_days,
    limits: Object.fromEntries(p.plan_limits.map((l) => [l.key, Number(l.value)])),
    spaces: inUse.get(p.id) ?? 0,
  }));

  return <PlansEditor plans={data} />;
}
