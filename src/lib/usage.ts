import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { formatDate, shiftMonth, todayEC } from "@/lib/format";

export type TxUsage = {
  used: number;
  /** null = sin límite */
  limit: number | null;
  remaining: number | null;
  pct: number;
  state: "ok" | "warn" | "danger" | "full" | "unlimited";
  /** Fecha (dd/mm/aaaa) en que se reinicia el contador mensual */
  resetsOn: string;
};

/** Uso de transacciones del mes del espacio, calculado por la base de datos (misma regla que impone el límite). */
export const getTxUsage = cache(async (workspaceId: string): Promise<TxUsage> => {
  const supabase = await createClient();
  const { data } = await supabase.rpc("workspace_usage", { ws: workspaceId });
  const row = data?.find((u) => u.key === "max_transacciones_mes");

  const used = Number(row?.used ?? 0);
  const raw = row?.limit;
  const limit = raw === null || raw === undefined || raw < 0 ? null : Number(raw);
  const resetsOn = formatDate(`${shiftMonth(todayEC().slice(0, 7), 1)}-01`);

  if (limit === null) return { used, limit, remaining: null, pct: 0, state: "unlimited", resetsOn };

  const remaining = Math.max(limit - used, 0);
  const pct = limit === 0 ? 100 : Math.min(100, Math.round((used / limit) * 100));
  const state = remaining === 0 ? "full" : pct >= 90 ? "danger" : pct >= 70 ? "warn" : "ok";
  return { used, limit, remaining, pct, state, resetsOn };
});
