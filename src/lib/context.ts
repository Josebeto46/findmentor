import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const ACTIVE_WORKSPACE_COOKIE = "fm_ws";

/** Usuario autenticado, su perfil y su espacio de trabajo activo. Redirige si falta algo. */
export const getAppContext = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: memberships, error: membershipsError }] = await Promise.all([
    supabase.from("profiles").select("full_name, email, platform_role, is_active").eq("id", user.id).single(),
    supabase
      .from("workspace_members")
      .select("role, workspaces(id, name, kind, status, access_expires_at, plan_id, ruc, legal_name, regime, iva_periodicity, tax_dependents, tax_employed, plans(name))")
      .eq("user_id", user.id)
      .order("created_at"),
  ]);

  // Un fallo de lectura NO es "sin espacio": no mandar al onboarding, mostrar el error.
  if (membershipsError) throw new Error(`No se pudo cargar tu espacio de trabajo: ${membershipsError.message}`);

  // Cuenta pendiente de activación o desactivada por el Administrador
  if (profile && !profile.is_active) redirect("/cuenta-inactiva");

  // Espacio activo: el elegido en la cookie (solo si realmente pertenece al usuario) o el más antiguo.
  const wanted = (await cookies()).get(ACTIVE_WORKSPACE_COOKIE)?.value;
  const all = (memberships ?? []).filter((m) => m.workspaces);
  const active = all.find((m) => m.workspaces?.id === wanted) ?? all[0] ?? null;

  return {
    supabase,
    user,
    profile,
    workspace: active?.workspaces ?? null,
    role: active?.role ?? null,
    workspaces: all.map((m) => ({ id: m.workspaces!.id, name: m.workspaces!.name, kind: m.workspaces!.kind })),
  };
});

/** Igual que getAppContext pero exige tener un espacio de trabajo (si no, va al onboarding). */
export async function requireWorkspace() {
  const ctx = await getAppContext();
  // Un Administrador sin espacio propio entra directo a su panel; los demás configuran su cuenta.
  if (!ctx.workspace) redirect(ctx.profile?.platform_role === "admin" ? "/admin" : "/onboarding");
  return { ...ctx, workspace: ctx.workspace };
}

/** Exige rol Administrador de la plataforma (si no, vuelve al panel). */
export async function requireAdmin() {
  const ctx = await getAppContext();
  if (ctx.profile?.platform_role !== "admin") redirect("/dashboard");
  return ctx;
}
