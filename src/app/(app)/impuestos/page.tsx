import type { Metadata } from "next";
import { requireWorkspace } from "@/lib/context";
import { todayEC } from "@/lib/format";
import { CompanyView } from "./company-view";
import { PersonalView } from "./personal-view";
import { TaxDataForm } from "./tax-data-form";

export const metadata: Metadata = { title: "Impuestos" };

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function ImpuestosPage({ searchParams }: PageProps<"/impuestos">) {
  const sp = await searchParams;
  const { supabase, workspace, role } = await requireWorkspace();
  const empresa = workspace.kind === "empresa";

  const { data: flags } = await supabase.from("plan_limits").select("key, value").eq("plan_id", workspace.plan_id).in("key", ["modulo_impuestos", "exportar"]);
  const flag = (k: string) => (flags ?? []).find((f) => f.key === k)?.value ?? 0;
  const enabled = flag("modulo_impuestos") !== 0;
  const canExport = flag("exportar") !== 0;

  const currentYear = Number(todayEC().slice(0, 4));
  const requestedYear = Number(first(sp.anio));
  const year = Number.isInteger(requestedYear) && requestedYear >= 2020 && requestedYear <= currentYear ? requestedYear : currentYear;

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Impuestos</h1>
        <p className="text-muted">
          {empresa ? "IVA de ventas y compras, retenciones y fechas de declaración de tu negocio." : "Tu impuesto a la renta estimado, la rebaja por gastos personales y tu fecha de declaración."}
        </p>
      </header>

      {!enabled ? (
        <p className="rounded-2xl border border-dashed border-border bg-surface px-6 py-12 text-center text-muted">
          El módulo de impuestos no está incluido en tu plan. Pídelo al administrador.
        </p>
      ) : (
        <>
          <TaxDataForm
            data={{
              id: workspace.id,
              kind: workspace.kind,
              ruc: workspace.ruc,
              regime: workspace.regime,
              iva_periodicity: workspace.iva_periodicity,
              tax_dependents: workspace.tax_dependents,
              tax_employed: workspace.tax_employed,
            }}
            canEdit={role === "owner"}
            startOpen={!workspace.ruc}
          />

          {empresa ? (
            <CompanyView
              supabase={supabase}
              workspaceId={workspace.id}
              periodKey={first(sp.periodo)}
              periodicity={workspace.iva_periodicity === "semestral" ? "semestral" : "mensual"}
              ruc={workspace.ruc}
              canExport={canExport}
            />
          ) : (
            <PersonalView
              supabase={supabase}
              workspaceId={workspace.id}
              year={year}
              dependents={workspace.tax_dependents}
              employed={workspace.tax_employed}
              id={workspace.ruc}
            />
          )}
        </>
      )}
    </div>
  );
}
