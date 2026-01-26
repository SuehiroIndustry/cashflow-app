// app/dashboard/_actions/getCashAccountRiskAlerts.ts
"use server";

import { createClient } from "@/utils/supabase/server";

export type CashAccountRiskLevel = "GREEN" | "YELLOW" | "RED";

export type CashAccountRiskAlertRow = {
  cash_account_id: number;
  cash_account_name: string;
  risk_level: CashAccountRiskLevel;
  alert_month: string; // YYYY-MM-01
  alert_projected_ending_cash: number;
};

/**
 * Dashboard上部の「危険/注意」判定の元データを返す
 * - 失敗しても throw しない（本番の Server Component を落とさない）
 */
export async function getCashAccountRiskAlerts(): Promise<CashAccountRiskAlertRow[]> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("v_cash_account_risk_alerts")
      .select(
        "cash_account_id, cash_account_name, risk_level, alert_month, alert_projected_ending_cash"
      )
      .order("cash_account_id", { ascending: true });

    if (error) {
      console.error("[getCashAccountRiskAlerts] supabase error:", error);
      return [];
    }

    if (!Array.isArray(data)) return [];

    // ✅ 形が崩れてても落とさない
    const rows: CashAccountRiskAlertRow[] = data
      .map((r: any) => {
        const cash_account_id = Number(r?.cash_account_id);
        const cash_account_name = String(r?.cash_account_name ?? "");
        const risk_level = String(r?.risk_level ?? "") as CashAccountRiskLevel;
        const alert_month = String(r?.alert_month ?? "");
        const alert_projected_ending_cash = Number(r?.alert_projected_ending_cash);

        const ok =
          Number.isFinite(cash_account_id) &&
          cash_account_name.length > 0 &&
          (risk_level === "GREEN" || risk_level === "YELLOW" || risk_level === "RED") &&
          alert_month.length > 0 &&
          Number.isFinite(alert_projected_ending_cash);

        if (!ok) return null;

        return {
          cash_account_id,
          cash_account_name,
          risk_level,
          alert_month,
          alert_projected_ending_cash,
        };
      })
      .filter(Boolean) as CashAccountRiskAlertRow[];

    return rows;
  } catch (e) {
    console.error("[getCashAccountRiskAlerts] unexpected error:", e);
    return [];
  }
}