"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus } from "lucide-react";
import { Alert, Button, Field } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { money } from "@/lib/format";

export type PlanData = {
  id: string;
  code: string;
  name: string;
  kind: "personal" | "empresa";
  price: number;
  isFree: boolean;
  isActive: boolean;
  trialDays: number | null;
  limits: Record<string, number>;
  spaces: number;
};

const COUNT_LIMITS = [
  { key: "max_transacciones_mes", label: "Transacciones por mes", hint: "Se cuentan por fecha de registro." },
  { key: "max_cuentas", label: "Cuentas (efectivo, banco…)", hint: "" },
  { key: "max_categorias", label: "Categorías personalizadas", hint: "Las sugeridas no cuentan." },
  { key: "max_miembros", label: "Usuarios por espacio", hint: "" },
  { key: "max_adjuntos_mb", label: "Adjuntos (MB)", hint: "" },
];
const FLAG_LIMITS = [
  { key: "flujo_caja_proyectado", label: "Flujo de caja proyectado a 90 días (si no, 30 días)" },
  { key: "modulo_impuestos", label: "Módulo de impuestos" },
  { key: "exportar", label: "Exportar reportes" },
];
const KNOWN = new Set([...COUNT_LIMITS, ...FLAG_LIMITS].map((l) => l.key));

export function PlansEditor({ plans }: { plans: PlanData[] }) {
  const [creating, setCreating] = useState(false);
  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Planes y límites</h1>
          <p className="text-muted">
            Define qué incluye cada plan. Usa <strong>-1</strong> para ilimitado. El plan gratuito que se asigna a los registros nuevos es el activo más antiguo de cada tipo.
          </p>
        </div>
        {!creating && (
          <Button onClick={() => setCreating(true)}>
            <Plus className="size-4" aria-hidden /> Nuevo plan
          </Button>
        )}
      </header>

      {creating && <NewPlan onDone={() => setCreating(false)} />}

      <div className="grid gap-5 lg:grid-cols-2">
        {plans.map((p) => (
          <PlanCard key={p.id} plan={p} />
        ))}
      </div>
    </div>
  );
}

function PlanCard({ plan }: { plan: PlanData }) {
  const router = useRouter();
  const [name, setName] = useState(plan.name);
  const [price, setPrice] = useState(String(plan.price));
  const [trial, setTrial] = useState(plan.trialDays === null ? "" : String(plan.trialDays));
  const [active, setActive] = useState(plan.isActive);
  const [counts, setCounts] = useState<Record<string, string>>(
    Object.fromEntries(COUNT_LIMITS.map((l) => [l.key, plan.limits[l.key] === undefined ? "" : String(plan.limits[l.key])])),
  );
  const [flags, setFlags] = useState<Record<string, boolean>>(Object.fromEntries(FLAG_LIMITS.map((l) => [l.key, (plan.limits[l.key] ?? 0) !== 0])));
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const touch = () => setSaved(false);

  async function save() {
    setError(null);
    const priceNum = Number(price.replace(",", "."));
    if (name.trim().length < 2) return setError("El plan necesita un nombre.");
    if (!Number.isFinite(priceNum) || priceNum < 0) return setError("El precio no es válido.");
    const trialNum = trial.trim() === "" ? null : Number(trial);
    if (trialNum !== null && (!Number.isInteger(trialNum) || trialNum < 1)) return setError("Los días de acceso deben ser un número entero mayor a 0, o vacío para sin vencimiento.");

    const limitRows: { plan_id: string; key: string; value: number }[] = [];
    for (const l of COUNT_LIMITS) {
      const raw = counts[l.key].trim();
      if (raw === "") continue;
      const n = Number(raw);
      if (!Number.isInteger(n) || n < -1) return setError(`“${l.label}”: usa un entero mayor o igual a 0, o -1 para ilimitado.`);
      limitRows.push({ plan_id: plan.id, key: l.key, value: n });
    }
    for (const l of FLAG_LIMITS) limitRows.push({ plan_id: plan.id, key: l.key, value: flags[l.key] ? 1 : 0 });

    setBusy(true);
    const supabase = createClient();
    const upd = await supabase.from("plans").update({ name: name.trim(), price_usd: priceNum, trial_days: trialNum, is_active: active }).eq("id", plan.id);
    const lim = upd.error ? null : await supabase.from("plan_limits").upsert(limitRows, { onConflict: "plan_id,key" });
    setBusy(false);
    if (upd.error || lim?.error) return setError("No se pudo guardar. Inténtalo de nuevo.");
    setSaved(true);
    router.refresh();
  }

  const extra = Object.entries(plan.limits).filter(([k]) => !KNOWN.has(k));

  return (
    <section className="space-y-5 rounded-2xl border border-border bg-surface p-5" aria-label={`Plan ${plan.name}`}>
      <header className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold">{plan.name}</h2>
        <span className="rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-medium text-brand">{plan.kind === "empresa" ? "Empresa" : "Personal"}</span>
        {plan.isFree && <span className="rounded-full bg-border px-2.5 py-0.5 text-xs font-medium">Gratuito</span>}
        <span className="ml-auto text-xs text-muted">
          {plan.spaces} {plan.spaces === 1 ? "espacio" : "espacios"} · código {plan.code}
        </span>
      </header>

      {error && <Alert>{error}</Alert>}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre" value={name} onChange={(e) => { setName(e.target.value); touch(); }} maxLength={40} />
        <Field label="Precio mensual (USD)" value={price} onChange={(e) => { setPrice(e.target.value); touch(); }} inputMode="decimal" />
        <Field
          label="Días de acceso al registrarse"
          value={trial}
          onChange={(e) => { setTrial(e.target.value.replace(/\D/g, "")); touch(); }}
          inputMode="numeric"
          placeholder="Sin vencimiento"
          hint="Vacío = sin vencimiento. Solo afecta a los espacios que se creen desde ahora."
          className="sm:col-span-2"
        />
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold">Límites</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          {COUNT_LIMITS.map((l) => (
            <Field
              key={l.key}
              label={l.label}
              value={counts[l.key]}
              onChange={(e) => { setCounts((c) => ({ ...c, [l.key]: e.target.value.replace(/[^\d-]/g, "") })); touch(); }}
              inputMode="numeric"
              placeholder="Sin definir"
              hint={l.hint || undefined}
            />
          ))}
        </div>
        <div className="space-y-2 pt-1">
          {FLAG_LIMITS.map((l) => (
            <label key={l.key} className="flex items-center gap-2.5 text-sm">
              <input type="checkbox" checked={flags[l.key]} onChange={(e) => { setFlags((f) => ({ ...f, [l.key]: e.target.checked })); touch(); }} className="size-4 accent-[var(--brand)]" />
              {l.label}
            </label>
          ))}
        </div>
        {extra.length > 0 && (
          <p className="text-xs text-muted">Otros límites definidos: {extra.map(([k, v]) => `${k} = ${v}`).join(", ")}</p>
        )}
      </fieldset>

      <label className="flex items-center gap-2.5 text-sm">
        <input type="checkbox" checked={active} onChange={(e) => { setActive(e.target.checked); touch(); }} className="size-4 accent-[var(--brand)]" />
        Plan activo (disponible para nuevos registros)
      </label>

      <div className="flex items-center gap-3">
        <Button onClick={save} loading={busy}>
          Guardar plan
        </Button>
        {saved && <span role="status" className="text-sm text-brand">Guardado</span>}
        {plan.price > 0 && <span className="ml-auto text-sm text-muted">{money(plan.price)}/mes</span>}
      </div>
    </section>
  );
}

