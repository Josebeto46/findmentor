import Link from "next/link";
import { Compass } from "lucide-react";
import { Logo } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-5 px-6 text-center">
      <Logo />
      <span className="grid size-14 place-items-center rounded-full bg-brand-soft text-brand">
        <Compass className="size-7" aria-hidden />
      </span>
      <h1 className="text-2xl font-semibold tracking-tight">No encontramos esa página</h1>
      <p className="text-muted">Puede que el enlace esté mal escrito o que ya no exista.</p>
      <Link href="/dashboard" className="inline-flex h-11 items-center rounded-xl bg-brand px-5 text-sm font-semibold text-brand-fg hover:brightness-110">
        Ir a mi panel
      </Link>
    </main>
  );
}
