// app/dashboard/_actions/getMonthlyBalance.ts
"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type MonthlyBalanceRow = {
  cash_account_id: number;
  month: string; // YYYY-MM-01
  income: number;
  expense: number;
  balance: number;
};

export async function getMonthlyBalance(params: {
  cashAccountId: number | null;
  months?: number;
}): Promise<MonthlyBalanceRow[]> {
  if (!params.cashAccountId) return [];

  const supabase = await createSupabaseServerClient();
  const months = params.months ?? 12;

  const { data, error } = await supabase
    .from("monthly_cash_account_balances")
    .select("cash_account_id, month, income, expense, balance")
    .eq("cash_account_id", params.cashAccountId)
    .order("month", { ascending: false })
    .limit(months);

  if (error) {
    console.error("[getMonthlyBalance] error:", error);
    return [];
  }

  return (data ?? []) as MonthlyBalanceRow[];
}