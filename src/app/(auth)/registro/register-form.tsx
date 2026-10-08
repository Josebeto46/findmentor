"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { MailCheck } from "lucide-react";
import { Alert, Button, Field, PasswordStrength, passwordScore } from "@/components/ui";
import { GoogleButton, OrDivider } from "@/components/google-button";
import { createClient } from "@/lib/supabase/client";
import { authErrorMessage } from "@/lib/auth-errors";

const schema = z.object({
  full_name: z.string().trim().min(2, "Ingresa tu nombre"),
  email: z.string().min(1, "Ingresa tu correo").email("Correo no válido"),
  password: z
    .string()
    .min(8, "Mínimo 8 caracteres")
    .refine((v) => passwordScore(v) >= 2, "Agrega mayúsculas, minúsculas y números"),
  terms: z.literal(true, { error: "Debes aceptar los términos para continuar" }),
});
type Values = z.infer<typeof schema>;

export function RegisterForm({ next = "/onboarding" }: { next?: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [resent, setResent] = useState(false);
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema) });
  const password = useWatch({ control, name: "password" });

  const redirectTo = () => `${location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

  async function onSubmit(v: Values) {
    setError(null);
    const { data, error } = await createClient().auth.signUp({
      email: v.email,
      password: v.password,
      options: { data: { full_name: v.full_name }, emailRedirectTo: redirectTo() },
    });
    if (error) return setError(authErrorMessage(error.message));
    // Con protección anti-enumeración, un correo ya registrado devuelve un usuario sin identidades.
    if (data.user && data.user.identities?.length === 0) {
      return setError(authErrorMessage("already registered"));
    }
    if (data.session) {
      router.replace(next);
      router.refresh();
    } else {
      setSentTo(v.email);
    }
  }

  async function resend() {
    if (!sentTo) return;
    await createClient().auth.resend({ type: "signup", email: sentTo, options: { emailRedirectTo: redirectTo() } });
    setResent(true);
  }

  if (sentTo) {
    return (
      <div className="space-y-4 rounded-2xl border border-border bg-surface p-6 text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-brand-soft text-brand">
          <MailCheck className="size-6" aria-hidden />
        </span>
        <h2 className="text-lg font-semibold">Revisa tu correo</h2>
        <p className="text-muted">
          Enviamos un enlace de confirmación a <strong className="text-foreground">{sentTo}</strong>. Ábrelo para
          continuar con la configuración de tu cuenta.
        </p>
        <Button variant="secondary" onClick={resend} disabled={resent}>
          {resent ? "Enlace reenviado" : "Reenviar correo"}
        </Button>
        <p className="text-xs text-muted">¿No lo ves? Revisa la carpeta de spam.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <GoogleButton next={next} label="Registrarme con Google" />
      <OrDivider />
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {error && <Alert>{error}</Alert>}
        <Field label="Nombre completo" autoComplete="name" placeholder="María Pérez" error={errors.full_name?.message} {...register("full_name")} />
        <Field label="Correo electrónico" type="email" autoComplete="email" inputMode="email" placeholder="tu@correo.com" error={errors.email?.message} {...register("email")} />
        <div className="space-y-2">
          <Field label="Contraseña" type="password" autoComplete="new-password" hint="Mínimo 8 caracteres, con letras y números." error={errors.password?.message} {...register("password")} />
          <PasswordStrength value={password ?? ""} />
        </div>
        <div>
          <label className="flex items-start gap-2.5 text-sm">
            <input type="checkbox" className="mt-0.5 size-4 accent-[var(--brand)]" {...register("terms")} />
            <span>
              Acepto los <Link href="/terminos" className="font-medium text-brand hover:underline">términos</Link> y la{" "}
              <Link href="/privacidad" className="font-medium text-brand hover:underline">política de privacidad</Link>.
            </span>
          </label>
          {errors.terms && <p className="mt-1 text-sm text-danger">{errors.terms.message}</p>}
        </div>
        <Button type="submit" className="w-full" loading={isSubmitting}>
          Crear cuenta
        </Button>
      </form>
      <p className="text-center text-sm text-muted">
        ¿Ya tienes cuenta?{" "}
        <Link href={next === "/onboarding" ? "/login" : `/login?next=${encodeURIComponent(next)}`} className="font-semibold text-brand hover:underline">
          Inicia sesión
        </Link>
      </p>
    </div>
  );
}
