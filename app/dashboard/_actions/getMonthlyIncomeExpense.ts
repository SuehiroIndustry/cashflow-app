// app/dashboard/_actions/getMonthlyIncomeExpense.ts
"use server";

import { createClient } from "@/utils/supabase/server";
import type { MonthlyIncomeExpenseRow } from "../_types";
import { ensureMonthlyCashBalance } from "./_ensureMonthlyCashBalance";

export async function getMonthlyIncomeExpense(args: {
  cash_account_id: number;
  month: string; // "YYYY-MM-01"
}): Promise<MonthlyIncomeExpenseRow> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) throw new Error("Not authenticated");

  // 月次レコードが無い場合に作る（あなたの運用に合わせる）
  await ensureMonthlyCashBalance({
    cash_account_id: args.cash_account_id,
    month: args.month,
  });

  const { data, error } = await supabase
    .from("monthly_cash_account_balances")
    .select("cash_account_id, month, income, expense")
    .eq("cash_account_id", args.cash_account_id)
    .eq("month", args.month)
    .maybeSingle();

  if (error) throw error;

  return {
    cash_account_id: args.cash_account_id,
    month: args.month,
    income: Number(data?.income ?? 0),
    expense: Number(data?.expense ?? 0),
  };
}