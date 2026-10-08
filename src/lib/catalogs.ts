import type { createClient } from "@/lib/supabase/server";
import { todayEC } from "@/lib/format";

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Catálogos necesarios para el formulario de movimientos. */
export async function loadFormCatalogs(supabase: Supabase, workspaceId: string) {
  const today = todayEC();
  const [accounts, categories, contacts, taxRates, withholdings] = await Promise.all([
    supabase.from("accounts").select("id, name").eq("workspace_id", workspaceId).eq("is_active", true).order("created_at"),
    supabase.from("categories").select("id, name, type").eq("workspace_id", workspaceId).order("name"),
    supabase.from("contacts").select("id, name, kind").eq("workspace_id", workspaceId).order("name"),
    supabase
      .from("tax_rates")
      .select("id, code, name, percentage")
      .eq("is_active", true)
      .lte("valid_from", today)
      .or(`valid_to.is.null,valid_to.gte.${today}`)
      .order("percentage", { ascending: false }),
    supabase.from("withholding_codes").select("id, sri_code, description, percentage").eq("is_active", true).order("sri_code"),
  ]);

  return {
    accounts: accounts.data ?? [],
    categories: categories.data ?? [],
    contacts: contacts.data ?? [],
    taxRates: taxRates.data ?? [],
    withholdings: withholdings.data ?? [],
  };
}

export type FormCatalogs = Awaited<ReturnType<typeof loadFormCatalogs>>;
