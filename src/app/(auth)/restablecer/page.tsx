import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { createClient } from "@/lib/supabase/server";
import { ResetForm } from "./reset-form";

export const metadata: Metadata = { title: "Nueva contraseña" };

export default async function RestablecerPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?error=enlace");

  return (
    <AuthShell title="Crea una contraseña nueva" subtitle="Elige una contraseña segura que no uses en otros sitios.">
      <ResetForm />
    </AuthShell>
  );
}
