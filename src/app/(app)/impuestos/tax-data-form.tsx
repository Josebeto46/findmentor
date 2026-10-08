"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, Button, Field } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { isValidEcuadorId } from "@/lib/ec-tax-id";
import type { Database } from "@/lib/database.types";

type Regime = Database["public"]["Enums"]["tax_regime"];

export type TaxData = {
  id: string;
  kind: "personal" | "empresa";
  ruc: string | null;
  regime: Regime | null;
  iva_periodicity: string;
  tax_dependents: number;
  tax_employed: boolean;
};

const REGIMES: { value: Regime; label: string }[] = [
  { value: "general", label: "Régimen general" },
  { value: "rimpe_emprendedor", label: "RIMPE – Emprendedor" },
  { value: "rimpe_negocio_popular", label: "RIMPE – Negocio popular" },
];
const selectCls = "h-11 w-full rounded-xl border border-border bg-surface px-3 text-base focus:border-brand focus:ring-2 focus:ring-brand/25";

export function TaxDataForm({ data, canEdit, startOpen }: { data: TaxData; canEdit: boolean; startOpen: boolean }) {
  const router = useRouter();
  const empresa = data.kind === "empresa";
  const [ruc, setRuc] = useState(data.ruc ?? "");
  const [regime, setRegime] = useState<Regime>(data.regime ?? "general");
  const [periodicity, setPeriodicity] = useState(data.iva_periodicity);
  const [dependents, setDependents] = useState(String(data.tax_dependents));
  const [employed, setEmployed] = useState(data.tax_employed);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (ruc && !isValidEcuadorId(ruc)) return setFieldError("Cédula o RUC no válidos. Verifica los dígitos.");
    setFieldError(undefined);
    setBusy(true);
    const values = empresa
      ? { ruc: ruc || null, regime, iva_periodicity: periodicity }
      : { ruc: ruc || null, tax_dependents: Number(dependents), tax_employed: employed };
    const { error } = await createClient().from("workspaces").update(values).eq("id", data.id);
    setBusy(false);
    if (error) return setError("No se pudo guardar. Solo el propietario del espacio puede cambiar estos datos.");
    setSaved(true);
    router.refresh();
  }

  return (
    <details id="datos-tributarios" open={startOpen} className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
      <summary className="cursor-pointer font-semibold">Mis datos tributarios</summary>
      <form onSubmit={save} className="mt-4 space-y-4" noValidate>
        {error && <Alert>{error}</Alert>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={empresa ? "RUC" : "Cédula o RUC"}
            value={ruc}
            onChange={(e) => {
              setRuc(e.target.value.replace(/\D/g, "").slice(0, 13));
              setSaved(false);
            }}
            inputMode="numeric"
            error={fieldError}
            disabled={!canEdit}
            hint="El noveno dígito define tu fecha de vencimiento."
          />
          {empresa ? (
            <>
              <div className="space-y-1.5">
                <label htmlFor="regime" className="text-sm font-medium">
                  Régimen tributario
                </label>
                <select id="regime" value={regime} onChange={(e) => { setRegime(e.target.value as Regime); setSaved(false); }} className={selectCls} disabled={!canEdit}>
                  {REGIMES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="period" className="text-sm font-medium">
                  Declaración de IVA
                </label>
                <select id="period" value={periodicity} onChange={(e) => { setPeriodicity(e.target.value); setSaved(false); }} className={selectCls} disabled={!canEdit}>
                  <option value="mensual">Mensual</option>
                  <option value="semestral">Semestral</option>
                </select>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-1.5">
                <label htmlFor="deps" className="text-sm font-medium">
                  Cargas familiares
                </label>
                <select id="deps" value={dependents} onChange={(e) => { setDependents(e.target.value); setSaved(false); }} className={selectCls} disabled={!canEdit}>
                  {[0, 1, 2, 3, 4].map((n) => (
                    <option key={n} value={n}>
                      {n === 0 ? "Sin cargas" : n}
                    </option>
                  ))}
                  <option value="5">5 o más</option>
                </select>
              </div>
              <label className="flex items-center gap-2.5 self-end pb-3 text-sm">
                <input type="checkbox" checked={employed} onChange={(e) => { setEmployed(e.target.checked); setSaved(false); }} disabled={!canEdit} className="size-4 accent-[var(--brand)]" />
                Trabajo en relación de dependencia (aporte IESS 9,45 %)
              </label>
            </>
          )}
        </div>
        {canEdit ? (
          <div className="flex items-center gap-3">
            <Button type="submit" loading={busy}>
              Guardar
            </Button>
            {saved && <span role="status" className="text-sm text-brand">Guardado</span>}
          </div>
        ) : (
          <p className="text-sm text-muted">Solo el propietario del espacio puede editar estos datos.</p>
        )}
      </form>
    </details>
  );
}
