import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED = ["/dashboard", "/onboarding", "/admin", "/cuenta-inactiva", "/movimientos", "/cuentas", "/categorias", "/contactos", "/mas", "/flujo-de-caja", "/impuestos", "/espacios", "/presupuestos", "/recurrentes", "/ajustes", "/equipo"];
const AUTH_PAGES = ["/login", "/registro", "/recuperar"];

const matches = (path: string, prefixes: string[]) =>
  prefixes.some((p) => path === p || path.startsWith(`${p}/`));

/** Refresca la sesión de Supabase y aplica redirecciones optimistas (la autorización real es RLS). */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(list) {
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const redirectTo = (to: string, search = "") => {
    const url = request.nextUrl.clone();
    url.pathname = to;
    url.search = search;
    const redirect = NextResponse.redirect(url);
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  };

  if (!user && matches(path, PROTECTED)) {
    return redirectTo("/login", `?next=${encodeURIComponent(path)}`);
  }
  if (user && matches(path, AUTH_PAGES)) {
    return redirectTo("/dashboard");
  }
  return response;
}
