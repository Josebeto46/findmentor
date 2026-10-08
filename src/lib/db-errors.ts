const LIMIT_LABELS: Record<string, string> = {
  max_transacciones_mes: "transacciones de este mes",
  max_cuentas: "cuentas",
  max_categorias: "categorías personalizadas",
  max_miembros: "usuarios",
};

/** Convierte errores de Postgres/Supabase en mensajes comprensibles. */
export function dbErrorMessage(error: { message: string; code?: string }): string {
  const limit = /LIMIT_EXCEEDED:(\w+)/.exec(error.message);
  if (limit) {
    return `Llegaste al límite de ${LIMIT_LABELS[limit[1]] ?? "tu plan"} del plan gratuito. Elimina alguno o mejora tu plan para continuar.`;
  }
  const known = [
    "Esa persona ya es miembro del espacio",
    "Solo los espacios de empresa admiten más usuarios",
    "No se puede quitar ni cambiar al propietario del espacio",
  ].find((k) => error.message.includes(k));
  if (known) return `${known}.`;
  if (error.code === "23505" && error.message.includes("workspace_invitations")) return "Ya hay una invitación pendiente para ese correo.";
  if (error.code === "23503") return "No se puede eliminar porque tiene movimientos asociados.";
  if (error.code === "42501" || /row-level security/i.test(error.message)) return "No se pudo guardar: no tienes permiso, o el acceso de este espacio está vencido o suspendido.";
  return "No se pudo guardar. Inténtalo de nuevo.";
}
