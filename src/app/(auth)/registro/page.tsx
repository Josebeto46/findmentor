import type { Metadata } from "next";
import { AuthShell } from "@/components/auth-shell";
import { RegisterForm } from "./register-form";
import { safeNext } from "@/lib/auth-errors";

export const metadata: Metadata = { title: "Crear cuenta" };

export default async function RegistroPage({ searchParams }: PageProps<"/registro">) {
  const sp = await searchParams;
  const next = safeNext(typeof sp.next === "string" ? sp.next : null, "/onboarding");
  return (
    <AuthShell title="Crea tu cuenta gratis" subtitle="Toma menos de un minuto. No necesitas tarjeta.">
      <RegisterForm next={next} />
    </AuthShell>
  );
}
