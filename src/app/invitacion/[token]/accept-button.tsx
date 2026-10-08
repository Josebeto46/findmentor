"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, Button } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { dbErrorMessage } from "@/lib/db-errors";

export function AcceptButton({ token }: { token: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function accept() {
    setBusy(true);
    setError(null);
    const { data: workspaceId, error } = await createClient().rpc("accept_invitation", { p_token: token });
    if (error || !workspaceId) {
      setBusy(false);
      const m = error?.message ?? "";
      return setError(
        m.includes("INVITACION_OTRO_CORREO")
          ? "Esta invitación es para otro correo."
          : m.includes("INVITACION_INVALIDA")
            ? "La invitación venció o ya fue usada."
            : dbErrorMessage(error ?? { message: "" }),
      );
    }
    // El espacio al que te uniste pasa a ser el activo.
    const fd = new FormData();
    fd.set("id", workspaceId);
    await fetch("/espacios/activar", { method: "POST", body: fd }).catch(() => {});
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <div className="w-full space-y-3">
      {error && <Alert>{error}</Alert>}
      <Button className="w-full" onClick={accept} loading={busy}>
        Unirme al espacio
      </Button>
    </div>
  );
}
