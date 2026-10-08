"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { clsx } from "clsx";
import { ArrowDownCircle, ArrowUpCircle, CheckCircle2, Paperclip, Trash2 } from "lucide-react";
import { Alert, Button, Field } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { dbErrorMessage } from "@/lib/db-errors";
import { ALLOWED_TYPES, MAX_FILE_BYTES } from "@/lib/attachment-rules";
import { FREQUENCY_LABEL, addPeriod, formatDate, money, todayEC, type Frequency } from "@/lib/format";
import type { FormCatalogs } from "@/lib/catalogs";
import type { Database } from "@/lib/database.types";

type Row = Database["public"]["Tables"]["transactions"]["Row"];
type TxType = Row["type"];

const selectCls =
  "h-11 w-full rounded-xl border border-border bg-surface px-3 text-base focus:border-brand focus:ring-2 focus:ring-brand/25";

function parseAmount(input: string): number | null {
  const n = Number(input.trim().replace(",", "."));
  if (!Number.isFinite(n) || n <= 0 || n > 999_999_999.99) return null;
  return Math.round(n * 100) / 100;
}

export function TransactionForm({
  workspaceId,
  workspaceKind,
  catalogs,
  initial,
  attachmentLimitMb = null,
}: {
  workspaceId: string;
  workspaceKind: "personal" | "empresa";
  catalogs: FormCatalogs;
  initial?: Row;
  attachmentLimitMb?: number | null;
}) {
  const router = useRouter();
  const isEmpresa = workspaceKind === "empresa";
  const editing = !!initial;

  const defaultIva = isEmpresa ? (catalogs.taxRates.find((t) => t.percentage > 0)?.id ?? "") : "";

  const [type, setType] = useState<TxType>(initial?.type ?? "gasto");
  const [amount, setAmount] = useState(initial ? String(initial.base_amount) : "");
  const [taxRateId, setTaxRateId] = useState(initial ? (initial.tax_rate_id ?? "") : defaultIva);
  const [date, setDate] = useState(initial?.occurred_on ?? todayEC());
  const [accountId, setAccountId] = useState(initial?.account_id ?? catalogs.accounts[0]?.id ?? "");
  const [categoryId, setCategoryId] = useState(initial?.category_id ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [status, setStatus] = useState<Row["payment_status"]>(initial?.payment_status ?? "pagado");
  const [dueDate, setDueDate] = useState(initial?.due_date ?? "");
  const [contactId, setContactId] = useState(initial?.contact_id ?? "");
  const [docNumber, setDocNumber] = useState(initial?.doc_number ?? "");
  const [withholdingId, setWithholdingId] = useState(initial?.withholding_id ?? "");
  const [ivaDeductible, setIvaDeductible] = useState(initial?.iva_deductible ?? false);
  const [repeat, setRepeat] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [dropAttachment, setDropAttachment] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const [frequency, setFrequency] = useState<Frequency>("mensual");

  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState<null | "save" | "again" | "delete">(null);

  const categories = useMemo(() => catalogs.categories.filter((c) => c.type === type), [catalogs.categories, type]);
  const contacts = useMemo(
    () => catalogs.contacts.filter((c) => c.kind === "ambos" || c.kind === (type === "ingreso" ? "cliente" : "proveedor")),
    [catalogs.contacts, type],
  );

  const base = parseAmount(amount) ?? 0;
  const pct = catalogs.taxRates.find((t) => t.id === taxRateId)?.percentage ?? 0;
  const tax = Math.round(base * pct) / 100;
  const total = base + tax;
  const withheldPct = catalogs.withholdings.find((w) => w.id === withholdingId)?.percentage ?? 0;
  const withheld = Math.round(base * withheldPct) / 100;

  function changeType(next: TxType) {
    setType(next);
    setCategoryId("");
    setContactId("");
    if (next === "ingreso") setIvaDeductible(false);
  }

  async function save(again: boolean) {
    setError(null);
    const parsed = parseAmount(amount);
    if (!parsed) return setError("Ingresa un monto mayor a cero.");
    if (!accountId) return setError("Selecciona una cuenta.");
    if (!date) return setError("Selecciona la fecha.");
    if (status === "pendiente" && dueDate && dueDate < date) return setError("El vencimiento no puede ser anterior a la fecha.");

    setBusy(again ? "again" : "save");
    const supabase = createClient();
    const payload = {
      type,
      base_amount: parsed,
      occurred_on: date,
      account_id: accountId,
      category_id: categoryId || null,
      description: description.trim() || null,
      payment_status: status,
      due_date: status === "pendiente" && dueDate ? dueDate : null,
      tax_rate_id: taxRateId || null,
      contact_id: isEmpresa && contactId ? contactId : null,
      doc_number: isEmpresa && docNumber.trim() ? docNumber.trim() : null,
      withholding_id: isEmpresa && withholdingId ? withholdingId : null,
      iva_deductible: type === "gasto" && pct > 0 ? ivaDeductible : false,
    };

    // Comprobante: se sube primero; si el guardado falla, se borra el archivo subido.
    let attachmentPath: string | null | undefined; // undefined = sin cambios
    if (file) {
      if (attachmentLimitMb !== null) {
        const { data: used } = await supabase.rpc("attachments_usage", { ws: workspaceId });
        if (Number(used ?? 0) + file.size > attachmentLimitMb * 1024 * 1024) {
          setBusy(null);
          return setError(`Superaste el espacio de comprobantes de tu plan (${attachmentLimitMb} MB). Elimina alguno o pide ampliar el plan.`);
        }
      }
      const safeName = file.name.replace(/[^\w.\-]+/g, "_").slice(-80);
      const path = `${workspaceId}/${crypto.randomUUID()}-${safeName}`;
      const up = await supabase.storage.from("attachments").upload(path, file, { contentType: file.type, upsert: false });
      if (up.error) {
        setBusy(null);
        return setError("No se pudo subir el comprobante. Verifica que sea una imagen o PDF de hasta 5 MB.");
      }
      attachmentPath = path;
    } else if (dropAttachment) {
      attachmentPath = null;
    }
    const fullPayload = attachmentPath === undefined ? payload : { ...payload, attachment_path: attachmentPath };

    // Movimiento recurrente: se crea la regla (el próximo vence un período después de esta fecha) y luego el movimiento.
    let ruleId: string | null = null;
    if (!initial && repeat) {
      const dueDays = status === "pendiente" && dueDate ? Math.max(0, Math.round((new Date(dueDate).getTime() - new Date(date).getTime()) / 86_400_000)) : 0;
      const { data: rule, error: ruleError } = await supabase
        .from("recurring_rules")
        .insert({
          workspace_id: workspaceId,
          frequency,
          next_date: addPeriod(date, frequency),
          template: {
            type,
            base_amount: parsed,
            account_id: accountId,
            category_id: categoryId || null,
            contact_id: payload.contact_id,
            description: payload.description,
            tax_rate_id: payload.tax_rate_id,
            withholding_id: payload.withholding_id,
            iva_deductible: payload.iva_deductible,
            payment_status: status,
            due_days: dueDays,
          },
        })
        .select("id")
        .single();
      if (ruleError || !rule) {
        setBusy(null);
        return setError(ruleError ? dbErrorMessage(ruleError) : "No se pudo crear la repetición.");
      }
      ruleId = rule.id;
    }

    const { error } = initial
      ? await supabase.from("transactions").update(fullPayload).eq("id", initial.id)
      : await supabase.from("transactions").insert({ ...fullPayload, workspace_id: workspaceId, recurring_rule_id: ruleId });

    if (error) {
      if (ruleId) await supabase.from("recurring_rules").delete().eq("id", ruleId);
      if (file && attachmentPath) await supabase.storage.from("attachments").remove([attachmentPath]);
      setBusy(null);
      return setError(dbErrorMessage(error));
    }
    // Se reemplazó o quitó el comprobante anterior: borrar el archivo viejo.
    if (initial?.attachment_path && attachmentPath !== undefined) await supabase.storage.from("attachments").remove([initial.attachment_path]);

    if (again) {
      setAmount("");
      setDescription("");
      setDocNumber("");
      setFile(null);
      if (fileInput.current) fileInput.current.value = "";
      setSaved(true);
      setBusy(null);
      router.refresh();
      return;
    }
    router.push(`/movimientos?mes=${date.slice(0, 7)}`);
    router.refresh();
  }

  async function openAttachment() {
    if (!initial?.attachment_path) return;
    const { data } = await createClient().storage.from("attachments").createSignedUrl(initial.attachment_path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener");
    else setError("No se pudo abrir el comprobante.");
  }

  function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFileError(null);
    if (f && !ALLOWED_TYPES.includes(f.type)) {
      setFileError("Solo se admiten fotos (JPG, PNG, WebP) o PDF.");
      e.target.value = "";
      return setFile(null);
    }
    if (f && f.size > MAX_FILE_BYTES) {
      setFileError("El archivo supera los 5 MB.");
      e.target.value = "";
      return setFile(null);
    }
    setFile(f);
    if (f) setDropAttachment(false);
  }

  async function remove() {
    if (!initial || !window.confirm("¿Eliminar este movimiento? Esta acción no se puede deshacer.")) return;
    setBusy("delete");
    const supabase = createClient();
    const { error } = await supabase.from("transactions").delete().eq("id", initial.id);
    if (error) {
      setBusy(null);
      return setError(dbErrorMessage(error));
    }
    if (initial.attachment_path) await supabase.storage.from("attachments").remove([initial.attachment_path]);
    router.push(`/movimientos?mes=${initial.occurred_on.slice(0, 7)}`);
    router.refresh();
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void save(false);
      }}
      className="space-y-5"
      noValidate
    >
      <div role="radiogroup" aria-label="Tipo de movimiento" className="grid grid-cols-2 gap-2 rounded-2xl bg-border/50 p-1">
        {(["gasto", "ingreso"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={type === t}
            onClick={() => changeType(t)}
            className={clsx(
              "flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition",
              type === t ? "bg-surface shadow-sm" : "text-muted",
              type === t && (t === "gasto" ? "text-danger" : "text-brand"),
            )}
          >
            {t === "gasto" ? <ArrowDownCircle className="size-4" aria-hidden /> : <ArrowUpCircle className="size-4" aria-hidden />}
            {t === "gasto" ? "Gasto" : "Ingreso"}
          </button>
        ))}
      </div>

      {saved && (
        <p role="status" className="flex items-center gap-2 rounded-xl bg-brand-soft px-3.5 py-3 text-sm text-brand">
          <CheckCircle2 className="size-4" aria-hidden /> Movimiento guardado. Puedes registrar otro.
        </p>
      )}
      {error && <Alert>{error}</Alert>}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={isEmpresa ? "Valor antes de IVA (USD)" : "Monto (USD)"}
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value);
            setSaved(false);
          }}
          inputMode="decimal"
          placeholder="0.00"
          autoFocus={!editing}
          className="text-lg font-semibold tabular-nums"
        />
        <div className="space-y-1.5">
          <label htmlFor="tax" className="text-sm font-medium">
            IVA
          </label>
          <select id="tax" value={taxRateId} onChange={(e) => setTaxRateId(e.target.value)} className={selectCls}>
            <option value="">Sin IVA</option>
            {catalogs.taxRates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {base > 0 && (pct > 0 || withheld > 0) && (
        <dl className="grid grid-cols-3 gap-2 rounded-xl bg-brand-soft px-4 py-3 text-sm" aria-live="polite">
          <Calc label="Base" value={money(base)} />
          <Calc label={`IVA ${pct}%`} value={money(tax)} />
          <Calc label="Total" value={money(total)} strong />
          {withheld > 0 && <Calc label={`Retención ${withheldPct}%`} value={`− ${money(withheld)}`} />}
        </dl>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Fecha" type="date" value={date} onChange={(e) => setDate(e.target.value)} max="2100-12-31" />
        <div className="space-y-1.5">
          <label htmlFor="account" className="text-sm font-medium">
            Cuenta
          </label>
          <select id="account" value={accountId} onChange={(e) => setAccountId(e.target.value)} className={selectCls}>
            {catalogs.accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="category" className="text-sm font-medium">
            Categoría
          </label>
          <select id="category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={selectCls}>
            <option value="">Sin categoría</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <Field label="Descripción (opcional)" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={140} placeholder="Ej. Compra de insumos" />
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Estado del pago</legend>
        <div className="grid grid-cols-2 gap-2">
          {(["pagado", "pendiente"] as const).map((s) => (
            <label
              key={s}
              className={clsx(
                "flex h-11 cursor-pointer items-center justify-center rounded-xl border text-sm font-medium transition",
                status === s ? "border-brand bg-brand-soft text-brand" : "border-border bg-surface text-muted",
              )}
            >
              <input type="radio" name="status" value={s} checked={status === s} onChange={() => setStatus(s)} className="sr-only" />
              {s === "pagado" ? (type === "ingreso" ? "Cobrado" : "Pagado") : type === "ingreso" ? "Por cobrar" : "Por pagar"}
            </label>
          ))}
        </div>
        {status === "pendiente" && <Field label="Fecha de vencimiento (opcional)" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />}
      </fieldset>

      <div className="space-y-2 rounded-2xl border border-border bg-surface p-4">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Paperclip className="size-4" aria-hidden /> Comprobante (opcional)
        </p>
        {initial?.attachment_path && !dropAttachment && !file && (
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <button type="button" onClick={openAttachment} className="font-medium text-brand hover:underline">
              Ver comprobante actual
            </button>
            <button type="button" onClick={() => setDropAttachment(true)} className="text-muted hover:text-danger">
              Quitar
            </button>
          </div>
        )}
        {dropAttachment && (
          <p className="text-sm text-muted">
            Se quitará al guardar.{" "}
            <button type="button" onClick={() => setDropAttachment(false)} className="font-medium text-brand hover:underline">
              Deshacer
            </button>
          </p>
        )}
        <input
          ref={fileInput}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          onChange={pickFile}
          aria-label="Adjuntar comprobante"
          className="block w-full text-sm file:mr-3 file:h-9 file:rounded-lg file:border file:border-border file:bg-surface file:px-3 file:text-sm file:font-medium hover:file:bg-brand-soft"
        />
        <p className="text-xs text-muted">{initial?.attachment_path ? "Si eliges otro archivo, reemplaza al actual. " : ""}Foto o PDF de hasta 5 MB.</p>
        {fileError && (
          <p role="alert" className="text-sm text-danger">
            {fileError}
          </p>
        )}
      </div>

      {!editing && (
        <div className="space-y-3 rounded-2xl border border-border bg-surface p-4">
          <label className="flex items-start gap-2.5 text-sm">
            <input type="checkbox" checked={repeat} onChange={(e) => setRepeat(e.target.checked)} className="mt-0.5 size-4 accent-[var(--brand)]" />
            <span>
              <strong>Repetir automáticamente</strong>
              <span className="block text-muted">Para arriendo, sueldos, suscripciones y pagos fijos. Se registran solos en cada fecha.</span>
            </span>
          </label>
          {repeat && (
            <div className="grid gap-3 sm:grid-cols-2 sm:items-end">
              <div className="space-y-1.5">
                <label htmlFor="freq" className="text-sm font-medium">
                  Frecuencia
                </label>
                <select id="freq" value={frequency} onChange={(e) => setFrequency(e.target.value as Frequency)} className={selectCls}>
                  {(Object.keys(FREQUENCY_LABEL) as Frequency[]).map((f) => (
                    <option key={f} value={f}>
                      {FREQUENCY_LABEL[f]}
                    </option>
                  ))}
                </select>
              </div>
              {date && <p className="pb-2.5 text-sm text-muted">El próximo se registrará el <strong className="text-foreground">{formatDate(addPeriod(date, frequency))}</strong>.</p>}
            </div>
          )}
        </div>
      )}

      {isEmpresa && (
        <details open={!!(contactId || docNumber || withholdingId)} className="rounded-2xl border border-border bg-surface p-4">
          <summary className="cursor-pointer text-sm font-semibold">Datos tributarios y de terceros</summary>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="contact" className="text-sm font-medium">
                {type === "ingreso" ? "Cliente" : "Proveedor"}
              </label>
              <select id="contact" value={contactId} onChange={(e) => setContactId(e.target.value)} className={selectCls}>
                <option value="">Sin asignar</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <Field label="N.º de comprobante" value={docNumber} onChange={(e) => setDocNumber(e.target.value)} placeholder="001-001-000000123" maxLength={30} />
            <div className="space-y-1.5 sm:col-span-2">
              <label htmlFor="wh" className="text-sm font-medium">
                Retención en la fuente (renta)
              </label>
              <select id="wh" value={withholdingId} onChange={(e) => setWithholdingId(e.target.value)} className={selectCls}>
                <option value="">Sin retención</option>
                {catalogs.withholdings.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.sri_code} · {w.percentage}% · {w.description}
                  </option>
                ))}
              </select>
            </div>
            {type === "gasto" && pct > 0 && (
              <label className="flex items-center gap-2.5 text-sm sm:col-span-2">
                <input type="checkbox" checked={ivaDeductible} onChange={(e) => setIvaDeductible(e.target.checked)} className="size-4 accent-[var(--brand)]" />
                El IVA de esta compra es crédito tributario (deducible)
              </label>
            )}
          </div>
        </details>
      )}

      <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:items-center">
        {editing && (
          <Button type="button" variant="ghost" className="text-danger hover:text-danger sm:mr-auto" loading={busy === "delete"} onClick={remove}>
            <Trash2 className="size-4" aria-hidden /> Eliminar
          </Button>
        )}
        {!editing && (
          <Button type="button" variant="secondary" loading={busy === "again"} disabled={busy !== null} onClick={() => save(true)} className="sm:ml-auto">
            Guardar y agregar otro
          </Button>
        )}
        <Button type="submit" loading={busy === "save"} disabled={busy !== null}>
          {editing ? "Guardar cambios" : "Guardar"}
        </Button>
      </div>
    </form>
  );
}

function Calc({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className={clsx("tabular-nums", strong && "font-semibold")}>{value}</dd>
    </div>
  );
}
