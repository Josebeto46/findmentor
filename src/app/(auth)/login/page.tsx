import type { Metadata } from "next";
import { AuthShell } from "@/components/auth-shell";
import { LoginForm } from "./login-form";
import { safeNext } from "@/lib/auth-errors";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const next = safeNext(typeof sp.next === "string" ? sp.next : null);
  const linkError = sp.error === "enlace";

  return (
    <AuthShell title="Bienvenido de nuevo" subtitle="Ingresa para ver tus finanzas.">
      <LoginForm next={next} linkError={linkError} />
    </AuthShell>
  );
}
