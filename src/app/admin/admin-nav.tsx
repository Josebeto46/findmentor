"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { clsx } from "clsx";
import { ArrowLeft, Building2, History, LayoutDashboard, Layers, Percent, SlidersHorizontal, Users } from "lucide-react";
import { SignOut } from "@/components/app-nav";

const ITEMS = [
  { href: "/admin", label: "Resumen", icon: LayoutDashboard, exact: true },
  { href: "/admin/usuarios", label: "Usuarios", icon: Users },
  { href: "/admin/espacios", label: "Espacios y acceso", icon: Building2 },
  { href: "/admin/planes", label: "Planes y límites", icon: Layers },
  { href: "/admin/impuestos", label: "IVA e impuestos", icon: Percent },
  { href: "/admin/parametros", label: "Parámetros", icon: SlidersHorizontal },
  { href: "/admin/auditoria", label: "Auditoría", icon: History },
];

export function AdminNav({ adminName, logo, hasWorkspace }: { adminName: string; logo: ReactNode; hasWorkspace: boolean }) {
  const path = usePathname();
  const active = (href: string, exact?: boolean) => (exact ? path === href : path === href || path.startsWith(`${href}/`));

  return (
    <aside className="border-b border-border bg-surface lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-64 lg:shrink-0 lg:flex-col lg:border-b-0 lg:border-r lg:p-4">
      <div className="flex items-center justify-between px-4 py-3 lg:block lg:px-2">
        {logo}
        <span className="rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-semibold text-brand lg:mt-2 lg:inline-block">Administrador</span>
      </div>
      <p className="hidden truncate px-2 text-sm text-muted lg:block">{adminName}</p>

      <nav aria-label="Administración" className="flex gap-1 overflow-x-auto px-3 pb-3 lg:mt-4 lg:flex-1 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0">
        {ITEMS.map(({ href, label, icon: Icon, exact }) => (
          <Link
            key={href}
            href={href}
            aria-current={active(href, exact) ? "page" : undefined}
            className={clsx(
              "flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-xl px-3 py-2 text-sm transition lg:py-2.5",
              active(href, exact) ? "bg-brand-soft font-medium text-brand" : "text-foreground/80 hover:bg-brand-soft/60",
            )}
          >
            <Icon className="size-4" aria-hidden /> {label}
          </Link>
        ))}
      </nav>

      <div className="hidden space-y-1 lg:block">
        <Link href={hasWorkspace ? "/dashboard" : "/onboarding"} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted hover:bg-brand-soft hover:text-foreground">
          <ArrowLeft className="size-4" aria-hidden /> {hasWorkspace ? "Mi espacio y movimientos" : "Crear mi espacio"}
        </Link>
        <SignOut />
      </div>
    </aside>
  );
}
