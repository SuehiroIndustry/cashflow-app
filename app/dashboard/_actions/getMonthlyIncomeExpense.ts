// app/dashboard/_actions/getMonthlyIncomeExpense.ts
"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { MonthlyIncomeExpenseRow } from "../_types";

export async function getMonthlyIncomeExpense(args: {
  cash_account_id: number;
  month: string; // "YYYY-MM-01"
}): Promise<MonthlyIncomeExpenseRow> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("monthly_cash_account_balances")
    .select("income,expense")
    .eq("cash_account_id", args.cash_account_id)
    .eq("month", args.month)
    .maybeSingle();

  if (error) throw error;

  return {
    income: data?.income ?? 0,
    expense: data?.expense ?? 0,
  };
}