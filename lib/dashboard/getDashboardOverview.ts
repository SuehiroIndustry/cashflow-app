// lib/dashboard/getDashboardOverview.ts
import { createClient } from "@/utils/supabase/client";

export async function getDashboardOverview(params: {
  accountId: number | null;
}) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("dashboard_overview")
    .select(
      `
      current_balance,
      monthly_fixed_cost,
      month_expense,
      planned_orders_30d,
      projected_balance,
      level,
      computed_at
    `
    )
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  // ★ UI用に正規化して返す
  return {
    current_balance: Number(data?.current_balance ?? 0),
    monthly_fixed_cost: Number(data?.monthly_fixed_cost ?? 0),
    month_expense: Number(data?.month_expense ?? 0),
    planned_orders_30d: Number(data?.planned_orders_30d ?? 0),
    projected_balance: Number(data?.projected_balance ?? 0),
    level: (data?.level ?? "GREEN") as
      | "GREEN"
      | "YELLOW"
      | "RED",
    computed_at: data?.computed_at ?? null,
  };
}