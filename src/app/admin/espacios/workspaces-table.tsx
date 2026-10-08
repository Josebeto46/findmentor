"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { clsx } from "clsx";
import { ChevronDown, Search } from "lucide-react";
import { Alert, Button } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { accessInfo, accessLabel } from "@/lib/access";
import { formatDate } from "@/lib/format";

export type WorkspaceRow = {
  id: string;
  name: string;
  kind: "personal" | "empresa";
  status: "active" | "suspended";
  access_expires_at: string | null;
  created_at: string;
  plan_id: string;
  planName: string;
  owner: string;
  ownerEmail: string;
};
type PlanOption = { id: string; name: string; account_kind: "personal" | "empresa" };

const DAY = 86_400_000;
const selectCls = "h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm focus:border-brand focus:ring-2 focus:ring-brand/25";

export function WorkspacesTable({ workspaces, plans }: { workspaces: WorkspaceRow[]; plans: PlanOption[] }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return workspaces.filter((w) => !term || `${w.name} ${w.owner} ${w.ownerEmail}`.toLowerCase().includes(term));
  }, [workspaces, q]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Espacios y acceso</h1>
        <p className="text-muted">
          Controla los días de acceso, el plan y la suspensión de cada espacio. Al vencer o suspenderse, el cliente conserva sus datos en solo lectura.
        </p>
      </header>

      <div className="relative sm:w-80">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar espacio o propietario"
          aria-label="Buscar espacios"
          className="h-10 w-full rounded-xl border border-border bg-surface pl-9 pr-3 text-sm focus:border-brand focus:ring-2 focus:ring-brand/25"
        />
      </div>

      <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
        {shown.map((w) => {
          const info = accessInfo(w.access_expires_at);
          const isOpen = open === w.id;
          return (
            <li key={w.id}>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : w.id)}
                aria-expanded={isOpen}
                className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3.5 text-left hover:bg-brand-soft/40"
              >
                <div className="min-w-0 flex-1 basis-56">
                  <p className="truncate font-medium">{w.name}</p>
                  <p className="truncate text-sm text-muted">
                    {w.owner} · {w.kind === "empresa" ? "Empresa" : "Personal"} · {w.planName}
                  </p>
                </div>
                <span
                  className={clsx(
                    "rounded-full px-2.5 py-0.5 text-xs font-medium",
                    w.status === "suspended" || info.state === "expired"
                      ? "bg-danger-soft text-danger"
                      : info.state === "expiring"
                        ? "bg-warn/15 text-warn"
                        : "bg-brand-soft text-brand",
                  )}
                >
                  {w.status === "suspended" ? "Suspendido" : info.state === "none" ? "Sin vencimiento" : info.state === "expired" ? "Vencido" : `${info.days} días`}
                </span>
                <ChevronDown className={clsx("size-4 text-muted transition", isOpen && "rotate-180")} aria-hidden />
              </button>
              {isOpen && <WorkspaceEditor ws={w} plans={plans.filter((p) => p.account_kind === w.kind)} />}
            </li>
          );
        })}
        {shown.length === 0 && <li className="px-4 py-10 text-center text-muted">No hay espacios con ese criterio.</li>}
      </ul>
    </div>
  );
}

function WorkspaceEditor({ ws, plans }: { ws: WorkspaceRow; plans: PlanOption[] }) {
  const router = useRouter();
  const [planId, setPlanId] = useState(ws.plan_id);
  const [status, setStatus] = useState(ws.status);
  const [expires, setExpires] = useState<string | null>(ws.access_expires_at);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const info = accessInfo(expires);
  const dateValue = expires ? new Date(expires).toLocaleDateString("en-CA", { timeZone: "America/Guayaquil" }) : "";

  /** Suma días desde hoy, o desde el vencimiento actual si todavía no venció. */
  function extend(days: number) {
    const now = new Date().getTime();
    const current = expires ? new Date(expires).getTime() : 0;
    setExpires(new Date(Math.max(now, current) + days * DAY).toISOString());
    setSaved(false);
  }

  async function save() {
    setBusy(true);
    setError(null);
    const { error } = await createClient()
      .from("workspaces")
      .update({ plan_id: planId, status, access_expires_at: expires })
      .eq("id", ws.id);
    setBusy(false);
    if (error) return setError("No se pudo guardar. Inténtalo de nuevo.");
    setSaved(true);
    router.refresh();
  }

  return (
    <div className="space-y-4 border-t border-border bg-background/50 px-4 py-4">
      {error && <Alert>{error}</Alert>}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor={`plan-${ws.id}`} className="text-sm font-medium">
            Plan
          </label>
          <select id={`plan-${ws.id}`} value={planId} onChange={(e) => { setPlanId(e.target.value); setSaved(false); }} className={selectCls}>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor={`st-${ws.id}`} className="text-sm font-medium">
            Estado
          </label>
          <select id={`st-${ws.id}`} value={status} onChange={(e) => { setStatus(e.target.value as typeof status); setSaved(false); }} className={selectCls}>
            <option value="active">Activo</option>
            <option value="suspended">Suspendido (solo lectura)</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">
          Acceso: <span className="font-normal text-muted">{accessLabel(info)}</span>
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {[7, 30, 90, 365].map((d) => (
            <button key={d} type="button" onClick={() => extend(d)} className="h-9 rounded-lg border border-border bg-surface px-3 text-sm font-medium hover:bg-brand-soft">
              +{d} días
            </button>
          ))}
          <button type="button" onClick={() => { setExpires(null); setSaved(false); }} className="h-9 rounded-lg border border-border bg-surface px-3 text-sm font-medium hover:bg-brand-soft">
            Sin vencimiento
          </button>
          <label className="ml-auto flex items-center gap-2 text-sm">
            <span className="text-muted">Vence el</span>
            <input
              type="date"
              value={dateValue}
              onChange={(e) => {
                setExpires(e.target.value ? new Date(`${e.target.value}T23:59:59-05:00`).toISOString() : null);
                setSaved(false);
              }}
              className="h-9 rounded-lg border border-border bg-surface px-2 text-sm"
            />
          </label>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={save} loading={busy}>
          Guardar cambios
        </Button>
        {saved && <span role="status" className="text-sm text-brand">Guardado</span>}
        <span className="ml-auto text-xs text-muted">Creado el {formatDate(ws.created_at.slice(0, 10))}</span>
      </div>
    </div>
  );
}
