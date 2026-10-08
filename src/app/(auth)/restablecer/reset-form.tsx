"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Alert, Button, Field, PasswordStrength, passwordScore } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { authErrorMessage } from "@/lib/auth-errors";

const schema = z
  .object({
    password: z
      .string()
      .min(8, "Mínimo 8 caracteres")
      .refine((v) => passwordScore(v) >= 2, "Agrega mayúsculas, minúsculas y números"),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Las contraseñas no coinciden" });
type Values = z.infer<typeof schema>;

export function ResetForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema) });
  const password = useWatch({ control, name: "password" });

  async function onSubmit({ password }: Values) {
    setError(null);
    const { error } = await createClient().auth.updateUser({ password });
    if (error) return setError(authErrorMessage(error.message));
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {error && <Alert>{error}</Alert>}
      <div className="space-y-2">
        <Field label="Contraseña nueva" type="password" autoComplete="new-password" error={errors.password?.message} {...register("password")} />
        <PasswordStrength value={password ?? ""} />
      </div>
      <Field label="Repite la contraseña" type="password" autoComplete="new-password" error={errors.confirm?.message} {...register("confirm")} />
      <Button type="submit" className="w-full" loading={isSubmitting}>
        Guardar contraseña
      </Button>
    </form>
  );
}
