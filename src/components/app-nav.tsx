"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { clsx } from "clsx";
import {
  BarChart3,
  Contact,
  Landmark,
  LayoutDashboard,
  LogOut,
  MoreHorizontal,
  PiggyBank,
  Plus,
  Receipt,
  Repeat,
  Settings,
  Shield,
  Tags,
  Users,
  Wallet,
} from "lucide-react";
import { Logo } from "@/components/ui";

type Item = { href: string; label: string; icon: typeof Receipt; ready: boolean; onlyEmpresa?: boolean };

const ITEMS: Item[] = [
  { href: "/dashboard", label: "Panel", icon: LayoutDashboard, ready: true },
  { href: "/movimientos", label: "Movimientos", icon: Receipt, ready: true },
  { href: "/cuentas", label: "Cuentas", icon: Wallet, ready: true },
  { href: "/categorias", label: "Categorías", icon: Tags, ready: true },
  { href: "/contactos", label: "Clientes y proveedores", icon: Contact, ready: true },
  { href: "/equipo", label: "Equipo", icon: Users, ready: true, onlyEmpresa: true },
  { href: "/flujo-de-caja", label: "Flujo de caja", icon: BarChart3, ready: true },
  { href: "/presupuestos", label: "Presupuestos", icon: PiggyBank, ready: true },
  { href: "/recurrentes", label: "Recurrentes", icon: Repeat, ready: true },
  { href: "/impuestos", label: "Impuestos", icon: Landmark, ready: true },
  { href: "/ajustes", label: "Ajustes", icon: Settings, ready: true },
];

const isActive = (path: string, href: string) => path === href || path.startsWith(`${href}/`);

export function Sidebar({
  workspaceName,
  isAdmin,
  canEdit,
  accessText,
  accessTone,
  usageChip,
  switcher,
  isEmpresa,
}: {
  workspaceName: string;
  isAdmin: boolean;
  canEdit: boolean;
  accessText: string;
  accessTone: "ok" | "warn" | "danger";
  usageChip?: ReactNode;
  switcher?: ReactNode;
  isEmpresa: boolean;
}) {
  const path = usePathname();
  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-border bg-surface p-4 lg:flex">
      <Logo className="px-2 py-3" />
      <p className="mt-4 truncate px-2 text-xs uppercase tracking-wide text-muted">{workspaceName}</p>
      {switcher && <div className="mt-2">{switcher}</div>}
      {canEdit && (
        <Link
          href="/movimientos/nuevo"
          className="mt-3 flex h-11 items-center justify-center gap-2 rounded-xl bg-brand text-sm font-semibold text-brand-fg hover:brightness-110"
        >
          <Plus className="size-4" aria-hidden /> Nuevo movimiento
        </Link>
      )}
      <nav className="mt-3 flex-1 space-y-1 overflow-y-auto" aria-label="Principal">
        {ITEMS.filter((i) => !i.onlyEmpresa || isEmpresa).map(({ href, label, icon: Icon, ready }) =>
          ready ? (
            <Link
              key={href}
              href={href}
              aria-current={isActive(path, href) ? "page" : undefined}
              className={clsx(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
                isActive(path, href) ? "bg-brand-soft font-medium text-brand" : "text-foreground/80 hover:bg-brand-soft/60",
              )}
            >
              <Icon className="size-4" aria-hidden /> {label}
            </Link>
          ) : (
            <span key={href} aria-disabled className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted/70">
              <Icon className="size-4" aria-hidden /> {label}
              <span className="ml-auto rounded-full bg-border px-2 py-0.5 text-[10px] font-medium">Pronto</span>
            </span>
          ),
        )}
        {isAdmin && (
          <Link href="/admin" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-brand hover:bg-brand-soft/60">
            <Shield className="size-4" aria-hidden /> Administración
          </Link>
        )}
      </nav>
      {usageChip && <div className="mb-2 rounded-xl border border-border px-3 py-2.5">{usageChip}</div>}
      <p
        className={clsx(
          "mb-2 rounded-xl px-3 py-2 text-xs",
          accessTone === "ok" && "bg-brand-soft text-brand",
          accessTone === "warn" && "bg-warn/15 text-warn",
          accessTone === "danger" && "bg-danger-soft text-danger",
        )}
      >
        {accessText}
      </p>
      <SignOut />
    </aside>
  );
}

/** Barra inferior para móvil: acceso rápido y botón central para registrar. */
export function BottomNav({ canEdit }: { canEdit: boolean }) {
  const path = usePathname();
  const tab = (href: string, label: string, Icon: typeof Receipt, active = isActive(path, href)) => (
    <Link
      key={href}
      href={href}
      aria-current={active ? "page" : undefined}
      className={clsx("flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px]", active ? "font-semibold text-brand" : "text-muted")}
    >
      <Icon className="size-5" aria-hidden /> {label}
    </Link>
  );
  const moreActive = ["/mas", "/categorias", "/contactos", "/equipo", "/presupuestos", "/recurrentes", "/ajustes", "/flujo-de-caja", "/impuestos"].some((h) => isActive(path, h));

  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-20 flex items-center border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      {tab("/dashboard", "Panel", LayoutDashboard)}
      {tab("/movimientos", "Movimientos", Receipt, isActive(path, "/movimientos") && path !== "/movimientos/nuevo")}
      {canEdit && (
        <Link
          href="/movimientos/nuevo"
          aria-label="Nuevo movimiento"
          className="-mt-6 grid size-14 shrink-0 place-items-center rounded-full bg-brand text-brand-fg shadow-lg ring-4 ring-background"
        >
          <Plus className="size-7" aria-hidden />
        </Link>
      )}
      {tab("/cuentas", "Cuentas", Wallet)}
      {tab("/mas", "Más", MoreHorizontal, moreActive)}
    </nav>
  );
}

export function SignOut({ compact }: { compact?: boolean }) {
  return (
    <form action="/auth/signout" method="post">
      <button
        type="submit"
        className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted transition hover:bg-brand-soft hover:text-foreground"
        aria-label="Cerrar sesión"
      >
        <LogOut className="size-4" aria-hidden /> {!compact && "Cerrar sesión"}
      </button>
    </form>
  );
}
