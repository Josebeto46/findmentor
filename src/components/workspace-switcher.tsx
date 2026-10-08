import { Building2, Check, User } from "lucide-react";
import { clsx } from "clsx";

type Item = { id: string; name: string; kind: "personal" | "empresa" };

/** Lista de espacios del usuario; el activo va marcado. Solo se muestra si hay más de uno. */
export function WorkspaceSwitcher({ items, activeId, className }: { items: Item[]; activeId: string; className?: string }) {
  if (items.length < 2) return null;
  return (
    <ul className={clsx("space-y-1", className)} aria-label="Mis espacios">
      {items.map((w) => {
        const Icon = w.kind === "empresa" ? Building2 : User;
        const active = w.id === activeId;
        return (
          <li key={w.id}>
            <form action="/espacios/activar" method="post">
              <input type="hidden" name="id" value={w.id} />
              <button
                type="submit"
                disabled={active}
                aria-current={active ? "true" : undefined}
                className={clsx(
                  "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm transition",
                  active ? "bg-brand-soft font-medium text-brand" : "text-foreground/80 hover:bg-brand-soft/60",
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden />
                <span className="min-w-0 flex-1 truncate">{w.name}</span>
                {active && <Check className="size-4 shrink-0" aria-hidden />}
              </button>
            </form>
          </li>
        );
      })}
    </ul>
  );
}
