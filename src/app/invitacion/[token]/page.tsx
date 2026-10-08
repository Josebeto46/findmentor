import type { Metadata } from "next";
import Link from "next/link";
import { MailWarning, UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Logo } from "@/components/ui";
import { AcceptButton } from "./accept-button";

export const metadata: Metadata = { title: "Invitación a un espacio" };

const ROLE_TEXT = { editor: "Editor (puede registrar y editar)", lector: "Lector (solo consulta)", owner: "Propietario" } as const;

export default async function InvitacionPage({ params }: PageProps<"/invitacion/[token]">) {
  const { token } = await params;
  const valid = /^[0-9a-f]{64}$/.test(token);

  const supabase = await createClient();
  const [{ data: rows }, { data: auth }] = await Promise.all([
    valid ? supabase.rpc("invitation_preview", { p_token: token }) : Promise.resolve({ data: [] as never[] }),
    supabase.auth.getUser(),
  ]);
  const inv = rows?.[0];
  const user = auth.user;
  const next = `/invitacion/${token}`;

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-5 px-6 py-10 text-center">
      <Logo />

      {!inv || inv.expired || inv.accepted ? (
        <>
          <span className="grid size-14 place-items-center rounded-full bg-danger-soft text-danger">
            <MailWarning className="size-7" aria-hidden />
          </span>
          <h1 className="text-2xl font-semibold tracking-tight">{inv?.accepted ? "Esta invitación ya fue usada" : inv?.expired ? "La invitación venció" : "Invitación no válida"}</h1>
          <p className="text-muted">Pide a quien te invitó que genere una nueva desde la sección Equipo.</p>
          <Link href={user ? "/dashboard" : "/login"} className="text-sm font-semibold text-brand hover:underline">
            {user ? "Ir a mi panel" : "Iniciar sesión"}
          </Link>
        </>
      ) : (
        <>
          <span className="grid size-14 place-items-center rounded-full bg-brand-soft text-brand">
            <UserPlus className="size-7" aria-hidden />
          </span>
          <h1 className="text-2xl font-semibold tracking-tight">Te invitaron a {inv.workspace_name}</h1>
          <p className="text-muted">
            <strong className="text-foreground">{inv.inviter ?? "Un administrador"}</strong> te invitó con el rol <strong className="text-foreground">{ROLE_TEXT[inv.role]}</strong>.
          </p>
          <p className="rounded-xl bg-brand-soft px-4 py-2.5 text-sm">
            La invitación es para <strong>{inv.email}</strong>
          </p>

          {!user ? (
            <div className="flex w-full flex-col gap-3">
              <Link href={`/login?next=${encodeURIComponent(next)}`} className="inline-flex h-11 items-center justify-center rounded-xl bg-brand px-5 text-sm font-semibold text-brand-fg hover:brightness-110">
                Ya tengo cuenta: iniciar sesión
              </Link>
              <Link href={`/registro?next=${encodeURIComponent(next)}`} className="inline-flex h-11 items-center justify-center rounded-xl border border-border bg-surface px-5 text-sm font-semibold hover:bg-brand-soft">
                Crear cuenta con ese correo
              </Link>
            </div>
          ) : (user.email ?? "").toLowerCase() !== inv.email ? (
            <div className="w-full space-y-3 text-sm">
              <p role="alert" className="rounded-xl bg-danger-soft px-4 py-3 text-danger">
                Iniciaste sesión como <strong>{user.email}</strong>, pero la invitación es para <strong>{inv.email}</strong>.
              </p>
              <form action="/auth/signout" method="post">
                <button type="submit" className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-border bg-surface px-5 font-semibold hover:bg-brand-soft">
                  Cerrar sesión y entrar con el otro correo
                </button>
              </form>
            </div>
          ) : (
            <AcceptButton token={token} />
          )}
        </>
      )}
    </div>
  );
}
