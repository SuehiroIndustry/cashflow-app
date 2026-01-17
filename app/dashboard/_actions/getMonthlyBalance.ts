"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type MonthlyBalanceRow = {
  month: string;
  income: number;
  expense: number;
  balance: number;
};

export async function getMonthlyBalance(accountId: string): Promise<MonthlyBalanceRow[]> {
  if (!accountId) return [];

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("monthly_account_balances")
    .select("month, income, expense, balance")
    .eq("account_id", accountId)
    .order("month", { ascending: false })
    .limit(12);

  if (error) {
    console.error("[getMonthlyBalance] error:", error.message);
    return [];
  }

  return (data ?? []) as MonthlyBalanceRow[];
}