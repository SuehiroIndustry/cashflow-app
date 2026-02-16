// lib/dashboard/getDashboardOverview.ts
import { createClient } from "@/utils/supabase/client";

export async function getDashboardOverview(params: {
  accountId: number | null;
}) {
  const supabase = createClient();

  const q = supabase
    .from("v_dashboard_overview_user_v2")
    .select(
      `
      cash_account_id,
      current_balance,
      month_income,
      month_expense,
      planned_income_30d,
      planned_expense_30d,
      projected_balance_30d,
      risk_level,
      computed_at
    `
    );

  // accountId が指定されているなら、その口座だけに絞る
  const { data, error } = params.accountId
    ? await q.eq("cash_account_id", params.accountId).maybeSingle()
    : await q.limit(1).maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  // ★ UI用に正規化して返す（既存の返却キーは維持）
  return {
    current_balance: Number(data?.current_balance ?? 0),
    monthly_fixed_cost: 0, // v2 には無いので 0（固定費は別VIEW/RPCで統合するなら後で）
    month_expense: Number(data?.month_expense ?? 0),

    // 旧UIの planned_orders_30d に相当するものが無いので、まずは planned_expense_30d を入れる
    // （UI側が「30日内の予定支出」を表示したいならこれが近い）
    planned_orders_30d: Number(data?.planned_expense_30d ?? 0),

    // projected_balance → v2 の projected_balance_30d
    projected_balance: Number(data?.projected_balance_30d ?? 0),

    // level → v2 の risk_level
    level: (data?.risk_level ?? "GREEN") as "GREEN" | "YELLOW" | "RED",

    computed_at: data?.computed_at ?? null,
  };
}