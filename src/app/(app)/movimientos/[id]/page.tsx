import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireWorkspace } from "@/lib/context";
import { loadFormCatalogs } from "@/lib/catalogs";
import { getAttachmentLimitMb } from "@/lib/attachments";
import { TransactionForm } from "../transaction-form";

export const metadata: Metadata = { title: "Editar movimiento" };

export default async function EditarMovimientoPage({ params }: PageProps<"/movimientos/[id]">) {
  const { id } = await params;
  const { supabase, workspace, role } = await requireWorkspace();
  if (role === "lector") redirect("/movimientos");

  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { data: tx } = await supabase.from("transactions").select("*").eq("id", id).eq("workspace_id", workspace.id).maybeSingle();
  if (!tx) notFound();

  const [catalogs, attachmentLimitMb] = await Promise.all([loadFormCatalogs(supabase, workspace.id), getAttachmentLimitMb(supabase, workspace.plan_id)]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href={`/movimientos?mes=${tx.occurred_on.slice(0, 7)}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden /> Movimientos
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">Editar movimiento</h1>
      <TransactionForm workspaceId={workspace.id} workspaceKind={workspace.kind} catalogs={catalogs} initial={tx} attachmentLimitMb={attachmentLimitMb} />
    </div>
  );
}
