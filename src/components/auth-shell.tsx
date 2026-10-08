import Link from "next/link";
import type { ReactNode } from "react";
import { CheckCircle2 } from "lucide-react";
import { Logo } from "@/components/ui";
import { LogoFull } from "@/components/logo";

const benefits = [
  "Ingresos y gastos en segundos, desde el celular",
  "IVA, retenciones y flujo de caja para Ecuador",
  "Plan gratuito para personas y empresas",
];

export function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      {/* Panel de marca: siempre claro para que el logo (fondo blanco) se vea igual en modo oscuro */}
      <aside className="hidden flex-col justify-between gap-10 bg-white p-12 text-[#10201c] lg:flex">
        <Link href="/" aria-label="Ir al inicio">
          <LogoFull priority />
        </Link>
        <ul className="space-y-3.5">
          {benefits.map((b) => (
            <li key={b} className="flex items-center gap-2.5 text-[#33433e]">
              <CheckCircle2 className="size-5 shrink-0 text-[#0f6f6c]" aria-hidden /> {b}
            </li>
          ))}
        </ul>
        <p className="text-sm text-[#5d6d68]">Hecho para Ecuador · USD</p>
      </aside>

      <main className="flex flex-col px-4 py-8 sm:px-8">
        <Link href="/" className="mb-8 self-start lg:hidden" aria-label="Inicio">
          <Logo />
        </Link>
        <div className="m-auto w-full max-w-md space-y-6">
          <header className="space-y-1.5">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            {subtitle && <p className="text-muted">{subtitle}</p>}
          </header>
          {children}
        </div>
      </main>
    </div>
  );
}
