// app/dashboard/_actions/getMonthlyCashBalance.ts
"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { MonthlyCashBalanceRow } from "../_types";

export async function getMonthlyCashBalance(input: {
  cash_account_id: number;
  month: string; // "YYYY-MM-01"
}): Promise<MonthlyCashBalanceRow | null> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) return null;

  const { data, error } = await supabase
    .from("monthly_cash_account_balances")
    .select("user_id, cash_account_id, month, income, expense, balance, updated_at")
    .eq("user_id", user.id)
    .eq("cash_account_id", input.cash_account_id)
    .eq("month", input.month)
    .maybeSingle();

  if (error) return null;

  return (data ?? null) as MonthlyCashBalanceRow | null;
}