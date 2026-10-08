import type { MetadataRoute } from "next";

const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = [
    { path: "", priority: 1 },
    { path: "/registro", priority: 0.8 },
    { path: "/login", priority: 0.5 },
    { path: "/terminos", priority: 0.2 },
    { path: "/privacidad", priority: 0.2 },
  ];
  return pages.map((p) => ({ url: `${base}${p.path}`, changeFrequency: "monthly", priority: p.priority }));
}
