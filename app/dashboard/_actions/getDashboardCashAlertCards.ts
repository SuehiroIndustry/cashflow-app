"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type DashboardCashAlertCard = {
  cash_account_id: number;
  account_name: string;
  first_alert_month: string;
  projected_ending_balance: number;
  alert_level: "warning" | "danger";
};

// UI を落とさないための安全な整形
function normalizeCard(row: unknown): DashboardCashAlertCard | null {
  const r = row as Partial<DashboardCashAlertCard> | null;

  if (!r) return null;

  const alertLevel =
    r.alert_level === "warning" || r.alert_level === "danger" ? r.alert_level : null;

  if (
    typeof r.cash_account_id !== "number" ||
    typeof r.account_name !== "string" ||
    typeof r.first_alert_month !== "string" ||
    typeof r.projected_ending_balance !== "number" ||
    !alertLevel
  ) {
    return null;
  }

  return {
    cash_account_id: r.cash_account_id,
    account_name: r.account_name,
    first_alert_month: r.first_alert_month,
    projected_ending_balance: r.projected_ending_balance,
    alert_level: alertLevel,
  };
}

export async function getDashboardCashAlertCards(
  threshold: number = 1_000_000
): Promise<DashboardCashAlertCard[]> {
  try {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase.rpc(
      "get_dashboard_cash_alert_cards_base",
      { threshold }
    );

    if (error) {
      console.error("get_dashboard_cash_alert_cards_base error:", error);
      return [];
    }

    const rows = Array.isArray(data) ? data : [];
    return rows.map(normalizeCard).filter(Boolean) as DashboardCashAlertCard[];
  } catch (e) {
    console.error("getDashboardCashAlertCards unexpected error:", e);
    return [];
  }
}