"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { MailCheck } from "lucide-react";
import { Alert, Button, Field } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { authErrorMessage } from "@/lib/auth-errors";

const schema = z.object({ email: z.string().min(1, "Ingresa tu correo").email("Correo no válido") });
type Values = z.infer<typeof schema>;

export function RecoverForm() {
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  async function onSubmit({ email }: Values) {
    setError(null);
    const { error } = await createClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}/auth/callback?next=/restablecer`,
    });
    if (error) return setError(authErrorMessage(error.message));
    setSent(true);
  }

  if (sent) {
    return (
      <div className="space-y-4 rounded-2xl border border-border bg-surface p-6 text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-brand-soft text-brand">
          <MailCheck className="size-6" aria-hidden />
        </span>
        <p className="text-muted">Si el correo está registrado, recibirás un enlace en unos minutos.</p>
        <Link href="/login" className="text-sm font-semibold text-brand hover:underline">
          Volver a iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {error && <Alert>{error}</Alert>}
      <Field label="Correo electrónico" type="email" autoComplete="email" inputMode="email" error={errors.email?.message} {...register("email")} />
      <Button type="submit" className="w-full" loading={isSubmitting}>
        Enviar enlace
      </Button>
      <p className="text-center text-sm">
        <Link href="/login" className="font-medium text-brand hover:underline">
          Volver
        </Link>
      </p>
    </form>
  );
}
