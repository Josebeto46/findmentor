import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireWorkspace } from "@/lib/context";
import { loadFormCatalogs } from "@/lib/catalogs";
import { TransactionForm } from "../transaction-form";
import { getTxUsage } from "@/lib/usage";
import { getAttachmentLimitMb } from "@/lib/attachments";
import { TxUsageCard } from "@/components/tx-usage";

export const metadata: Metadata = { title: "Nuevo movimiento" };

export default async function NuevoMovimientoPage() {
  const { supabase, workspace, role } = await requireWorkspace();
  if (role === "lector") redirect("/movimientos");
  const [catalogs, usage, attachmentLimitMb] = await Promise.all([loadFormCatalogs(supabase, workspace.id), getTxUsage(workspace.id), getAttachmentLimitMb(supabase, workspace.plan_id)]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/movimientos" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden /> Movimientos
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">Nuevo movimiento</h1>
      <TxUsageCard usage={usage} />
      {usage.state !== "full" && <TransactionForm workspaceId={workspace.id} workspaceKind={workspace.kind} catalogs={catalogs} attachmentLimitMb={attachmentLimitMb} />}
    </div>
  );
}
