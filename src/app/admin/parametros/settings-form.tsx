"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, Button } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

export function SettingsForm({ requireActivation, others }: { requireActivation: boolean; others: { key: string; value: string }[] }) {
  const router = useRouter();
  const [value, setValue] = useState(requireActivation);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    setError(null);
    const { error } = await createClient().from("app_settings").upsert({ key: "require_admin_activation", value }, { onConflict: "key" });
    setBusy(false);
    if (error) return setError("No se pudo guardar. Inténtalo de nuevo.");
    setSaved(true);
    router.refresh();
  }

  return (
    <div className="max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Parámetros</h1>
        <p className="text-muted">Reglas globales de la plataforma.</p>
      </header>

      <section className="space-y-4 rounded-2xl border border-border bg-surface p-5">
        <h2 className="font-semibold">Registro de nuevos usuarios</h2>
        {error && <Alert>{error}</Alert>}
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" checked={value} onChange={(e) => { setValue(e.target.checked); setSaved(false); }} className="mt-0.5 size-4 accent-[var(--brand)]" />
          <span>
            <strong>Requerir activación del administrador.</strong>
            <span className="mt-0.5 block text-muted">
              Si está activado, quien se registre queda “Inactivo” y no puede usar la app hasta que lo actives en Usuarios. Si no, el acceso es inmediato. No afecta a los usuarios ya registrados.
            </span>
          </span>
        </label>
        <div className="flex items-center gap-3">
          <Button onClick={save} loading={busy}>Guardar</Button>
          {saved && <span role="status" className="text-sm text-brand">Guardado</span>}
        </div>
      </section>

      {others.length > 0 && (
        <section className="space-y-3 rounded-2xl border border-border bg-surface p-5">
          <h2 className="font-semibold">Valores globales</h2>
          <dl className="divide-y divide-border text-sm">
            {others.map((o) => (
              <div key={o.key} className="flex justify-between gap-4 py-2">
                <dt className="font-mono text-xs text-muted">{o.key}</dt>
                <dd className="font-mono text-xs">{o.value}</dd>
              </div>
            ))}
          </dl>
          <p className="text-xs text-muted">Solo lectura por ahora: moneda, país y zona horaria están fijados para Ecuador.</p>
        </section>
      )}
    </div>
  );
}
