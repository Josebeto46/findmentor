import type { Metadata } from "next";
import { requireAdmin } from "@/lib/context";
import { Logo } from "@/components/ui";
import { AdminNav } from "./admin-nav";

export const metadata: Metadata = { title: { default: "Administración", template: "%s · Administración" } };

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const { profile, workspace } = await requireAdmin();

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <AdminNav adminName={profile?.full_name ?? profile?.email ?? "Administrador"} logo={<Logo />} hasWorkspace={!!workspace} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-8 sm:py-10">{children}</main>
    </div>
  );
}
