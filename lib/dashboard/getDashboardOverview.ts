// lib/dashboard/getDashboardOverview.ts
import { supabase } from "@/lib/supabaseClient";

export type DashboardOverviewRow = {
  user_id: string;
  cash_account_id?: number; // 口座別ビューにはある / Allビューにはない
  current_balance: number;
  income_mtd: number;
  expense_mtd: number;
  planned_income_30d: number;
  planned_expense_30d: number;
  projected_balance_30d: number;
  risk_level: "GREEN" | "YELLOW" | "RED";
  risk_score: number;
  computed_at: string;
};

type AccountFilter =
  | { mode: "all" }
  | { mode: "account"; cashAccountId: number };

export async function getDashboardOverview(filter: AccountFilter) {
  // All選択時は「ユーザー合算ビュー」
  if (filter.mode === "all") {
    const { data, error } = await supabase
      .from("v_dashboard_overview_user_all_v1")
      .select("*")
      .single();

    if (error) throw error;
    return data as DashboardOverviewRow;
  }

  // 口座選択時は「口座別ビュー」を cash_account_id で絞る
  const { data, error } = await supabase
    .from("v_dashboard_overview_user_v2")
    .select("*")
    .eq("cash_account_id", filter.cashAccountId)
    .single();

  if (error) throw error;
  return data as DashboardOverviewRow;
}