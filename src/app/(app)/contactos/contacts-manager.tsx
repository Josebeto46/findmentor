"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus, Trash2, Users } from "lucide-react";
import { Alert, Button, Field } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { dbErrorMessage } from "@/lib/db-errors";
import { isValidEcuadorId } from "@/lib/ec-tax-id";
import type { Database } from "@/lib/database.types";

type Kind = Database["public"]["Enums"]["contact_kind"];
type Contact = { id: string; name: string; tax_id: string | null; kind: Kind; email: string | null; phone: string | null };

const KIND_LABEL: Record<Kind, string> = { cliente: "Cliente", proveedor: "Proveedor", ambos: "Cliente y proveedor" };

export function ContactsManager({ workspaceId, contacts, canEdit }: { workspaceId: string; contacts: Contact[]; canEdit: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [taxId, setTaxId] = useState("");
  const [kind, setKind] = useState<Kind>("cliente");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<{ name?: string; taxId?: string; email?: string }>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const errs: typeof errors = {};
    if (name.trim().length < 2) errs.name = "Ingresa el nombre.";
    if (taxId && !isValidEcuadorId(taxId)) errs.taxId = "Cédula o RUC no válidos.";
    if (email && !/^\S+@\S+\.\S+$/.test(email)) errs.email = "Correo no válido.";
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setBusy("add");
    setError(null);
    const { error } = await createClient()
      .from("contacts")
      .insert({ workspace_id: workspaceId, name: name.trim(), kind, tax_id: taxId || null, email: email.trim() || null, phone: phone.trim() || null });
    setBusy(null);
    if (error) return setError(dbErrorMessage(error));
    setName("");
    setTaxId("");
    setEmail("");
    setPhone("");
    setOpen(false);
    router.refresh();
  }

  async function remove(c: Contact) {
    if (!window.confirm(`¿Eliminar a “${c.name}”?`)) return;
    setBusy(c.id);
    setError(null);
    const { error } = await createClient().from("contacts").delete().eq("id", c.id);
    setBusy(null);
    if (error) return setError(dbErrorMessage(error));
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Clientes y proveedores</h1>
          <p className="text-muted">Asócialos a tus ventas y compras para llevar el control por tercero.</p>
        </div>
        {canEdit && !open && (
          <Button onClick={() => setOpen(true)}>
            <Plus className="size-4" aria-hidden /> Nuevo
          </Button>
        )}
      </header>

      {error && <Alert>{error}</Alert>}

      {open && (
        <form onSubmit={add} className="space-y-4 rounded-2xl border border-border bg-surface p-5" noValidate>
          <h2 className="font-semibold">Nuevo contacto</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre o razón social" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} maxLength={80} autoFocus />
            <div className="space-y-1.5">
              <label htmlFor="ckind" className="text-sm font-medium">
                Tipo
              </label>
              <select
                id="ckind"
                value={kind}
                onChange={(e) => setKind(e.target.value as Kind)}
                className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-base focus:border-brand focus:ring-2 focus:ring-brand/25"
              >
                {(Object.keys(KIND_LABEL) as Kind[]).map((k) => (
                  <option key={k} value={k}>
                    {KIND_LABEL[k]}
                  </option>
                ))}
              </select>
            </div>
            <Field label="Cédula o RUC (opcional)" value={taxId} onChange={(e) => setTaxId(e.target.value.replace(/\D/g, "").slice(0, 13))} inputMode="numeric" error={errors.taxId} />
            <Field label="Teléfono (opcional)" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" maxLength={20} />
            <Field label="Correo (opcional)" type="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} className="sm:col-span-2" />
          </div>
          <div className="flex gap-3">
            <Button type="submit" loading={busy === "add"} disabled={busy !== null}>
              Guardar
            </Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      )}

      {contacts.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-surface px-6 py-12 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-brand-soft text-brand">
            <Users className="size-6" aria-hidden />
          </span>
          <p className="font-semibold">Aún no tienes clientes ni proveedores</p>
        </div>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
          {contacts.map((c) => (
            <li key={c.id} className="flex items-center gap-3 px-4 py-3.5">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{c.name}</p>
                <p className="truncate text-sm text-muted">{[KIND_LABEL[c.kind], c.tax_id, c.phone, c.email].filter(Boolean).join(" · ")}</p>
              </div>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => remove(c)}
                  disabled={busy === c.id}
                  aria-label={`Eliminar ${c.name}`}
                  className="grid size-9 place-items-center rounded-lg text-muted hover:bg-danger-soft hover:text-danger disabled:opacity-50"
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
