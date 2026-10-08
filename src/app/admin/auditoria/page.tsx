import type { Metadata } from "next";
import Link from "next/link";
import { clsx } from "clsx";
import { requireAdmin } from "@/lib/context";

export const metadata: Metadata = { title: "Auditoría" };

const TABLES = [
  { value: "", label: "Todo" },
  { value: "profiles", label: "Usuarios" },
  { value: "workspaces", label: "Espacios" },
  { value: "plans", label: "Planes" },
  { value: "plan_limits", label: "Límites" },
  { value: "tax_rates", label: "IVA" },
  { value: "withholding_codes", label: "Retenciones" },
  { value: "app_settings", label: "Parámetros" },
  { value: "transactions", label: "Movimientos" },
];
const ACTIONS: Record<string, string> = { INSERT: "Creó", UPDATE: "Modificó", DELETE: "Eliminó" };

const when = new Intl.DateTimeFormat("es-EC", { dateStyle: "short", timeStyle: "medium", timeZone: "America/Guayaquil" });

export default async function AuditoriaPage({ searchParams }: PageProps<"/admin/auditoria">) {
  const sp = await searchParams;
  const table = TABLES.some((t) => t.value === sp.tabla) ? (sp.tabla as string) : "";
  const { supabase } = await requireAdmin();

  let query = supabase.from("audit_log").select("id, created_at, user_id, action, table_name, record_id, changes").order("created_at", { ascending: false }).limit(200);
  if (table) query = query.eq("table_name", table);
  const { data: rows } = await query;
  const list = rows ?? [];

  const ids = [...new Set(list.map((r) => r.user_id).filter((v): v is string => !!v))];
  const { data: people } = ids.length ? await supabase.from("profiles").select("id, email").in("id", ids) : { data: [] };
  const email = new Map((people ?? []).map((p) => [p.id, p.email]));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Auditoría</h1>
        <p className="text-muted">Últimos 200 cambios: quién, qué y cuándo.</p>
      </header>

      <nav aria-label="Filtrar por tabla" className="flex flex-wrap gap-1.5 text-sm">
        {TABLES.map((t) => (
          <Link
            key={t.value}
            href={t.value ? `/admin/auditoria?tabla=${t.value}` : "/admin/auditoria"}
            aria-current={table === t.value ? "page" : undefined}
            className={clsx("rounded-lg border px-3 py-1.5 font-medium", table === t.value ? "border-brand bg-brand-soft text-brand" : "border-border bg-surface text-muted hover:text-foreground")}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {list.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-surface px-6 py-12 text-center text-muted">Aún no hay cambios registrados.</p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
          {list.map((r) => (
            <li key={r.id} className="px-4 py-3">
              <details>
                <summary className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                  <span className="tabular-nums text-muted">{when.format(new Date(r.created_at))}</span>
                  <span className="font-medium">{r.user_id ? (email.get(r.user_id) ?? "Usuario eliminado") : "Sistema"}</span>
                  <span>
                    {ACTIONS[r.action] ?? r.action} <span className="font-mono text-xs">{r.table_name}</span>
                  </span>
                </summary>
                <pre className="mt-3 max-h-72 overflow-auto rounded-xl bg-background p-3 text-xs">{JSON.stringify(r.changes, null, 2)}</pre>
              </details>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
