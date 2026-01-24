"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type DashboardCashStatus = {
  status: "ok" | "warning" | "danger";
  monitored_accounts: number;
  warning_count: number;
  danger_count: number;
  first_alert_month: string | null;
  worst_balance: number | null;
};

export async function getDashboardCashStatus(
  threshold: number = 1_000_000
): Promise<DashboardCashStatus> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .rpc("get_dashboard_cash_status_base", { threshold })
    .single();

  if (error) {
    console.error("get_dashboard_cash_status_base error:", error);
    throw new Error("Failed to fetch dashboard cash status");
  }

  // SupabaseのRPC戻りは any になりがちなので、最低限ここで型を合わせる
  return data as DashboardCashStatus;
}