import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/sw-register";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "FinMentor · Finanzas en tu bolsillo", template: "%s · FinMentor" },
  description: "Controla tus ingresos, gastos, flujo de caja e impuestos en Ecuador. Para personas y empresas.",
  applicationName: "FinMentor",
  appleWebApp: { capable: true, title: "FinMentor", statusBarStyle: "default" },
  openGraph: {
    type: "website",
    locale: "es_EC",
    siteName: "FinMentor",
    title: "FinMentor · Finanzas en tu bolsillo",
    description: "Ingresos, gastos, flujo de caja, presupuestos e impuestos de Ecuador, en dólares.",
    images: [{ url: "/logo.jpg", width: 1024, height: 478, alt: "FinMentor – Finanzas en tu bolsillo" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0f6f6c" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1512" },
  ],
};

// Aplica el tema elegido (Ajustes → Apariencia) antes de pintar, para evitar un destello del tema equivocado.
const themeScript = `try{var t=localStorage.getItem("fm-theme");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-EC" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
