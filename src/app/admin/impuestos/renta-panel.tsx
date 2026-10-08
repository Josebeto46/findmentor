"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Info, Plus, Trash2 } from "lucide-react";
import { Alert, Button, Field } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

export type YearParams = {
  year: number;
  basic_basket_value: number;
  rebate_rate: number;
  catastrophic_baskets: number;
  iess_rate: number;
  source: string | null;
  verified: boolean;
};
export type BracketRow = { year: number; lower: number; upper: number | null; base_tax: number; rate: number };
export type BasketRow = { year: number; dependents: number; baskets: number };

const cell = "h-10 w-full rounded-lg border border-border bg-surface px-2.5 text-sm focus:border-brand focus:ring-2 focus:ring-brand/25";
const num = (v: string) => {
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

export function RentaPanel({ params, brackets, baskets }: { params: YearParams[]; brackets: BracketRow[]; baskets: BasketRow[] }) {
  const years = params.map((p) => p.year).sort((a, b) => b - a);
  const [year, setYear] = useState<number | null>(years[0] ?? null);
  const p = params.find((x) => x.year === year) ?? null;

  return (
    <div className="space-y-5">
      <p className="flex gap-2 rounded-xl bg-brand-soft px-4 py-3 text-sm">
        <Info className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
        <span>
          Cada diciembre el SRI publica la tabla del impuesto a la renta y la canasta básica del año siguiente. Crea el año nuevo (copia el anterior) y ajusta los valores. Los datos de 2026 provienen de la Resolución NAC-DGERCGC25-00000043 y del Boletín NAC-COM-26-006.
        </span>
      </p>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <label htmlFor="renta-year" className="text-sm font-medium">
            Año fiscal
          </label>
          <select id="renta-year" value={year ?? ""} onChange={(e) => setYear(Number(e.target.value))} className="h-11 rounded-xl border border-border bg-surface px-3 text-base">
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <NewYear from={year} years={years} params={params} brackets={brackets} baskets={baskets} onCreated={setYear} />
      </div>

      {p ? (
        <>
          <ParamsForm key={`p-${p.year}`} p={p} />
          <BracketsTable key={`b-${p.year}`} year={p.year} rows={brackets.filter((b) => b.year === p.year)} />
          <BasketsForm key={`k-${p.year}`} year={p.year} rows={baskets.filter((b) => b.year === p.year)} />
        </>
      ) : (
        <p className="text-sm text-muted">Aún no hay años configurados. Crea el primero.</p>
      )}
    </div>
  );
}

function NewYear({ from, years, params, brackets, baskets, onCreated }: { from: number | null; years: number[]; params: YearParams[]; brackets: BracketRow[]; baskets: BasketRow[]; onCreated: (y: number) => void }) {
  const router = useRouter();
  const [value, setValue] = useState(String((years[0] ?? 2025) + 1));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function create() {
    const y = Number(value);
    if (!Number.isInteger(y) || y < 2000 || y > 2100) return setError("Año no válido.");
    if (years.includes(y)) return setError("Ese año ya existe.");
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const src = params.find((x) => x.year === from);
    const ins = await supabase.from("tax_year_params").insert({
      year: y,
      basic_basket_value: src?.basic_basket_value ?? 800,
      rebate_rate: src?.rebate_rate ?? 18,
      catastrophic_baskets: src?.catastrophic_baskets ?? 100,
      iess_rate: src?.iess_rate ?? 9.45,
      source: "Copiado del año anterior: actualizar con la resolución oficial",
      verified: false,
    });
    if (ins.error) {
      setBusy(false);
      return setError("No se pudo crear el año.");
    }
    const br = brackets.filter((b) => b.year === from).map((b) => ({ year: y, lower: b.lower, upper: b.upper, base_tax: b.base_tax, rate: b.rate }));
    const bk = baskets.filter((b) => b.year === from).map((b) => ({ year: y, dependents: b.dependents, baskets: b.baskets }));
    if (br.length) await supabase.from("income_tax_brackets").insert(br);
    if (bk.length) await supabase.from("rebate_baskets").insert(bk);
    setBusy(false);
    onCreated(y);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="w-28">
        <Field label="Nuevo año" value={value} onChange={(e) => setValue(e.target.value.replace(/\D/g, "").slice(0, 4))} inputMode="numeric" />
      </div>
      <Button variant="secondary" onClick={create} loading={busy}>
        <Plus className="size-4" aria-hidden /> Crear copiando {from ?? "—"}
      </Button>
      {error && <span role="alert" className="pb-3 text-sm text-danger">{error}</span>}
    </div>
  );
}

function ParamsForm({ p }: { p: YearParams }) {
  const router = useRouter();
  const [basket, setBasket] = useState(String(p.basic_basket_value));
  const [rebate, setRebate] = useState(String(p.rebate_rate));
  const [iess, setIess] = useState(String(p.iess_rate));
  const [cat, setCat] = useState(String(p.catastrophic_baskets));
  const [source, setSource] = useState(p.source ?? "");
  const [verified, setVerified] = useState(p.verified);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const touch = () => setSaved(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const b = num(basket), r = num(rebate), i = num(iess), c = Number(cat);
    if (b === null || b <= 0) return setError("Canasta básica no válida.");
    if (r === null || r < 0 || r > 100) return setError("La rebaja debe estar entre 0 y 100.");
    if (i === null || i < 0 || i > 100) return setError("El aporte IESS debe estar entre 0 y 100.");
    if (!Number.isInteger(c) || c < 1) return setError("Las canastas por enfermedad catastrófica deben ser un entero mayor a 0.");
    setBusy(true);
    setError(null);
    const { error } = await createClient().from("tax_year_params").update({ basic_basket_value: b, rebate_rate: r, iess_rate: i, catastrophic_baskets: c, source: source.trim() || null, verified }).eq("year", p.year);
    setBusy(false);
    if (error) return setError("No se pudo guardar.");
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={save} className="space-y-4 rounded-2xl border border-border bg-surface p-4 sm:p-5" noValidate>
      <h2 className="font-semibold">Parámetros {p.year}</h2>
      {error && <Alert>{error}</Alert>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Canasta básica (USD)" value={basket} onChange={(e) => { setBasket(e.target.value); touch(); }} inputMode="decimal" hint="Base del tope de gastos personales." />
        <Field label="Rebaja gastos personales (%)" value={rebate} onChange={(e) => { setRebate(e.target.value); touch(); }} inputMode="decimal" />
        <Field label="Aporte IESS (%)" value={iess} onChange={(e) => { setIess(e.target.value); touch(); }} inputMode="decimal" />
        <Field label="Canastas (enf. catastróficas)" value={cat} onChange={(e) => { setCat(e.target.value.replace(/\D/g, "")); touch(); }} inputMode="numeric" />
      </div>
      <Field label="Fuente" value={source} onChange={(e) => { setSource(e.target.value); touch(); }} placeholder="Resolución o boletín del SRI" />
      <label className="flex items-center gap-2.5 text-sm">
        <input type="checkbox" checked={verified} onChange={(e) => { setVerified(e.target.checked); touch(); }} className="size-4 accent-[var(--brand)]" />
        Verificado contra la publicación oficial del SRI
      </label>
      <div className="flex items-center gap-3">
        <Button type="submit" loading={busy}>Guardar parámetros</Button>
        {saved && <span role="status" className="text-sm text-brand">Guardado</span>}
      </div>
    </form>
  );
}

function BracketsTable({ year, rows }: { year: number; rows: BracketRow[] }) {
  const router = useRouter();
  const sorted = [...rows].sort((a, b) => a.lower - b.lower);
  const [form, setForm] = useState({ lower: "", upper: "", base_tax: "", rate: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const lower = num(form.lower), base = num(form.base_tax), rate = num(form.rate);
    const upper = form.upper.trim() === "" ? null : num(form.upper);
    if (lower === null || base === null || rate === null || (form.upper.trim() !== "" && upper === null)) return setError("Revisa los valores numéricos.");
    if (rate < 0 || rate > 100) return setError("El porcentaje debe estar entre 0 y 100.");
    setBusy(true);
    setError(null);
    const { error } = await createClient().from("income_tax_brackets").insert({ year, lower, upper, base_tax: base, rate });
    setBusy(false);
    if (error) return setError(error.code === "23505" ? "Ya existe un tramo que empieza en ese valor." : "No se pudo agregar el tramo.");
    setForm({ lower: "", upper: "", base_tax: "", rate: "" });
    router.refresh();
  }

  return (
    <section className="space-y-3 rounded-2xl border border-border bg-surface p-4 sm:p-5" aria-label={`Tabla de renta ${year}`}>
      <h2 className="font-semibold">Tabla del impuesto a la renta {year}</h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-2 py-2 font-medium">Fracción básica</th>
              <th className="px-2 py-2 font-medium">Exceso hasta</th>
              <th className="px-2 py-2 font-medium">Impuesto fracción básica</th>
              <th className="px-2 py-2 font-medium">% excedente</th>
              <th><span className="sr-only">Acciones</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sorted.map((b) => (
              <BracketRowEditor key={`${b.lower}-${b.upper}-${b.base_tax}-${b.rate}`} row={b} />
            ))}
          </tbody>
        </table>
      </div>
      <form onSubmit={add} className="space-y-2 border-t border-border pt-4" noValidate>
        <p className="text-sm font-medium">Agregar tramo</p>
        {error && <Alert>{error}</Alert>}
        <div className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_1fr_auto] sm:items-end">
          <Field label="Desde" value={form.lower} onChange={(e) => setForm({ ...form, lower: e.target.value })} inputMode="decimal" />
          <Field label="Hasta (vacío = en adelante)" value={form.upper} onChange={(e) => setForm({ ...form, upper: e.target.value })} inputMode="decimal" />
          <Field label="Impuesto base" value={form.base_tax} onChange={(e) => setForm({ ...form, base_tax: e.target.value })} inputMode="decimal" />
          <Field label="% excedente" value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} inputMode="decimal" />
          <Button type="submit" loading={busy}>Agregar</Button>
        </div>
      </form>
    </section>
  );
}

