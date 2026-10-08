import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, ArrowRight, WalletCards } from "lucide-react";
import { requireAdmin } from "@/lib/context";
import { todayEC } from "@/lib/format";

export const metadata: Metadata = { title: "Resumen" };

export default async function AdminHomePage() {
  const { supabase, workspace } = await requireAdmin();
  const nowIso = new Date().toISOString();
  const monthStart = `${todayEC().slice(0, 7)}-01`;
  const count = { count: "exact", head: true } as const;

  const [users, pending, admins, wsPersonal, wsEmpresa, suspended, expired, tx] = await Promise.all([
    supabase.from("profiles").select("id", count),
    supabase.from("profiles").select("id", count).eq("is_active", false),
    supabase.from("profiles").select("id", count).eq("platform_role", "admin"),
    supabase.from("workspaces").select("id", count).eq("kind", "personal"),
    supabase.from("workspaces").select("id", count).eq("kind", "empresa"),
    supabase.from("workspaces").select("id", count).eq("status", "suspended"),
    supabase.from("workspaces").select("id", count).lt("access_expires_at", nowIso),
    supabase.from("transactions").select("id", count).gte("created_at", monthStart),
  ]);

  const stats = [
    { label: "Usuarios", value: users.count ?? 0, href: "/admin/usuarios" },
    { label: "Administradores", value: admins.count ?? 0, href: "/admin/usuarios" },
    { label: "Espacios personales", value: wsPersonal.count ?? 0, href: "/admin/espacios" },
    { label: "Espacios de empresa", value: wsEmpresa.count ?? 0, href: "/admin/espacios" },
    { label: "Movimientos este mes", value: tx.count ?? 0, href: "/admin/auditoria" },
  ];

  const alerts = [
    { n: pending.count ?? 0, text: "usuarios pendientes de activación o desactivados", href: "/admin/usuarios?estado=inactivos" },
    { n: expired.count ?? 0, text: "espacios con el acceso vencido", href: "/admin/espacios" },
    { n: suspended.count ?? 0, text: "espacios suspendidos", href: "/admin/espacios" },
  ].filter((a) => a.n > 0);

  const shortcuts = [
    { href: "/admin/usuarios", title: "Usuarios", text: "Activar o desactivar cuentas y asignar el rol Administrador." },
    { href: "/admin/espacios", title: "Espacios y acceso", text: "Días de acceso, plan y suspensión de cada espacio." },
    { href: "/admin/planes", title: "Planes y límites", text: "Transacciones por mes, cuentas, usuarios y días del plan gratuito." },
    { href: "/admin/impuestos", title: "IVA e impuestos", text: "Tarifas de IVA con vigencia, retenciones y vencimientos." },
    { href: "/admin/parametros", title: "Parámetros", text: "Activación manual de nuevos usuarios y valores globales." },
    { href: "/admin/auditoria", title: "Auditoría", text: "Quién cambió qué y cuándo." },
  ];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Administración</h1>
        <p className="text-muted">Control de usuarios, planes, acceso e impuestos de FinMentor.</p>
      </header>

      {!workspace ? (
        <Link href="/onboarding" className="flex items-center gap-4 rounded-2xl border border-brand bg-brand-soft p-5 hover:brightness-95">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand text-brand-fg">
            <WalletCards className="size-5" aria-hidden />
          </span>
          <span className="flex-1">
            <strong className="block">Crea tu propio espacio para registrar movimientos</strong>
            <span className="text-sm text-muted">Tu cuenta de Administrador solo gestiona la plataforma. Para llevar ingresos y gastos necesitas un espacio personal o de empresa.</span>
          </span>
          <ArrowRight className="size-5 shrink-0 text-brand" aria-hidden />
        </Link>
      ) : (
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-medium text-brand hover:underline">
          <WalletCards className="size-4" aria-hidden /> Ir a mi espacio: {workspace.name} <ArrowRight className="size-4" aria-hidden />
        </Link>
      )}

      {alerts.length > 0 && (
        <ul className="space-y-2" aria-label="Atención requerida">
          {alerts.map((a) => (
            <li key={a.text}>
              <Link href={a.href} className="flex items-center gap-3 rounded-2xl border border-warn/40 bg-warn/10 px-4 py-3 text-sm text-warn hover:brightness-105">
                <AlertTriangle className="size-4 shrink-0" aria-hidden />
                <span>
                  <strong className="tabular-nums">{a.n}</strong> {a.text}
                </span>
                <ArrowRight className="ml-auto size-4" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5" aria-label="Cifras">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="rounded-2xl border border-border bg-surface p-4 hover:border-brand">
            <p className="text-sm text-muted">{s.label}</p>
            <p className="mt-1 text-3xl font-semibold tabular-nums">{s.value}</p>
          </Link>
        ))}
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="Accesos">
        {shortcuts.map((s) => (
          <Link key={s.href} href={s.href} className="space-y-1 rounded-2xl border border-border bg-surface p-5 transition hover:border-brand">
            <h2 className="font-semibold">{s.title}</h2>
            <p className="text-sm text-muted">{s.text}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
