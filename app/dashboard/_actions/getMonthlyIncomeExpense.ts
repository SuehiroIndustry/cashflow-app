// app/dashboard/_actions/getMonthlyIncomeExpense.ts
"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureMonthlyCashBalance } from "./ensureMonthlyCashBalance";
import type { MonthlyIncomeExpense } from "../_types";

export async function getMonthlyIncomeExpense(args: {
  cash_account_id: number;
  month: string; // "YYYY-MM-01"
}): Promise<MonthlyIncomeExpense> {
  const supabase = await createSupabaseServerClient();

  // auth（RLS前提）
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) throw new Error("Not authenticated");

  // 月次レコードが無ければ作る
  await ensureMonthlyCashBalance({
    cash_account_id: args.cash_account_id,
    month: args.month,
  });

  const { data, error } = await supabase
    .from("monthly_cash_account_balances")
    .select("income, expense")
    .eq("cash_account_id", args.cash_account_id)
    .eq("month", args.month)
    .maybeSingle();

  if (error) throw error;

  return {
    income: Number(data?.income ?? 0),
    expense: Number(data?.expense ?? 0),
  };
}