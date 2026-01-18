// app/dashboard/_actions/getMonthlyIncomeExpense.ts
"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { MonthlyAgg } from "../_types";

export async function getMonthlyIncomeExpense(input: {
  cash_account_id: number;
  month: string; // "YYYY-MM-01"
}): Promise<MonthlyAgg> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) return { income: 0, expense: 0 };

  const { data, error } = await supabase
    .from("monthly_cash_account_balances")
    .select("income, expense")
    .eq("user_id", user.id)
    .eq("cash_account_id", input.cash_account_id)
    .eq("month", input.month)
    .maybeSingle();

  if (error) {
    // RLS等で取れない/無い場合は 0 扱い
    return { income: 0, expense: 0 };
  }

  return {
    income: Number(data?.income ?? 0),
    expense: Number(data?.expense ?? 0),
  };
}