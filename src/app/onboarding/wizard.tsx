"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { clsx } from "clsx";
import { ArrowLeft, Building2, Check, User } from "lucide-react";
import { Alert, Button, Field } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { isValidEcuadorId } from "@/lib/ec-tax-id";
import type { Database } from "@/lib/database.types";

type Kind = "personal" | "empresa";
type Regime = Database["public"]["Enums"]["tax_regime"];
export type PlanSummary = { name: string; limits: Record<string, number> };

const REGIMES: { value: Regime; label: string }[] = [
  { value: "general", label: "Régimen general" },
  { value: "rimpe_emprendedor", label: "RIMPE – Emprendedor" },
  { value: "rimpe_negocio_popular", label: "RIMPE – Negocio popular" },
];

const limitText = (v: number, singular: string, plural: string) =>
  v < 0 ? `${plural} ilimitados` : `${v} ${v === 1 ? singular : plural}`;

export function OnboardingWizard({
  firstName,
  plans,
  hasPersonal = false,
}: {
  firstName?: string;
  plans: Partial<Record<Kind, PlanSummary>>;
  hasPersonal?: boolean;
}) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [kind, setKind] = useState<Kind | null>(null);
  const [name, setName] = useState("");
  const [ruc, setRuc] = useState("");
  const [regime, setRegime] = useState<Regime>("general");
  const [errors, setErrors] = useState<{ name?: string; ruc?: string }>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const plan = kind ? plans[kind] : undefined;

  function pickKind(k: Kind) {
    setKind(k);
    setName((n) => n || (k === "personal" ? "Mis finanzas" : ""));
    setStep(2);
  }

  function validateDetails() {
    const e: typeof errors = {};
    if (name.trim().length < 2) e.name = kind === "empresa" ? "Ingresa el nombre de tu empresa" : "Ponle un nombre a tu espacio";
    if (ruc && !isValidEcuadorId(ruc)) e.ruc = "RUC o cédula no válidos. Verifica los dígitos.";
    setErrors(e);
    if (Object.keys(e).length === 0) setStep(3);
  }

  async function finish() {
    if (!kind) return;
    setLoading(true);
    setSubmitError(null);
    const { data: newId, error } = await createClient().rpc("create_workspace", {
      p_name: name.trim(),
      p_kind: kind,
      p_ruc: ruc || undefined,
      p_legal_name: kind === "empresa" ? name.trim() : undefined,
      p_regime: kind === "empresa" ? regime : undefined,
    });
    if (error) {
      setLoading(false);
      return setSubmitError(
        error.message.includes("Ya tienes un espacio")
          ? "Ya tienes un espacio personal creado."
          : "No pudimos crear tu espacio. Inténtalo de nuevo.",
      );
    }
    // El espacio recién creado pasa a ser el activo.
    if (newId) {
      const fd = new FormData();
      fd.set("id", newId);
      await fetch("/espacios/activar", { method: "POST", body: fd }).catch(() => {});
    }
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <nav aria-label="Progreso" className="flex items-center gap-2">
        {[1, 2, 3].map((n) => (
          <span key={n} className={clsx("h-1.5 flex-1 rounded-full transition", n <= step ? "bg-brand" : "bg-border")} />
        ))}
        <span className="ml-2 text-sm text-muted">Paso {step} de 3</span>
      </nav>

      {step === 1 && (
        <section className="space-y-6">
          <header className="space-y-1.5">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {firstName ? `¡Hola, ${firstName}!` : "¡Bienvenido!"} ¿Para qué usarás FinMentor?
            </h1>
            <p className="text-muted">Así prepararemos categorías y reportes a tu medida. Podrás cambiarlo después.</p>
          </header>
          <div className="grid gap-4 sm:grid-cols-2">
            {!hasPersonal && (
              <KindCard
                icon={<User className="size-6" />}
                title="Mis finanzas personales"
                text="Ingresos, gastos, ahorro y gastos deducibles de tu impuesto a la renta."
                onClick={() => pickKind("personal")}
              />
            )}
            <KindCard
              icon={<Building2 className="size-6" />}
              title="Mi negocio o empresa"
              text="Ventas, compras, IVA, retenciones y flujo de caja de tu negocio."
              onClick={() => pickKind("empresa")}
            />
          </div>
        </section>
      )}

      {step === 2 && kind && (
        <section className="space-y-6">
          <BackButton onClick={() => setStep(1)} />
          <header className="space-y-1.5">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {kind === "empresa" ? "Cuéntanos sobre tu negocio" : "Dale un nombre a tu espacio"}
            </h1>
            <p className="text-muted">
              {kind === "empresa" ? "El RUC es opcional; puedes agregarlo cuando quieras." : "Por ejemplo: “Mis finanzas” o “Presupuesto familiar”."}
            </p>
          </header>
          <div className="space-y-4">
            <Field
              label={kind === "empresa" ? "Nombre o razón social" : "Nombre del espacio"}
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={errors.name}
              autoFocus
            />
            <Field
              label={kind === "empresa" ? "RUC (opcional)" : "Cédula o RUC (opcional)"}
              value={ruc}
              onChange={(e) => setRuc(e.target.value.replace(/\D/g, "").slice(0, 13))}
              inputMode="numeric"
              placeholder={kind === "empresa" ? "1790012345001" : "1712345678"}
              hint="Lo usamos para tus recordatorios de declaración según el noveno dígito."
              error={errors.ruc}
            />
            {kind === "empresa" && (
              <div className="space-y-1.5">
                <label htmlFor="regime" className="text-sm font-medium">
                  Régimen tributario
                </label>
                <select
                  id="regime"
                  value={regime}
                  onChange={(e) => setRegime(e.target.value as Regime)}
                  className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-base focus:border-brand focus:ring-2 focus:ring-brand/25"
                >
                  {REGIMES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <Button className="w-full sm:w-auto" onClick={validateDetails}>
            Continuar
          </Button>
        </section>
      )}

      {step === 3 && kind && (
        <section className="space-y-6">
          <BackButton onClick={() => setStep(2)} />
          <header className="space-y-1.5">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Todo listo, {name.trim()}</h1>
            <p className="text-muted">Empiezas con el plan gratuito. Sin tarjeta y sin fecha de vencimiento.</p>
          </header>
          <div className="space-y-3 rounded-2xl border border-border bg-surface p-5">
            <p className="font-semibold">{plan?.name ?? "Plan gratuito"}</p>
            <ul className="space-y-2 text-sm">
              {plan && (
                <>
                  <Included>{limitText(plan.limits.max_transacciones_mes ?? -1, "transacción", "transacciones")} al mes</Included>
                  <Included>{limitText(plan.limits.max_cuentas ?? -1, "cuenta", "cuentas")} (efectivo, banco, tarjeta)</Included>
                  {kind === "empresa" && <Included>{limitText(plan.limits.max_miembros ?? -1, "usuario", "usuarios")} en tu equipo</Included>}
                </>
              )}
              <Included>Categorías sugeridas ya listas</Included>
              <Included>{kind === "empresa" ? "IVA y retenciones del SRI" : "Seguimiento de gastos deducibles"}</Included>
            </ul>
          </div>
          {submitError && <Alert>{submitError}</Alert>}
          <Button className="w-full sm:w-auto" loading={loading} onClick={finish}>
            Entrar a FinMentor
          </Button>
        </section>
      )}
    </div>
  );
}

function KindCard({ icon, title, text, onClick }: { icon: React.ReactNode; title: string; text: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group space-y-3 rounded-2xl border border-border bg-surface p-5 text-left transition hover:border-brand hover:shadow-sm"
    >
      <span className="grid size-11 place-items-center rounded-xl bg-brand-soft text-brand">{icon}</span>
      <span className="block text-lg font-semibold">{title}</span>
      <span className="block text-sm text-muted">{text}</span>
    </button>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-foreground">
      <ArrowLeft className="size-4" aria-hidden /> Atrás
    </button>
  );
}

function Included({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2">
      <Check className="size-4 shrink-0 text-brand" aria-hidden /> {children}
    </li>
  );
}
