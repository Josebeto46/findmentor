import type { Metadata } from "next";
import { requireAdmin } from "@/lib/context";
import { TaxAdmin } from "./tax-admin";

export const metadata: Metadata = { title: "IVA e impuestos" };

export default async function ImpuestosAdminPage() {
  const { supabase } = await requireAdmin();

  const [{ data: rates }, { data: withholdings }, { data: dueDays }, { data: yearParams }, { data: brackets }, { data: baskets }] = await Promise.all([
    supabase.from("tax_rates").select("id, code, name, percentage, valid_from, valid_to, is_active").order("valid_from", { ascending: false }).order("code"),
    supabase.from("withholding_codes").select("id, sri_code, description, percentage, is_active").order("sri_code"),
    supabase.from("tax_due_days").select("ninth_digit, due_day").order("ninth_digit"),
    supabase.from("tax_year_params").select("*").order("year"),
    supabase.from("income_tax_brackets").select("*").order("lower"),
    supabase.from("rebate_baskets").select("*"),
  ]);

  return <TaxAdmin rates={rates ?? []} withholdings={withholdings ?? []} dueDays={dueDays ?? []} yearParams={yearParams ?? []} brackets={brackets ?? []} baskets={baskets ?? []} />;
}
