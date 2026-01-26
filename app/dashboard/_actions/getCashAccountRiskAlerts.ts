// app/dashboard/_actions/getCashAccountRiskAlerts.ts
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/auth-helpers-nextjs";
import type { Database } from "@/lib/database.types";

export type CashAccountRiskLevel = "GREEN" | "YELLOW" | "RED";

export type CashAccountRiskAlertRow = {
  cash_account_id: number;
  cash_account_name: string;
  risk_level: CashAccountRiskLevel;
  alert_month: string; // e.g. "2026-02-01"
  alert_projected_ending_cash: number;
};

export async function getCashAccountRiskAlerts(): Promise<CashAccountRiskAlertRow[]> {
  const cookieStore = cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: any) {
        // Nextのcookiesは set({name,value,...}) 形式
        cookieStore.set({ name, value, ...options });
      },
      remove(name: string, options: any) {
        cookieStore.set({ name, value: "", ...options, maxAge: 0 });
      },
    },
  });

  const { data, error } = await supabase
    .from("v_cash_account_risk_alerts")
    .select("cash_account_id,cash_account_name,risk_level,alert_month,alert_projected_ending_cash")
    .order("cash_account_id", { ascending: true });

  if (error) {
    console.error("[getCashAccountRiskAlerts] error:", error);
    throw new Error("Failed to fetch cash account risk alerts");
  }

  return (data ?? []).map((r: any) => ({
    cash_account_id: Number(r.cash_account_id),
    cash_account_name: String(r.cash_account_name),
    risk_level: r.risk_level as CashAccountRiskLevel,
    alert_month: String(r.alert_month),
    alert_projected_ending_cash: Number(r.alert_projected_ending_cash),
  }));
}