"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, Button, Field, PasswordStrength, passwordScore } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { authErrorMessage } from "@/lib/auth-errors";

function useSave() {
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  return { error, setError, saved, setSaved, busy, setBusy };
}

function Footer({ busy, saved, label = "Guardar" }: { busy: boolean; saved: boolean; label?: string }) {
  return (
    <div className="flex items-center gap-3">
      <Button type="submit" loading={busy}>
        {label}
      </Button>
      {saved && (
        <span role="status" className="text-sm text-brand">
          Guardado
        </span>
      )}
    </div>
  );
}

export function ProfileForm({ fullName, email }: { fullName: string; email: string }) {
  const router = useRouter();
  const [name, setName] = useState(fullName);
  const [fieldError, setFieldError] = useState<string | undefined>();
  const s = useSave();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    s.setError(null);
    if (name.trim().length < 2) return setFieldError("Ingresa tu nombre");
    setFieldError(undefined);
    s.setBusy(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      s.setBusy(false);
      return s.setError("Tu sesión expiró. Vuelve a iniciar sesión.");
    }
    const { error } = await supabase.from("profiles").update({ full_name: name.trim() }).eq("id", user.id);
    s.setBusy(false);
    if (error) return s.setError("No se pudo guardar. Inténtalo de nuevo.");
    s.setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {s.error && <Alert>{s.error}</Alert>}
      <Field label="Nombre completo" value={name} onChange={(e) => { setName(e.target.value); s.setSaved(false); }} error={fieldError} autoComplete="name" maxLength={80} />
      <Field label="Correo electrónico" value={email} disabled readOnly hint="El correo no se puede cambiar desde aquí." />
      <Footer busy={s.busy} saved={s.saved} />
    </form>
  );
}

export function PasswordForm() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [fieldError, setFieldError] = useState<{ password?: string; confirm?: string }>({});
  const s = useSave();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    s.setError(null);
    const errs: typeof fieldError = {};
    if (password.length < 8) errs.password = "Mínimo 8 caracteres";
    else if (passwordScore(password) < 2) errs.password = "Agrega mayúsculas, minúsculas y números";
    if (confirm !== password) errs.confirm = "Las contraseñas no coinciden";
    setFieldError(errs);
    if (Object.keys(errs).length) return;

    s.setBusy(true);
    const { error } = await createClient().auth.updateUser({ password });
    s.setBusy(false);
    if (error) return s.setError(authErrorMessage(error.message));
    setPassword("");
    setConfirm("");
    s.setSaved(true);
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {s.error && <Alert>{s.error}</Alert>}
      <div className="space-y-2">
        <Field label="Contraseña nueva" type="password" value={password} onChange={(e) => { setPassword(e.target.value); s.setSaved(false); }} error={fieldError.password} autoComplete="new-password" />
        <PasswordStrength value={password} />
      </div>
      <Field label="Repite la contraseña" type="password" value={confirm} onChange={(e) => { setConfirm(e.target.value); s.setSaved(false); }} error={fieldError.confirm} autoComplete="new-password" />
      <Footer busy={s.busy} saved={s.saved} label="Cambiar contraseña" />
    </form>
  );
}

export function WorkspaceForm({ id, name, kind, legalName, canEdit }: { id: string; name: string; kind: "personal" | "empresa"; legalName: string; canEdit: boolean }) {
  const router = useRouter();
  const [n, setN] = useState(name);
  const [legal, setLegal] = useState(legalName);
  const [fieldError, setFieldError] = useState<string | undefined>();
  const s = useSave();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    s.setError(null);
    if (n.trim().length < 2) return setFieldError("Ponle un nombre al espacio");
    setFieldError(undefined);
    s.setBusy(true);
    const values = kind === "empresa" ? { name: n.trim(), legal_name: legal.trim() || null } : { name: n.trim() };
    const { error } = await createClient().from("workspaces").update(values).eq("id", id);
    s.setBusy(false);
    if (error) return s.setError("No se pudo guardar. Solo el propietario puede cambiar estos datos.");
    s.setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {s.error && <Alert>{s.error}</Alert>}
      <Field label={kind === "empresa" ? "Nombre comercial" : "Nombre del espacio"} value={n} onChange={(e) => { setN(e.target.value); s.setSaved(false); }} error={fieldError} disabled={!canEdit} maxLength={80} />
      {kind === "empresa" && <Field label="Razón social" value={legal} onChange={(e) => { setLegal(e.target.value); s.setSaved(false); }} disabled={!canEdit} maxLength={120} hint="El RUC y el régimen se editan en Impuestos → Mis datos tributarios." />}
      {canEdit ? <Footer busy={s.busy} saved={s.saved} /> : <p className="text-sm text-muted">Solo el propietario del espacio puede editar estos datos.</p>}
    </form>
  );
}
