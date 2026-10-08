import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Hourglass } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Logo } from "@/components/ui";
import { SignOut } from "@/components/app-nav";

export const metadata: Metadata = { title: "Cuenta pendiente de activación" };

export default async function CuentaInactivaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("is_active").eq("id", user.id).single();
  if (profile?.is_active) redirect("/dashboard");

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-5 px-6 text-center">
      <Logo />
      <span className="grid size-14 place-items-center rounded-full bg-brand-soft text-brand">
        <Hourglass className="size-7" aria-hidden />
      </span>
      <h1 className="text-2xl font-semibold tracking-tight">Tu cuenta aún no está activa</h1>
      <p className="text-muted">
        El administrador debe activar tu acceso. Si ya lo solicitaste, vuelve a intentarlo más tarde; si tu cuenta fue
        desactivada, comunícate con el administrador.
      </p>
      <SignOut />
    </div>
  );
}