function BracketRowEditor({ row }: { row: BracketRow }) {
  const router = useRouter();
  const [upper, setUpper] = useState(row.upper === null ? "" : String(row.upper));
  const [base, setBase] = useState(String(row.base_tax));
  const [rate, setRate] = useState(String(row.rate));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<null | "save" | "del">(null);
  const dirty = upper !== (row.upper === null ? "" : String(row.upper)) || Number(base) !== row.base_tax || Number(rate) !== row.rate;

  async function save() {
    const u = upper.trim() === "" ? null : num(upper), b = num(base), r = num(rate);
    if ((upper.trim() !== "" && u === null) || b === null || r === null || r < 0 || r > 100) return setError("Valores no válidos");
    setBusy("save");
    setError(null);
    const { error } = await createClient().from("income_tax_brackets").update({ upper: u, base_tax: b, rate: r }).eq("year", row.year).eq("lower", row.lower);
    setBusy(null);
    if (error) return setError("No se pudo guardar");
    router.refresh();
  }

  async function remove() {
    if (!window.confirm(`¿Eliminar el tramo desde ${row.lower}?`)) return;
    setBusy("del");
    const { error } = await createClient().from("income_tax_brackets").delete().eq("year", row.year).eq("lower", row.lower);
    setBusy(null);
    if (error) return setError("No se pudo eliminar");
    router.refresh();
  }

  return (
    <tr className="align-top">
      <td className="px-2 py-2 tabular-nums">{row.lower.toLocaleString("es-EC")}</td>
      <td className="px-2 py-2"><input aria-label={`Hasta del tramo ${row.lower}`} value={upper} onChange={(e) => setUpper(e.target.value)} placeholder="en adelante" inputMode="decimal" className={cell} /></td>
      <td className="px-2 py-2"><input aria-label={`Impuesto base del tramo ${row.lower}`} value={base} onChange={(e) => setBase(e.target.value)} inputMode="decimal" className={cell} /></td>
      <td className="px-2 py-2"><input aria-label={`Porcentaje del tramo ${row.lower}`} value={rate} onChange={(e) => setRate(e.target.value)} inputMode="decimal" className={cell} /></td>
      <td className="px-2 py-2">
        <div className="flex items-center justify-end gap-1.5">
          {dirty && <Button className="h-9 px-3" onClick={save} loading={busy === "save"}>Guardar</Button>}
          <button type="button" onClick={remove} disabled={busy !== null} aria-label={`Eliminar tramo ${row.lower}`} className="grid size-9 place-items-center rounded-lg text-muted hover:bg-danger-soft hover:text-danger disabled:opacity-50">
            <Trash2 className="size-4" aria-hidden />
          </button>
        </div>
        {error && <p role="alert" className="mt-1 text-right text-xs text-danger">{error}</p>}
      </td>
    </tr>
  );
}

