"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Archive, Banknote, CreditCard, Landmark, Pencil, Plus, Smartphone } from "lucide-react";
import { Alert, Button, Field } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { dbErrorMessage } from "@/lib/db-errors";
import { money } from "@/lib/format";
import type { Database } from "@/lib/database.types";

type Kind = Database["public"]["Enums"]["bank_account_kind"];
type Account = { id: string; name: string; kind: Kind; initial_balance: number; balance: number };

const KINDS: { value: Kind; label: string; icon: typeof Banknote }[] = [
  { value: "efectivo", label: "Efectivo", icon: Banknote },
  { value: "banco", label: "Cuenta bancaria", icon: Landmark },
  { value: "tarjeta", label: "Tarjeta", icon: CreditCard },
  { value: "billetera", label: "Billetera digital", icon: Smartphone },
];
const selectCls = "h-11 w-full rounded-xl border border-border bg-surface px-3 text-base focus:border-brand focus:ring-2 focus:ring-brand/25";

export function AccountsManager({
  workspaceId,
  accounts,
  canEdit,
  limit,
}: {
  workspaceId: string;
  accounts: Account[];
  canEdit: boolean;
  limit: number;
}) {
  const [editing, setEditing] = useState<Account | "new" | null>(null);
  const atLimit = limit >= 0 && accounts.length >= limit;
  const total = accounts.reduce((s, a) => s + a.balance, 0);

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Cuentas</h1>
          <p className="text-muted">
            Saldo total <strong className="tabular-nums text-foreground">{money(total)}</strong>
            {limit >= 0 && ` · ${accounts.length} de ${limit} cuentas`}
          </p>
        </div>
        {canEdit && editing === null && (
          <Button onClick={() => setEditing("new")} disabled={atLimit} title={atLimit ? "Alcanzaste el límite de tu plan" : undefined}>
            <Plus className="size-4" aria-hidden /> Nueva
          </Button>
        )}
      </header>

      {atLimit && canEdit && <p className="rounded-xl bg-brand-soft px-4 py-3 text-sm">Llegaste al límite de cuentas de tu plan gratuito.</p>}

      {editing && <AccountForm key={editing === "new" ? "new" : editing.id} workspaceId={workspaceId} account={editing === "new" ? undefined : editing} onDone={() => setEditing(null)} />}

      <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
        {accounts.map((a) => {
          const Icon = KINDS.find((k) => k.value === a.kind)?.icon ?? Banknote;
          return (
            <li key={a.id} className="flex items-center gap-3 px-4 py-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
                <Icon className="size-5" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{a.name}</p>
                <p className="text-sm text-muted">{KINDS.find((k) => k.value === a.kind)?.label}</p>
              </div>
              <span className={`font-semibold tabular-nums ${a.balance < 0 ? "text-danger" : ""}`}>{money(a.balance)}</span>
              {canEdit && (
                <button type="button" onClick={() => setEditing(a)} aria-label={`Editar ${a.name}`} className="grid size-9 place-items-center rounded-lg text-muted hover:bg-brand-soft hover:text-foreground">
                  <Pencil className="size-4" aria-hidden />
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function AccountForm({ workspaceId, account, onDone }: { workspaceId: string; account?: Account; onDone: () => void }) {
  const router = useRouter();
  const [name, setName] = useState(account?.name ?? "");
  const [kind, setKind] = useState<Kind>(account?.kind ?? "banco");
  const [initial, setInitial] = useState(account ? String(account.initial_balance) : "0");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<null | "save" | "archive">(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const balance = Number(initial.replace(",", "."));
    if (name.trim().length < 2) return setError("Ponle un nombre a la cuenta.");
    if (!Number.isFinite(balance) || Math.abs(balance) > 999_999_999) return setError("El saldo inicial no es válido.");
    setBusy("save");
    setError(null);
    const supabase = createClient();
    const values = { name: name.trim(), kind, initial_balance: Math.round(balance * 100) / 100 };
    const { error } = account
      ? await supabase.from("accounts").update(values).eq("id", account.id)
      : await supabase.from("accounts").insert({ ...values, workspace_id: workspaceId });
    if (error) {
      setBusy(null);
      return setError(dbErrorMessage(error));
    }
    onDone();
    router.refresh();
  }

  async function archive() {
    if (!account) return;
    if (!window.confirm(`¿Archivar la cuenta “${account.name}”? Sus movimientos se conservan.`)) return;
    setBusy("archive");
    const { error } = await createClient().from("accounts").update({ is_active: false }).eq("id", account.id);
    if (error) {
      setBusy(null);
      return setError(dbErrorMessage(error));
    }
    onDone();
    router.refresh();
  }

  return (
    <form onSubmit={save} className="space-y-4 rounded-2xl border border-border bg-surface p-5" noValidate>
      <h2 className="font-semibold">{account ? "Editar cuenta" : "Nueva cuenta"}</h2>
      {error && <Alert>{error}</Alert>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Banco Pichincha" maxLength={40} autoFocus />
        <div className="space-y-1.5">
          <label htmlFor="kind" className="text-sm font-medium">
            Tipo
          </label>
          <select id="kind" value={kind} onChange={(e) => setKind(e.target.value as Kind)} className={selectCls}>
            {KINDS.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
              </option>
            ))}
          </select>
        </div>
        <Field label="Saldo inicial (USD)" value={initial} onChange={(e) => setInitial(e.target.value)} inputMode="decimal" hint="Lo que tenías antes de empezar a registrar." />
      </div>
      <div className="flex flex-wrap gap-3">
        <Button type="submit" loading={busy === "save"} disabled={busy !== null}>
          Guardar
        </Button>
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancelar
        </Button>
        {account && (
          <Button type="button" variant="ghost" className="text-danger hover:text-danger sm:ml-auto" loading={busy === "archive"} onClick={archive}>
            <Archive className="size-4" aria-hidden /> Archivar
          </Button>
        )}
      </div>
    </form>
  );
}
