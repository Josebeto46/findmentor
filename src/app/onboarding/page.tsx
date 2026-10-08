import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAppContext } from "@/lib/context";
import { Logo } from "@/components/ui";
import { OnboardingWizard, type PlanSummary } from "./wizard";

export const metadata: Metadata = { title: "Configura tu cuenta" };

export default async function OnboardingPage({ searchParams }: PageProps<"/onboarding">) {
  const sp = await searchParams;
  const { supabase, workspace, profile, workspaces } = await getAppContext();
  if (workspace && sp.nuevo !== "1") redirect("/dashboard");

  // Los límites del plan gratuito se leen de la base: lo que ve el usuario siempre coincide con lo parametrizado.
  const { data: plans } = await supabase
    .from("plans")
    .select("account_kind, name, plan_limits(key, value)")
    .eq("is_free", true)
    .eq("is_active", true);

  const summaries: Partial<Record<"personal" | "empresa", PlanSummary>> = {};
  for (const p of plans ?? []) {
    summaries[p.account_kind] = {
      name: p.name,
      limits: Object.fromEntries(p.plan_limits.map((l) => [l.key, l.value])),
    };
  }

  const firstName = profile?.full_name?.split(" ")[0];

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-4 py-8 sm:px-6">
      <Logo />
      <main className="flex-1 py-8">
        <OnboardingWizard firstName={firstName} plans={summaries} hasPersonal={workspaces.some((w) => w.kind === "personal")} />
      </main>
    </div>
  );
}
