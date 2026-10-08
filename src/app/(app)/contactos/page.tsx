import type { Metadata } from "next";
import { requireWorkspace } from "@/lib/context";
import { ContactsManager } from "./contacts-manager";

export const metadata: Metadata = { title: "Clientes y proveedores" };

export default async function ContactosPage() {
  const { supabase, workspace, role } = await requireWorkspace();
  const { data: contacts } = await supabase
    .from("contacts")
    .select("id, name, tax_id, kind, email, phone")
    .eq("workspace_id", workspace.id)
    .order("name");

  return <ContactsManager workspaceId={workspace.id} canEdit={role !== "lector"} contacts={contacts ?? []} />;
}
