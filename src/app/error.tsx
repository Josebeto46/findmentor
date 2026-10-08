"use client";

import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="grid size-14 place-items-center rounded-full bg-danger-soft text-danger">
        <TriangleAlert className="size-7" aria-hidden />
      </span>
      <h1 className="text-2xl font-semibold tracking-tight">Algo salió mal</h1>
      <p className="text-muted">No pudimos cargar esta página. Inténtalo de nuevo; si continúa, avisa al administrador.</p>
      <Button onClick={reset}>Reintentar</Button>
    </div>
  );
}
