import { NextResponse, type NextRequest } from "next/server";
import { requireWorkspace } from "@/lib/context";
import { csvNum, csvResponse, csvText } from "@/lib/csv";
import { monthRange, parseMonth } from "@/lib/format";

/** Movimientos del mes (con los mismos filtros de la lista) en CSV. Requiere "exportar" en el plan. */
export async function GET(request: NextRequest) {
  const { supabase, workspace } = await requireWorkspace();
  const sp = request.nextUrl.searchParams;
  const month = parseMonth(sp.get("mes") ?? undefined);
  const tipo = sp.get("tipo") === "ingreso" || sp.get("tipo") === "gasto" ? (sp.get("tipo") as "ingreso" | "gasto") : undefined;
  const q = (sp.get("q") ?? "").trim().slice(0, 60);

  const { data: flag } = await supabase.from("plan_limits").select("value").eq("plan_id", workspace.plan_id).eq("key", "exportar").maybeSingle();
  if ((flag?.value ?? 0) === 0) return new NextResponse("La exportación no está incluida en tu plan.", { status: 403 });

  const { from, to } = monthRange(month);
  let query = supabase
    .from("transactions")
    .select("occurred_on, type, description, doc_number, base_amount, tax_amount, total, withheld_amount, payment_status, due_date, categories(name), accounts(name), contacts(name, tax_id)")
    .eq("workspace_id", workspace.id)
    .gte("occurred_on", from)
    .lt("occurred_on", to)
    .order("occurred_on")
    .limit(5000);
  if (tipo) query = query.eq("type", tipo);
  if (q) query = query.ilike("description", `%${q.replace(/[%_\\]/g, "\\$&")}%`);
  const { data } = await query;

  const head = ["Fecha", "Tipo", "Descripción", "Categoría", "Cuenta", "Tercero", "Identificación", "Comprobante", "Base", "IVA", "Total", "Retención", "Estado", "Vence"];
  const lines = (data ?? []).map((r) =>
    [
      r.occurred_on,
      r.type === "ingreso" ? "Ingreso" : "Gasto",
      csvText(r.description),
      csvText(r.categories?.name),
      csvText(r.accounts?.name),
      csvText(r.contacts?.name),
      csvText(r.contacts?.tax_id),
      csvText(r.doc_number),
      csvNum(Number(r.base_amount)),
      csvNum(Number(r.tax_amount)),
      csvNum(Number(r.total)),
      csvNum(Number(r.withheld_amount)),
      r.payment_status === "pagado" ? "Pagado" : "Pendiente",
      r.due_date ?? "",
    ].join(";"),
  );
  return csvResponse(`movimientos-${month}${tipo ? `-${tipo}s` : ""}.csv`, head, lines);
}
