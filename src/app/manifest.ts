import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FinMentor · Finanzas en tu bolsillo",
    short_name: "FinMentor",
    description: "Ingresos, gastos, flujo de caja, presupuestos e impuestos de Ecuador.",
    lang: "es-EC",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f6f8f6",
    theme_color: "#0f6f6c",
    categories: ["finance", "business", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Nuevo movimiento", url: "/movimientos/nuevo", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Flujo de caja", url: "/flujo-de-caja", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
