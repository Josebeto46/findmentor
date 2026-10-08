import Link from "next/link";
import type { ReactNode } from "react";
import { TriangleAlert } from "lucide-react";

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-12">
      <Link href="/" className="text-sm font-medium text-brand hover:underline">
        ← Volver
      </Link>
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-muted">Última actualización: {updated}</p>
      </header>
      <p role="note" className="flex gap-2.5 rounded-xl border border-warn/40 bg-warn/10 px-4 py-3 text-sm text-warn">
        <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
        <span>
          <strong>Borrador pendiente de revisión legal.</strong> Complete los datos entre corchetes y haga que un abogado lo revise antes de publicar la aplicación.
        </span>
      </p>
      <div className="space-y-6 leading-relaxed [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_p]:text-foreground/90 [&_ul]:space-y-1">{children}</div>
    </main>
  );
}
