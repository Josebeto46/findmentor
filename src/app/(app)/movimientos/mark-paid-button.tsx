"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { todayEC } from "@/lib/format";

export function MarkPaidButton({ id, type }: { id: string; type: "ingreso" | "gasto" }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function markPaid() {
    setBusy(true);
    setFailed(false);
    const { error } = await createClient()
      .from("transactions")
      .update({ payment_status: "pagado", paid_on: todayEC() })
      .eq("id", id);
    if (error) {
      setBusy(false);
      return setFailed(true);
    }
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={markPaid}
      disabled={busy}
      className="inline-flex h-8 items-center gap-1 rounded-lg border border-border px-2.5 text-xs font-medium hover:bg-brand-soft disabled:opacity-60"
    >
      <Check className="size-3.5" aria-hidden />
      {failed ? "Reintentar" : type === "ingreso" ? "Marcar cobrado" : "Marcar pagado"}
    </button>
  );
}
