"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Alert, Button, Field } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { dbErrorMessage } from "@/lib/db-errors";

type Category = { id: string; name: string; type: "ingreso" | "gasto"; is_default: boolean };

export function CategoriesManager({
  workspaceId,
  categories,
  canEdit,
  customUsed,
  customLimit,
}: {
  workspaceId: string;
  categories: Category[];
  canEdit: boolean;
  customUsed: number;
  customLimit: number;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [type, setType] = useState<"ingreso" | "gasto">("gasto");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const atLimit = customLimit >= 0 && customUsed >= customLimit;

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) return setError("Escribe un nombre para la categoría.");
    setBusy("add");
    setError(null);
    const { error } = await createClient().from("categories").insert({ workspace_id: workspaceId, name: name.trim(), type });
    setBusy(null);
    if (error) return setError(dbErrorMessage(error));
    setName("");
    router.refresh();
  }

  async function remove(c: Category) {
    if (!window.confirm(`¿Eliminar la categoría “${c.name}”?`)) return;
    setBusy(c.id);
    setError(null);
    const { error } = await createClient().from("categories").delete().eq("id", c.id);
    setBusy(null);
    if (error) return setError(dbErrorMessage(error));
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Categorías</h1>
        <p className="text-muted">
          Clasifica tus movimientos.
          {customLimit >= 0 && ` Personalizadas: ${customUsed} de ${customLimit}.`}
        </p>
      </header>

      {canEdit && (
        <form onSubmit={add} className="space-y-4 rounded-2xl border border-border bg-surface p-5" noValidate>
          <h2 className="font-semibold">Nueva categoría</h2>
          {atLimit && <p className="rounded-xl bg-brand-soft px-4 py-3 text-sm">Llegaste al límite de categorías personalizadas de tu plan gratuito.</p>}
          {error && <Alert>{error}</Alert>}
          <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
            <Field label="Nombre" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="Ej. Mascotas" />
            <div className="space-y-1.5">
              <label htmlFor="ctype" className="text-sm font-medium">
                Tipo
              </label>
              <select
                id="ctype"
                value={type}
                onChange={(e) => setType(e.target.value as "ingreso" | "gasto")}
                className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-base focus:border-brand focus:ring-2 focus:ring-brand/25"
              >
                <option value="gasto">Gasto</option>
                <option value="ingreso">Ingreso</option>
              </select>
            </div>
            <Button type="submit" loading={busy === "add"} disabled={atLimit || busy !== null}>
              Agregar
            </Button>
          </div>
        </form>
      )}

      {!canEdit && error && <Alert>{error}</Alert>}

      <div className="grid gap-4 md:grid-cols-2">
        {(["gasto", "ingreso"] as const).map((t) => (
          <section key={t} className="rounded-2xl border border-border bg-surface" aria-label={t === "gasto" ? "Categorías de gasto" : "Categorías de ingreso"}>
            <h2 className="border-b border-border px-4 py-3 font-semibold">{t === "gasto" ? "Gastos" : "Ingresos"}</h2>
            <ul className="divide-y divide-border">
              {categories
                .filter((c) => c.type === t)
                .map((c) => (
                  <li key={c.id} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="flex-1 truncate">{c.name}</span>
                    {c.is_default ? (
                      <span className="rounded-full bg-border px-2 py-0.5 text-[10px] font-medium text-muted">Sugerida</span>
                    ) : (
                      canEdit && (
                        <button
                          type="button"
                          onClick={() => remove(c)}
                          disabled={busy === c.id}
                          aria-label={`Eliminar ${c.name}`}
                          className="grid size-8 place-items-center rounded-lg text-muted hover:bg-danger-soft hover:text-danger disabled:opacity-50"
                        >
                          <Trash2 className="size-4" aria-hidden />
                        </button>
                      )
                    )}
                  </li>
                ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
