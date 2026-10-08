import type { Metadata } from "next";
import { requireWorkspace } from "@/lib/context";
import { CategoriesManager } from "./categories-manager";

export const metadata: Metadata = { title: "Categorías" };

export default async function CategoriasPage() {
  const { supabase, workspace, role } = await requireWorkspace();
  const [{ data: categories }, { data: usage }] = await Promise.all([
    supabase.from("categories").select("id, name, type, is_default").eq("workspace_id", workspace.id).order("name"),
    supabase.rpc("workspace_usage", { ws: workspace.id }),
  ]);
  const custom = usage?.find((u) => u.key === "max_categorias");

  return (
    <CategoriesManager
      workspaceId={workspace.id}
      canEdit={role !== "lector"}
      categories={categories ?? []}
      customUsed={custom?.used ?? 0}
      customLimit={custom?.limit ?? -1}
    />
  );
}