function NewPlan({ onDone }: { onDone: () => void }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [kind, setKind] = useState<"personal" | "empresa">("empresa");
  const [price, setPrice] = useState("0");
  const [free, setFree] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const priceNum = Number(price.replace(",", "."));
    if (!/^[a-z0-9_]{3,30}$/.test(code)) return setError("El código usa solo minúsculas, números y guion bajo (3 a 30).");
    if (name.trim().length < 2) return setError("Ponle un nombre al plan.");
    if (!Number.isFinite(priceNum) || priceNum < 0) return setError("El precio no es válido.");
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("plans")
      .insert({ code, name: name.trim(), account_kind: kind, price_usd: priceNum, is_free: free })
      .select("id")
      .single();
    if (error || !data) {
      setBusy(false);
      return setError(error?.code === "23505" ? "Ya existe un plan con ese código." : "No se pudo crear el plan.");
    }
    // Límites iniciales prudentes; se ajustan desde la tarjeta del plan.
    await supabase.from("plan_limits").insert([
      { plan_id: data.id, key: "max_transacciones_mes", value: 100 },
      { plan_id: data.id, key: "max_cuentas", value: 3 },
      { plan_id: data.id, key: "max_categorias", value: 10 },
      { plan_id: data.id, key: "max_miembros", value: 1 },
    ]);
    setBusy(false);
    onDone();
    router.refresh();
  }

  return (
    <form onSubmit={create} className="space-y-4 rounded-2xl border border-border bg-surface p-5" noValidate>
      <h2 className="font-semibold">Nuevo plan</h2>
      {error && <Alert>{error}</Alert>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Código" value={code} onChange={(e) => setCode(e.target.value.toLowerCase())} placeholder="pro_empresa" />
        <Field label="Nombre" value={name} onChange={(e) => setName(e.target.value)} placeholder="Pro Empresa" />
        <div className="space-y-1.5">
          <label htmlFor="newkind" className="text-sm font-medium">
            Tipo de cuenta
          </label>
          <select id="newkind" value={kind} onChange={(e) => setKind(e.target.value as typeof kind)} className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-base">
            <option value="empresa">Empresa</option>
            <option value="personal">Personal</option>
          </select>
        </div>
        <Field label="Precio mensual (USD)" value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" />
      </div>
      <label className="flex items-center gap-2.5 text-sm">
        <input type="checkbox" checked={free} onChange={(e) => setFree(e.target.checked)} className="size-4 accent-[var(--brand)]" />
        Es un plan gratuito
      </label>
      <div className="flex gap-3">
        <Button type="submit" loading={busy}>
          Crear plan
        </Button>
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
