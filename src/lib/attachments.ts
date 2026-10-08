import type { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Espacio total de adjuntos del plan en MB (null = sin límite; el parámetro se edita en Administración → Planes). */
export async function getAttachmentLimitMb(supabase: Supabase, planId: string) {
  const { data } = await supabase.from("plan_limits").select("value").eq("plan_id", planId).eq("key", "max_adjuntos_mb").maybeSingle();
  return data === null || data.value < 0 ? null : Number(data.value);
}
