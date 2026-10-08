import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { requireWorkspace } from "@/lib/context";
import { accessInfo, accessLabel } from "@/lib/access";
import { SignOut } from "@/components/app-nav";
import { PasswordForm, ProfileForm, WorkspaceForm } from "./settings-forms";
import { ThemeToggle } from "./theme-toggle";

export const metadata: Metadata = { title: "Ajustes" };

const USAGE_LABELS: Record<string, string> = {
  max_transacciones_mes: "Transacciones este mes",
  max_cuentas: "Cuentas",
  max_categorias: "Categorías personalizadas",
  max_miembros: "Usuarios",
};

export default async function AjustesPage() {
  const { supabase, workspace, profile, role } = await requireWorkspace();
  const { data: usage } = await supabase.rpc("workspace_usage", { ws: workspace.id });
  const rows = (usage ?? []).filter((u) => USAGE_LABELS[u.key] && (workspace.kind === "empresa" || u.key !== "max_miembros"));
  const access = accessInfo(workspace.access_expires_at);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Ajustes</h1>
        <p className="text-muted">Tu cuenta, tu contraseña y los datos de tu espacio.</p>
      </header>

      <Section title="Mi perfil">
        <ProfileForm fullName={profile?.full_name ?? ""} email={profile?.email ?? ""} />
      </Section>

      <Section title="Apariencia">
        <ThemeToggle />
      </Section>

      <Section title="Contraseña">
        <PasswordForm />
      </Section>

      <Section title={`Mi espacio: ${workspace.name}`}>
        <WorkspaceForm id={workspace.id} name={workspace.name} kind={workspace.kind} legalName={workspace.legal_name ?? ""} canEdit={role === "owner"} />
      </Section>

      <Section title="Mi plan">
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Plan</dt>
            <dd className="font-medium">{workspace.plans?.name ?? "Plan gratuito"}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Acceso</dt>
            <dd className="text-right font-medium">{accessLabel(access)}</dd>
          </div>
          {rows.map((u) => (
            <div key={u.key} className="flex justify-between gap-4">
              <dt className="text-muted">{USAGE_LABELS[u.key]}</dt>
              <dd className="font-medium tabular-nums">
                {u.used} / {u.limit === null || u.limit < 0 ? "sin límite" : u.limit}
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-xs text-muted">Para ampliar tu plan o tus días de acceso, comunícate con el administrador.</p>
      </Section>

      <Section title="Más espacios">
        <p className="mb-3 text-sm text-muted">Puedes llevar otro negocio o tus finanzas personales por separado, cada uno con su propio plan.</p>
        <Link href="/onboarding?nuevo=1" className="inline-flex h-11 items-center gap-2 rounded-xl border border-border bg-surface px-4 text-sm font-semibold hover:bg-brand-soft">
          <Plus className="size-4" aria-hidden /> Agregar otro espacio
        </Link>
      </Section>

      <div className="pt-2">
        <SignOut />
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 rounded-2xl border border-border bg-surface p-4 sm:p-5">
      <h2 className="font-semibold">{title}</h2>
      {children}
    </section>
  );
}
