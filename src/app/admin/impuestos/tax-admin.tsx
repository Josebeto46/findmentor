"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { clsx } from "clsx";
import { Info, Plus, Trash2 } from "lucide-react";
import { Alert, Button, Field } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { RentaPanel, type BasketRow, type BracketRow, type YearParams } from "./renta-panel";

type Rate = { id: string; code: string; name: string; percentage: number; valid_from: string; valid_to: string | null; is_active: boolean };
type Withholding = { id: string; sri_code: string; description: string; percentage: number; is_active: boolean };
type DueDay = { ninth_digit: number; due_day: number };

const TABS = [
  { id: "iva", label: "Tarifas de IVA" },
  { id: "ret", label: "Retenciones" },
  { id: "venc", label: "Vencimientos" },
  { id: "renta", label: "Renta personal" },
] as const;

const cell = "h-10 w-full rounded-lg border border-border bg-surface px-2.5 text-sm focus:border-brand focus:ring-2 focus:ring-brand/25";

function pct(value: string) {
  const n = Number(value.replace(",", "."));
  return Number.isFinite(n) && n >= 0 && n <= 100 ? Math.round(n * 100) / 100 : null;
}

function errorText(error: { code?: string; message: string }) {
  if (error.code === "23503") return "No se puede eliminar: ya hay movimientos que usan este valor. Desactívalo en su lugar.";
  if (error.code === "23505") return "Ya existe un registro con ese código.";
  return "No se pudo guardar. Inténtalo de nuevo.";
}

export function TaxAdmin({
  rates,
  withholdings,
  dueDays,
  yearParams,
  brackets,
  baskets,
}: {
  rates: Rate[];
  withholdings: Withholding[];
  dueDays: DueDay[];
  yearParams: YearParams[];
  brackets: BracketRow[];
  baskets: BasketRow[];
}) {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("iva");

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">IVA e impuestos</h1>
        <p className="text-muted">Valores que usa toda la plataforma para calcular IVA y retenciones. Verifícalos con el SRI antes de publicar cambios.</p>
      </header>

      <nav aria-label="Secciones" className="flex w-fit gap-1 rounded-xl border border-border bg-surface p-1 text-sm">
        {TABS.map((t) => (
          <button key={t.id} type="button" onClick={() => setTab(t.id)} aria-pressed={tab === t.id} className={clsx("rounded-lg px-3.5 py-1.5 font-medium", tab === t.id ? "bg-brand-soft text-brand" : "text-muted hover:text-foreground")}>
            {t.label}
          </button>
        ))}
      </nav>

      {tab === "iva" && <RatesPanel rates={rates} />}
      {tab === "ret" && <WithholdingsPanel items={withholdings} />}
      {tab === "venc" && <DueDaysPanel items={dueDays} />}
      {tab === "renta" && <RentaPanel params={yearParams} brackets={brackets} baskets={baskets} />}
    </div>
  );
}

