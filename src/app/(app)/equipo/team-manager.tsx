"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { clsx } from "clsx";
import { Check, Copy, Link2, Mail, Trash2, UserMinus } from "lucide-react";
import { Alert, Button, Field } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { dbErrorMessage } from "@/lib/db-errors";

export type MemberView = { userId: string; role: "owner" | "editor" | "lector"; name: string; email: string };
export type InviteView = { id: string; email: string; role: "editor" | "lector"; token: string; expired: boolean };

const ROLE_LABEL = { owner: "Propietario", editor: "Editor", lector: "Lector" } as const;
const ROLE_HELP = {
  owner: "Administra el espacio, el plan y al equipo.",
  editor: "Registra y edita movimientos, cuentas y categorías.",
  lector: "Solo consulta; no puede modificar nada.",
} as const;
const selectCls = "h-10 rounded-lg border border-border bg-surface px-2.5 text-sm focus:border-brand focus:ring-2 focus:ring-brand/25";

export function TeamManager({
  workspaceId,
  workspaceName,
  meId,
  isOwner,
  limit,
  members,
  invitations,
}: {
  workspaceId: string;
  workspaceName: string;
  meId: string;
  isOwner: boolean;
  limit: number | null;
  members: MemberView[];
  invitations: InviteView[];
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"editor" | "lector">("editor");
  const [emailError, setEmailError] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [fresh, setFresh] = useState<string | null>(null); // token de la invitación recién creada

  const pending = invitations.filter((i) => !i.expired).length;
  const used = members.length + pending;
  const linkOf = (token: string) => `${location.origin}/invitacion/${token}`;

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const mail = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(mail)) return setEmailError("Correo no válido");
    setEmailError(undefined);
    setBusy("invite");
    const { data, error } = await createClient().from("workspace_invitations").insert({ workspace_id: workspaceId, email: mail, role }).select("token").single();
    setBusy(null);
    if (error || !data) return setError(dbErrorMessage(error ?? { message: "" }));
    setEmail("");
    setFresh(data.token);
    router.refresh();
  }

  async function copy(token: string) {
    try {
      await navigator.clipboard.writeText(linkOf(token));
      setCopied(token);
      setTimeout(() => setCopied((c) => (c === token ? null : c)), 2500);
    } catch {
      window.prompt("Copia este enlace y compártelo:", linkOf(token));
    }
  }

  async function revoke(i: InviteView) {
    setBusy(i.id);
    setError(null);
    const { error } = await createClient().from("workspace_invitations").delete().eq("id", i.id);
    setBusy(null);
    if (error) return setError(dbErrorMessage(error));
    if (fresh === i.token) setFresh(null);
    router.refresh();
  }

  async function changeRole(m: MemberView, next: "editor" | "lector") {
    setBusy(m.userId);
    setError(null);
    const { error } = await createClient().from("workspace_members").update({ role: next }).eq("workspace_id", workspaceId).eq("user_id", m.userId);
    setBusy(null);
    if (error) return setError(dbErrorMessage(error));
    router.refresh();
  }

  async function remove(m: MemberView) {
    if (!window.confirm(`¿Quitar a ${m.name} del espacio? Perderá el acceso a los datos de ${workspaceName}.`)) return;
    setBusy(m.userId);
    setError(null);
    const { error } = await createClient().from("workspace_members").delete().eq("workspace_id", workspaceId).eq("user_id", m.userId);
    setBusy(null);
    if (error) return setError(dbErrorMessage(error));
    router.refresh();
  }

  const atLimit = limit !== null && used >= limit;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Equipo</h1>
        <p className="text-muted">
          Quiénes pueden entrar a {workspaceName}.{limit !== null && ` Usuarios: ${used} de ${limit} (incluye invitaciones pendientes).`}
        </p>
      </header>

      {error && <Alert>{error}</Alert>}

      <section className="overflow-hidden rounded-2xl border border-border bg-surface" aria-label="Miembros">
        <h2 className="border-b border-border px-4 py-3 font-semibold">Miembros</h2>
        <ul className="divide-y divide-border">
          {members.map((m) => (
            <li key={m.userId} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5">
              <div className="min-w-0 flex-1 basis-52">
                <p className="truncate font-medium">
                  {m.name} {m.userId === meId && <span className="text-xs font-normal text-muted">(tú)</span>}
                </p>
                <p className="truncate text-sm text-muted">{m.email}</p>
              </div>
              {m.role === "owner" || !isOwner ? (
                <span className="rounded-full bg-brand-soft px-2.5 py-1 text-xs font-medium text-brand">{ROLE_LABEL[m.role]}</span>
              ) : (
                <>
                  <label className="sr-only" htmlFor={`rol-${m.userId}`}>
                    Rol de {m.name}
                  </label>
                  <select id={`rol-${m.userId}`} value={m.role} disabled={busy === m.userId} onChange={(e) => changeRole(m, e.target.value as "editor" | "lector")} className={selectCls}>
                    <option value="editor">Editor</option>
                    <option value="lector">Lector</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => remove(m)}
                    disabled={busy === m.userId}
                    aria-label={`Quitar a ${m.name}`}
                    className="grid size-9 place-items-center rounded-lg text-muted hover:bg-danger-soft hover:text-danger disabled:opacity-50"
                  >
                    <UserMinus className="size-4" aria-hidden />
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      </section>

      {isOwner && (
        <>
          <form onSubmit={invite} className="space-y-4 rounded-2xl border border-border bg-surface p-4 sm:p-5" noValidate>
            <h2 className="font-semibold">Invitar a alguien</h2>
            {atLimit && <p className="rounded-xl bg-brand-soft px-4 py-3 text-sm">Llegaste al límite de usuarios de tu plan. Quita a alguien o pide ampliar el plan al administrador.</p>}
            <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
              <Field label="Correo de la persona" type="email" value={email} onChange={(e) => setEmail(e.target.value)} error={emailError} autoComplete="off" placeholder="nombre@empresa.com" />
              <div className="space-y-1.5">
                <label htmlFor="inv-role" className="text-sm font-medium">
                  Rol
                </label>
                <select id="inv-role" value={role} onChange={(e) => setRole(e.target.value as "editor" | "lector")} className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-base">
                  <option value="editor">Editor</option>
                  <option value="lector">Lector</option>
                </select>
              </div>
              <Button type="submit" loading={busy === "invite"} disabled={atLimit}>
                <Mail className="size-4" aria-hidden /> Invitar
              </Button>
            </div>
            <dl className="grid gap-1 text-xs text-muted sm:grid-cols-3">
              {(["owner", "editor", "lector"] as const).map((r) => (
                <div key={r}>
                  <dt className="inline font-semibold text-foreground">{ROLE_LABEL[r]}: </dt>
                  <dd className="inline">{ROLE_HELP[r]}</dd>
                </div>
              ))}
            </dl>
          </form>

          {fresh && (
            <div role="status" className="space-y-2 rounded-2xl border border-brand bg-brand-soft p-4">
              <p className="flex items-center gap-2 font-semibold text-brand">
                <Check className="size-4" aria-hidden /> Invitación creada
              </p>
              <p className="text-sm">Comparte este enlace con la persona (por WhatsApp o correo). Debe entrar con el correo que invitaste y vence en 7 días.</p>
              <div className="flex flex-wrap items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded-lg bg-surface px-3 py-2 text-xs">{linkOf(fresh)}</code>
                <Button variant="secondary" className="h-10" onClick={() => copy(fresh)}>
                  {copied === fresh ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />} {copied === fresh ? "Copiado" : "Copiar enlace"}
                </Button>
              </div>
            </div>
          )}

          {invitations.length > 0 && (
            <section className="overflow-hidden rounded-2xl border border-border bg-surface" aria-label="Invitaciones pendientes">
              <h2 className="border-b border-border px-4 py-3 font-semibold">Invitaciones pendientes</h2>
              <ul className="divide-y divide-border">
                {invitations.map((i) => (
                  <li key={i.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5">
                    <div className="min-w-0 flex-1 basis-52">
                      <p className="truncate font-medium">{i.email}</p>
                      <p className={clsx("text-sm", i.expired ? "text-danger" : "text-muted")}>
                        {ROLE_LABEL[i.role]} · {i.expired ? "venció: elimínala y vuelve a invitar" : "pendiente"}
                      </p>
                    </div>
                    {!i.expired && (
                      <button type="button" onClick={() => copy(i.token)} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-medium hover:bg-brand-soft">
                        {copied === i.token ? <Check className="size-3.5" aria-hidden /> : <Link2 className="size-3.5" aria-hidden />} {copied === i.token ? "Copiado" : "Copiar enlace"}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => revoke(i)}
                      disabled={busy === i.id}
                      aria-label={`Eliminar invitación de ${i.email}`}
                      className="grid size-9 place-items-center rounded-lg text-muted hover:bg-danger-soft hover:text-danger disabled:opacity-50"
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
