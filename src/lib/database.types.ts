// Tipos de la base de datos. Regenerar con generate_typescript_types (MCP de Supabase)
// o `supabase gen types typescript` cuando cambie el esquema.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type AccountKind = "personal" | "empresa";
type MemberRole = "owner" | "editor" | "lector";
type PlatformRole = "user" | "admin";
type TaxRegime = "persona_natural" | "general" | "rimpe_emprendedor" | "rimpe_negocio_popular";
type WorkspaceStatus = "active" | "suspended";
type TxType = "ingreso" | "gasto";
type PaymentStatus = "pagado" | "pendiente";
type BankAccountKind = "efectivo" | "banco" | "tarjeta" | "billetera";
type ContactKind = "cliente" | "proveedor" | "ambos";

type Rel = (column: string, table: string) => {
  foreignKeyName: string;
  columns: [string];
  isOneToOne: false;
  referencedRelation: string;
  referencedColumns: ["id"];
};
type R<C extends string, T extends string> = ReturnType<Rel> & { columns: [C]; referencedRelation: T };

export type Database = {
  __InternalSupabase: { PostgrestVersion: "14.18" };
  public: {
    Tables: {
      profiles: {
        Row: {
          country: string;
          created_at: string;
          email: string | null;
          full_name: string | null;
          id: string;
          is_active: boolean;
          platform_role: PlatformRole;
          updated_at: string;
        };
        Insert: { id: string; email?: string | null; full_name?: string | null };
        Update: { email?: string | null; full_name?: string | null; country?: string; platform_role?: PlatformRole; is_active?: boolean };
        Relationships: [];
      };
      plans: {
        Row: {
          account_kind: AccountKind;
          code: string;
          created_at: string;
          id: string;
          is_active: boolean;
          is_free: boolean;
          name: string;
          price_usd: number;
          trial_days: number | null;
        };
        Insert: { account_kind: AccountKind; code: string; name: string; is_free?: boolean; is_active?: boolean; price_usd?: number; trial_days?: number | null };
        Update: { name?: string; is_free?: boolean; is_active?: boolean; price_usd?: number; trial_days?: number | null };
        Relationships: [];
      };
      plan_limits: {
        Row: { key: string; plan_id: string; value: number };
        Insert: { key: string; plan_id: string; value: number };
        Update: { value?: number };
        Relationships: [R<"plan_id", "plans">];
      };
      workspaces: {
        Row: {
          created_at: string;
          currency: string;
          id: string;
          iva_periodicity: string;
          kind: AccountKind;
          legal_name: string | null;
          name: string;
          obligado_contabilidad: boolean;
          owner_id: string;
          plan_id: string;
          regime: TaxRegime | null;
          ruc: string | null;
          status: WorkspaceStatus;
          updated_at: string;
          access_expires_at: string | null;
          tax_dependents: number;
          tax_employed: boolean;
        };
        Insert: { kind: AccountKind; name: string; owner_id: string; plan_id: string };
        Update: {
          legal_name?: string | null;
          name?: string;
          obligado_contabilidad?: boolean;
          regime?: TaxRegime | null;
          ruc?: string | null;
          iva_periodicity?: string;
          plan_id?: string;
          status?: WorkspaceStatus;
          access_expires_at?: string | null;
          tax_dependents?: number;
          tax_employed?: boolean;
        };
        Relationships: [R<"plan_id", "plans">, R<"owner_id", "profiles">];
      };
      workspace_members: {
        Row: { created_at: string; role: MemberRole; user_id: string; workspace_id: string };
        Insert: { role?: MemberRole; user_id: string; workspace_id: string };
        Update: { role?: MemberRole };
        Relationships: [R<"workspace_id", "workspaces">, R<"user_id", "profiles">];
      };
      accounts: {
        Row: {
          created_at: string;
          id: string;
          initial_balance: number;
          is_active: boolean;
          kind: BankAccountKind;
          name: string;
          workspace_id: string;
        };
        Insert: { workspace_id: string; name: string; kind?: BankAccountKind; initial_balance?: number; is_active?: boolean };
        Update: { name?: string; kind?: BankAccountKind; initial_balance?: number; is_active?: boolean };
        Relationships: [R<"workspace_id", "workspaces">];
      };
      categories: {
        Row: {
          color: string | null;
          created_at: string;
          icon: string | null;
          id: string;
          is_default: boolean;
          name: string;
          parent_id: string | null;
          tax_deductible_group: string | null;
          type: TxType;
          workspace_id: string;
        };
        Insert: { workspace_id: string; name: string; type: TxType; icon?: string | null; color?: string | null };
        Update: { name?: string; icon?: string | null; color?: string | null };
        Relationships: [R<"workspace_id", "workspaces">];
      };
      contacts: {
        Row: {
          created_at: string;
          email: string | null;
          id: string;
          kind: ContactKind;
          name: string;
          phone: string | null;
          tax_id: string | null;
          workspace_id: string;
        };
        Insert: { workspace_id: string; name: string; kind?: ContactKind; tax_id?: string | null; email?: string | null; phone?: string | null };
        Update: { name?: string; kind?: ContactKind; tax_id?: string | null; email?: string | null; phone?: string | null };
        Relationships: [R<"workspace_id", "workspaces">];
      };
      tax_rates: {
        Row: {
          code: string;
          id: string;
          is_active: boolean;
          name: string;
          percentage: number;
          valid_from: string;
          valid_to: string | null;
        };
        Insert: { code: string; name: string; percentage: number; valid_from: string; valid_to?: string | null; is_active?: boolean };
        Update: { name?: string; percentage?: number; valid_to?: string | null; is_active?: boolean };
        Relationships: [];
      };
      withholding_codes: {
        Row: { description: string; id: string; is_active: boolean; percentage: number; sri_code: string };
        Insert: { description: string; percentage: number; sri_code: string; is_active?: boolean };
        Update: { description?: string; percentage?: number; is_active?: boolean };
        Relationships: [];
      };
      tax_due_days: {
        Row: { due_day: number; ninth_digit: number };
        Insert: { due_day: number; ninth_digit: number };
        Update: { due_day?: number };
        Relationships: [];
      };
      workspace_invitations: {
        Row: {
          id: string;
          workspace_id: string;
          email: string;
          role: MemberRole;
          token: string;
          invited_by: string | null;
          created_at: string;
          expires_at: string;
          accepted_at: string | null;
          accepted_by: string | null;
        };
        Insert: { workspace_id: string; email: string; role: MemberRole };
        Update: never;
        Relationships: [R<"workspace_id", "workspaces">];
      };
      budgets: {
        Row: { amount: number; category_id: string; id: string; month: string; workspace_id: string };
        Insert: { amount: number; category_id: string; month: string; workspace_id: string };
        Update: { amount?: number };
        Relationships: [R<"category_id", "categories">, R<"workspace_id", "workspaces">];
      };
      recurring_rules: {
        Row: {
          created_at: string;
          frequency: string;
          id: string;
          is_active: boolean;
          next_date: string;
          template: Json;
          workspace_id: string;
        };
        Insert: { frequency: string; next_date: string; template: Json; workspace_id: string; is_active?: boolean };
        Update: { is_active?: boolean; next_date?: string; frequency?: string };
        Relationships: [R<"workspace_id", "workspaces">];
      };
      tax_year_params: {
        Row: {
          year: number;
          basic_basket_value: number;
          rebate_rate: number;
          catastrophic_baskets: number;
          iess_rate: number;
          source: string | null;
          verified: boolean;
        };
        Insert: {
          year: number;
          basic_basket_value: number;
          rebate_rate: number;
          catastrophic_baskets?: number;
          iess_rate?: number;
          source?: string | null;
          verified?: boolean;
        };
        Update: {
          basic_basket_value?: number;
          rebate_rate?: number;
          catastrophic_baskets?: number;
          iess_rate?: number;
          source?: string | null;
          verified?: boolean;
        };
        Relationships: [];
      };
      income_tax_brackets: {
        Row: { year: number; lower: number; upper: number | null; base_tax: number; rate: number };
        Insert: { year: number; lower: number; upper?: number | null; base_tax: number; rate: number };
        Update: { lower?: number; upper?: number | null; base_tax?: number; rate?: number };
        Relationships: [];
      };
      rebate_baskets: {
        Row: { year: number; dependents: number; baskets: number };
        Insert: { year: number; dependents: number; baskets: number };
        Update: { baskets?: number };
        Relationships: [];
      };
      app_settings: {
        Row: { key: string; updated_at: string; value: Json };
        Insert: { key: string; value: Json };
        Update: { value?: Json };
        Relationships: [];
      };
      audit_log: {
        Row: {
          action: string;
          changes: Json | null;
          created_at: string;
          id: number;
          record_id: string | null;
          table_name: string;
          user_id: string | null;
          workspace_id: string | null;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      transactions: {
        Row: {
          account_id: string;
          attachment_path: string | null;
          base_amount: number;
          category_id: string | null;
          contact_id: string | null;
          created_at: string;
          created_by: string | null;
          description: string | null;
          doc_number: string | null;
          doc_type: string | null;
          due_date: string | null;
          id: string;
          iva_deductible: boolean;
          occurred_on: string;
          paid_on: string | null;
          payment_method: string | null;
          payment_status: PaymentStatus;
          recurring_rule_id: string | null;
          tax_amount: number;
          tax_rate_id: string | null;
          total: number;
          type: TxType;
          updated_at: string;
          withheld_amount: number;
          withholding_id: string | null;
          workspace_id: string;
        };
        Insert: {
          account_id: string;
          base_amount: number;
          type: TxType;
          workspace_id: string;
          category_id?: string | null;
          contact_id?: string | null;
          description?: string | null;
          doc_number?: string | null;
          doc_type?: string | null;
          due_date?: string | null;
          iva_deductible?: boolean;
          occurred_on?: string;
          payment_method?: string | null;
          payment_status?: PaymentStatus;
          recurring_rule_id?: string | null;
          attachment_path?: string | null;
          tax_rate_id?: string | null;
          withholding_id?: string | null;
        };
        Update: {
          account_id?: string;
          base_amount?: number;
          type?: TxType;
          category_id?: string | null;
          contact_id?: string | null;
          description?: string | null;
          doc_number?: string | null;
          doc_type?: string | null;
          due_date?: string | null;
          paid_on?: string | null;
          attachment_path?: string | null;
          iva_deductible?: boolean;
          occurred_on?: string;
          payment_method?: string | null;
          payment_status?: PaymentStatus;
          tax_rate_id?: string | null;
          withholding_id?: string | null;
        };
        Relationships: [
          R<"account_id", "accounts">,
          R<"category_id", "categories">,
          R<"contact_id", "contacts">,
          R<"tax_rate_id", "tax_rates">,
          R<"withholding_id", "withholding_codes">,
          R<"workspace_id", "workspaces">,
        ];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      create_workspace: {
        Args: { p_kind: AccountKind; p_name: string; p_legal_name?: string; p_regime?: TaxRegime; p_ruc?: string };
        Returns: string;
      };
      is_admin: { Args: never; Returns: boolean };
      workspace_usage: { Args: { ws: string }; Returns: { key: string; limit: number | null; used: number }[] };
      run_recurring: { Args: { p_ws?: string }; Returns: number };
      accept_invitation: { Args: { p_token: string }; Returns: string };
      attachments_usage: { Args: { ws: string }; Returns: number };
      invitation_preview: {
        Args: { p_token: string };
        Returns: { workspace_name: string; role: MemberRole; email: string; inviter: string | null; expired: boolean; accepted: boolean }[];
      };
      account_balances: { Args: { ws: string }; Returns: { account_id: string; balance: number }[] };
      month_summary: {
        Args: { ws: string; month_start: string };
        Returns: { income: number; expense: number; receivable: number; payable: number }[];
      };
    };
    Enums: {
      account_kind: AccountKind;
      member_role: MemberRole;
      platform_role: PlatformRole;
      tax_regime: TaxRegime;
      workspace_status: WorkspaceStatus;
      tx_type: TxType;
      payment_status: PaymentStatus;
      bank_account_kind: BankAccountKind;
      contact_kind: ContactKind;
    };
    CompositeTypes: { [_ in never]: never };
  };
};