/* ───────────── IVA ───────────── */
function RatesPanel({ rates }: { rates: Rate[] }) {
  const router = useRouter();
  const [form, setForm] = useState({ code: "", name: "", percentage: "", valid_from: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const p = pct(form.percentage);
    if (!/^[A-Z0-9]{2,12}$/.test(form.code)) return setError("El código usa mayúsculas y números (ej. IVA15).");
    if (form.name.trim().length < 2) return setError("Ingresa el nombre (ej. IVA 15%).");
    if (p === null) return setError("El porcentaje debe estar entre 0 y 100.");
    if (!form.valid_from) return setError("Indica desde qué fecha rige.");
    setBusy(true);
    setError(null);
    const { error } = await createClient().from("tax_rates").insert({ code: form.code, name: form.name.trim(), percentage: p, valid_from: form.valid_from });
    setBusy(false);
    if (error) return setError(errorText(error));
    setForm({ code: "", name: "", percentage: "", valid_from: "" });
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <p className="flex gap-2 rounded-xl bg-brand-soft px-4 py-3 text-sm">
        <Info className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
        <span>
          Cuando cambie la tarifa del IVA, <strong>crea una tarifa nueva</strong> con su fecha de inicio y cierra la anterior en “Vigente hasta”. No cambies el porcentaje de una tarifa ya usada: los movimientos se recalculan al editarse.
        </span>
      </p>

      <form onSubmit={add} className="space-y-3 rounded-2xl border border-border bg-surface p-4" noValidate>
        <h2 className="font-semibold">Agregar tarifa</h2>
        {error && <Alert>{error}</Alert>}
        <div className="grid gap-3 sm:grid-cols-[1fr_1.5fr_1fr_1.2fr_auto] sm:items-end">
          <Field label="Código" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="IVA15" />
          <Field label="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="IVA 15%" />
          <Field label="Porcentaje" value={form.percentage} onChange={(e) => setForm({ ...form, percentage: e.target.value })} inputMode="decimal" placeholder="15" />
          <Field label="Rige desde" type="date" value={form.valid_from} onChange={(e) => setForm({ ...form, valid_from: e.target.value })} />
          <Button type="submit" loading={busy}>
            <Plus className="size-4" aria-hidden /> Agregar
          </Button>
        </div>
      </form>

      <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-3 py-3 font-medium">Código</th>
              <th className="px-3 py-3 font-medium">Nombre</th>
              <th className="w-24 px-3 py-3 font-medium">%</th>
              <th className="px-3 py-3 font-medium">Desde</th>
              <th className="px-3 py-3 font-medium">Vigente hasta</th>
              <th className="px-3 py-3 font-medium">Activa</th>
              <th className="px-3 py-3"><span className="sr-only">Acciones</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rates.map((r) => (
              <RateRow key={`${r.id}-${r.percentage}-${r.valid_to}-${r.is_active}-${r.name}`} rate={r} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RateRow({ rate }: { rate: Rate }) {
  const router = useRouter();
  const [name, setName] = useState(rate.name);
  const [percentage, setPercentage] = useState(String(rate.percentage));
  const [to, setTo] = useState(rate.valid_to ?? "");
  const [active, setActive] = useState(rate.is_active);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<null | "save" | "del">(null);
  const dirty = name !== rate.name || Number(percentage) !== rate.percentage || to !== (rate.valid_to ?? "") || active !== rate.is_active;

  async function save() {
    const p = pct(percentage);
    if (p === null) return setError("% inválido");
    if (to && to < rate.valid_from) return setError("La fecha final es anterior al inicio");
    setBusy("save");
    setError(null);
    const { error } = await createClient().from("tax_rates").update({ name: name.trim(), percentage: p, valid_to: to || null, is_active: active }).eq("id", rate.id);
    setBusy(null);
    if (error) return setError(errorText(error));
    router.refresh();
  }

  async function remove() {
    if (!window.confirm(`¿Eliminar la tarifa ${rate.code} (${rate.valid_from})?`)) return;
    setBusy("del");
    setError(null);
    const { error } = await createClient().from("tax_rates").delete().eq("id", rate.id);
    setBusy(null);
    if (error) return setError(errorText(error));
    router.refresh();
  }

  return (
    <tr className="align-top">
      <td className="px-3 py-2.5 font-mono text-xs">{rate.code}</td>
      <td className="px-3 py-2.5"><input aria-label={`Nombre ${rate.code}`} value={name} onChange={(e) => setName(e.target.value)} className={cell} /></td>
      <td className="px-3 py-2.5"><input aria-label={`Porcentaje ${rate.code}`} value={percentage} onChange={(e) => setPercentage(e.target.value)} inputMode="decimal" className={cell} /></td>
      <td className="px-3 py-2.5 text-muted">{rate.valid_from}</td>
      <td className="px-3 py-2.5"><input aria-label={`Vigente hasta ${rate.code}`} type="date" value={to} onChange={(e) => setTo(e.target.value)} className={cell} /></td>
      <td className="px-3 py-2.5"><input aria-label={`Activa ${rate.code}`} type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="mt-2.5 size-4 accent-[var(--brand)]" /></td>
      <td className="px-3 py-2.5">
        <div className="flex items-center justify-end gap-1.5">
          {dirty && <Button className="h-9 px-3" onClick={save} loading={busy === "save"}>Guardar</Button>}
          <button type="button" onClick={remove} disabled={busy !== null} aria-label={`Eliminar ${rate.code}`} className="grid size-9 place-items-center rounded-lg text-muted hover:bg-danger-soft hover:text-danger disabled:opacity-50">
            <Trash2 className="size-4" aria-hidden />
          </button>
        </div>
        {error && <p role="alert" className="mt-1 max-w-52 text-right text-xs text-danger">{error}</p>}
      </td>
    </tr>
  );
}

/* ───────────── Retenciones ───────────── */
function WithholdingsPanel({ items }: { items: Withholding[] }) {
  const router = useRouter();
  const [form, setForm] = useState({ sri_code: "", description: "", percentage: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const p = pct(form.percentage);
    if (!/^[0-9A-Za-z]{2,6}$/.test(form.sri_code)) return setError("El código SRI usa de 2 a 6 caracteres (ej. 303).");
    if (form.description.trim().length < 3) return setError("Ingresa la descripción.");
    if (p === null) return setError("El porcentaje debe estar entre 0 y 100.");
    setBusy(true);
    setError(null);
    const { error } = await createClient().from("withholding_codes").insert({ sri_code: form.sri_code, description: form.description.trim(), percentage: p });
    setBusy(false);
    if (error) return setError(errorText(error));
    setForm({ sri_code: "", description: "", percentage: "" });
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <form onSubmit={add} className="space-y-3 rounded-2xl border border-border bg-surface p-4" noValidate>
        <h2 className="font-semibold">Agregar código de retención</h2>
        {error && <Alert>{error}</Alert>}
        <div className="grid gap-3 sm:grid-cols-[1fr_3fr_1fr_auto] sm:items-end">
          <Field label="Código SRI" value={form.sri_code} onChange={(e) => setForm({ ...form, sri_code: e.target.value })} placeholder="303" />
          <Field label="Descripción" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <Field label="Porcentaje" value={form.percentage} onChange={(e) => setForm({ ...form, percentage: e.target.value })} inputMode="decimal" />
          <Button type="submit" loading={busy}>
            <Plus className="size-4" aria-hidden /> Agregar
          </Button>
        </div>
      </form>

      <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-3 py-3 font-medium">Código</th>
              <th className="px-3 py-3 font-medium">Descripción</th>
              <th className="w-24 px-3 py-3 font-medium">%</th>
              <th className="px-3 py-3 font-medium">Activo</th>
              <th className="px-3 py-3"><span className="sr-only">Acciones</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((w) => (
              <WithholdingRow key={`${w.id}-${w.percentage}-${w.is_active}-${w.description}`} item={w} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function WithholdingRow({ item }: { item: Withholding }) {
  const router = useRouter();
  const [description, setDescription] = useState(item.description);
  const [percentage, setPercentage] = useState(String(item.percentage));
  const [active, setActive] = useState(item.is_active);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<null | "save" | "del">(null);
  const dirty = description !== item.description || Number(percentage) !== item.percentage || active !== item.is_active;

  async function save() {
    const p = pct(percentage);
    if (p === null) return setError("% inválido");
    setBusy("save");
    setError(null);
    const { error } = await createClient().from("withholding_codes").update({ description: description.trim(), percentage: p, is_active: active }).eq("id", item.id);
    setBusy(null);
    if (error) return setError(errorText(error));
    router.refresh();
  }

  async function remove() {
    if (!window.confirm(`¿Eliminar el código ${item.sri_code}?`)) return;
    setBusy("del");
    setError(null);
    const { error } = await createClient().from("withholding_codes").delete().eq("id", item.id);
    setBusy(null);
    if (error) return setError(errorText(error));
    router.refresh();
  }

  return (
    <tr className="align-top">
      <td className="px-3 py-2.5 font-mono text-xs">{item.sri_code}</td>
      <td className="px-3 py-2.5"><input aria-label={`Descripción ${item.sri_code}`} value={description} onChange={(e) => setDescription(e.target.value)} className={cell} /></td>
      <td className="px-3 py-2.5"><input aria-label={`Porcentaje ${item.sri_code}`} value={percentage} onChange={(e) => setPercentage(e.target.value)} inputMode="decimal" className={cell} /></td>
      <td className="px-3 py-2.5"><input aria-label={`Activo ${item.sri_code}`} type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="mt-2.5 size-4 accent-[var(--brand)]" /></td>
      <td className="px-3 py-2.5">
        <div className="flex items-center justify-end gap-1.5">
          {dirty && <Button className="h-9 px-3" onClick={save} loading={busy === "save"}>Guardar</Button>}
          <button type="button" onClick={remove} disabled={busy !== null} aria-label={`Eliminar ${item.sri_code}`} className="grid size-9 place-items-center rounded-lg text-muted hover:bg-danger-soft hover:text-danger disabled:opacity-50">
            <Trash2 className="size-4" aria-hidden />
          </button>
        </div>
        {error && <p role="alert" className="mt-1 max-w-52 text-right text-xs text-danger">{error}</p>}
      </td>
    </tr>
  );
}

/* ───────────── Vencimientos ───────────── */
function DueDaysPanel({ items }: { items: DueDay[] }) {
  const router = useRouter();
  const [days, setDays] = useState<Record<number, string>>(Object.fromEntries(items.map((i) => [i.ninth_digit, String(i.due_day)])));
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  async function save() {
    const rows: DueDay[] = [];
    for (const i of items) {
      const n = Number(days[i.ninth_digit]);
      if (!Number.isInteger(n) || n < 1 || n > 31) return setError(`Dígito ${i.ninth_digit}: el día debe estar entre 1 y 31.`);
      rows.push({ ninth_digit: i.ninth_digit, due_day: n });
    }
    setBusy(true);
    setError(null);
    const { error } = await createClient().from("tax_due_days").upsert(rows, { onConflict: "ninth_digit" });
    setBusy(false);
    if (error) return setError(errorText(error));
    setSaved(true);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">Día del mes en que vence la declaración mensual según el noveno dígito del RUC.</p>
      {error && <Alert>{error}</Alert>}
      <div className="grid grid-cols-2 gap-3 rounded-2xl border border-border bg-surface p-4 sm:grid-cols-5">
        {items.map((i) => (
          <Field
            key={i.ninth_digit}
            label={`Dígito ${i.ninth_digit}`}
            value={days[i.ninth_digit]}
            onChange={(e) => { setDays({ ...days, [i.ninth_digit]: e.target.value.replace(/\D/g, "").slice(0, 2) }); setSaved(false); }}
            inputMode="numeric"
          />
        ))}
      </div>
      <div className="flex items-center gap-3">
        <Button onClick={save} loading={busy}>Guardar vencimientos</Button>
        {saved && <span role="status" className="text-sm text-brand">Guardado</span>}
      </div>
    </div>
  );
}
