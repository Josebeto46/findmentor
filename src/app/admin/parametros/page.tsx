import type { Metadata } from "next";
import { requireAdmin } from "@/lib/context";
import { SettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "Parámetros" };

export default async function ParametrosPage() {
  const { supabase } = await requireAdmin();
  const { data: settings } = await supabase.from("app_settings").select("key, value, updated_at").order("key");

  const list = settings ?? [];
  const requireActivation = list.find((s) => s.key === "require_admin_activation")?.value === true;
  const others = list.filter((s) => s.key !== "require_admin_activation").map((s) => ({ key: s.key, value: JSON.stringify(s.value) }));

  return <SettingsForm requireActivation={requireActivation} others={others} />;
}
