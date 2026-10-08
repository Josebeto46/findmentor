import type { MetadataRoute } from "next";

const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/registro", "/login", "/terminos", "/privacidad"],
        // Todo lo que requiere sesión o es operativo queda fuera de los buscadores
        disallow: ["/admin", "/dashboard", "/movimientos", "/cuentas", "/categorias", "/contactos", "/equipo", "/flujo-de-caja", "/presupuestos", "/recurrentes", "/impuestos", "/ajustes", "/mas", "/onboarding", "/invitacion", "/auth", "/espacios", "/cuenta-inactiva", "/restablecer", "/recuperar", "/offline"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
