/** Traduce errores de Supabase Auth a mensajes claros en español. */
export function authErrorMessage(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "Correo o contraseña incorrectos.";
  if (m.includes("email not confirmed")) return "Aún no confirmas tu correo. Revisa tu bandeja de entrada.";
  if (m.includes("already registered") || m.includes("already been registered")) return "Ya existe una cuenta con este correo. Inicia sesión.";
  if (m.includes("password should be")) return "La contraseña es demasiado débil. Usa al menos 8 caracteres.";
  if (m.includes("rate limit") || m.includes("too many")) return "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.";
  if (m.includes("network") || m.includes("fetch")) return "No hay conexión. Revisa tu internet e inténtalo de nuevo.";
  return "Ocurrió un error inesperado. Inténtalo de nuevo.";
}

/** Solo rutas internas, para evitar redirecciones abiertas. */
export function safeNext(next: string | null | undefined, fallback = "/dashboard") {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}
