import type { Metadata } from "next";
import { WifiOff } from "lucide-react";
import { Logo } from "@/components/ui";

export const metadata: Metadata = { title: "Sin conexión", robots: { index: false } };

export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-5 px-6 text-center">
      <Logo />
      <span className="grid size-14 place-items-center rounded-full bg-brand-soft text-brand">
        <WifiOff className="size-7" aria-hidden />
      </span>
      <h1 className="text-2xl font-semibold tracking-tight">Sin conexión</h1>
      <p className="text-muted">No pudimos conectarnos a internet. Tus datos están a salvo; vuelve a intentarlo cuando recuperes la señal.</p>
    </main>
  );
}
