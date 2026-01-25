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

// 取得できない時に UI を落とさないための安全なデフォルト
function fallbackStatus(): DashboardCashStatus {
  return {
    status: "warning", // 取得できない＝監視上は「注意」に倒す（見逃し防止）
    monitored_accounts: 0,
    warning_count: 0,
    danger_count: 0,
    first_alert_month: null,
    worst_balance: null,
  };
}

export async function getDashboardCashStatus(
  threshold: number = 1_000_000
): Promise<DashboardCashStatus> {
  try {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .rpc("get_dashboard_cash_status_base", { threshold })
      .single();

    if (error || !data) {
      console.error("get_dashboard_cash_status_base error:", error);
      return fallbackStatus();
    }

    // 返り値が壊れてても落とさない（最低限の形を保証）
    const parsed = data as Partial<DashboardCashStatus>;

    const status =
      parsed.status === "ok" || parsed.status === "warning" || parsed.status === "danger"
        ? parsed.status
        : "warning";

    return {
      status,
      monitored_accounts: typeof parsed.monitored_accounts === "number" ? parsed.monitored_accounts : 0,
      warning_count: typeof parsed.warning_count === "number" ? parsed.warning_count : 0,
      danger_count: typeof parsed.danger_count === "number" ? parsed.danger_count : 0,
      first_alert_month:
        typeof parsed.first_alert_month === "string" ? parsed.first_alert_month : null,
      worst_balance:
        typeof parsed.worst_balance === "number" ? parsed.worst_balance : null,
    };
  } catch (e) {
    console.error("getDashboardCashStatus unexpected error:", e);
    return fallbackStatus();
  }
}