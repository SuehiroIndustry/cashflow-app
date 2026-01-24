"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type DashboardCashAlertCard = {
  cash_account_id: number;
  account_name: string;
  first_alert_month: string;
  projected_ending_balance: number;
  alert_level: "warning" | "danger";
};

export async function getDashboardCashAlertCards(
  threshold: number = 1_000_000
): Promise<DashboardCashAlertCard[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.rpc(
    "get_dashboard_cash_alert_cards_base",
    { threshold }
  );

  if (error) {
    console.error("get_dashboard_cash_alert_cards_base error:", error);
    throw new Error("Failed to fetch dashboard cash alert cards");
  }

  return (data ?? []) as DashboardCashAlertCard[];
}