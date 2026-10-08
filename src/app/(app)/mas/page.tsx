import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, ChevronRight, Contact, Users, Landmark, PiggyBank, Repeat, Settings, Tags } from "lucide-react";
import { requireWorkspace } from "@/lib/context";
import { SignOut } from "@/components/app-nav";
import { WorkspaceSwitcher } from "@/components/workspace-switcher";

export const metadata: Metadata = { title: "Más" };

const LINKS = [
  { href: "/categorias", label: "Categorías", icon: Tags, ready: true },
  { href: "/contactos", label: "Clientes y proveedores", icon: Contact, ready: true },
  { href: "/equipo", label: "Equipo", icon: Users, ready: true, onlyEmpresa: true },
  { href: "/flujo-de-caja", label: "Flujo de caja", icon: BarChart3, ready: true },
  { href: "/presupuestos", label: "Presupuestos", icon: PiggyBank, ready: true },
  { href: "/recurrentes", label: "Recurrentes", icon: Repeat, ready: true },
  { href: "/impuestos", label: "Impuestos", icon: Landmark, ready: true },
  { href: "/ajustes", label: "Ajustes", icon: Settings, ready: true },
];

export default async function MasPage() {
  const { profile, workspace, workspaces } = await requireWorkspace();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Más</h1>
        <p className="truncate text-muted">
          {profile?.full_name ?? profile?.email} · {workspace.name}
        </p>
      </header>
      {workspaces.length > 1 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-muted">Mis espacios</h2>
          <div className="rounded-2xl border border-border bg-surface p-2">
            <WorkspaceSwitcher items={workspaces} activeId={workspace.id} />
          </div>
        </section>
      )}
      <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
        {LINKS.filter((l) => !("onlyEmpresa" in l) || workspace.kind === "empresa").map(({ href, label, icon: Icon, ready }) => (
          <li key={href}>
            {ready ? (
              <Link href={href} className="flex items-center gap-3 px-4 py-4 hover:bg-brand-soft/50">
                <Icon className="size-5 text-brand" aria-hidden />
                <span className="flex-1 font-medium">{label}</span>
                <ChevronRight className="size-4 text-muted" aria-hidden />
              </Link>
            ) : (
              <span aria-disabled className="flex items-center gap-3 px-4 py-4 text-muted">
                <Icon className="size-5" aria-hidden />
                <span className="flex-1">{label}</span>
                <span className="rounded-full bg-border px-2 py-0.5 text-[10px] font-medium">Pronto</span>
              </span>
            )}
          </li>
        ))}
      </ul>
      <SignOut />
    </div>
  );
}
