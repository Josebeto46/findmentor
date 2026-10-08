import { NextResponse, type NextRequest } from "next/server";
import { requireWorkspace } from "@/lib/context";
import { csvNum as num, csvResponse, csvText as esc } from "@/lib/csv";
import { resolvePeriod } from "@/lib/tax";

/** CSV de ventas o compras de un período (separador ";" y decimales con coma, para Excel en español). */
export async function GET(request: NextRequest) {
  const { supabase, workspace } = await requireWorkspace();
  const sp = request.nextUrl.searchParams;
  const tipo = sp.get("tipo") === "compras" ? "compras" : "ventas";
  const period = resolvePeriod(sp.get("periodo") ?? undefined, workspace.iva_periodicity === "semestral" ? "semestral" : "mensual");

  const { data: flag } = await supabase.from("plan_limits").select("value").eq("plan_id", workspace.plan_id).eq("key", "exportar").maybeSingle();
  if ((flag?.value ?? 0) === 0) return new NextResponse("La exportación no está incluida en tu plan.", { status: 403 });

  const { data } = await supabase
    .from("transactions")
    .select("occurred_on, doc_number, description, base_amount, tax_amount, total, withheld_amount, payment_status, tax_rates(name), contacts(name, tax_id)")
    .eq("workspace_id", workspace.id)
    .eq("type", tipo === "ventas" ? "ingreso" : "gasto")
    .gte("occurred_on", period.from)
    .lt("occurred_on", period.to)
    .order("occurred_on")
    .limit(5000);

  const head = ["Fecha", "Comprobante", "Identificación", tipo === "ventas" ? "Cliente" : "Proveedor", "Descripción", "Base", "Tarifa IVA", "IVA", "Total", "Retención", "Estado"];
  const lines = (data ?? []).map((r) =>
    [
      r.occurred_on,
      esc(r.doc_number),
      esc(r.contacts?.tax_id),
      esc(r.contacts?.name),
      esc(r.description),
      num(Number(r.base_amount)),
      esc(r.tax_rates?.name ?? "Sin IVA"),
      num(Number(r.tax_amount)),
      num(Number(r.total)),
      num(Number(r.withheld_amount)),
      r.payment_status === "pagado" ? "Pagado" : "Pendiente",
    ].join(";"),
  );

  return csvResponse(`${tipo}-${period.key}.csv`, head, lines);
}