function BasketsForm({ year, rows }: { year: number; rows: BasketRow[] }) {
  const router = useRouter();
  const [values, setValues] = useState<Record<number, string>>(Object.fromEntries([0, 1, 2, 3, 4, 5].map((d) => [d, String(rows.find((r) => r.dependents === d)?.baskets ?? "")])));
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  async function save() {
    const out: BasketRow[] = [];
    for (const d of [0, 1, 2, 3, 4, 5]) {
      const raw = values[d].trim();
      if (raw === "") continue;
      const n = Number(raw);
      if (!Number.isInteger(n) || n < 1) return setError("Las canastas deben ser enteros mayores a 0.");
      out.push({ year, dependents: d, baskets: n });
    }
    setBusy(true);
    setError(null);
    const { error } = await createClient().from("rebate_baskets").upsert(out, { onConflict: "year,dependents" });
    setBusy(false);
    if (error) return setError("No se pudo guardar.");
    setSaved(true);
    router.refresh();
  }

  return (
    <section className="space-y-3 rounded-2xl border border-border bg-surface p-4 sm:p-5" aria-label={`Canastas ${year}`}>
      <div>
        <h2 className="font-semibold">Canastas básicas por cargas familiares ({year})</h2>
        <p className="text-sm text-muted">Tope de gastos personales = canastas × canasta básica. “5” significa 5 o más cargas.</p>
      </div>
      {error && <Alert>{error}</Alert>}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
        {[0, 1, 2, 3, 4, 5].map((d) => (
          <Field
            key={d}
            label={d === 5 ? "5 o más cargas" : d === 0 ? "Sin cargas" : `${d} ${d === 1 ? "carga" : "cargas"}`}
            value={values[d]}
            onChange={(e) => { setValues({ ...values, [d]: e.target.value.replace(/\D/g, "") }); setSaved(false); }}
            inputMode="numeric"
          />
        ))}
      </div>
      <div className="flex items-center gap-3">
        <Button onClick={save} loading={busy}>Guardar canastas</Button>
        {saved && <span role="status" className="text-sm text-brand">Guardado</span>}
      </div>
    </section>
  );
}
