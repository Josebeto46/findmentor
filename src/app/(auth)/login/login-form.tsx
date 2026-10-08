"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Alert, Button, Field } from "@/components/ui";
import { GoogleButton, OrDivider } from "@/components/google-button";
import { createClient } from "@/lib/supabase/client";
import { authErrorMessage } from "@/lib/auth-errors";

const schema = z.object({
  email: z.string().min(1, "Ingresa tu correo").email("Correo no válido"),
  password: z.string().min(1, "Ingresa tu contraseña"),
});
type Values = z.infer<typeof schema>;

export function LoginForm({ next, linkError }: { next: string; linkError: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(
    linkError ? "El enlace no es válido o ya expiró. Solicita uno nuevo." : null,
  );
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  async function onSubmit(values: Values) {
    setError(null);
    const { error } = await createClient().auth.signInWithPassword(values);
    if (error) return setError(authErrorMessage(error.message));
    router.replace(next);
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <GoogleButton next={next} />
      <OrDivider />
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {error && <Alert>{error}</Alert>}
        <Field label="Correo electrónico" type="email" autoComplete="email" inputMode="email" placeholder="tu@correo.com" error={errors.email?.message} {...register("email")} />
        <Field label="Contraseña" type="password" autoComplete="current-password" error={errors.password?.message} {...register("password")} />
        <div className="text-right">
          <Link href="/recuperar" className="text-sm font-medium text-brand hover:underline">
            ¿Olvidaste tu contraseña?
          </Link>
        </div>
        <Button type="submit" className="w-full" loading={isSubmitting}>
          Iniciar sesión
        </Button>
      </form>
      <p className="text-center text-sm text-muted">
        ¿Aún no tienes cuenta?{" "}
        <Link href={next === "/dashboard" ? "/registro" : `/registro?next=${encodeURIComponent(next)}`} className="font-semibold text-brand hover:underline">
          Crear cuenta gratis
        </Link>
      </p>
    </div>
  );
}
