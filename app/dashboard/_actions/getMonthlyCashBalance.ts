"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type MonthlyCashBalanceRow = {
  month: string;   // '2026-01-01'
  income: number;
  expense: number;
  balance: number;
};

export async function getMonthlyCashBalance(cashAccountId: number) {
  const supabase = await createSupabaseServerClient();

  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userRes.user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("monthly_cash_account_balances")
    .select("month, income, expense, balance")
    .eq("user_id", userRes.user.id)
    .eq("cash_account_id", cashAccountId)
    .order("month", { ascending: false })
    .limit(12);

  if (error) throw new Error(error.message);
  return (data ?? []) as MonthlyCashBalanceRow[];
}