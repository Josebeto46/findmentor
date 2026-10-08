import Link from "next/link";
import { ArrowRight, Building2, Landmark, LineChart, User } from "lucide-react";
import { Logo } from "@/components/ui";
import { LogoFull } from "@/components/logo";

const features = [
  { icon: User, title: "Personal", text: "Ordena tus ingresos y gastos y controla lo que puedes deducir en tu impuesto a la renta." },
  { icon: Building2, title: "Empresarial", text: "Ventas, compras, clientes y proveedores con IVA y retenciones del SRI." },
  { icon: LineChart, title: "Flujo de caja", text: "Sabe cuánto tienes hoy y cuánto tendrás en 30, 60 y 90 días." },
  { icon: Landmark, title: "Impuestos", text: "Recordatorios de declaración según tu RUC y resumen listo para tu contador." },
];

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-8">
        <Logo />
        <nav className="flex items-center gap-2">
          <Link href="/login" className="rounded-xl px-4 py-2 text-sm font-medium hover:bg-brand-soft">
            Iniciar sesión
          </Link>
          <Link href="/registro" className="hidden rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-brand-fg sm:block">
            Crear cuenta
          </Link>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 sm:px-8">
        <section className="grid items-center gap-10 py-12 sm:py-20 lg:grid-cols-2">
          <div>
            <h1 className="max-w-xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
              Tus finanzas en orden, sin complicarte.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted">
              Controla ingresos, gastos, flujo de caja e impuestos en dólares. Hecho para personas y negocios de Ecuador.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/registro" className="inline-flex h-12 items-center gap-2 rounded-xl bg-brand px-6 font-semibold text-brand-fg hover:brightness-110">
                Empezar gratis <ArrowRight className="size-4" aria-hidden />
              </Link>
              <Link href="/login" className="inline-flex h-12 items-center rounded-xl border border-border bg-surface px-6 font-semibold hover:bg-brand-soft">
                Ya tengo cuenta
              </Link>
            </div>
          </div>
          <LogoFull priority className="shadow-sm ring-1 ring-border" />
        </section>

        <section className="grid gap-4 pb-20 sm:grid-cols-2 lg:grid-cols-4" aria-label="Qué incluye">
          {features.map(({ icon: Icon, title, text }) => (
            <div key={title} className="space-y-3 rounded-2xl border border-border bg-surface p-5">
              <span className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand">
                <Icon className="size-5" aria-hidden />
              </span>
              <h2 className="font-semibold">{title}</h2>
              <p className="text-sm text-muted">{text}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-border px-4 py-6 text-center text-sm text-muted">
        © {new Date().getFullYear()} FinMentor · Herramienta de apoyo; no sustituye tu declaración oficial en el SRI.
      </footer>
    </div>
  );
}
