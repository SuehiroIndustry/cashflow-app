// app/dashboard/_actions/getCashAccountRiskAlerts.ts
import { cookies } from "next/headers";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import type { Database } from "@/lib/database.types";

export type CashAccountRiskLevel = "GREEN" | "YELLOW" | "RED";

export type CashAccountRiskAlertRow = {
  cash_account_id: number;
  cash_account_name: string;
  risk_level: CashAccountRiskLevel;
  alert_month: string; // e.g. "2026-02-01"
  alert_projected_ending_cash: number; // can be negative
};

export async function getCashAccountRiskAlerts(): Promise<CashAccountRiskAlertRow[]> {
  const supabase = createServerComponentClient<Database>({ cookies });

  const { data, error } = await supabase
    .from("v_cash_account_risk_alerts")
    .select(
      "cash_account_id,cash_account_name,risk_level,alert_month,alert_projected_ending_cash",
    )
    .order("cash_account_id", { ascending: true });

  if (error) {
    // ここは黙って落ちるより、ログに残して気づけるほうが勝ち
    console.error("[getCashAccountRiskAlerts] error:", error);
    throw new Error("Failed to fetch cash account risk alerts");
  }

  // supabaseの型解決が弱い場合があるので、最低限の整形だけして返す
  return (data ?? []).map((r: any) => ({
    cash_account_id: Number(r.cash_account_id),
    cash_account_name: String(r.cash_account_name),
    risk_level: r.risk_level as CashAccountRiskLevel,
    alert_month: String(r.alert_month),
    alert_projected_ending_cash: Number(r.alert_projected_ending_cash),
  }));
}