import type { Metadata } from "next";
import { AuthShell } from "@/components/auth-shell";
import { RecoverForm } from "./recover-form";

export const metadata: Metadata = { title: "Recuperar contraseña" };

export default function RecuperarPage() {
  return (
    <AuthShell title="Recupera tu acceso" subtitle="Te enviaremos un enlace para crear una contraseña nueva.">
      <RecoverForm />
    </AuthShell>
  );
}
