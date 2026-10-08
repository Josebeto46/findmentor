import Link from "next/link";
import { Compass } from "lucide-react";

/** 404 dentro de la app (ya está dentro del <main> del diseño: no debe abrir otro). */
export default function AppNotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
      <span className="grid size-14 place-items-center rounded-full bg-brand-soft text-brand">
        <Compass className="size-7" aria-hidden />
      </span>
      <h1 className="text-2xl font-semibold tracking-tight">No encontramos eso</h1>
      <p className="text-muted">El elemento no existe, fue eliminado o pertenece a otro de tus espacios.</p>
      <Link href="/dashboard" className="inline-flex h-11 items-center rounded-xl bg-brand px-5 text-sm font-semibold text-brand-fg hover:brightness-110">
        Ir a mi panel
      </Link>
    </div>
  );
}
