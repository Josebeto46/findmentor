"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { clsx } from "clsx";
import { Search, ShieldCheck, UserCheck, UserX } from "lucide-react";
import { Alert } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/format";
import type { Database } from "@/lib/database.types";

export type UserRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  platform_role: Database["public"]["Enums"]["platform_role"];
  is_active: boolean;
  created_at: string;
  spaces: { name: string; kind: "personal" | "empresa" }[];
};

type Filter = "todos" | "inactivos" | "admins";

export function UsersTable({ users, meId, initialFilter }: { users: UserRow[]; meId: string; initialFilter: Filter }) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>(initialFilter);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const inactive = users.filter((u) => !u.is_active).length;
  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return users.filter((u) => {
      if (filter === "inactivos" && u.is_active) return false;
      if (filter === "admins" && u.platform_role !== "admin") return false;
      return !term || `${u.full_name ?? ""} ${u.email ?? ""}`.toLowerCase().includes(term);
    });
  }, [users, filter, q]);

  async function update(id: string, values: Database["public"]["Tables"]["profiles"]["Update"]) {
    setBusy(id);
    setError(null);
    const { error } = await createClient().from("profiles").update(values).eq("id", id);
    setBusy(null);
    if (error) {
      return setError(
        error.message.includes("al menos un Administrador")
          ? "No se puede quitar al último Administrador activo. Asigna primero a otra persona."
          : "No se pudo guardar el cambio. Inténtalo de nuevo.",
      );
    }
    router.refresh();
  }

  const tabs: { value: Filter; label: string }[] = [
    { value: "todos", label: `Todos (${users.length})` },
    { value: "inactivos", label: `Inactivos (${inactive})` },
    { value: "admins", label: "Administradores" },
  ];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Usuarios</h1>
        <p className="text-muted">Activa o desactiva cuentas y asigna el rol de Administrador. Un usuario inactivo no puede entrar a sus datos.</p>
      </header>

      {error && <Alert>{error}</Alert>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Filtro" className="flex gap-1 rounded-xl border border-border bg-surface p-1 text-sm">
          {tabs.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setFilter(t.value)}
              aria-pressed={filter === t.value}
              className={clsx("rounded-lg px-3 py-1.5 font-medium", filter === t.value ? "bg-brand-soft text-brand" : "text-muted hover:text-foreground")}
            >
              {t.label}
            </button>
          ))}
        </nav>
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre o correo"
            aria-label="Buscar usuarios"
            className="h-10 w-full rounded-xl border border-border bg-surface pl-9 pr-3 text-sm focus:border-brand focus:ring-2 focus:ring-brand/25"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-border text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Usuario</th>
              <th className="px-4 py-3 font-medium">Espacios</th>
              <th className="px-4 py-3 font-medium">Registro</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Rol</th>
              <th className="px-4 py-3 text-right font-medium">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {shown.map((u) => {
              const me = u.id === meId;
              return (
                <tr key={u.id} className={clsx(!u.is_active && "bg-warn/5")}>
                  <td className="px-4 py-3">
                    <p className="font-medium">
                      {u.full_name || "Sin nombre"} {me && <span className="text-xs text-muted">(tú)</span>}
                    </p>
                    <p className="text-muted">{u.email}</p>
                  </td>
                  <td className="px-4 py-3 text-muted">{u.spaces.length ? u.spaces.map((s) => `${s.name} (${s.kind})`).join(", ") : "—"}</td>
                  <td className="px-4 py-3 text-muted">{formatDate(u.created_at.slice(0, 10))}</td>
                  <td className="px-4 py-3">
                    <span className={clsx("rounded-full px-2.5 py-0.5 text-xs font-medium", u.is_active ? "bg-brand-soft text-brand" : "bg-warn/15 text-warn")}>
                      {u.is_active ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <label className="sr-only" htmlFor={`rol-${u.id}`}>
                      Rol de {u.email}
                    </label>
                    <select
                      id={`rol-${u.id}`}
                      value={u.platform_role}
                      disabled={me || busy === u.id}
                      onChange={(e) => update(u.id, { platform_role: e.target.value as "user" | "admin" })}
                      className="h-9 rounded-lg border border-border bg-surface px-2 text-sm disabled:opacity-60"
                    >
                      <option value="user">Usuario</option>
                      <option value="admin">Administrador</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      disabled={me || busy === u.id}
                      onClick={() => update(u.id, { is_active: !u.is_active })}
                      className={clsx(
                        "inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50",
                        u.is_active ? "border-border hover:bg-danger-soft hover:text-danger" : "border-brand bg-brand-soft text-brand hover:brightness-95",
                      )}
                    >
                      {u.is_active ? <UserX className="size-4" aria-hidden /> : <UserCheck className="size-4" aria-hidden />}
                      {u.is_active ? "Desactivar" : "Activar"}
                    </button>
                  </td>
                </tr>
              );
            })}
            {shown.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted">
                  No hay usuarios con estos filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="flex items-center gap-2 text-sm text-muted">
        <ShieldCheck className="size-4" aria-hidden /> No puedes cambiar tu propio rol ni desactivarte, y siempre debe quedar al menos un Administrador activo.
      </p>
    </div>
  );
}
