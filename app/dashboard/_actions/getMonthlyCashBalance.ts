// app/dashboard/_actions/getMonthlyBalance.ts
"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { MonthlyCashBalanceRow } from "../_types";

export async function getMonthlyBalance(accountId: string): Promise<MonthlyCashBalanceRow[]> {
  if (!accountId) return [];

  const supabase = await createSupabaseServerClient();

  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userRes.user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("monthly_cash_account_balances")
    .select("month, income, expense, balance")
    .eq("user_id", userRes.user.id)
    .eq("cash_account_id", Number(accountId))
    .order("month", { ascending: false })
    .limit(12);

  if (error) throw new Error(error.message);
  return (data ?? []) as MonthlyCashBalanceRow[];
}